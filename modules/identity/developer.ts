// #swagger.file.tags = ['Users']
// #swagger.file.basePath = '/v1/users'

import * as Servers from '@/servers';
import { DbEntries } from '@omniflex/infra-express/validators';
//import { repositories } from '@omniflex/module-identity-postgres';
import { repositories } from '@omniflex/module-identity-mongoose';

import { BaseExpressController }
  from '@omniflex/infra-express/utils/base-controller';

const profiles = repositories.profiles.raw();

const router = Servers.developerRoute('/v1/users');

router
  .get('/:id',
    DbEntries.requiredById(
      repositories.users,
      (req) => req.params.id,
    ),
    (req, res, next) => {
      const controller = new BaseExpressController(req, res, next);

      controller.tryAction(() => {
        controller.respondRequired('_byId');
      });
    })

  .get('/',
    (req, res: any, next) => {
      const controller = new BaseExpressController(req, res, next);

      controller.tryAction(async function () {
        controller.respondMany(await profiles
          .find({
            isDeleted: false,
          })
        );
      });
    });