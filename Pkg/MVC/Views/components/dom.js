const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Always escape user-provided text before putting it into innerHTML.
export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
