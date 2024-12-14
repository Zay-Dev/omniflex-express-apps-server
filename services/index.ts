import config from '@/config';
import { BcryptHashProvider } from '@/utils/hash';

import { AutoServer } from '@omniflex/infra-express';
import { createLogger } from '@omniflex/infra-winston';
import { Containers, initializeAppContainer } from '@omniflex/core';

import * as Modules from './modules';
import * as Swagger from './swagger';
import { appContainer, connectDb } from './db-driver';

export const resolve = appContainer.resolve;
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

  await Modules.initialize();
  await Swagger.initialize();

  sequelize && await sequelize.sync();
  await AutoServer.start();
})();