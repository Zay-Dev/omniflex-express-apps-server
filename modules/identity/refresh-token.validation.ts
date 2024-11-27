import { errors } from '@omniflex/core';
import { jwtProvider } from '@/utils/jwt';
import { Request, Response, NextFunction } from 'express';

export const validateRefreshToken = [
  async (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken } = req.body;

    try {
      const decoded = await jwtProvider.verify(refreshToken);

      if (decoded.__type !== 'refresh-token') {
        return next(errors.unauthorized());
      }

      return next();
    } catch (error) {
      return next(errors.unauthorized());
    }
  },
];