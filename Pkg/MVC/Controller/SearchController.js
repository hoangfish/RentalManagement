import { Emitter } from '../../Common/signal.js';
import { URL_ROOMS, URL_ROOMS_SEARCH, DEFAULT_RADIUS_KM } from '../../Common/constant.js';
import { validateSearch, parsePriceRange, parseArea, firstError } from '../../Common/validators.js';
import { HttpClientImpl } from '../../Protocols/Http/httpclientimpl.js';
import { LOG, LogLevel } from '../../Utils/Logger/logger.js';
import { SearchModel } from '../Models/SearchModel.js';

const TAG = 'SearchController';

// Tenant side. Signals:
//   searchStarted()                 searchDone(model)          searchFailed(message, fieldErrors)
//   contactLoaded(roomId, contact)  contactFailed(roomId, message)
export class SearchController extends Emitter {
  static #instance = null;
  static getInstance() {
    if (!SearchController.#instance) SearchController.#instance = new SearchController();
    return SearchController.#instance;
  }

  #seq = 0; // only the newest search may update the screen

  constructor() {
    super();
    this.http = HttpClientImpl.getInstance();
    this.searchModel = new SearchModel();
  }

  getSearchModel() { return this.searchModel; }

  // form: { address, radiusKm, price, minArea, nearby: string[] }  (raw text from the form)
  async search(form) {
    const errors = validateSearch(form);
    if (Object.keys(errors).length) {
      this.emit('searchFailed', firstError(errors), errors);
      return;
    }

    const range = parsePriceRange(form.price);
    const radius = String(form.radiusKm ?? '').trim();
    const params = new URLSearchParams();
    const address = String(form.address ?? '').trim();
    if (address) params.set('address', address);
    params.set('radiusKm', String(radius === '' ? DEFAULT_RADIUS_KM : parseArea(radius)));
    if (range.min !== null) params.set('minPrice', String(range.min));
    if (range.max !== null) params.set('maxPrice', String(range.max));
    if (String(form.minArea ?? '').trim() !== '') params.set('minArea', String(parseArea(form.minArea)));
    if (form.nearby?.length) params.set('nearby', form.nearby.join(','));

    const seq = ++this.#seq;
    this.emit('searchStarted');
    const response = await this.http.sendGetRequest(`${URL_ROOMS_SEARCH}?${params}`);
    if (seq !== this.#seq) return; // a newer search is already running

    if (response.success) {
      this.searchModel.setResults(response.data);
      this.emit('searchDone', this.searchModel);
    } else {
      LOG(LogLevel.ERROR, `Search failed: ${response.message}`, TAG);
      this.emit('searchFailed', response.message, response.errors || {});
    }
  }

  // Counts a "View 3D" open (shown to the landlord). Best effort: never bothers the tenant.
  async recordView3d(roomId) {
    await this.http.sendPostRequest(`${URL_ROOMS}/${encodeURIComponent(roomId)}/view3d`, {});
  }

  async loadContact(roomId) {
    const response = await this.http.sendGetRequest(`${URL_ROOMS}/${encodeURIComponent(roomId)}/contact`);
    if (response.success) this.emit('contactLoaded', roomId, response.data);
    else this.emit('contactFailed', roomId, response.message);
  }

  clear() { this.#seq++; this.searchModel.clear(); }
}
