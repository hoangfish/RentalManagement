import { Emitter } from '../../Common/signal.js';
import {
  URL_USER_REGISTER, URL_USER_LOGIN, URL_USER_LOGOUT, URL_USER_ME, STORAGE_KEYS,
} from '../../Common/constant.js';
import {
  validateRegister, validateLogin, firstError, normalizeEmail, normalizePhone,
} from '../../Common/validators.js';
import { HttpClientImpl } from '../../Protocols/Http/httpclientimpl.js';
import { SocketClient } from '../../Protocols/SocketIO/socketclient.js';
import { Storage } from '../../Utils/Storage/storage.js';
import { LOG, LogLevel } from '../../Utils/Logger/logger.js';
import { UserModel } from '../Models/UserModel.js';

const TAG = 'UserController';

// Signals (same idea as the Q_SIGNALS in the Qt version):
//   registerSuccess(user)            registerFailed(message, fieldErrors)
//   loginSuccess(user)               loginFailed(message, fieldErrors)
//   logoutSuccess()
export class UserController extends Emitter {
  static #instance = null;
  static getInstance() {
    if (!UserController.#instance) UserController.#instance = new UserController();
    return UserController.#instance;
  }

  constructor() {
    super();
    this.http = HttpClientImpl.getInstance();
    this.userModel = new UserModel();
    this.http.setTokenProvider(() => this.userModel.token);
  }

  getUserModel() { return this.userModel; }
  isLoggedIn() { return this.userModel.isLoggedIn; }

  async registerUser({ firstName, lastName, phone, email, password, role }) {
    const errors = validateRegister({ firstName, lastName, phone, email, password, role });
    if (Object.keys(errors).length) {
      this.emit('registerFailed', firstError(errors), errors);
      return;
    }

    const response = await this.http.sendPostRequest(URL_USER_REGISTER, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: normalizePhone(phone),
      email: normalizeEmail(email),
      password,
      role,
    });

    if (response.success) {
      LOG(LogLevel.INFO, 'Register request successful', TAG);
      this.#startSession(response.data);
      this.emit('registerSuccess', this.userModel);
    } else {
      LOG(LogLevel.ERROR, `Register failed: ${response.message}`, TAG);
      this.emit('registerFailed', response.message, response.errors || {});
    }
  }

  async loginUser(emailOrPhone, password, role) {
    const errors = validateLogin({ emailOrPhone, password, role });
    if (Object.keys(errors).length) {
      this.emit('loginFailed', firstError(errors), errors);
      return;
    }

    const response = await this.http.sendPostRequest(URL_USER_LOGIN, {
      emailOrPhone: emailOrPhone.trim(),
      password,
      role,
    });

    if (response.success) {
      LOG(LogLevel.INFO, 'Login successful and user data updated', TAG);
      this.#startSession(response.data);
      this.emit('loginSuccess', this.userModel);
    } else {
      LOG(LogLevel.ERROR, `Login failed: ${response.message}`, TAG);
      this.emit('loginFailed', response.message, response.errors || {});
    }
  }

  async logoutUser() {
    // Tell the server (best effort) but always sign out locally.
    await this.http.sendPostRequest(URL_USER_LOGOUT, {});
    this.#endSession();
    LOG(LogLevel.INFO, 'Logout successful', TAG);
    this.emit('logoutSuccess');
  }

  // Called once at start-up: if a token is stored, check it is still valid.
  async restoreSession() {
    const token = Storage.get(STORAGE_KEYS.TOKEN);
    if (!token) return false;

    this.userModel.setToken(token);
    const response = await this.http.sendGetRequest(URL_USER_ME);

    if (response.success) {
      this.userModel.setUser(response.data.user);
      SocketClient.getInstance().connect(token);
      return true;
    }
    if (!response.networkError) {
      // Token expired / account deleted: forget it.
      this.#endSession();
    } else {
      // Server unreachable: keep the token for next time but stay signed out for now.
      this.userModel.setToken('');
    }
    return false;
  }

  #startSession({ user, token }) {
    this.userModel.setToken(token);
    this.userModel.setUser(user);
    Storage.set(STORAGE_KEYS.TOKEN, token);
    SocketClient.getInstance().connect(token);
  }

  #endSession() {
    SocketClient.getInstance().disconnect();
    Storage.remove(STORAGE_KEYS.TOKEN);
    this.userModel.clear();
  }
}
