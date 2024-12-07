import config from '@/config';
import { autoImport } from '@omniflex/core';

async function sequelizeUserSession() {
  const sequelize = await import('@omniflex/module-user-session-sequelize-v6');

  sequelize.createRegisteredRepositories();
}

async function mongooseUserSession() {
  const mongoose = await import('@omniflex/module-user-session-mongoose');

  mongoose.createRegisteredRepositories();
}

async function sequelizeIdentity() {
  const sequelize = await import('@omniflex/module-identity-sequelize-v6');
  const Types = await import('@omniflex/infra-sequelize-v6/types');

  const userSchema = sequelize.getUserSchema({
    ...sequelize.userBaseSchema,
    appTypes: {
      ...Types.mixed(),
      defaultValue: [],
    },
  });

  sequelize.createRegisteredRepositories(userSchema);
}

async function mongooseIdentity() {
  const mongoose = await import('@omniflex/module-identity-mongoose');
  const { requiredString } = await import('@omniflex/infra-mongoose/types');

  const userSchema = mongoose.getUserSchema({
    ...mongoose.userBaseSchema,
    appTypes: [requiredString],
  });

  mongoose.createRegisteredRepositories(userSchema);
}

async function routes() {
  const { join } = await import('path');

  const dirname = import.meta.dirname;
  const path = join(dirname, '../modules');

  await autoImport(path, (filename) => {
    return ['exposed', 'staff', 'developer']
      .includes(filename);
  });
}

export const initialize = async () => {
  switch (config.dbDriver) {
    case 'mongoose':
      await mongooseIdentity();
      await mongooseUserSession();
      break;

    case 'sqlite':
    case 'postgres':
      await sequelizeIdentity();
      await sequelizeUserSession();
      break;
  }

  await routes();
};