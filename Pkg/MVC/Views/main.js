// Counterpart of main.qml + main.cpp: creates the controllers, registers the screens, starts the app.
import { ROUTES, ROLES } from '../../Common/constant.js';
import { UserController } from '../Controller/UserController.js';
import { RoomController } from '../Controller/RoomController.js';
import { SearchController } from '../Controller/SearchController.js';
import { Router } from './Router.js';
import { IntroView } from './IntroView.js';
import { LoginView } from './LoginView.js';
import { RegisterView } from './RegisterView.js';
import { SearchView } from './SearchView.js';
import { MyRoomsView } from './MyRoomsView.js';
import { RoomFormView } from './RoomFormView.js';
import { LOG, LogLevel } from '../../Utils/Logger/logger.js';

async function bootstrap() {
  LOG(LogLevel.INFO, 'Start app', 'main');

  const userController = UserController.getInstance();
  const roomController = RoomController.getInstance();
  const searchController = SearchController.getInstance();
  userController.on('logoutSuccess', () => { roomController.clear(); searchController.clear(); }); // never show one user's data to the next
  const router = new Router(document.getElementById('app'), { userController });

  router
    .add(ROUTES.INTRO, IntroView)
    .add(ROUTES.LOGIN, LoginView, 'guest')
    .add(ROUTES.REGISTER, RegisterView, 'guest')
    .add(ROUTES.HOME, SearchView, ROLES.TENANT)
    .add(ROUTES.MY_ROOMS, MyRoomsView, ROLES.LANDLORD)
    .add(ROUTES.ROOM_NEW, RoomFormView, ROLES.LANDLORD)
    .add(ROUTES.ROOM_EDIT, RoomFormView, ROLES.LANDLORD);

  await userController.restoreSession(); // so a refresh keeps you signed in
  router.start();
}

bootstrap();
