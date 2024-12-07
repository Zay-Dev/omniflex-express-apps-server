import config from '@/config';

import { Sequelize } from 'sequelize';
import { Containers } from '@omniflex/core';

import * as Postgres from '@omniflex/infra-postgres';
import * as Mongoose from '@omniflex/infra-mongoose';
import * as Sqlite from '@omniflex/infra-sqlite';

export const appContainer = Containers.appContainerAs<{
  sequelize: Sequelize,

  postgres: Awaited<ReturnType<typeof Postgres.getConnection>>,
  mongoose: Awaited<ReturnType<typeof Mongoose.getConnection>>,
  sqlite: Awaited<ReturnType<typeof Sqlite.getConnection>>,
}>();

const connectSequelize = async () => {
  switch (config.dbDriver) {
    case 'postgres':
      return await Postgres.getConnection(config);
    case 'sqlite':
      return await Sqlite.getConnection(config);
  }

  return undefined;
};

const connectMongoose = async () => {
  return config.dbDriver == 'mongoose' && await Mongoose.getConnection(config);
};

export const connectDb = async () => {
  return {
    mongoose: await connectMongoose(),
    sequelize: await connectSequelize(),
  };
};
