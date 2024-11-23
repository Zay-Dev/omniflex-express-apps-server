import config from '@/config';
import { servers } from '@/servers';

import fs from 'fs/promises';
import { modulesSchemas } from '@omniflex/core';
import swaggerAutogen from '@omniflex/infra-swagger-autogen';

const getTitle = (type) => {
  switch (type) {
    case "exposed": return "Exposed APIs";
    case "staff": return "Staff APIs";
    case "developer": return "Developer APIs";
  }

  return "Unknown APIs";
};

const getDescription = (type) => {
  switch (type) {
    case "exposed": return "APIs that are exposed to the public";
    case "staff": return "APIs that are only accessible by staff";
    case "developer": return "APIs that are only accessible by developers";
  }

  return "Unknown APIs";
};

export const generateSwagger = async () => {
  const pathTo = './docs';
  await fs.mkdir(pathTo, { recursive: true });

  await Promise.all(
    Object.keys(servers).map(async key => {
      const doc = {
        info: {
          title: getTitle(key),
          description: getDescription(key),
        },

        servers: [
          { url: `http://localhost:${config.ports[key] || "unknown"}` },
        ],

        components: {
          '@schemas': modulesSchemas,

          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer'
            }
          }
        },
      };

      const outputFile = `${pathTo}/swagger-${key}.json`;

      const routes = [`./modules/*/${key}`]
        .flatMap(file => [`${file}.ts`, `${file}.js`]);

      await swaggerAutogen({ openapi: '3.0.0' })(outputFile, routes, doc);
    })
  );
};