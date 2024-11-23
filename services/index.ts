import config from '@/config';
import * as Servers from '@/servers';
import { BcryptHashProvider } from '@/utils/hash';

import helmet from 'helmet';
import swaggerUI from 'swagger-ui-express';

import { AutoServer } from '@omniflex/infra-express';
import { Containers, initializeAppContainer } from '@omniflex/core';

import { createLogger } from '@omniflex/infra-winston';
import { getConnection as getPostgres } from '@omniflex/infra-postgres';
import { getConnection as getMongoose } from '@omniflex/infra-mongoose';

const appContainer = Containers.appContainerAs<{
  postgres: Awaited<ReturnType<typeof getPostgres>>,
  mongoose: Awaited<ReturnType<typeof getMongoose>>,
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
  const postgres = await getPostgres(config);
  const mongoose = await getMongoose(config);

  Containers.asValues({
    config,
    postgres,
    mongoose,
  });

  await (await import('./modules')).initialize();

  await postgres.sync();

  await import('./swagger')
    .then(({ generateSwagger }) => generateSwagger())
    .then(async () => {
      await swaggerRoutes();
      await AutoServer.start();
    });
})();