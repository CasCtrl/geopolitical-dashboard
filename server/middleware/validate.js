import { z } from 'zod';
import { ApiError } from './apiError.js';

function formatZodIssues(issues) {
  return issues.map(issue => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

function validateWithSchema(schema, source) {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      return next(
        new ApiError(
          400,
          'VALIDATION_ERROR',
          `Invalid ${source} payload`,
          formatZodIssues(parsed.error.issues),
        ),
      );
    }

    // In newer Express/router stacks, req.query/req.params can be getter-backed.
    // Mutate the existing object instead of reassigning when possible.
    if ((source === 'query' || source === 'params') && req[source] && typeof req[source] === 'object') {
      const target = req[source];
      Object.keys(target).forEach(key => {
        delete target[key];
      });
      Object.assign(target, parsed.data);
    } else {
      req[source] = parsed.data;
    }
    return next();
  };
}

export const validateParams = schema => validateWithSchema(schema, 'params');
export const validateQuery = schema => validateWithSchema(schema, 'query');
export const validateBody = schema => validateWithSchema(schema, 'body');

export { z };