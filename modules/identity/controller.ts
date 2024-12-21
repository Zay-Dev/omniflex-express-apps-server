import { errors } from '@omniflex/core';
import { getControllerCreator } from '@omniflex/infra-express';

import { UsersController } from '@omniflex/module-identity-express';
import { TBodyRefreshToken } from '@omniflex/module-user-session-core';

import {
  TUser,
  TBodyLoginWithEmail,
  TBodyRegisterWithEmail,
} from '@omniflex/module-identity-core';

import { AuthService } from './auth.service';

class Controller extends UsersController<TUser & {
  appTypes: string[];
}> {
  tryRegisterWithEmail(appType: string) {
    type TBody = TBodyRegisterWithEmail;

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
    type TBody = TBodyLoginWithEmail;

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
    type TBody = TBodyRefreshToken;

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
      await AuthService.logout(this.res);

      return this.res.status(204).send();
    });
  }
}

export const create = getControllerCreator(Controller);