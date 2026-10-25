import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { badRequest } from '../utils/errors.js';

type Schemas = { body?: ZodType; query?: ZodType; params?: ZodType };

/** Valida e substitui body/query/params pelos valores já tipados e normalizados. */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    for (const key of ['params', 'query', 'body'] as const) {
      const schema = schemas[key];
      if (!schema) continue;
      const result = schema.safeParse(req[key]);
      if (!result.success) {
        return next(
          badRequest(
            'Dados inválidos.',
            result.error.issues.map((i) => ({ field: [key, ...i.path].join('.'), message: i.message })),
          ),
        );
      }
      if (key === 'query') {
        // req.query é só de leitura em Express 5 / getter; guardamos em validatedQuery
        Object.defineProperty(req, 'validatedQuery', { value: result.data, configurable: true });
      } else {
        (req as unknown as Record<string, unknown>)[key] = result.data;
      }
    }
    next();
  };
}

export function getQuery<T>(req: unknown): T {
  return (req as { validatedQuery: T }).validatedQuery;
}
