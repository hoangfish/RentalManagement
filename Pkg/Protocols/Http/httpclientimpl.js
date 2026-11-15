import { HttpClient } from './httpclient.js';

const TIMEOUT_MS = 15000;
const UPLOAD_TIMEOUT_MS = 120000; // photo uploads can be slow on mobile data

export class HttpClientImpl extends HttpClient {
  static #instance = null;
  #tokenProvider = () => null;

  static getInstance() {
    if (!HttpClientImpl.#instance) HttpClientImpl.#instance = new HttpClientImpl();
    return HttpClientImpl.#instance;
  }

  // The controller registers a function that returns the current login token.
  setTokenProvider(fn) { this.#tokenProvider = fn; }

  sendGetRequest(url) { return this.#request('GET', url); }
  sendPostRequest(url, json = {}) { return this.#request('POST', url, json); }
  sendPutRequest(url, json = {}) { return this.#request('PUT', url, json); }
  sendPatchRequest(url, json = {}) { return this.#request('PATCH', url, json); }
  sendDeleteRequest(url) { return this.#request('DELETE', url); }

  // File upload. The browser sets the multipart Content-Type (with its boundary) by itself.
  sendFormRequest(method, url, formData) { return this.#request(method, url, formData, UPLOAD_TIMEOUT_MS); }

  // Always resolves with the server's JSON ({ success, message, data, errors, ... }).
  // Network problems resolve with { success: false, networkError: true, message }.
  async #request(method, url, body, timeoutMs = TIMEOUT_MS) {
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    const headers = { Accept: 'application/json' };
    if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
    const token = this.#tokenProvider();
    if (token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
        signal: controller.signal,
      });
      let data = null;
      try { data = await response.json(); } catch { /* not JSON */ }
      return data ?? { success: false, message: `Unexpected server response (${response.status})` };
    } catch (err) {
      const timedOut = err?.name === 'AbortError';
      return {
        success: false,
        networkError: true,
        message: timedOut
          ? 'The server took too long to respond. Please try again.'
          : 'Cannot reach the server. Please check your connection and try again.',
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
