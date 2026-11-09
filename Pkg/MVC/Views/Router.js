import { ROUTES } from '../../Common/constant.js';

// Counterpart of the StackView in main.qml: hash-based routing, e.g. index.html#/login
//   guard 'guest' -> only for signed-out users (login / register)
//   guard 'auth'  -> only for signed-in users
export class Router {
  #routes = new Map();
  #current = null;
  #currentPath = null;

  constructor(outlet, ctx) {
    this.outlet = outlet;
    this.ctx = { ...ctx, router: this };
    this.previousPath = null;
  }

  add(path, View, guard = null) {
    this.#routes.set(path, { View, guard });
    return this;
  }

  start() {
    window.addEventListener('hashchange', () => this.#resolve());
    this.#resolve();
  }

  navigate(path, params) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    const target = `#${path}${query}`;
    if (window.location.hash === target) this.#resolve();
    else window.location.hash = target;
  }

  // Close-style navigation: go back where we came from, or to the intro page.
  back() {
    this.navigate(this.previousPath || ROUTES.INTRO);
  }

  #redirect(path) {
    // replace() so the Back button does not bounce the user into the guard again
    window.location.replace(`${window.location.pathname}${window.location.search}#${path}`);
  }

  #parse() {
    const raw = window.location.hash.replace(/^#/, '') || '/';
    const [path, query = ''] = raw.split('?');
    return { path, params: Object.fromEntries(new URLSearchParams(query)) };
  }

  #resolve() {
    const { path, params } = this.#parse();
    const route = this.#routes.get(path);
    if (!route) return this.#redirect(ROUTES.INTRO);

    const loggedIn = this.ctx.userController.isLoggedIn();
    if (route.guard === 'auth' && !loggedIn) return this.#redirect(ROUTES.LOGIN);
    if (route.guard === 'guest' && loggedIn) return this.#redirect(ROUTES.HOME);

    this.#current?.destroy();
    this.previousPath = this.#currentPath;
    this.#currentPath = path;
    this.#current = new route.View(this.ctx, params);
    this.#current.mount(this.outlet);
    window.scrollTo(0, 0);
  }
}
