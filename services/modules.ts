import config from '@/config';
import { autoImport } from '@omniflex/core';

async function postgresUserSession() {
  const postgres = await import('@omniflex/module-user-session-postgres');

  postgres.createRegisteredRepositories();
}

async function mongooseUserSession() {
  const mongoose = await import('@omniflex/module-user-session-mongoose');

  mongoose.createRegisteredRepositories();
}

async function postgresIdentity() {
  const postgres = await import('@omniflex/module-identity-postgres');
  const {
    requiredString,
    toRequiredArray,
  } = await import('@omniflex/infra-postgres/types');

  const userSchema = postgres.getUserSchema({
    ...postgres.userBaseSchema,
    appTypes: {
      ...toRequiredArray(requiredString()),
      defaultValue: [],
    },
  });

  postgres.createRegisteredRepositories(userSchema);
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

    case 'postgres':
      await postgresIdentity();
      await postgresUserSession();
      break;
  }

  await routes();
};