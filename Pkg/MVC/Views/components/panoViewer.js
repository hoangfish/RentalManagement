// A small 360° photo viewer. The photo (an "equirectangular" picture, twice as wide as it is tall)
// is wrapped on the inside of a sphere and the camera sits in the middle, so the tenant can look
// around like standing in the room.
//
//   const viewer = mountPanoViewer(hostElement, { url, label });
//   viewer.setUrl(otherUrl)   // switch to another spot (used later when several 360° photos are linked)
//   viewer.destroy();         // always call this when the host goes away (frees the GPU memory)
//
// Controls: drag / swipe to look around, wheel or pinch to zoom, arrow keys to turn, + / - to zoom, Home to reset.
// Three.js (Pkg/Vendor/three) is only downloaded when the first viewer is opened.
import { icons } from './icons.js';
import { escapeHtml } from './dom.js';

const THREE_URL = new URL('../../../Vendor/three/three.module.min.js', import.meta.url).href;
let threePromise = null;
const loadThree = () => {
  threePromise ||= import(THREE_URL).catch((err) => { threePromise = null; throw err; });
  return threePromise;
};

const FOV_DEFAULT = 75;
const FOV_MIN = 30;
const FOV_MAX = 100;
const LAT_LIMIT = 85;
const AUTO_SPEED = 6;            // degrees per second
const START_LON = 180;           // the middle of the photo faces the viewer at the start

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const touchDevice = () => window.matchMedia?.('(pointer: coarse)').matches;

