import { errors } from '@omniflex/core';
import { TUser } from '@omniflex/module-identity-core/types';
import { getControllerCreator } from '@omniflex/infra-express';

import * as IdentitySchemas
  from '@omniflex/module-identity-core/user.schema';

import * as UserSessionSchemas
  from '@omniflex/module-user-session-core/session.schema';

import { UsersController }
  from '@omniflex/module-identity-express/users.controller';

import { AuthService } from './auth.service';

class Controller extends UsersController<TUser & {
  appTypes: string[];
}> {
  tryRegisterWithEmail(appType: string) {
    type TBody = IdentitySchemas.TBodyRegisterWithEmail;

    this.tryActionWithBody<TBody>(async ({ password, ...body }) => {
      const { id } = await this.register(appType, password, {
        ...body,
        username: body.email,
      });

      const user = await this.repository.updateById(id, {
        appTypes: [appType],
      });

      return this.respondOne(user);
    });
  }

  tryLoginWithEmail(appType: string) {
    type TBody = IdentitySchemas.TBodyLoginWithEmail;

    this.tryActionWithBody<TBody>(async (body) => {
      const user = await this.login(appType, {
        ...body,
        username: body.email,
      });
      const userAppTypes = user.appTypes || [];

      if (!userAppTypes.includes(appType)) {
        throw errors.unauthorized();
      }

      const {
        accessToken,
        refreshToken,
      } = await AuthService.getTokens(user, this.res);

      return this.respondOne({
        refreshToken,
        token: accessToken,
      });
    });
  }

  tryRefreshToken() {
    type TBody = UserSessionSchemas.TBodyRefreshToken;

    this.tryActionWithBody<TBody>(async ({ refreshToken }) => {
      const user = this.res.locals.required.user;
      const tokens = await AuthService
        .refreshTokens(refreshToken, user, this.res);

      return this.respondOne({
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    });
  }

  tryLogout() {
    this.tryAction(async () => {
      AuthService.logout(this.req);

      return this.res.status(204).send();
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