import path from 'path';
import dotenv from 'dotenv';
import { Algorithm } from 'jsonwebtoken';

import { TBaseConfig } from '@omniflex/core/types';
import { TPostgresConfig } from '@omniflex/infra-postgres/types';
import { TMongooseConfig } from '@omniflex/infra-mongoose/types';

dotenv.config();

const config: TBaseConfig &
  TPostgresConfig &
  TMongooseConfig & {
    dbDriver: 'postgres' | 'mongoose';

    ports: {
      exposed: number;
      staff: number;
      developer: number;
    };
    jwt: {
      publicKeyPath: string;
      privateKeyPath: string;

      issuer?: string;
      algorithm: Algorithm;
      expiresIn: string | number;
      refreshTokenExpiresIn: string | number;
    };
  } = {
  env: (process.env.NODE_ENV || 'development') as TBaseConfig['env'],

  dbDriver: process.env.DB_DRIVER as 'postgres' | 'mongoose',

  logging: {
    exposeErrorDetails: process.env.EXPOSE_ERROR_DETAILS == 'true',
    level: (process.env.LOG_LEVEL || 'info') as TBaseConfig['logging']['level'],
  },

  server: {
    requestTimeoutInSeconds: parseInt(process.env.REQUEST_TIMEOUT_SECONDS || '30', 10),
  },

  ports: {
    exposed: parseInt(process.env.PORT_EXPOSED || '3500', 10),
    staff: parseInt(process.env.PORT_STAFF || '3600', 10),
    developer: parseInt(process.env.PORT_DEVELOPER || '3700', 10),
  },

  jwt: {
    issuer: process.env.JWT_ISSUER || 'omniflex-server',
    algorithm: process.env.JWT_ALGORITHM as Algorithm || 'RS256',

    publicKeyPath: path.resolve(process.cwd(), process.env.JWT_PUBLIC_KEY_PATH || 'files/public.pem'),
    privateKeyPath: path.resolve(process.cwd(), process.env.JWT_PRIVATE_KEY_PATH || 'files/private.pem'),

    expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '1d',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '30d',
  },

  postgres: {
    uri: process.env.POSTGRES_URI || '',
  },

  mongoose: {
    uri: process.env.MONGO_URI || '',
    dbName: process.env.MONGO_DB || '',
  },
};

export default config;