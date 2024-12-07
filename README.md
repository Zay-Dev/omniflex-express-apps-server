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
yarn ws-run apps-server add @omniflex/module-identity-core@^0.1.0
yarn ws-run apps-server add @omniflex/module-identity-express@^0.1.0
yarn ws-run apps-server add @omniflex/module-identity-mongoose@^0.1.0
yarn ws-run apps-server add @omniflex/module-identity-sequelize-v6@^0.1.0
```

### 2. Environment Setup

Create a `.env` file in the project root:

```env
# Environment (development, production, test)
NODE_ENV=development

# Logging level (error, warn, info, debug, verbose, silly)
LOG_LEVEL=silly

# Set to 'true' to expose detailed error information in responses (not recommended for production)
EXPOSE_ERROR_DETAILS=true

# Request timeout in seconds
REQUEST_TIMEOUT_SECONDS=30

# Server Ports
PORT_EXPOSED=3500  # Port for public/exposed API
PORT_STAFF=3600    # Port for staff API
PORT_DEVELOPER=3700  # Port for developer API

# Db Driver (mongoose, postgres)
DB_DRIVER=mongoose

# MongoDb
MONGO_DB=
MONGO_URI=mongodb://localhost:27017/omniflex

# Postgres
POSTGRES_URI="postgresql://postgres:test1234@localhost:5432/omniflex?schema=public"

# JWT Configuration
JWT_ALGORITHM=RS256
JWT_ISSUER=omniflex-server
JWT_PUBLIC_KEY_PATH=files/public.pem
JWT_PRIVATE_KEY_PATH=files/private.pem
JWT_ACCESS_TOKEN_EXPIRATION=1d
JWT_REFRESH_TOKEN_EXPIRATION=30d
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
- PUT `/v1/users/access-tokens` - Refresh access token
- DELETE `/v1/users/access-tokens` - Revoke access token
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
  const registered = Containers.asValues({
    config,

    postgres: config.dbDriver == 'postgres' &&
      await Postgres.getConnection(config) || undefined,
    mongoose: config.dbDriver == 'mongoose' &&
      await Mongoose.getConnection(config) || undefined,
  });

  await (await import('./modules')).initialize();

  switch (config.dbDriver) {
    case 'postgres':
      await registered.resolve('postgres').sync();
      break;
  }

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