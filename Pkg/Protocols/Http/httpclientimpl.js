import { HttpClient } from './httpclient.js';

const TIMEOUT_MS = 15000;

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
  sendDeleteRequest(url) { return this.#request('DELETE', url); }

  // Always resolves with the server's JSON ({ success, message, data, ... }).
  // Network problems resolve with { success: false, networkError: true, message }.
  async #request(method, url, body) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = this.#tokenProvider();
    if (token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
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
