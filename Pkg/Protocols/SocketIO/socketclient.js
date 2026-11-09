import { Emitter } from '../../Common/signal.js';
import { URL_SERVER_SOCKET } from '../../Common/constant.js';
import { LOG, LogLevel } from '../../Utils/Logger/logger.js';
import { NotiCtrl } from './NotiCtrl.js';

// Counterpart of SocketIoClient. Emits 'statusChanged' with 'connected' | 'disconnected'.
export class SocketClient extends Emitter {
  static #instance = null;
  #socket = null;
  #status = 'disconnected';

  static getInstance() {
    if (!SocketClient.#instance) SocketClient.#instance = new SocketClient();
    return SocketClient.#instance;
  }

  get status() { return this.#status; }

  #setStatus(status) {
    if (this.#status === status) return;
    this.#status = status;
    this.emit('statusChanged', status);
  }

  // The socket.io browser client is served by the socket server itself.
  async #loadLibrary() {
    if (window.io) return;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${URL_SERVER_SOCKET}/socket.io/socket.io.js`;
      script.onload = resolve;
      script.onerror = () => reject(new Error('socket.io client could not be loaded'));
      document.head.appendChild(script);
    });
  }

  async connect(token) {
    this.disconnect();
    if (!token) return;
    try {
      await this.#loadLibrary();
    } catch (err) {
      // Realtime is optional: the rest of the app keeps working without it.
      LOG(LogLevel.WARNING, `${err.message} (is SOCKET_SERVER running?)`, 'SocketClient');
      return;
    }
    const socket = window.io(URL_SERVER_SOCKET, { auth: { token }, reconnectionAttempts: 5 });
    this.#socket = socket;
    socket.on('connect', () => { LOG(LogLevel.INFO, 'Socket connected', 'SocketClient'); this.#setStatus('connected'); });
    socket.on('disconnect', () => this.#setStatus('disconnected'));
    socket.on('connect_error', (err) => LOG(LogLevel.WARNING, `Socket error: ${err.message}`, 'SocketClient'));
    socket.on('notification', (payload) => NotiCtrl.getInstance().emitNoti(payload));
  }

  disconnect() {
    if (this.#socket) {
      this.#socket.disconnect();
      this.#socket = null;
    }
    this.#setStatus('disconnected');
  }
}
