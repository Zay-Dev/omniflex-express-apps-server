// #swagger.file.tags = ['Users']
// #swagger.file.basePath = '/v1/users'

import * as Servers from '@/servers';
import { auth } from '@/middlewares/auth';

import { resolve } from '@omniflex/module-identity-core';
import { RequiredDbEntries } from '@omniflex/infra-express';

import { IdentityValidators } from '@omniflex/module-identity-express';
import { UserSessionValidators } from '@omniflex/module-user-session-express';

import { create } from './controller';
import { validateRefreshToken } from './refresh-token.validation';

const router = Servers.exposedRoute('/v1/users');

const appType = Servers.servers.exposed.type;

router
  .get('/my/profile',
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
      'profile'
    ),

    create(controller => controller.tryGetMyProfile()),
  )

  .post('/',
    // #swagger.jsonBody = required|components/schemas/moduleIdentity/registerWithEmail
    IdentityValidators.validateRegisterWithEmail,
    create(controller => controller.tryRegisterWithEmail(appType)),
  )

  .post('/access-tokens',
    // #swagger.jsonBody = required|components/schemas/moduleIdentity/loginWithEmail
    IdentityValidators.validateLoginWithEmail,
    create(controller => controller.tryLoginWithEmail(appType)),
  )

  .put('/access-tokens',
    // #swagger.jsonBody = required|components/schemas/moduleUserSession/refreshToken
    UserSessionValidators.validateRefreshToken,
    validateRefreshToken,
    create(controller => controller.tryRefreshToken()),
  )

  .delete('/access-tokens',
    // #swagger.security = [{"bearerAuth": []}]
    auth.requireExposed,
    create(controller => controller.tryLogout()),
  );