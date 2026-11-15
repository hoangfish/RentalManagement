import { Emitter } from '../../Common/signal.js';
import { ROOM_STATUS } from '../../Common/constant.js';

// Holds the landlord's rooms. Emits 'changed' whenever the list is replaced or one room is updated.
export class RoomModel extends Emitter {
  #rooms = [];
  #loaded = false;

  get rooms() { return this.#rooms; }
  get loaded() { return this.#loaded; }

  get activeCount() { return this.#rooms.filter((r) => r.status === ROOM_STATUS.ACTIVE).length; }
  get views3d() { return this.#rooms.reduce((sum, r) => sum + (r.views3d || 0), 0); }

  setRooms(rooms = []) {
    this.#rooms = rooms;
    this.#loaded = true;
    this.emit('changed');
  }

  // Insert or replace one room (after a save / status change); newest first.
  upsert(room) {
    const i = this.#rooms.findIndex((r) => r.id === room.id);
    if (i >= 0) this.#rooms[i] = room; else this.#rooms.unshift(room);
    this.emit('changed');
  }

  find(id) { return this.#rooms.find((r) => r.id === id) || null; }

  clear() {
    this.#rooms = [];
    this.#loaded = false;
    this.emit('changed');
  }
}
