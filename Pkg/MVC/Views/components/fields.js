// Underlined text field with a small label and an error line (works with BaseView.showFormErrors).
export const textField = ({ name, label, placeholder = '', inputmode = '', textarea = false, maxlength = '' }) => `
  <div class="field labeled" data-field="${name}">
    <label for="f-${name}">${label}</label>
    ${textarea
      ? `<textarea id="f-${name}" name="${name}" rows="3" placeholder="${placeholder}" maxlength="${maxlength}" aria-describedby="e-${name}"></textarea>`
      : `<input id="f-${name}" name="${name}" type="text" placeholder="${placeholder}" autocomplete="off"
               ${inputmode ? `inputmode="${inputmode}"` : ''} ${maxlength ? `maxlength="${maxlength}"` : ''} aria-describedby="e-${name}">`}
    <p class="field-error" id="e-${name}" role="alert"></p>
  </div>`;
