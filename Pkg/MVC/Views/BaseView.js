// Every screen extends this. A view only draws UI and forwards user actions to a controller;
// it listens to controller signals (like QML Connections) and cleans up in destroy().
export class BaseView {
  title = '';
  #offs = [];

  constructor(ctx, params = {}) {
    this.ctx = ctx;        // { router, userController }
    this.params = params;  // query parameters from the URL hash
    this.el = null;
  }

  render() { return ''; }  // return an HTML string
  onMount() {}             // wire up events after the HTML is in the page

  mount(outlet) {
    this.el = document.createElement('div');
    this.el.className = 'view';
    this.el.innerHTML = this.render();
    outlet.replaceChildren(this.el);
    if (this.title) document.title = this.title;
    this.onMount();
  }

  listen(emitter, event, callback) {
    this.#offs.push(emitter.on(event, callback));
  }

  destroy() {
    this.#offs.forEach((off) => off());
    this.#offs = [];
  }

  $(selector) { return this.el.querySelector(selector); }
  $$(selector) { return [...this.el.querySelectorAll(selector)]; }

  // ----- form helpers shared by the login / register screens -----
  clearFormErrors() {
    this.$$('.field').forEach((f) => {
      f.classList.remove('invalid');
      f.querySelector('input')?.removeAttribute('aria-invalid');
      f.querySelector('.field-error').textContent = '';
    });
    const box = this.$('.form-error');
    if (box) { box.textContent = ''; box.hidden = true; }
  }

  // errors = { fieldName: message }. Anything without a visible field goes to the form-level box.
  showFormErrors(message, errors = {}) {
    this.clearFormErrors();
    let shownOnField = false;
    let focus = null;
    for (const [name, text] of Object.entries(errors)) {
      const f = this.$(`.field[data-field="${name}"]`);
      if (!f) continue;
      f.classList.add('invalid');
      f.querySelector('input').setAttribute('aria-invalid', 'true');
      f.querySelector('.field-error').textContent = text;
      shownOnField = true;
      focus ||= f.querySelector('input');
    }
    if (!shownOnField) {
      const box = this.$('.form-error');
      box.textContent = message;
      box.hidden = false;
    }
    focus?.focus();
  }

  setBusy(button, busy, idleText, busyText) {
    button.disabled = busy;
    button.textContent = busy ? busyText : idleText;
  }

  selectedRole() {
    return this.$('input[name="role"]:checked')?.value;
  }

  bindSocialButtons(toast, verb) {
    this.$$('.social-btn').forEach((b) =>
      b.addEventListener('click', () => toast(`${verb} with ${b.title} is coming soon`)));
  }
}
