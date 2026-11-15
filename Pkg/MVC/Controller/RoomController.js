import { Emitter } from '../../Common/signal.js';
import { URL_ROOMS, URL_MY_ROOMS, ROOM_STATUS } from '../../Common/constant.js';
import { validateRoom, firstError } from '../../Common/validators.js';
import { HttpClientImpl } from '../../Protocols/Http/httpclientimpl.js';
import { LOG, LogLevel } from '../../Utils/Logger/logger.js';
import { RoomModel } from '../Models/RoomModel.js';

const TAG = 'RoomController';

// Landlord side. Signals:
//   roomsLoaded(model)            roomsLoadFailed(message)
//   roomLoaded(room)              roomLoadFailed(message)
//   roomSaved(room, message, warning)   roomSaveFailed(message, fieldErrors)
//   statusChanged(room)           statusChangeFailed(message)
export class RoomController extends Emitter {
  static #instance = null;
  static getInstance() {
    if (!RoomController.#instance) RoomController.#instance = new RoomController();
    return RoomController.#instance;
  }

  constructor() {
    super();
    this.http = HttpClientImpl.getInstance();
    this.roomModel = new RoomModel();
  }

  getRoomModel() { return this.roomModel; }

  async loadMyRooms() {
    const response = await this.http.sendGetRequest(URL_MY_ROOMS);
    if (response.success) {
      this.roomModel.setRooms(response.data.rooms);
      this.emit('roomsLoaded', this.roomModel);
    } else {
      LOG(LogLevel.ERROR, `Load rooms failed: ${response.message}`, TAG);
      this.emit('roomsLoadFailed', response.message);
    }
  }

  // For the edit form (always fetched fresh from the server)
  async loadRoom(id) {
    const response = await this.http.sendGetRequest(`${URL_ROOMS}/${encodeURIComponent(id)}`);
    if (response.success) this.emit('roomLoaded', response.data.room);
    else this.emit('roomLoadFailed', response.message);
  }

  // fields: { ownerName, title, address, area, price, maxPeople, description }
  // amenities: string[]
  // photos: in the order chosen by the landlord:
  //   { kind: 'existing', id }            – already on the server
  //   { kind: 'new', blob, name }         – picked just now
  // intent: 'draft' | 'publish' | 'save'
  // requireAll: true when the room must be complete (publishing, or editing a room that is already posted)
  async saveRoom({ id = null, intent, requireAll, fields, amenities, photos }) {
    const errors = validateRoom(fields, { publish: requireAll, photoCount: photos.length });
    if (Object.keys(errors).length) {
      this.emit('roomSaveFailed', firstError(errors), errors);
      return;
    }

    const form = new FormData();
    form.append('intent', intent);
    for (const [key, value] of Object.entries(fields)) form.append(key, String(value ?? '').trim());
    form.append('amenities', JSON.stringify(amenities));
    form.append('photoOrder', JSON.stringify(photos.map((p) => (p.kind === 'existing' ? p.id : 'new'))));
    for (const p of photos) if (p.kind === 'new') form.append('photos', p.blob, p.name);

    const response = id
      ? await this.http.sendFormRequest('PATCH', `${URL_ROOMS}/${encodeURIComponent(id)}`, form)
      : await this.http.sendFormRequest('POST', URL_ROOMS, form);

    if (response.success) {
      LOG(LogLevel.INFO, `Room saved (${intent})`, TAG);
      this.roomModel.upsert(response.data.room);
      this.emit('roomSaved', response.data.room, response.message, response.warning || null);
    } else {
      LOG(LogLevel.ERROR, `Save room failed: ${response.message}`, TAG);
      this.emit('roomSaveFailed', response.message, response.errors || {});
    }
  }

  // status: 'active' (show) | 'hidden' | 'rented'
  async setStatus(id, status) {
    if (![ROOM_STATUS.ACTIVE, ROOM_STATUS.HIDDEN, ROOM_STATUS.RENTED].includes(status)) return;
    const response = await this.http.sendPatchRequest(`${URL_ROOMS}/${encodeURIComponent(id)}/status`, { status });
    if (response.success) {
      this.roomModel.upsert(response.data.room);
      this.emit('statusChanged', response.data.room);
    } else {
      this.emit('statusChangeFailed', response.message);
    }
  }

  clear() { this.roomModel.clear(); }
}
