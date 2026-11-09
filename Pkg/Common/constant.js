// Counterpart of Pkg/Common/constant.h in the hotel project.
export const APP_NAME = 'Roommate Finder';

export const URL_SERVER_BACKEND = 'http://localhost:3000';
export const URL_SERVER_SOCKET = 'http://localhost:3001';

export const URL_USER_REGISTER = `${URL_SERVER_BACKEND}/api/v1/users/register`;
export const URL_USER_LOGIN = `${URL_SERVER_BACKEND}/api/v1/users/login`;
export const URL_USER_LOGOUT = `${URL_SERVER_BACKEND}/api/v1/users/logout`;
export const URL_USER_ME = `${URL_SERVER_BACKEND}/api/v1/users/me`;

export const ROLES = Object.freeze({
  TENANT: 'tenant',     // "Rent a room"
  LANDLORD: 'landlord', // "Rent out a room"
});

export const ROUTES = Object.freeze({
  INTRO: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  HOME: '/home',
});

export const STORAGE_KEYS = Object.freeze({ TOKEN: 'rf.token' });
