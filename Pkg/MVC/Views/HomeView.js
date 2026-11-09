import { BaseView } from './BaseView.js';
import { ROUTES, ROLES, APP_NAME } from '../../Common/constant.js';
import { SocketClient } from '../../Protocols/SocketIO/socketclient.js';
import { escapeHtml } from './components/dom.js';
import { icons } from './components/icons.js';

// Placeholder for the signed-in area. The tenant search page and the landlord
// "post a room" page will replace the content of this screen later.
export class HomeView extends BaseView {
  title = `Home – ${APP_NAME}`;

  render() {
    const user = this.ctx.userController.getUserModel();
    const isTenant = user.role === ROLES.TENANT;
    return `
      <div class="app-shell">
        <header class="app-bar">
          <span class="app-bar-title">${APP_NAME} – ${isTenant ? 'Find a room' : 'Your listings'}</span>
          <div class="app-bar-right">
            <span class="live" id="live" title="Realtime connection"><i></i><span>Offline</span></span>
            <button type="button" class="btn btn-light btn-sm" id="logout-btn">Log out</button>
            <div class="avatar" title="${escapeHtml(user.fullName)}">${escapeHtml(user.initials)}</div>
          </div>
        </header>
        <main class="app-body">
          <section class="card welcome">
            <h1>Welcome, ${escapeHtml(user.firstName)}!</h1>
            <p class="muted">You are signed in as ${isTenant ? 'a tenant looking for a room' : 'a landlord'} (${escapeHtml(user.email)}).</p>
            <p>${icons.cube(18)} ${isTenant
              ? 'Next up: search rooms by address, radius, price and minimum area, then open the 3D preview.'
              : 'Next up: post your rooms with the owner name, address, size and photos.'}</p>
          </section>
        </main>
      </div>`;
  }

  onMount() {
    const { userController, router } = this.ctx;
    const socket = SocketClient.getInstance();

    const paintStatus = (status) => {
      const live = this.$('#live');
      live.classList.toggle('on', status === 'connected');
      live.querySelector('span').textContent = status === 'connected' ? 'Live' : 'Offline';
    };
    paintStatus(socket.status);
    this.listen(socket, 'statusChanged', paintStatus);

    this.$('#logout-btn').addEventListener('click', () => userController.logoutUser());
    this.listen(userController, 'logoutSuccess', () => router.navigate(ROUTES.LOGIN));
  }
}
