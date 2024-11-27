import config from '@/config';
import * as Servers from '@/servers';
import { BcryptHashProvider } from '@/utils/hash';

import helmet from 'helmet';
import swaggerUI from 'swagger-ui-express';

import { AutoServer } from '@omniflex/infra-express';
import { Containers, initializeAppContainer } from '@omniflex/core';

import { createLogger } from '@omniflex/infra-winston';
import * as Postgres from '@omniflex/infra-postgres';
import * as Mongoose from '@omniflex/infra-mongoose';

const appContainer = Containers.appContainerAs<{
  postgres: Awaited<ReturnType<typeof Postgres.getConnection>>,
  mongoose: Awaited<ReturnType<typeof Mongoose.getConnection>>,
}>();

export const resolve = appContainer.resolve;

const swaggerRoutes = async () => {
  const router = Servers.developerRoute('/swagger');
  (router as any)._unsafeRoutes = true;

  for (const key of Object.keys(Servers.servers)) {
    const port = config.ports[key];

    router
      .use(`/${key}`,
        async (req, _, next) => {
          const imported = (await import(`../docs/swagger-${key}.json`, {
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
  const registered = Containers.asValues({
    config,

    postgres: config.dbDriver == 'postgres' &&
      await Postgres.getConnection(config) || undefined,
    mongoose: config.dbDriver == 'mongoose' &&
      await Mongoose.getConnection(config) || undefined,
  });

  await (await import('./modules')).initialize();

  switch (config.dbDriver) {
    case 'postgres':
      await registered.resolve('postgres').sync();
      console.log(12345);
      break;
  }

  await import('./swagger')
    .then(({ generateSwagger }) => generateSwagger())
    .then(async () => {
      await swaggerRoutes();
      await AutoServer.start();
    });
})();