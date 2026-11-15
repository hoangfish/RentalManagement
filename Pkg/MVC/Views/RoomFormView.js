import { BaseView } from './BaseView.js';
import {
  ROUTES, ROOM_STATUS, APP_NAME, AMENITIES, MIN_PHOTOS, MAX_PHOTOS, PANORAMA_LABEL_MAX, assetUrl,
} from '../../Common/constant.js';
import { RoomController } from '../Controller/RoomController.js';
import { appBar, wireAppBar } from './components/appBar.js';
import { escapeHtml } from './components/dom.js';
import { prepareImage, preparePanorama } from './components/imageTools.js';
import { openTourDialog } from './components/tourDialog.js';
import { toast } from './components/toast.js';
import { icons } from './components/icons.js';
import { textField } from './components/fields.js';


// Landlord: post a new room (#/rooms/new) or edit one (#/rooms/edit?id=...).
export class RoomFormView extends BaseView {
  title = `Post a room – ${APP_NAME}`;
  #roomId = null;
  #room = null;           // the room being edited (null when posting a new one)
  #items = [];            // photos in order: { key, kind: 'existing'|'new', id?, blob?, name?, url }
  #amenities = new Set();
  #seq = 0;
  #ready = true;
  #busy = false;
  #photoError = '';
  #photoNote = '';
  #pano = null;           // the 360° photo: { kind: 'existing', id, url } | { kind: 'new', blob, name, url, width, height }
  #panoLabel = '';
  #panoError = '';
  #panoNote = '';
  #tour = null;

