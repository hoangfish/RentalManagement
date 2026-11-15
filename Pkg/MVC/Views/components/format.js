import { ROOM_STATUS } from '../../../Common/constant.js';

export const formatMoney = (n) => Number(n).toLocaleString('en-US');

export const STATUS_LABEL = Object.freeze({
  [ROOM_STATUS.ACTIVE]: 'Visible',
  [ROOM_STATUS.HIDDEN]: 'Hidden',
  [ROOM_STATUS.RENTED]: 'Rented',
  [ROOM_STATUS.DRAFT]: 'Draft',
});

// 0.8 -> "0.8 km", 0.04 -> "50 m"
export const formatDistance = (km) => (km < 0.1 ? `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m` : `${(Math.round(km * 10) / 10).toFixed(1)} km`);
