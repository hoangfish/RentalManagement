import { Emitter } from '../../Common/signal.js';

// Holds the signed-in user's data. Emits 'changed' whenever it is updated or cleared.
export class UserModel extends Emitter {
  #id = '';
  #firstName = '';
  #lastName = '';
  #email = '';
  #phone = '';
  #role = '';
  #token = '';

  get id() { return this.#id; }
  get firstName() { return this.#firstName; }
  get lastName() { return this.#lastName; }
  get email() { return this.#email; }
  get phone() { return this.#phone; }
  get role() { return this.#role; }
  get token() { return this.#token; }
  get isLoggedIn() { return Boolean(this.#token && this.#id); }

  get fullName() { return `${this.#firstName} ${this.#lastName}`.trim(); }
  get initials() {
    return `${this.#firstName.charAt(0)}${this.#lastName.charAt(0)}`.toUpperCase() || '?';
  }

  setUser({ id = '', firstName = '', lastName = '', email = '', phone = '', role = '' } = {}) {
    this.#id = id;
    this.#firstName = firstName;
    this.#lastName = lastName;
    this.#email = email;
    this.#phone = phone;
    this.#role = role;
    this.emit('changed');
  }

  setToken(token) {
    this.#token = token || '';
  }

  clear() {
    this.setToken('');
    this.setUser();
  }
}
