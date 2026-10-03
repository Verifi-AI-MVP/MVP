import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { AppError } from './error.middleware.js';

export function validate(validations: ValidationChain[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    await Promise.all(validations.map((v) => v.run(req)));
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
      return;
    }
    const msg = errors.array().map((e) => (e.type === 'field' ? `${e.path}: ` : '') + e.msg).join('; ');
    next(new AppError(400, msg, 'VALIDATION_ERROR'));
  };
}
