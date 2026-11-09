// Minimal replacement for Qt signals/slots: controller.on('loginSuccess', cb)
export class Emitter {
  #listeners = new Map();

  // Returns an "off" function so views can unsubscribe when they are destroyed.
  on(event, callback) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event).add(callback);
    return () => this.#listeners.get(event)?.delete(callback);
  }

  emit(event, ...args) {
    this.#listeners.get(event)?.forEach((cb) => {
      try { cb(...args); } catch (err) { console.error(`Listener for "${event}" failed`, err); }
    });
  }
}
