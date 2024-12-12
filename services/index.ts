import config from '@/config';
import * as Servers from '@/servers';
import { BcryptHashProvider } from '@/utils/hash';
import { appContainer, connectDb } from './db-driver';

import helmet from 'helmet';
import swaggerUI from 'swagger-ui-express';

import { AutoServer } from '@omniflex/infra-express';
import { createLogger } from '@omniflex/infra-winston';
import { Containers, initializeAppContainer } from '@omniflex/core';

export const resolve = appContainer.resolve;

const resolvePath = async (relativePath: string) => {
  const dirname = import.meta.dirname;
  const { join } = await import('path');

  return join(dirname, relativePath);
}

const swaggerRoutes = async () => {
  const router = Servers.developerRoute('/swagger');
  (router as any)._unsafeRoutes = true;

  for (const key of Object.keys(Servers.servers)) {
    const port = config.ports[key];

    router
      .use(`/${key}`,
        async (req, _, next) => {
          const path = await resolvePath(`../docs/swagger-${key}.json`);

          const imported = (await import(path, {
            assert: {
              type: "json",
            },
          }));

          req.swaggerDoc = imported.default;
          next();
        },
        helmet({
          contentSecurityPolicy: {
            directives: {
              'connect-src': `localhost:${port}`,
            },
          },
        }),
        swaggerUI.serveFiles(undefined, {
          swaggerOptions: {
            defaultModelsExpandDepth: -1,
            defaultModelExpandDepth: 999,
          },
        }),
        swaggerUI.setup(),
      );
  }
};

initializeAppContainer({
  logger: createLogger({ config }),
  hashProvider: new BcryptHashProvider(),
});

(async () => {
  const { sequelize, mongoose } = await connectDb();

  Containers.asValues({
    config,
    mongoose,
    sequelize,
  });

  await (await import('./modules')).initialize();

  sequelize && await sequelize.sync();

  await import('./swagger')
    .then(({ generateSwagger }) => generateSwagger())
    .then(async () => {
      await swaggerRoutes();
      await AutoServer.start();
    });
})();