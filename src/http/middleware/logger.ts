/**
 * Request logging middleware
 */

import type { NextFunction, Request, Response } from 'express';

/**
 * Simple request logger middleware with input sanitization
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();

  // Sanitize user input to prevent log injection
  const sanitize = (str: string) => str.replaceAll(/[\r\n]/g, '');
  const method = sanitize(req.method);
  const path = sanitize(req.path);

  // Log request
  console.log(`[${new Date().toISOString()}] ${method} ${path}`);

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m'; // Red for errors, green for success
    const reset = '\x1b[0m';

    console.log(
      `[${new Date().toISOString()}] ${method} ${path} ${statusColor}${res.statusCode}${reset} ${duration}ms`
    );
  });

  next();
}
