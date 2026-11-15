import { ROUTES, homeRouteFor } from '../../../Common/constant.js';
import { SocketClient } from '../../../Protocols/SocketIO/socketclient.js';
import { escapeHtml } from './dom.js';

// Red top bar shared by every signed-in screen: title, realtime status, log out, avatar.
export function appBar({ title, user }) {
  return `
    <header class="app-bar">
      <a class="app-bar-title" href="#${homeRouteFor(user.role)}">${escapeHtml(title)}</a>
      <div class="app-bar-right">
        <span class="live" id="live" title="Realtime connection"><i></i><span>Offline</span></span>
        <button type="button" class="btn btn-light btn-sm" id="logout-btn">Log out</button>
        <div class="avatar" title="${escapeHtml(user.fullName)}">${escapeHtml(user.initials)}</div>
      </div>
    </header>`;
}

// Call from onMount() of a view that rendered appBar().
export function wireAppBar(view) {
  const { userController, router } = view.ctx;
  const socket = SocketClient.getInstance();

  const paintStatus = (status) => {
    const live = view.$('#live');
    if (!live) return;
    live.classList.toggle('on', status === 'connected');
    live.querySelector('span').textContent = status === 'connected' ? 'Live' : 'Offline';
  };
  paintStatus(socket.status);
  view.listen(socket, 'statusChanged', paintStatus);

  view.$('#logout-btn').addEventListener('click', () => userController.logoutUser());
  view.listen(userController, 'logoutSuccess', () => router.navigate(ROUTES.LOGIN));
}
