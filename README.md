# Omniflex Express Server Example

## Usage Notice

This project is built using the Omniflex Mono-Repo. For more information, visit [omniflex.io](https://omniflex.io).

The omniflex mono-repo is available at [here](https://github.com/Zay-Dev/omniflex).

## Prerequisites

- Node.js (v16 or higher)
- Yarn (v1.22 or higher)
- PostgreSQL database
- MongoDB database
- RSA key pair for JWT signing (provided in `files` directory)

## Installation

### 1. Core Dependencies

From the mono-repo root directory, install the following packages:


```bash
# Core packages
yarn ws-run apps-server add @omniflex/core@^0.1.0
yarn ws-run apps-server add @omniflex/infra-express@^0.1.0
yarn ws-run apps-server add @omniflex/infra-mongoose@^0.1.0
yarn ws-run apps-server add @omniflex/infra-swagger-autogen@^2.24.0
yarn ws-run apps-server add @omniflex/infra-winston@^0.1.0
# Identity module packages

```bash
yarn ws-run apps-server add @omniflex/module-identity-core@^0.1.0
yarn ws-run apps-server add @omniflex/module-identity-express@^0.1.0
yarn ws-run apps-server add @omniflex/module-identity-mongoose@^0.1.0
yarn ws-run apps-server add @omniflex/module-identity-postgres@^0.1.0
```

### 2. Environment Setup

Create a `.env` file in the project root:

```env
NODE_ENV=development
LOG_LEVEL=info
EXPOSE_ERROR_DETAILS=true

#Server Ports
PORT_EXPOSED=3500
PORT_STAFF=3600
PORT_DEVELOPER=3700

# Database Connections
POSTGRES_URI=postgresql://username:password@localhost:5432/database
MONGO_URI=mongodb://localhost:27017
MONGO_DB=omniflex

# Request Timeout
REQUEST_TIMEOUT_SECONDS=30
```

## Project Structure

- `/services` - Core service initialization and configuration
- `/modules` - Feature modules (e.g., identity)
- `/middlewares` - Express middlewares
- `/utils` - Utility functions and providers
- `/docs` - Auto-generated Swagger documentation

## Available Scripts

```bash
# Development mode with hot reload
yarn dev
# Build the project
yarn build
# Start production server
yarn start
```

## Authentication

The example uses JWT-based authentication with RSA key pairs. Make sure the following files exist in the `files` directory:

- `private.pem` - RSA private key for token signing
- `public.pem` - RSA public key for token verification

Please replace the files with your own keys before using the server in production.
You could also mount the files to the container in production.

## Available Endpoints

### Public APIs (Port 3500)
- POST `/v1/users` - Register new user
- POST `/v1/users/access-tokens` - Login
- GET `/v1/users/my/profile` - Get current user profile

### Staff APIs (Port 3600)
- GET `/v1/ping` - Health check

### Developer APIs (Port 3700)
- GET `/v1/ping` - Health check
- GET `/v1/users` - List all users
- GET `/v1/users/:id` - Get user by ID

## Technical Guide

### Server Architecture

This example implements a multi-server architecture with three distinct servers:

- **Exposed Server (3500)**: Public-facing APIs
- **Staff Server (3600)**: Internal staff-only APIs
- **Developer Server (3700)**: Development and debugging APIs

Each server provides isolation and separate security contexts for different types of users.

### Service Setup Flow

1. **Initialize Core Services**

```typescript
import '@/services';
import as Servers from '@/servers';
import { errors } from '@omniflex/core';
```

2. **Service Configuration**
The service initialization flow (see `services/index.ts`):

```typescript:services/index.ts
// -- services/index.ts

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
```

### Module-Based Routing

The application uses a module-based architecture for better organization and scalability:

1. **Module Structure**

```
/modules
  /identity
    controller.ts  # Controller logic
    exposed.ts     # Public APIs
    developer.ts   # Developer APIs
    index.ts       # Module entry point
```

2. **Creating Routes**
Example of creating module routes:

```typescript
import * as Servers from '@/servers';

// Public API route
const exposedRouter = Servers.exposedRoute('/v1/users');

// Staff API route
const staffRouter = Servers.staffRoute('/v1/admin');

// Developer API route
const developerRouter = Servers.developerRoute('/v1/debug');
```

Benefits:
- Clear separation of concerns
- Independent scaling
- Easier maintenance
- Modular security policies
- Isolated testing environments

### Swagger Documentation

The server automatically generates Swagger documentation during startup. Documentation is only accessible through the Developer server.

#### Access URLs
- Exposed APIs: `http://localhost:3700/swagger/exposed`
- Staff APIs: `http://localhost:3700/swagger/staff`
- Developer APIs: `http://localhost:3700/swagger/developer`

#### Swagger Generation Comments
Add these comments above your route handlers:

```typescript
// #swagger.file.tags = ['Users']
// #swagger.file.basePath = '/v1/users'

router.post('/', 
  // #swagger.jsonBody = required|components/schemas/moduleIdentity/registerWithEmail
  validateRegisterWithEmail,
  create(controller => controller.tryRegisterWithEmail(appType))
);
```

The swagger generation process is handled automatically (see `services/swagger.ts`):

```typescript:services/swagger.ts
// -- services/swagger.ts

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
```

### Server Configuration

The server configuration is managed through the `servers.ts` file:

```typescript:servers.ts
// -- servers.ts

export const servers: Record<ServerType, TBaseServer> = {
  exposed: {
    type: 'exposed',
    port: config.ports.exposed,
    options: {
      middlewares: {
        before: [
          auth.optional,
        ],
      },
    },
  },
  staff: {
    type: 'staff',
    port: config.ports.staff,
    options: {
      middlewares: {
        before: [
          auth.optional,
        ],
      },
    },
  },
  developer: {
    type: 'developer',
    port: config.ports.developer,
    options: {
      middlewares: {
        before: [
          (req: Request, res: Response, next: NextFunction) => {
            if (req.path.startsWith('/swagger/')) {
              res.locals._noLogger = true;
            }

            next();
          },
        ],
      },
    },
  },
};
```

Each server can have its own middleware stack and security configurations while sharing the core application logic.


## License

MIT License - see [LICENSE](LICENSE) for details