// #swagger.file.tags = ['Users']
// #swagger.file.basePath = '/v1/users'

import * as Servers from '@/servers';
import { resolve } from '@omniflex/module-identity-core';

import {
  ExpressUtils,
  RequiredDbEntries,
} from '@omniflex/infra-express';

const router = Servers.developerRoute('/v1/users');

router
  .get('/:id',
    RequiredDbEntries.byPathId(resolve().users, 'user'),
    ExpressUtils.tryAction(async (_, res) => {
      return ExpressUtils.respondRequired(res, res.locals, 'user');
    }))

  .get('/',
    ExpressUtils.tryAction(async (_, res) => {
      const users = await resolve().users.find(
        {
          deletedAt: null,
          //{ identifier: 'null' },
        },
        {
          populate: 'profile',
          select: '-createdAt -updatedAt -isDeleted',
        },
      );

      return ExpressUtils.respondMany(res, users);
    }, true),
  );