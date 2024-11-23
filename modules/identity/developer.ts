// #swagger.file.tags = ['Users']
// #swagger.file.basePath = '/v1/users'

import * as Servers from '@/servers';
import { DbEntries } from '@omniflex/infra-express/validators';
import { repositories as postgresRepositories } from '@omniflex/module-identity-postgres';
//import { repositories as mongooseRepositories } from '@omniflex/module-identity-mongoose';

import { BaseExpressController }
  from '@omniflex/infra-express/utils/base-controller';

const postgresProfiles = postgresRepositories.profiles.raw();
//const mongooseProfiles = mongooseRepositories.profiles.raw();

const router = Servers.developerRoute('/v1/users');

router
  .get('/:id',
    DbEntries.requiredById(
      postgresRepositories.users,
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
        controller.respondMany(await postgresProfiles //mongooseProfiles
          .find({
            where: {
              isDeleted: false,
            },
          })
        );
      });
    });