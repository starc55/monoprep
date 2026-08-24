import { env } from '../config/env.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

export function errorHandler(error, _req, res, _next) {
  const isOperational = Number.isInteger(error.statusCode) && error.statusCode >= 400;
  const statusCode = isOperational ? error.statusCode : 500;
  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    message: isOperational ? error.message : 'Unexpected server error.',
    details: !env.isProduction && isOperational ? error.details || null : null
  });
}
