import config from '@/config';
import { errors } from '@omniflex/core';

import fs from 'fs/promises';
import jwt from 'jsonwebtoken';

const loadKey = (path: string) => fs.readFile(path, 'utf8');

export class JwtProvider {
  private _publicKey?: string;
  private _privateKey?: string;

  get401Error(errorCode?: string) {
    return errors.unauthorized({
      errorCode,
      error: 'JWT_PROVIDER'
    });
  }

  async sign(payload: Record<string, any>): Promise<string> {
    await this._loadKeys();

    return jwt.sign(payload, this._privateKey!, {
      algorithm: config.jwt.algorithm,
      expiresIn: config.jwt.expiresIn,
      issuer: config.jwt.issuer || undefined,
    });
  }

  async verify(token: string): Promise<Record<string, any>> {
    await this._loadKeys();

    try {
      return jwt.verify(
        token,
        this._publicKey!,
        {
          issuer: config.jwt.issuer,
          algorithms: [config.jwt.algorithm],
        },
      ) as Record<string, any>;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw this.get401Error();
      }

      throw this.get401Error();
    }
  }

  async authenticate(token: string) {
    if (!token) {
      throw this.get401Error();
    }

    const payload = await this.verify(
      this.sanitizeToken(token)
    );

    return { user: { ...payload } as any };
  }

  private sanitizeToken(token: string) {
    return token.replace(/^Bearer\s/, '');
  }

  private async _loadKeys() {
    if (!this._publicKey) {
      this._publicKey = await loadKey(config.jwt.publicKeyPath);
    }

    if (!this._privateKey) {
      this._privateKey = await loadKey(config.jwt.privateKeyPath);
    }
  }
}

export const jwtProvider = new JwtProvider();