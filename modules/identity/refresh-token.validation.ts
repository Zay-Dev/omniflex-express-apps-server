import { jwtProvider } from '@/utils/jwt';
import { errors, Utils } from '@omniflex/core';
import { Request, Response, NextFunction } from 'express';

import { resolve } from '@omniflex/module-identity-core';
import { RequiredDbEntries } from '@omniflex/infra-express';

import { tryValidateBody } from '@omniflex/infra-express/helpers/joi';
import { schemas } from '@omniflex/module-user-session-core/joi.schemas';

import {
  TBodyRefreshToken,
  UserSessionService,
} from '@omniflex/module-user-session-core';

export const validateRefreshToken = [
  tryValidateBody(schemas.refreshToken),

  (req: Request, _: Response, next: NextFunction) => {
    Utils.tryAction(async () => {
      const { refreshToken } = req.body as TBodyRefreshToken;
      const { __type, __identifier } = await jwtProvider.verify(refreshToken);

      if (__type != 'refresh-token') {
        throw errors.unauthorized();
      }
      await UserSessionService.throwIfInvalidSession(__identifier);

      return next();
    }, { next });
  },

  RequiredDbEntries.byId(
    resolve().users,
    async (req) => {
      const { id } = await jwtProvider.decode(req.body.refreshToken);

      return id;
    },
    'user',
  ),
];