  constructor(ctx, params) {
    super(ctx, params);
    this.#roomId = params.id || null;
    this.#ready = !this.#roomId;
    if (this.#roomId) this.title = `Edit room – ${APP_NAME}`;
  }

  get editing() { return Boolean(this.#roomId); }
  // Posted rooms must stay complete; drafts may be saved half-filled.
  get isDraft() { return !this.editing || this.#room?.status === ROOM_STATUS.DRAFT; }

  render() {
    const user = this.ctx.userController.getUserModel();
    const chips = AMENITIES.map((a) =>
      `<button type="button" class="chip" data-amenity="${escapeHtml(a)}" aria-pressed="false">${escapeHtml(a)}</button>`).join('');
    return `
      <div class="app-shell">
        ${appBar({ title: `${APP_NAME} – Landlord`, user })}
        <main class="app-body wide">
          <a class="back-inline" href="#${ROUTES.MY_ROOMS}">${icons.arrowLeft(16)} My rooms</a>
          <div class="page-head"><h2>${this.editing ? 'Edit room' : 'Post a room'}</h2></div>

          <div class="card empty" id="load-state" ${this.editing ? '' : 'hidden'}>
            <p class="muted" id="load-message">Loading room…</p>
            <a class="btn btn-outline" id="load-back" href="#${ROUTES.MY_ROOMS}" hidden>Back to my rooms</a>
          </div>

          <form class="room-form" id="room-form" novalidate ${this.editing ? 'hidden' : ''}>
            <section class="card form-card">
              <h3>Room information</h3>
              ${textField({ name: 'ownerName', label: 'Owner name', placeholder: 'e.g. Nguyen Van A', maxlength: 80 })}
              ${textField({ name: 'title', label: 'Room name / title', placeholder: 'e.g. Studio near the market', maxlength: 100 })}
              ${textField({ name: 'address', label: 'Address', placeholder: 'House no., street, ward, district, city', maxlength: 200 })}
              <div class="field-row three">
                ${textField({ name: 'area', label: 'Area (m²)', placeholder: '28', inputmode: 'decimal', maxlength: 7 })}
                ${textField({ name: 'price', label: 'Rent (đ/month)', placeholder: '4,500,000', inputmode: 'numeric', maxlength: 13 })}
                ${textField({ name: 'maxPeople', label: 'Max people', placeholder: '2', inputmode: 'numeric', maxlength: 2 })}
              </div>
              ${textField({ name: 'description', label: 'Description', placeholder: 'Furniture, opening hours, electricity and water…', textarea: true, maxlength: 2000 })}
              <p class="label-sm">Amenities</p>
              <div class="chips" id="amenities">${chips}</div>
            </section>

            <div class="form-col">
            <section class="card photos-card pano-card">
              <h3>3D view – 360° photo <span class="optional">optional</span></h3>
              <p class="muted small">Tenants can look all around your room in 3D from one 360° photo. Stand in the middle of the room
                and shoot with a 360° camera or a 360° photo app. The photo must be a flat “equirectangular” picture, twice as wide as it is tall (2:1).</p>
              <div id="pano-slot"></div>
              <input type="file" id="pano-input" accept="image/jpeg,image/png,image/webp" hidden>
              <div class="photo-status" id="pano-status" role="status" hidden></div>
            </section>

            <section class="card photos-card">
              <h3>Room photos</h3>
              <p class="muted small">Add clear photos of the room. The first photo is the cover tenants see in the search results.</p>
              <div class="photo-grid" id="photo-grid"></div>
              <input type="file" id="photo-input" accept="image/jpeg,image/png,image/webp" multiple hidden>
              <div class="photo-status" id="photo-status" role="status"></div>
              <div class="form-error" hidden></div>
              <div class="form-actions" id="actions"></div>
            </section>
            </div>
          </form>
        </main>
      </div>`;
  }

  onMount() {
    wireAppBar(this);
    const rooms = RoomController.getInstance();
    const { router, userController } = this.ctx;

    if (this.editing) {
      this.listen(rooms, 'roomLoaded', (room) => this.fill(room));
      this.listen(rooms, 'roomLoadFailed', (message) => {
        this.$('#load-message').textContent = message;
        this.$('#load-back').hidden = false;
      });
      rooms.loadRoom(this.#roomId);
    } else {
      this.$('[name="ownerName"]').value = userController.getUserModel().fullName;
    }

    this.listen(rooms, 'roomSaved', (room, message, warning) => {
      toast(warning ? `${message}. ${warning}` : message, warning ? 8000 : 2600);
      router.navigate(ROUTES.MY_ROOMS);
    });
    this.listen(rooms, 'roomSaveFailed', (message, errors) => { this.setBusy2(false); this.showErrors(message, errors); });

    this.$('#amenities').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const name = chip.dataset.amenity;
      if (this.#amenities.has(name)) this.#amenities.delete(name); else this.#amenities.add(name);
      this.paintAmenities();
    });

    const price = this.$('[name="price"]');
    price.addEventListener('input', () => this.formatPriceInput(price));
    const area = this.$('[name="area"]');
    area.addEventListener('input', () => { area.value = area.value.replace(/[^\d.,]/g, ''); });
    const people = this.$('[name="maxPeople"]');
    people.addEventListener('input', () => { people.value = people.value.replace(/\D/g, ''); });

    const input = this.$('#photo-input');
    input.addEventListener('change', () => { this.addFiles(input.files); input.value = ''; });
    const grid = this.$('#photo-grid');
    grid.addEventListener('click', (e) => this.onGridClick(e, input));
    grid.addEventListener('dragover', (e) => { e.preventDefault(); grid.classList.add('drop'); });
    grid.addEventListener('dragleave', () => grid.classList.remove('drop'));
    grid.addEventListener('drop', (e) => {
      e.preventDefault();
      grid.classList.remove('drop');
      if (e.dataTransfer?.files?.length) this.addFiles(e.dataTransfer.files);
    });

    const panoInput = this.$('#pano-input');
    panoInput.addEventListener('change', () => { this.setPanorama(panoInput.files[0]); panoInput.value = ''; });
    const slot = this.$('#pano-slot');
    slot.addEventListener('click', (e) => {
      const action = e.target.closest('[data-pano]')?.dataset.pano;
      if (action === 'pick') panoInput.click();
      else if (action === 'remove') { this.revokePano(); this.#pano = null; this.#panoLabel = ''; this.#panoError = ''; this.paintPano(); }
      else if (action === 'preview') this.previewPano();
    });
    slot.addEventListener('input', (e) => { if (e.target.matches('[name="panoLabel"]')) this.#panoLabel = e.target.value; });
    slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('drop'); });
    slot.addEventListener('dragleave', () => slot.classList.remove('drop'));
    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      slot.classList.remove('drop');
      if (e.dataTransfer?.files?.[0]) this.setPanorama(e.dataTransfer.files[0]);
    });

    this.$('#room-form').addEventListener('submit', (e) => { e.preventDefault(); this.submit(this.isDraft ? 'publish' : 'save'); });
    this.$('#actions').addEventListener('click', (e) => {
      const button = e.target.closest('button[data-intent]');
      if (button) this.submit(button.dataset.intent);
    });

    this.paintAmenities();
    this.paintPhotos();
    this.paintPano();
    this.paintActions();
  }

  destroy() {
    super.destroy();
    this.#tour?.close();
    this.#items.forEach((item) => this.revoke(item));
    this.revokePano();
  }

  // ---------- filling / reading the form ----------

  fill(room) {
    this.#room = room;
    this.#ready = true;
    this.title = `Edit room – ${APP_NAME}`;
    for (const name of ['ownerName', 'title', 'address', 'description']) this.$(`[name="${name}"]`).value = room[name] ?? '';
    this.$('[name="area"]').value = room.area ?? '';
    this.$('[name="price"]').value = room.price ? Number(room.price).toLocaleString('en-US') : '';
    this.$('[name="maxPeople"]').value = room.maxPeople ?? '';
    this.#amenities = new Set(room.amenities);
    this.#items = room.photos.map((p) => ({ key: `k${this.#seq++}`, kind: 'existing', id: p.id, url: assetUrl(p.url) }));
    const pano = room.panoramas?.[0];
    this.#pano = pano ? { kind: 'existing', id: pano.id, url: assetUrl(pano.url) } : null;
    this.#panoLabel = pano?.label ?? '';
    this.$('#load-state').hidden = true;
    this.$('#room-form').hidden = false;
    this.paintAmenities();
    this.paintPhotos();
    this.paintPano();
    this.paintActions();
  }

  readFields() {
    const value = (name) => this.$(`[name="${name}"]`).value;
    return {
      ownerName: value('ownerName'), title: value('title'), address: value('address'),
      area: value('area'), price: value('price'), maxPeople: value('maxPeople'), description: value('description'),
    };
  }

  // 4500000 -> "4,500,000" while typing, keeping the cursor next to the same digit
  formatPriceInput(el) {
    const digitsBefore = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, '').length;
    const digits = el.value.replace(/\D/g, '').slice(0, 10);
    el.value = digits ? Number(digits).toLocaleString('en-US') : '';
    let pos = 0;
    for (let seen = 0; pos < el.value.length && seen < digitsBefore; pos++) if (/\d/.test(el.value[pos])) seen++;
    el.setSelectionRange?.(pos, pos);
  }

  // ---------- amenities ----------

  paintAmenities() {
    this.$$('#amenities .chip').forEach((chip) => {
      const on = this.#amenities.has(chip.dataset.amenity);
      chip.classList.toggle('on', on);
      chip.setAttribute('aria-pressed', String(on));
    });
  }

  // ---------- photos ----------

  revoke(item) {
    if (item.kind === 'new') URL.revokeObjectURL?.(item.url);
  }

  async addFiles(fileList) {
    const files = [...fileList];
    if (!files.length) return;
    this.#photoError = '';
    const space = MAX_PHOTOS - this.#items.length;
    const accepted = files.slice(0, Math.max(space, 0));
    const problems = [];
    if (files.length > accepted.length) problems.push(`Only ${MAX_PHOTOS} photos are allowed – ${files.length - accepted.length} skipped`);

    this.#photoNote = 'Processing photos…';
    this.paintPhotos();
    for (const file of accepted) {
      try {
        const blob = await prepareImage(file);
        this.#items.push({
          key: `k${this.#seq++}`, kind: 'new', blob, name: blob.name || file.name, url: URL.createObjectURL(blob),
        });
      } catch (err) {
        problems.push(`${file.name}: ${err.message}`);
      }
    }
    this.#photoNote = '';
    this.#photoError = problems.join('. ');
    this.paintPhotos();
  }

