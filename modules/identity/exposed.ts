// #swagger.file.tags = ['Users']
// #swagger.file.basePath = '/v1/users'

import * as Servers from '@/servers';
import { create } from './controller';
import { auth } from '@/middlewares/auth';

import { DbEntries } from '@omniflex/infra-express/validators';
import { repositories } from '@omniflex/module-identity-postgres';

import * as Validators
  from '@omniflex/module-identity-express/register.validation';

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
  );