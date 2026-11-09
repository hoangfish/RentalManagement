// Small inline SVG icon set (stroke icons, 24x24 grid).
const svg = (body, size = 20) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const icons = {
  mail: (s) => svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', s),
  close: (s) => svg('<path d="M6 6l12 12M18 6 6 18"/>', s),
  pin: (s) => svg('<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>', s),
  cube: (s) => svg('<path d="M12 3 3 7.5v9L12 21l9-4.5v-9L12 3z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>', s),
  home: (s) => svg('<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>', s),
  chat: (s) => svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z"/>', s),
  arrowLeft: (s) => svg('<path d="M19 12H5M11 6l-6 6 6 6"/>', s),
};
