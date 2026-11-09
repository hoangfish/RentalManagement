import { ROLES, APP_NAME } from '../../../Common/constant.js';
import { icons } from './icons.js';

// "I want to:  (•) Rent a room   ( ) Rent out a room"
export function roleSelector(selected = ROLES.TENANT) {
  const radio = (value, label) => `
    <label class="radio">
      <input type="radio" name="role" value="${value}" ${selected === value ? 'checked' : ''}>
      <span>${label}</span>
    </label>`;
  return `
    <fieldset class="role">
      <legend>I want to</legend>
      <div class="role-options">
        ${radio(ROLES.TENANT, 'Rent a room')}
        ${radio(ROLES.LANDLORD, 'Rent out a room')}
      </div>
    </fieldset>`;
}

export function socialButtons(verb) {
  const btn = (id, label, content) =>
    `<button type="button" class="social-btn" data-social="${id}" aria-label="${verb} with ${label}" title="${label}">${content}</button>`;
  return `
    <p class="divider">or ${verb.toLowerCase()} with</p>
    <div class="social">
      ${btn('email', 'Email link', `<span class="social-mail">${icons.mail(20)}</span>`)}
      ${btn('google', 'Google', 'G')}
      ${btn('facebook', 'Facebook', 'f')}
      ${btn('zalo', 'Zalo', 'Z')}
    </div>`;
}

export const authFooter = () => `<div class="auth-footer">© ${APP_NAME}</div>`;

// Text input with an error line underneath. `name` links it to validation errors.
export function field({ name, type = 'text', label, autocomplete = 'off', inputmode = '' }) {
  return `
    <div class="field" data-field="${name}">
      <input id="f-${name}" name="${name}" type="${type}" placeholder="${label}" aria-label="${label}"
             autocomplete="${autocomplete}" ${inputmode ? `inputmode="${inputmode}"` : ''} aria-describedby="e-${name}">
      <p class="field-error" id="e-${name}" role="alert"></p>
    </div>`;
}