export function mountPanoViewer(host, { url, label = '' } = {}) {
  let destroyed = false;
  let currentUrl = url;
  let session = null; // everything that belongs to the photo being shown (see start())

  host.classList.add('pano');
  host.innerHTML = `
    <canvas class="pano-canvas" tabindex="0"
      aria-label="360° view${label ? ` of ${escapeHtml(label)}` : ''}. Drag to look around, scroll to zoom, use the arrow keys to turn."></canvas>
    <div class="pano-state" role="status" aria-live="polite">
      <div class="pano-spinner" aria-hidden="true"></div>
      <p class="pano-msg">Loading 360° photo…</p>
      <div class="pano-bar" aria-hidden="true"><span></span></div>
      <button type="button" class="btn btn-light btn-sm pano-retry" hidden>Try again</button>
    </div>
    <div class="pano-hint" hidden>${icons.panorama(16)} Drag to look around</div>
    <div class="pano-tools" role="toolbar" aria-label="3D view controls" hidden>
      <button type="button" data-tool="in" aria-label="Zoom in" title="Zoom in">${icons.plus(18)}</button>
      <button type="button" data-tool="out" aria-label="Zoom out" title="Zoom out">${icons.minus(18)}</button>
      <button type="button" data-tool="auto" aria-label="Auto-rotate" aria-pressed="false" title="Auto-rotate">${icons.rotate(18)}</button>
      <button type="button" data-tool="reset" aria-label="Reset view" title="Reset view">${icons.reset(18)}</button>
      <button type="button" data-tool="full" aria-label="Full screen" title="Full screen" hidden>${icons.expand(18)}</button>
    </div>`;

  const $ = (s) => host.querySelector(s);
  let canvas = $('.pano-canvas');
  const stateBox = $('.pano-state');
  const msg = $('.pano-msg');
  const bar = $('.pano-bar span');
  const retry = $('.pano-retry');
  const hint = $('.pano-hint');
  const tools = $('.pano-tools');
  const autoBtn = $('[data-tool="auto"]');
  const fullBtn = $('[data-tool="full"]');
  const fullTarget = host.closest('.tour') || host;
  if (fullTarget.requestFullscreen) fullBtn.hidden = false;

  // ---------- state shown over the picture ----------
  const showLoading = (text = 'Loading 360° photo…') => {
    stateBox.hidden = false;
    stateBox.classList.remove('error');
    msg.textContent = text;
    bar.style.width = '0%';
    $('.pano-bar').hidden = false;
    $('.pano-spinner').hidden = false;
    retry.hidden = true;
    tools.hidden = true;
    hint.hidden = true;
  };
  const showError = (text) => {
    stateBox.hidden = false;
    stateBox.classList.add('error');
    msg.textContent = text;
    $('.pano-bar').hidden = true;
    $('.pano-spinner').hidden = true;
    retry.hidden = false;
    tools.hidden = true;
  };
  const showReady = () => {
    stateBox.hidden = true;
    tools.hidden = false;
    hint.hidden = false;
    setTimeout(() => { hint.hidden = true; }, 3500);
  };

  // ---------- loading the picture ----------
  async function downloadPhoto(src, signal, onProgress) {
    const res = await fetch(src, { signal });
    if (!res.ok) throw new Error('The 360° photo could not be loaded');
    const total = Number(res.headers.get('content-length')) || 0;
    if (!res.body || !total) return res.blob();
    const reader = res.body.getReader();
    const chunks = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      onProgress(got / total);
    }
    return new Blob(chunks, { type: res.headers.get('content-type') || '' });
  }

  async function decodePhoto(blob) {
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = objectUrl;
      await img.decode();
      return img;
    } catch {
      throw new Error('This 360° photo could not be displayed');
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  // ---------- one photo = one session (so switching photos / destroying never leaves anything behind) ----------
  async function start(src) {
    stop();
    if (!src) return showError('There is no 360° photo to show');
    showLoading();
    const abort = new AbortController();
    const mine = { abort, dispose: () => {} };
    session = mine;
    try {
      const THREE = await loadThree();
      if (session !== mine) return;
      const blob = await downloadPhoto(src, abort.signal, (p) => { bar.style.width = `${Math.round(p * 100)}%`; });
      if (session !== mine) return;
      msg.textContent = 'Preparing 3D view…';
      bar.style.width = '100%';
      const image = await decodePhoto(blob);
      if (session !== mine) return;
      mine.dispose = build(THREE, image);
      showReady();
    } catch (err) {
      if (session !== mine || err?.name === 'AbortError') return;
      console.error('360° viewer:', err);
      showError(err.message || 'Something went wrong while opening the 360° photo');
    }
  }

  function stop() {
    if (!session) return;
    session.abort.abort();
    session.dispose();
    session = null;
  }

  // Creates the WebGL scene for a decoded picture. Returns a function that frees everything again.
  function build(THREE, image) {
    // A fresh canvas every time: a canvas whose WebGL context was lost or released cannot be reused.
    const fresh = canvas.cloneNode(false);
    canvas.replaceWith(fresh);
    canvas = fresh;
    const view = fresh;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: view, antialias: true, powerPreference: 'high-performance' });
    } catch {
      throw new Error('Your browser cannot show 3D views (WebGL is turned off or not supported)');
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // Very large pictures are shrunk to what this device can really hold (phones: 4096 px wide).
    const limit = Math.min(renderer.capabilities.maxTextureSize, touchDevice() ? 4096 : 8192);
    let source = image;
    if (image.naturalWidth > limit) {
      const c = document.createElement('canvas');
      c.width = limit;
      c.height = Math.round(limit / 2);
      c.getContext('2d').drawImage(image, 0, 0, c.width, c.height);
      source = c;
    }

    const texture = new THREE.Texture(source);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    texture.needsUpdate = true;
    const geometry = new THREE.SphereGeometry(500, 80, 50);
    geometry.scale(-1, 1, 1); // look at the inside of the sphere
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(geometry, material));
    const camera = new THREE.PerspectiveCamera(FOV_DEFAULT, 1, 0.1, 1100);

    // --- view state ---
    let lon = START_LON;
    let lat = 0;
    let fov = FOV_DEFAULT;
    let fovTarget = FOV_DEFAULT;
    let velLon = 0;
    let velLat = 0;
    let auto = !reducedMotion();
    let dragging = false;
    let raf = 0;
    let last = 0;
    let lost = false;
    const pointers = new Map();
    let pinchStart = 0;
    let pinchFov = 0;
    let lastMove = 0;

    const paintAuto = () => { autoBtn.setAttribute('aria-pressed', String(auto)); autoBtn.classList.toggle('on', auto); };
    paintAuto();

    const render = () => {
      const phi = THREE.MathUtils.degToRad(90 - lat);
      const theta = THREE.MathUtils.degToRad(lon);
      camera.lookAt(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
      renderer.render(scene, camera);
    };

    const tick = (now) => {
      raf = 0;
      if (destroyed || lost) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      let moving = dragging;

      if (!dragging) {
        if (Math.abs(velLon) > 0.05 || Math.abs(velLat) > 0.05) {
          lon += velLon * dt;
          lat += velLat * dt;
          const decay = Math.pow(0.02, dt); // inertia fades out in about a second
          velLon *= decay;
          velLat *= decay;
          moving = true;
        } else if (auto) {
          lon += AUTO_SPEED * dt;
          moving = true;
        }
      }
      if (Math.abs(fovTarget - fov) > 0.05) {
        fov += (fovTarget - fov) * (1 - Math.pow(0.0005, dt));
        camera.fov = fov;
        camera.updateProjectionMatrix();
        moving = true;
      }
      lat = clamp(lat, -LAT_LIMIT, LAT_LIMIT);
      lon = ((lon % 360) + 360) % 360;
      render();
      if (moving) request();
    };
    const request = () => { if (!raf && !destroyed && !lost) raf = requestAnimationFrame(tick); };

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      request();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const stopAuto = () => { if (auto) { auto = false; paintAuto(); } };
    const setZoom = (delta) => { fovTarget = clamp(fovTarget + delta, FOV_MIN, FOV_MAX); request(); };
    const reset = () => { lon = START_LON; lat = 0; fovTarget = FOV_DEFAULT; velLon = velLat = 0; request(); };

    // --- pointer: drag to look, pinch to zoom ---
    const degPerPixel = () => camera.fov / Math.max(1, host.clientHeight);
    const onDown = (e) => {
      view.setPointerCapture?.(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      stopAuto();
      hint.hidden = true;
      velLon = velLat = 0;
      if (pointers.size === 1) { dragging = true; view.classList.add('grabbing'); }
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
        pinchFov = fovTarget;
        dragging = false;
      }
      request();
    };
    const onMove = (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (pointers.size === 1 && dragging) {
        const k = degPerPixel();
        lon -= dx * k;
        lat += dy * k;
        // smoothed speed (degrees / second) so a flick keeps turning for a moment
        const dt = Math.max(0.008, (e.timeStamp - (p.t ?? e.timeStamp - 16)) / 1000);
        p.t = e.timeStamp;
        lastMove = e.timeStamp;
        velLon = velLon * 0.6 + (-dx * k / dt) * 0.4;
        velLat = velLat * 0.6 + (dy * k / dt) * 0.4;
        request();
      } else if (pointers.size === 2 && pinchStart) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        fovTarget = clamp(pinchFov * (pinchStart / dist), FOV_MIN, FOV_MAX);
        request();
      }
    };
    const onUp = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStart = 0;
      if (pointers.size === 0) {
        dragging = false;
        view.classList.remove('grabbing');
        if (e.timeStamp - lastMove > 100) velLon = velLat = 0; // held still before letting go: no flick
      } else if (pointers.size === 1) {
        dragging = true; // one finger of a pinch is still down: keep dragging from where it is
        velLon = velLat = 0;
      }
      request();
    };
    const onWheel = (e) => {
      e.preventDefault();
      stopAuto();
      setZoom(clamp(e.deltaY, -100, 100) * 0.05);
    };
    const onKey = (e) => {
      const step = 6;
      const handled = {
        ArrowLeft: () => { lon -= step; },
        ArrowRight: () => { lon += step; },
        ArrowUp: () => { lat += step; },
        ArrowDown: () => { lat -= step; },
        '+': () => setZoom(-8), '=': () => setZoom(-8),
        '-': () => setZoom(8), _: () => setZoom(8),
        Home: reset,
      }[e.key];
      if (!handled) return;
      e.preventDefault();
      stopAuto();
      handled();
      request();
    };
    const onToolClick = (e) => {
      const btn = e.target.closest('button[data-tool]');
      if (!btn) return;
      const tool = btn.dataset.tool;
      if (tool === 'in') setZoom(-10);
      else if (tool === 'out') setZoom(10);
      else if (tool === 'reset') reset();
      else if (tool === 'auto') { auto = !auto; velLon = velLat = 0; paintAuto(); request(); }
      else if (tool === 'full') {
        if (document.fullscreenElement) document.exitFullscreen?.();
        else fullTarget.requestFullscreen?.().catch(() => {});
      }
      if (tool !== 'auto') stopAuto();
    };

    // The browser can take the GPU away (many tabs, phone locked): say so instead of showing a frozen picture.
    const onLost = (e) => { e.preventDefault(); lost = true; showError('The 3D view was interrupted. Please try again'); };

    view.addEventListener('pointerdown', onDown);
    view.addEventListener('pointermove', onMove);
    view.addEventListener('pointerup', onUp);
    view.addEventListener('pointercancel', onUp);
    view.addEventListener('wheel', onWheel, { passive: false });
    view.addEventListener('keydown', onKey);
    view.addEventListener('webglcontextlost', onLost);
    tools.addEventListener('click', onToolClick);

    resize();
    request();

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      observer.disconnect();
      view.removeEventListener('pointerdown', onDown);
      view.removeEventListener('pointermove', onMove);
      view.removeEventListener('pointerup', onUp);
      view.removeEventListener('pointercancel', onUp);
      view.removeEventListener('wheel', onWheel);
      view.removeEventListener('keydown', onKey);
      view.removeEventListener('webglcontextlost', onLost);
      tools.removeEventListener('click', onToolClick);
      texture.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }

  retry.addEventListener('click', () => start(currentUrl)); // start() stops the old session and builds on a fresh canvas

  start(currentUrl);

  return {
    setUrl(next) { currentUrl = next; start(next); },
    destroy() {
      destroyed = true;
      stop();
      host.classList.remove('pano');
      host.replaceChildren();
    },
  };
}
