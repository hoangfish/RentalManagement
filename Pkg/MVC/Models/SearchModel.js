import { Emitter } from '../../Common/signal.js';

// The tenant's latest search: where they searched from and which rooms matched.
// Emits 'changed' whenever new results arrive.
export class SearchModel extends Emitter {
  #results = [];
  #center = null;      // { lat, lng, label, approximate } of the searched address, or null
  #radiusKm = 3;
  #total = 0;          // matches on the server (results holds at most the nearest 100)
  #loaded = false;

  get results() { return this.#results; }
  get center() { return this.#center; }
  get radiusKm() { return this.#radiusKm; }
  get total() { return this.#total; }
  get loaded() { return this.#loaded; }

  setResults({ results = [], center = null, radiusKm = 3, total = 0 } = {}) {
    this.#results = results;
    this.#center = center;
    this.#radiusKm = radiusKm;
    this.#total = total;
    this.#loaded = true;
    this.emit('changed');
  }

  find(id) { return this.#results.find((r) => r.id === id) || null; }

  clear() { this.setResults(); this.#loaded = false; }
}
