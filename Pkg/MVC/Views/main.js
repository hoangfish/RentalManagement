// Counterpart of main.qml + main.cpp: creates the controllers, registers the screens, starts the app.
import { ROUTES } from '../../Common/constant.js';
import { UserController } from '../Controller/UserController.js';
import { Router } from './Router.js';
import { IntroView } from './IntroView.js';
import { LoginView } from './LoginView.js';
import { RegisterView } from './RegisterView.js';
import { HomeView } from './HomeView.js';
import { LOG, LogLevel } from '../../Utils/Logger/logger.js';

async function bootstrap() {
  LOG(LogLevel.INFO, 'Start app', 'main');

  const userController = UserController.getInstance();
  const router = new Router(document.getElementById('app'), { userController });

  router
    .add(ROUTES.INTRO, IntroView)
    .add(ROUTES.LOGIN, LoginView, 'guest')
    .add(ROUTES.REGISTER, RegisterView, 'guest')
    .add(ROUTES.HOME, HomeView, 'auth');

  await userController.restoreSession(); // so a refresh keeps you signed in
  router.start();
}

bootstrap();
