import { AutoServer } from '@omniflex/infra-express';
import { Request, Response, NextFunction } from 'express';

import config from '@/config';
import { auth } from '@/middlewares/auth';
import { TBaseServer } from '@omniflex/infra-express/types';

export type ServerType = 'exposed' | 'staff' | 'developer';

export const servers: Record<ServerType, TBaseServer> = {
  exposed: {
    type: 'exposed',
    port: config.ports.exposed,
    options: {
      middlewares: {
        before: [
          auth.optional,
        ],
      },
    },
  },
  staff: {
    type: 'staff',
    port: config.ports.staff,
    options: {
      middlewares: {
        before: [
          auth.optional,
        ],
      },
    },
  },
  developer: {
    type: 'developer',
    port: config.ports.developer,
    options: {
      middlewares: {
        before: [
          (req: Request, res: Response, next: NextFunction) => {
            if (req.path.startsWith('/swagger/')) {
              res.locals._noLogger = true;
            }

            next();
          },
        ],
      },
    },
  },
};

export const exposedRoute = (path: string) => {
  return AutoServer.getOrCreateRouter(servers.exposed.type, path);
};

export const staffRoute = (path: string) => {
  return AutoServer.getOrCreateRouter(servers.staff.type, path);
};

export const developerRoute = (path: string) => {
  return AutoServer.getOrCreateRouter(servers.developer.type, path);
};

Object.values(servers)
  .forEach(server => AutoServer.addServer(server));