// Map panel: Leaflet (bundled in Pkg/Vendor/leaflet) + OpenStreetMap tiles. No API key needed.
import { escapeHtml } from './dom.js';
import { formatMoney } from './format.js';
import { MAP_TILE_SOURCES } from '../../../Common/constant.js';

const DEFAULT_CENTER = [10.7769, 106.7009]; // Ho Chi Minh City
const FAIL_AFTER = 4; // this many tiles failing with none loaded = the source is unreachable

let leafletPromise = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  leafletPromise ||= new Promise((resolve, reject) => {
    const base = new URL('../../../Vendor/leaflet/', import.meta.url);
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = new URL('leaflet.css', base).href;
    document.head.appendChild(css);
    const script = document.createElement('script');
    script.src = new URL('leaflet.js', base).href;
    script.onload = () => (window.L ? resolve(window.L) : reject(new Error('Leaflet did not start')));
    script.onerror = () => { leafletPromise = null; reject(new Error('Leaflet could not be loaded')); };
    document.head.appendChild(script);
  });
  return leafletPromise;
}

const pin = (cls) => `<span class="pin ${cls}"></span>`;

export class RoomMap {
  #el; #onSelect; #L = null; #map = null; #layer = null;
  #markers = new Map();  // roomId -> marker
  #pending = null;       // data given before Leaflet finished loading
  #selected = null;
  #destroyed = false;
  #tiles = null;
  #sourceIndex = 0;
  #notice = null;

  constructor(el, { onSelect = () => {} } = {}) {
    this.#el = el;
    this.#onSelect = onSelect;
  }

  async init() {
    try {
      this.#L = await loadLeaflet();
    } catch {
      if (!this.#destroyed) this.#el.innerHTML = '<p class="map-fallback">The map could not be loaded. Check your internet connection and reload the page.</p>';
      return;
    }
    if (this.#destroyed) return;
    const L = this.#L;
    this.#map = L.map(this.#el).setView(DEFAULT_CENTER, 12);
    // Open credit links in a new tab (by default "Leaflet" would replace the whole app page)
    this.#map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    this.#notice = document.createElement('div');
    this.#notice.className = 'map-notice';
    this.#notice.hidden = true;
    this.#el.parentElement?.appendChild(this.#notice);
    this.#addTiles(0);
    this.#layer = L.layerGroup().addTo(this.#map);
    if (this.#pending) { const data = this.#pending; this.#pending = null; this.setData(data); }
    setTimeout(() => this.#map?.invalidateSize(), 0);
  }

  #addTiles(index) {
    const L = this.#L;
    const source = MAP_TILE_SOURCES[index];
    this.#sourceIndex = index;
    const layer = L.tileLayer(source.url, { maxZoom: 19, attribution: source.attribution, subdomains: source.subdomains || 'abc' });
    let loaded = 0;
    let failed = 0;
    layer.on('tileload', () => { loaded++; if (this.#notice) this.#notice.hidden = true; });
    layer.on('tileerror', () => { if (!loaded && ++failed === FAIL_AFTER) this.#tilesUnreachable(); });
    layer.addTo(this.#map);
    this.#tiles = layer;
  }

  // The current source is not answering: move on to the next one, or tell the user.
  #tilesUnreachable() {
    if (this.#destroyed || !this.#map) return;
    if (this.#sourceIndex + 1 < MAP_TILE_SOURCES.length) {
      this.#tiles.remove();
      this.#addTiles(this.#sourceIndex + 1);
      return;
    }
    this.#notice.textContent = 'The map pictures cannot be loaded. This computer may be blocking the map servers, or the connection is down. Your results still work.';
    this.#notice.hidden = false;
  }

  icon(cls) {
    return this.#L.divIcon({ className: 'pin-wrap', html: pin(cls), iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -12] });
  }

  // center: { lat, lng } | null,  radiusKm,  rooms: public room objects (those with a location get a pin)
  setData({ center, radiusKm, rooms }) {
    if (!this.#map) { this.#pending = { center, radiusKm, rooms }; return; }
    const L = this.#L;
    this.#layer.clearLayers();
    this.#markers.clear();
    this.#selected = null;

    const points = [];
    let circle = null;
    if (center) {
      circle = L.circle([center.lat, center.lng], { radius: radiusKm * 1000, color: '#b71c1c', weight: 1, fillOpacity: 0.05 }).addTo(this.#layer);
      L.marker([center.lat, center.lng], { icon: this.icon('you'), title: 'Your address', keyboard: false }).addTo(this.#layer);
      points.push([center.lat, center.lng]);
    }
    for (const room of rooms) {
      if (!room.location) continue;
      const at = [room.location.lat, room.location.lng];
      const marker = L.marker(at, { icon: this.icon(''), title: room.title })
        .bindPopup(`<strong>${escapeHtml(room.title)}</strong><br>${formatMoney(room.price)} đ/month`)
        .on('click', () => { this.#highlight(room.id); this.#onSelect(room.id); })
        .addTo(this.#layer);
      this.#markers.set(room.id, marker);
      points.push(at);
    }

    if (circle) this.#map.fitBounds(circle.getBounds(), { padding: [20, 20], maxZoom: 16 });
    else if (points.length > 1) this.#map.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
    else if (points.length === 1) this.#map.setView(points[0], 15);
    else this.#map.setView(DEFAULT_CENTER, 12);
  }

  #highlight(id) {
    if (this.#selected && this.#markers.has(this.#selected)) this.#markers.get(this.#selected).setIcon(this.icon(''));
    this.#selected = this.#markers.has(id) ? id : null;
    if (this.#selected) this.#markers.get(id).setIcon(this.icon('on'));
  }

  // Called when a card in the list is chosen
  select(id) {
    if (!this.#map) return;
    this.#highlight(id);
    const marker = this.#markers.get(id);
    if (!marker) return;
    this.#map.panTo(marker.getLatLng());
    marker.openPopup();
  }

  destroy() {
    this.#destroyed = true;
    this.#notice?.remove();
    this.#map?.remove();
    this.#map = null;
  }
}
