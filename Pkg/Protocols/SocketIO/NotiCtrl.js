import { Emitter } from '../../Common/signal.js';

// Counterpart of NotiCtrl: views listen to 'notiChanged' to show server pushes.
export class NotiCtrl extends Emitter {
  static #instance = null;
  static getInstance() {
    if (!NotiCtrl.#instance) NotiCtrl.#instance = new NotiCtrl();
    return NotiCtrl.#instance;
  }
  emitNoti(content) { this.emit('notiChanged', content); }
}
