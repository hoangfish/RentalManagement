import { BaseView } from './BaseView.js';
import { ROUTES, ROLES, APP_NAME } from '../../Common/constant.js';
import { PASSWORD_MIN_LENGTH } from '../../Common/validators.js';
import { roleSelector, socialButtons, authFooter, field } from './components/authParts.js';
import { icons } from './components/icons.js';
import { toast } from './components/toast.js';

export class RegisterView extends BaseView {
  title = `Register – ${APP_NAME}`;

  render() {
    const role = this.params.role === ROLES.LANDLORD ? ROLES.LANDLORD : ROLES.TENANT;
    return `
      <main class="auth-page">
        <section class="auth-card wide" aria-labelledby="register-title">
          <div class="auth-head">
            <h2 id="register-title" class="auth-title">Register</h2>
            <button type="button" class="icon-btn" id="close-btn" aria-label="Close">${icons.close(26)}</button>
          </div>

          <form id="register-form" novalidate>
            ${roleSelector(role)}

            <div class="field-row">
              ${field({ name: 'firstName', label: 'First name', autocomplete: 'given-name' })}
              ${field({ name: 'lastName', label: 'Last name', autocomplete: 'family-name' })}
            </div>
            ${field({ name: 'phone', type: 'tel', label: 'Phone number', autocomplete: 'tel', inputmode: 'tel' })}
            ${field({ name: 'email', type: 'email', label: 'Email', autocomplete: 'email', inputmode: 'email' })}
            ${field({ name: 'password', type: 'password', label: `Password (min. ${PASSWORD_MIN_LENGTH} characters)`, autocomplete: 'new-password' })}

            <p class="form-error" role="alert" hidden></p>
            <button type="submit" class="btn btn-primary btn-block">Register</button>
          </form>

          ${socialButtons('Register')}
          <p class="switch-auth">Already have an account? <a class="link-strong inline" href="#${ROUTES.LOGIN}">Sign in</a></p>
          ${authFooter()}
        </section>
      </main>`;
  }

  onMount() {
    const { userController, router } = this.ctx;
    const form = this.$('#register-form');
    const submit = this.$('button[type="submit"]');

    this.$('#close-btn').addEventListener('click', () => router.back());
    this.bindSocialButtons(toast, 'Registering');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.clearFormErrors();
      this.setBusy(submit, true, 'Register', 'Creating account…');
      const f = form.elements;
      userController.registerUser({
        firstName: f.firstName.value,
        lastName: f.lastName.value,
        phone: f.phone.value,
        email: f.email.value,
        password: f.password.value,
        role: this.selectedRole(),
      });
    });

    this.listen(userController, 'registerSuccess', () => {
      toast('Account created. Welcome!');
      router.navigate(ROUTES.HOME);
    });
    this.listen(userController, 'registerFailed', (message, errors) => {
      this.setBusy(submit, false, 'Register', 'Creating account…');
      this.showFormErrors(message, errors);
    });
  }
}
