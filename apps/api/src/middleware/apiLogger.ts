import { pinoHttp } from 'pino-http';
import logger from '../utils/logger.js';
import type { RequestHandler } from 'express';

const apiLogger : RequestHandler = pinoHttp({
    logger,  // Keeps pretty printing in dev
    // 1. Custom log level based on status (e.g., warn on 4xx, error on 5xx, silent on redirects)
    customLogLevel: (req: Request, res: any, err?: any) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      if (res.statusCode >= 300) return 'silent';  // Hide redirects
      return 'info';
    },

    // 2. Custom message (instead of default empty msg)
    customSuccessMessage: (req: Request, res: any) => {
      return `${req.method} ${req.url} ${res.statusCode} ${res.responseTime}ms`;
    },
    customErrorMessage: (req: Request, res: any, err: Error) => {
      return `${req.method} ${req.url} errored`;
    },

    // 3. Hide or redact sensitive parts (e.g., cookies, specific headers)
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        headers: {
          // Only log useful headers, redact others
          host: req.headers.host,
          'user-agent': req.headers['user-agent'],
          // Hide cookies/tokens completely
          // cookie: '[Redacted]',
        },
        remoteAddress: req.remoteAddress,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
        headers: {
          'content-type': res.headers['content-type'],
          'content-length': res.headers['content-length'],
        },
        body: res.body
      }),
    },

    // 4. Skip noisy routes (e.g., health checks)
    // autoLogging: {
    //   ignore: (req: Request) => req.url === '/health',
    // },
  }) as any;

  export default apiLogger;