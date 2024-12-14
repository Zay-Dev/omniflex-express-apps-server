import fs from 'fs/promises';
import config from '@/config';
import { modulesSchemas } from '@omniflex/core';
import { servers, developerRoute } from '@/servers';

import helmet from 'helmet';
import swaggerUI from 'swagger-ui-express';
import swaggerAutogen from '@omniflex/infra-swagger-autogen';

const resolvePath = async (relativePath: string) => {
  const dirname = import.meta.dirname;
  const { join } = await import('path');

  return join(dirname, relativePath);
};

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

const generateSwagger = async () => {
  const pathTo = await resolvePath('../docs');
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

const swaggerRoutes = async () => {
  const router = developerRoute('/swagger');
  const { pathToFileURL } = await import('url');

  (router as any)._unsafeRoutes = true;

  for (const key of Object.keys(servers)) {
    const port = config.ports[key];

    router
      .use(`/${key}`,
        async (req, _, next) => {
          const path = await resolvePath(`../docs/swagger-${key}.json`);

          const imported = (await import(`${pathToFileURL(path)}`, {
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

export const initialize = async () => {
  await generateSwagger();
  await swaggerRoutes();
};