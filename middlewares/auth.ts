import { errors, logger } from '@omniflex/core';

import { ServerType } from '@/servers';
import { jwtProvider } from "@/utils/jwt";
import { ExpressUtils } from '@omniflex/infra-express';
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

  return ExpressUtils.tryAction(async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!optional && !token) {
      throw errors.unauthorized();
    }

    if (!token) return;

    try {
      const {
        __type,
        __identifier,
        ...user
      } = (await jwt.verify(token)) ?? {};

      if (__type !== "access-token") {
        throw errors.unauthorized();
      }

      res.locals.user = user;
      res.locals.accessToken = token;

      if (typeof mode != "boolean") {
        if (mode != user.__appType) {
          throw errors.forbidden();
        }
      }

      await throwIfNotValidToken(__identifier);
    } catch (error: any) {
      logger.error("Auth", { error });
      throw errors.unauthorized();
    }
  });
};

export const auth = {
  optional: middleware({ mode: false }),
  requireAny: middleware({ mode: true }),

  requireStaff: middleware({ mode: "staff" }),
  requireExposed: middleware({ mode: "exposed" }),
  requireDeveloper: middleware({ mode: "developer" }),
};