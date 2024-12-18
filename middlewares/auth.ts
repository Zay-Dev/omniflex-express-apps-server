//import config from "@/config";
import { Response } from 'express';
import { errors, logger } from '@omniflex/core';

import { ServerType } from '@/servers';
import { jwtProvider } from "@/utils/jwt";
import { UserSessionService } from '@omniflex/module-user-session-core';

const jwt = jwtProvider;

const throwIfNotValidToken = async (identifier: string) => {
  await UserSessionService.throwIfInvalidSession(identifier);
};

const middleware = ({
  mode = false,
}: {
  mode?: boolean | ServerType;
} = {}) => {
  const optional = !mode;

  return async (req, res: Response, next) => {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!optional && !token) {
      return next(errors.unauthorized());
    }

    if (!token) return next();

    try {
      const {
        __type,
        __identifier,
        ...user
      } = (await jwt.verify(token)) ?? {};

      if (__type !== "access-token") {
        return next(errors.unauthorized());
      }

      res.locals.user = user;
      res.locals.accessToken = token;

      if (typeof mode != "boolean") {
        if (mode != user.__appType) {
          return next(errors.forbidden());
        }
      }

      await throwIfNotValidToken(__identifier);
      return next();
    } catch (error: any) {
      logger.error("Auth", { error });
      return next(errors.unauthorized());
    }

    return next(errors.custom("Unexpected Error"));
  };
};

export const auth = {
  optional: middleware({ mode: false }),
  requireAny: middleware({ mode: true }),

  requireStaff: middleware({ mode: "staff" }),
  requireExposed: middleware({ mode: "exposed" }),
  requireDeveloper: middleware({ mode: "developer" }),
};