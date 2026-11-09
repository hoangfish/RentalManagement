import { BaseView } from './BaseView.js';
import { ROUTES, ROLES, APP_NAME } from '../../Common/constant.js';
import { roleSelector, socialButtons, authFooter, field } from './components/authParts.js';
import { icons } from './components/icons.js';
import { toast } from './components/toast.js';

const MODES = {
  email: { type: 'email', placeholder: 'Email', autocomplete: 'username', inputmode: 'email' },
  phone: { type: 'tel', placeholder: 'Phone number', autocomplete: 'tel', inputmode: 'tel' },
};

export class LoginView extends BaseView {
  title = `Sign in – ${APP_NAME}`;
  #mode = 'email';

  render() {
    const role = this.params.role === ROLES.LANDLORD ? ROLES.LANDLORD : ROLES.TENANT;
    return `
      <main class="auth-page">
        <a class="back-link" href="#${ROUTES.INTRO}">${icons.arrowLeft(16)} Back to home</a>
        <section class="auth-card" aria-labelledby="login-title">
          <h2 id="login-title" class="auth-title center">Sign in to your account</h2>

          <form id="login-form" novalidate>
            ${roleSelector(role)}

            <div class="tabs" role="tablist" aria-label="Sign in with">
              <button type="button" role="tab" class="tab active" data-mode="email" aria-selected="true">Email</button>
              <button type="button" role="tab" class="tab" data-mode="phone" aria-selected="false">Phone number</button>
            </div>

            ${field({ name: 'emailOrPhone', type: 'email', label: 'Email', autocomplete: 'username', inputmode: 'email' })}
            ${field({ name: 'password', type: 'password', label: 'Password', autocomplete: 'current-password' })}

            <p class="form-error" role="alert" hidden></p>
            <button type="submit" class="btn btn-primary btn-block">Sign in</button>
          </form>

          ${socialButtons('Sign in')}
          <a class="link-strong" href="#${ROUTES.REGISTER}">Register</a>
          ${authFooter()}
        </section>
      </main>`;
  }

  onMount() {
    const { userController, router } = this.ctx;
    const form = this.$('#login-form');
    const submit = this.$('button[type="submit"]');
    const input = this.$('input[name="emailOrPhone"]');

    this.$$('.tab').forEach((tab) => tab.addEventListener('click', () => this.#setMode(tab.dataset.mode)));
    this.bindSocialButtons(toast, 'Signing in');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.clearFormErrors();
      this.setBusy(submit, true, 'Sign in', 'Signing in…');
      userController.loginUser(input.value, form.elements.password.value, this.selectedRole());
    });

    this.listen(userController, 'loginSuccess', () => router.navigate(ROUTES.HOME));
    this.listen(userController, 'loginFailed', (message, errors) => {
      this.setBusy(submit, false, 'Sign in', 'Signing in…');
      this.showFormErrors(message, errors);
    });
  }

  #setMode(mode) {
    if (mode === this.#mode) return;
    this.#mode = mode;
    const cfg = MODES[mode];
    this.$$('.tab').forEach((t) => {
      const active = t.dataset.mode === mode;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', String(active));
    });
    const input = this.$('input[name="emailOrPhone"]');
    input.type = cfg.type;
    input.placeholder = cfg.placeholder;
    input.setAttribute('aria-label', cfg.placeholder);
    input.autocomplete = cfg.autocomplete;
    input.inputMode = cfg.inputmode;
    input.value = '';
    this.clearFormErrors();
    input.focus();
  }
}
