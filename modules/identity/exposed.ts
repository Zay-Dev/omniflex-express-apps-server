// #swagger.file.tags = ['Users']
// #swagger.file.basePath = '/v1/users'

import * as Servers from '@/servers';
import { auth } from '@/middlewares/auth';

import { resolve } from '@omniflex/module-identity-core';
import { ExpressUtils, RequiredDbEntries } from '@omniflex/infra-express';

import { create } from './controller';
import { validateRefreshToken } from './refresh-token.validation';

import {
  validateLoginWithEmail,
  validateRegisterWithEmail,
} from '@omniflex/module-identity-express';

const router = Servers.exposedRoute('/v1/users');

const appType = Servers.servers.exposed.type;

router
  .get('/my/profile', // #swagger.summary = 'Get my profile'
    // #swagger.security = [{"bearerAuth": []}]
    auth.requireExposed,

    RequiredDbEntries.byId(
      resolve().users,
      (_, res) => res.locals.user.id,
      true,
    ),
    RequiredDbEntries.firstMatch(
      resolve().profiles,
      (_, res) => ({ userId: res.locals.user.id }),
      'profile',
    ),

    ExpressUtils.tryAction((_, res) => {
      ExpressUtils.respondRequired(res, res.locals, 'profile');
    }, true),
  )

  .post('/',  // #swagger.summary = 'Register a new user'
    // #swagger.jsonBody = required|components/schemas/moduleIdentity/registerWithEmail
    validateRegisterWithEmail,
    create(controller => controller.tryRegisterWithEmail(appType)),
  )

  .post('/access-tokens', // #swagger.summary = 'Login with email'
    // #swagger.jsonBody = required|components/schemas/moduleIdentity/loginWithEmail
    validateLoginWithEmail,
    create(controller => controller.tryLoginWithEmail(appType)),
  )

  .put('/access-tokens', // #swagger.summary = 'Refresh access token'
    // #swagger.jsonBody = required|components/schemas/moduleUserSession/refreshToken
    validateRefreshToken,
    create(controller => controller.tryRefreshToken()),
  )

  .delete('/access-tokens', // #swagger.summary = 'Logout'
    // #swagger.security = [{"bearerAuth": []}]
    auth.requireExposed,
    create(controller => controller.tryLogout()),
  );