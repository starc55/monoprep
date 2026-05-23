import { ApiError } from '../utils/apiError.js';

export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (error) {
      if (typeof error.flatten === 'function') {
        next(new ApiError(400, 'Validation failed.', error.flatten()));
        return;
      }

      next(error);
    }
  };
}