  onGridClick(event, input) {
    if (event.target.closest('[data-add]')) { input.click(); return; }
    const button = event.target.closest('button[data-op]');
    if (!button) return;
    const i = this.#items.findIndex((it) => it.key === button.dataset.key);
    if (i < 0) return;
    this.#photoError = '';
    const op = button.dataset.op;
    if (op === 'remove') {
      this.revoke(this.#items[i]);
      this.#items.splice(i, 1);
    } else {
      const j = op === 'left' ? i - 1 : i + 1;
      if (j >= 0 && j < this.#items.length) [this.#items[i], this.#items[j]] = [this.#items[j], this.#items[i]];
    }
    this.paintPhotos();
  }

  paintPhotos() {
    const last = this.#items.length - 1;
    const tiles = this.#items.map((item, i) => `
      <div class="photo-tile">
        <img src="${escapeHtml(item.url)}" alt="Room photo ${i + 1}">
        <span class="photo-no">${i === 0 ? '1 • Cover' : i + 1}</span>
        <div class="photo-ctrl">
          <button type="button" data-op="left" data-key="${item.key}" aria-label="Move photo ${i + 1} earlier" ${i === 0 ? 'disabled' : ''}>‹</button>
          <button type="button" data-op="right" data-key="${item.key}" aria-label="Move photo ${i + 1} later" ${i === last ? 'disabled' : ''}>›</button>
          <button type="button" data-op="remove" data-key="${item.key}" aria-label="Remove photo ${i + 1}">${icons.close(14)}</button>
        </div>
      </div>`).join('');
    const full = this.#items.length >= MAX_PHOTOS;
    this.$('#photo-grid').innerHTML =
      `<button type="button" class="photo-add" data-add ${full ? 'disabled' : ''}>+ Add photo</button>${tiles}`;

    const n = this.#items.length;
    const status = this.$('#photo-status');
    status.className = 'photo-status';
    if (this.#photoError) {
      status.classList.add('error');
      status.textContent = this.#photoError;
    } else if (this.#photoNote) {
      status.textContent = this.#photoNote;
    } else if (n === 0) {
      status.classList.add('warn');
      status.textContent = `No photos yet • Add at least ${MIN_PHOTOS} photo to post the room`;
    } else {
      status.textContent = `${n} ${n === 1 ? 'photo' : 'photos'} ready`;
    }
  }

  // ---------- 360° photo ----------

  revokePano() {
    if (this.#pano?.kind === 'new') URL.revokeObjectURL?.(this.#pano.url);
  }

  async setPanorama(file) {
    if (!file) return;
    this.#panoError = '';
    this.#panoNote = 'Checking the 360° photo…';
    this.paintPano();
    try {
      const { blob, width, height } = await preparePanorama(file);
      this.revokePano();
      this.#pano = { kind: 'new', blob, name: blob.name || file.name, url: URL.createObjectURL(blob), width, height };
      if (!this.#panoLabel) this.#panoLabel = '';
    } catch (err) {
      this.#panoError = `${file.name}: ${err.message}`;
    }
    this.#panoNote = '';
    this.paintPano();
  }

  previewPano() {
    if (!this.#pano || this.#tour) return;
    this.#tour = openTourDialog({
      title: this.$('[name="title"]').value.trim() || 'Your room',
      panoramas: [{ url: this.#pano.url, label: this.#panoLabel.trim() }],
      onClose: () => { this.#tour = null; },
    });
  }

  paintPano() {
    const slot = this.$('#pano-slot');
    const status = this.$('#pano-status');
    if (!this.#pano) {
      slot.innerHTML = `<button type="button" class="photo-add pano-add" data-pano="pick">${icons.panorama(22)} Add 360° photo</button>`;
    } else {
      const size = this.#pano.width ? `${this.#pano.width}×${this.#pano.height}` : '';
      slot.innerHTML = `
        <div class="pano-picked">
          <div class="pano-thumb"><img src="${escapeHtml(this.#pano.url)}" alt="Flat preview of your 360° photo"><span class="photo-no">360°${size ? ` • ${size}` : ''}</span></div>
          <div class="pano-side">
            <label class="label-sm" for="pano-label">Name of this view (optional)</label>
            <input id="pano-label" name="panoLabel" class="pano-label" type="text" maxlength="${PANORAMA_LABEL_MAX}"
              placeholder="e.g. Living room" value="${escapeHtml(this.#panoLabel)}">
            <div class="pano-actions">
              <button type="button" class="btn btn-primary btn-sm" data-pano="preview">${icons.panorama(16)} Preview in 3D</button>
              <button type="button" class="btn btn-outline btn-sm" data-pano="pick">Replace</button>
              <button type="button" class="btn btn-ghost btn-sm" data-pano="remove">Remove</button>
            </div>
          </div>
        </div>`;
    }
    status.className = 'photo-status';
    status.hidden = !(this.#panoError || this.#panoNote);
    if (this.#panoError) { status.classList.add('error'); status.textContent = this.#panoError; }
    else status.textContent = this.#panoNote;
  }

  // ---------- buttons / saving ----------

  paintActions() {
    this.$('#actions').innerHTML = this.isDraft
      ? `<button type="button" class="btn btn-outline" data-intent="draft">Save draft</button>
         <button type="button" class="btn btn-primary" data-intent="publish">Post room</button>`
      : `<a class="btn btn-outline" href="#${ROUTES.MY_ROOMS}">Cancel</a>
         <button type="button" class="btn btn-primary" data-intent="save">Save changes</button>`;
  }

  setBusy2(busy, intent) {
    this.#busy = busy;
    this.$$('#actions button').forEach((button) => {
      const idle = { draft: 'Save draft', publish: 'Post room', save: 'Save changes' }[button.dataset.intent];
      this.setBusy(button, busy, idle, button.dataset.intent === intent ? 'Saving…' : idle);
    });
  }

  submit(intent) {
    if (this.#busy || !this.#ready) return;
    this.#photoError = '';
    this.#panoError = '';
    this.paintPhotos();
    this.paintPano();
    this.clearFormErrors();
    this.setBusy2(true, intent);
    RoomController.getInstance().saveRoom({
      id: this.#roomId,
      intent,
      requireAll: intent === 'publish' || !this.isDraft,
      fields: this.readFields(),
      amenities: [...this.#amenities],
      photos: this.#items.map((it) => (it.kind === 'existing'
        ? { kind: 'existing', id: it.id }
        : { kind: 'new', blob: it.blob, name: it.name })),
      panorama: !this.#pano ? null : this.#pano.kind === 'existing'
        ? { kind: 'existing', id: this.#pano.id, label: this.#panoLabel }
        : { kind: 'new', blob: this.#pano.blob, name: this.#pano.name, label: this.#panoLabel },
    });
  }

  showErrors(message, errors = {}) {
    const { photos: photoError, panoramas: panoError, ...fieldErrors } = errors;
    if (panoError) {
      this.#panoError = panoError;
      this.paintPano();
      this.clearFormErrors();
      if (Object.keys(fieldErrors).length) this.showFormErrors(message, fieldErrors);
      else this.$('#pano-status').scrollIntoView?.({ block: 'center' });
      return;
    }
    if (photoError) {
      this.#photoError = photoError;
      this.paintPhotos();
      this.clearFormErrors();
      if (Object.keys(fieldErrors).length) this.showFormErrors(message, fieldErrors);
      else this.$('#photo-status').scrollIntoView?.({ block: 'center' });
    } else {
      this.showFormErrors(message, fieldErrors);
    }
  }
}
