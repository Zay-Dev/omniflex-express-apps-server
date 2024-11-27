// #swagger.file.tags = ['Users']
// #swagger.file.basePath = '/v1/users'

import * as Servers from '@/servers';
import { create } from './controller';
import { auth } from '@/middlewares/auth';

import { resolve } from '@omniflex/module-identity-core';
import { DbEntries } from '@omniflex/infra-express/validators';
import { UserSessionService } from '@omniflex/module-user-session-core/services/user-session.service';

import * as Validators
  from '@omniflex/module-identity-express/register.validation';
import * as UserSessionValidators
  from '@omniflex/module-user-session-express/session.validation';

import { validateRefreshToken } from './refresh-token.validation';
import { jwtProvider } from '@/utils/jwt';

const repositories = resolve();
const router = Servers.exposedRoute('/v1/users');

const appType = Servers.servers.exposed.type;

router
  .get('/my/profile',
    // #swagger.security = [{"bearerAuth": []}]
    auth.requireExposed,

    DbEntries.requiredById(
      repositories.users,
      (req, res, next) => res.locals.user.id,
      true,
    ),
    DbEntries.requiredFirstMatch(
      repositories.profiles,
      (_, res) => ({ userId: res.locals.user.id }),
      'profile'
    ),

    create(controller => controller.tryGetMyProfile()),
  )

  .post('/',
    // #swagger.jsonBody = required|components/schemas/moduleIdentity/registerWithEmail
    Validators.validateRegisterWithEmail,

    create(controller => controller.tryRegisterWithEmail(appType)),
  )

  .post('/access-tokens',
    // #swagger.jsonBody = required|components/schemas/moduleIdentity/loginWithEmail
    Validators.validateLoginWithEmail,

    create(controller => controller.tryLoginWithEmail(appType)),
  )

  .put('/access-tokens',
    // #swagger.jsonBody = required|components/schemas/moduleUserSession/refreshToken
    UserSessionValidators.validateRefreshToken,
    validateRefreshToken,
    async (req, _, next) => {
      const { __identifier } = await jwtProvider.decode(req.body.refreshToken);

      try {
        await UserSessionService.throwIfInvalidSession(__identifier);
      } catch (error) {
        return next(error);
      }

      return next();
    },

    DbEntries.requiredById(
      repositories.users,
      async (req) => {
        const { id } = await jwtProvider.decode(req.body.refreshToken);

        return id;
      },
      'user'
    ),

    create(controller => controller.tryRefreshToken()),
  )

  .delete('/access-tokens',
    // #swagger.security = [{"bearerAuth": []}]
    auth.requireExposed,

    create(controller => controller.tryLogout()),
  );