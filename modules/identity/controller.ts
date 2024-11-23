import { errors } from '@omniflex/core';
import { jwtProvider } from '@/utils/jwt';

import { TUser } from '@omniflex/module-identity-core/types';
import { getControllerCreator } from '@omniflex/infra-express';

import * as Schemas
  from '@omniflex/module-identity-core/user.schema';

import { UsersController }
  from '@omniflex/module-identity-express/users.controller';

class Controller extends UsersController<TUser & {
  appTypes: string[];
}> {
  tryRegisterWithEmail(appType: string) {
    type TBody = Schemas.TBodyRegisterWithEmail;

    this.tryActionWithBody<TBody>(async ({ password, ...body }) => {
      const { id } = await this.register(appType, password, {
        ...body,
        username: body.email,
      });

      const user = await this.repository.update(id, {
        appTypes: [appType],
      });

      return this.respondOne(user);
    });
  }

  tryLoginWithEmail(appType: string) {
    type TBody = Schemas.TBodyLoginWithEmail;

    this.tryActionWithBody<TBody>(async (body) => {
      const user = await this.login(appType, {
        ...body,
        username: body.email,
      });
      const userAppTypes = user.appTypes || [];

      if (!userAppTypes.includes(appType)) {
        throw errors.unauthorized();
      }

      return this.respondOne({
        token: await jwtProvider.sign({
          ...user,
          id: user.id,

          __appType: appType,
          __type: 'access-token',
        }),
      });
    });
  }

  tryGetMyProfile() {
    this.tryAction(async () => {
      const profile = this.res.locals.required.profile;

      return this.respondOne({
        profileId: profile.id,
        ...profile,
      });
    });
  }
}

export const create = getControllerCreator(Controller);