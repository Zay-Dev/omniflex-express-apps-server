import '@/services';
import * as Servers from '@/servers';
import { errors } from '@omniflex/core';

Servers.exposedRoute('/v1/ping')
  .get('/', (_, res) => {
    res.json({ message: 'Pong (staff)' });
  });

Servers.staffRoute('/v1/ping')
  .get('/', (_, res) => {
    res.json({ message: 'Pong (staff)' });
  });

Servers.developerRoute('/v1/')
  .useMiddlewares([(_, __, next) => {
    console.log('Middleware for developer');
    return next();
  }])
  .get('/ping', (_, res) => {
    res.json({ message: 'Pong (developer)' });
  })
  .get('/errors/401', (_, __, next) => {
    next(errors.unauthorized());
  })
  .get('/errors/async', async () => {
    throw errors.custom('Custom error', 500);
  })
  .get('/errors/uncatchable', () => {
    (async () => {
      throw errors.custom('Custom error', 500);
    })();
  });
