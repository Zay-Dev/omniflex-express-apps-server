import ms from 'ms';

import config from '@/config';
import { jwtProvider } from '@/utils/jwt';
import { Request, Response } from '@omniflex/infra-express/types';
import { UserSessionService } from '@omniflex/module-user-session-core';

type TUser = {
  id: any;
  [key: string]: any;
};

export class AuthService {
  static async logout(req: Request) {
    const token = `${req.headers.authorization}`.substring(7);
    const { __pairIdentifier } = await jwtProvider.decode(token);

    await UserSessionService.inactivateByPairIdentifier(__pairIdentifier);
  }

  static async refreshTokens(refreshToken: string, user: TUser, res: Response) {
    const {
      __identifier,
      __pairIdentifier,
    } = await jwtProvider.decode(refreshToken);

    await UserSessionService.inactivateByPairIdentifier(__pairIdentifier);

    return this.getTokens(
      user,
      res,
      { previousIdentifier: __identifier, previousPairIdentifier: __pairIdentifier },
    );
  }

  static async getTokens(
    user: TUser,
    res: Response,
    metadata: any = {},
  ) {
    const appType = res.locals.appType;
    const createSession = UserSessionService.getCreateSession(
      user.id,
      {
        metadata,
        deviceInfo: res.req.useragent,
        remoteAddress: res.req.ip || '',
        userAgent: res.req.headers['user-agent'],
      },
    );

    const getToken = async (
      type: 'app' | 'refresh',
      expiresIn: string | number,
    ) => {
      const expiredInMs = typeof expiresIn === 'string' ?
        ms(expiresIn) : expiresIn * 1000;

      const { identifier, pairIdentifier } = await createSession(
        `${type}:${appType}`,
        expiredInMs,
      );

      return await jwtProvider.sign(
        {
          ...user,

          __appType: appType,
          __identifier: identifier,
          __pairIdentifier: pairIdentifier,
          __type: type === 'app' ? 'access-token' : 'refresh-token',
        },
        expiredInMs,
      );
    };

    return {
      accessToken: await getToken('app', config.jwt.expiresIn),
      refreshToken: await getToken('refresh', config.jwt.refreshTokenExpiresIn),
    };
  }
}