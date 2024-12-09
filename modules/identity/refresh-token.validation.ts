import { errors } from '@omniflex/core';
import { jwtProvider } from '@/utils/jwt';
import { Request, Response, NextFunction } from 'express';

import { resolve } from '@omniflex/module-identity-core';
import { RequiredDbEntries } from '@omniflex/infra-express';
import { UserSessionService } from '@omniflex/module-user-session-core/services/user-session.service';

export const validateRefreshToken = [
  async (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken } = req.body;

    try {
      const decoded = await jwtProvider.verify(refreshToken);

      if (decoded.__type !== 'refresh-token') {
        return next(errors.unauthorized());
      }

      return next();
    } catch (error) {
      return next(errors.unauthorized());
    }
  },
  async (req, _, next) => {
    const { __identifier } = await jwtProvider.decode(req.body.refreshToken);

    try {
      await UserSessionService.throwIfInvalidSession(__identifier);
    } catch (error) {
      return next(error);
    }

    return next();
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