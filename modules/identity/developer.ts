// #swagger.file.tags = ['Users']
// #swagger.file.basePath = '/v1/users'

import * as Servers from '@/servers';
import { resolve } from '@omniflex/module-identity-core';
import { DbEntries } from '@omniflex/infra-express/validators';
import { BaseExpressController } from '@omniflex/infra-express';

const router = Servers.developerRoute('/v1/users');

router
  .get('/:id',
    DbEntries.requiredById(
      resolve().users,
      (req) => req.params.id,
      'user',
    ),
    (req, res, next) => {
      const controller = new BaseExpressController(req, res, next);

      controller.tryAction(() => {
        controller.respondRequired('user');
      });
    })

  .get('/',
    (req, res: any, next) => {
      const controller = new BaseExpressController(req, res, next);

      controller.tryAction(async function () {
        const users = await resolve().profiles.find(
          {
            isDeleted: { $ne: true },
            //user: { identifier: 'null' },
          },
          {
            populate: 'user',
            select: '-createdAt -updatedAt -isDeleted',
          },
        );

        controller.respondMany(users);
      });
    }
  );