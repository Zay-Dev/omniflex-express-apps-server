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
  const Types = await import('@omniflex/infra-sequelize-v6/types');
  const sequelize = await import('@omniflex/module-identity-sequelize-v6');
  const UserSchema = await import('@omniflex/module-identity-sequelize-v6/schemas/user.js');

  const userDefinition = UserSchema.getDefinition({
    ...UserSchema.baseDefinition,
    appTypes: {
      ...Types.mixed(),
      defaultValue: [],
    },
  });

  const repository = UserSchema.createRepository(userDefinition);
  sequelize.createRegisteredRepositories(repository);
}

async function mongooseIdentity() {
  const mongoose = await import('@omniflex/module-identity-mongoose');
  const Types = await import('@omniflex/infra-mongoose/types');
  const UserSchema = await import('@omniflex/module-identity-mongoose/schemas/user.js');

  const userDefinition = UserSchema.defineSchema({
    ...UserSchema.baseDefinition,
    appTypes: [Types.requiredString],
  });

  mongoose.createRegisteredRepositories(userDefinition);
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