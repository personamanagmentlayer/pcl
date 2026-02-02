/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PCL HTTP Registry Server
 * Phase 3.4: REST API for remote PCL artifact registry
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import compression from 'compression';
import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import helmet from 'helmet';
import { createServer, type Server } from 'http';
import swaggerUi from 'swagger-ui-express';
import { initTelemetry } from '../observability/telemetry.js';
import { openApiSpec } from './docs/openapi.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/logger.js';
import { apiLimiter } from './middleware/rate-limit.js';
import { routes } from './routes/index.js';
import type { RegistryConfig } from './types/config.js';

/**
 * HTTP Registry Server
 */
export class HTTPRegistryServer {
  private app: Express;
  private server: Server | null = null;
  private config: RegistryConfig;

  constructor(config: Partial<RegistryConfig> = {}) {
    this.config = {
      port: config.port ?? 3000,
      host: config.host ?? '0.0.0.0',
      cors: config.cors ?? {
        origin: '*',
        credentials: true,
      },
      ...config,
    };

    // Initialize observability
    this.initializeObservability();

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Initialize observability (telemetry, metrics, tracing)
   */
  private initializeObservability(): void {
    const telemetryEnabled = process.env.TELEMETRY_ENABLED !== 'false';

    if (telemetryEnabled) {
      initTelemetry({
        serviceName: process.env.SERVICE_NAME || 'pcl-http-server',
        environment: process.env.NODE_ENV || 'development',
        metrics: {
          enabled: process.env.METRICS_ENABLED !== 'false',
          port: parseInt(process.env.METRICS_PORT || '9464', 10),
        },
        tracing: {
          enabled: process.env.TRACING_ENABLED === 'true',
          endpoint:
            process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
        },
        logging: {
          enabled: process.env.LOGGING_ENABLED !== 'false',
          level:
            (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') ||
            'info',
        },
      });

      console.log('[Observability] Telemetry initialized');
      if (process.env.METRICS_ENABLED !== 'false') {
        console.log(
          `[Observability] Metrics available at http://localhost:${process.env.METRICS_PORT || '9464'}/metrics`
        );
      }
      if (process.env.TRACING_ENABLED === 'true') {
        console.log(
          `[Observability] Tracing enabled - exporting to ${process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces'}`
        );
      }
    } else {
      console.log(
        '[Observability] Telemetry disabled (set TELEMETRY_ENABLED=true to enable)'
      );
    }
  }

  /**
   * Setup middleware chain
   */
  private setupMiddleware(): void {
    // Security headers with CSP enabled
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // Needed for Swagger UI
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
          },
        },
        crossOriginEmbedderPolicy: false,
      })
    );

    // CORS with restricted origins (use ALLOWED_ORIGINS env var in production)
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : this.config.cors.origin === '*'
        ? ['http://localhost:3000', 'http://localhost:5173'] // Dev defaults
        : this.config.cors.origin;

    this.app.use(
      cors({
        origin:
          process.env.NODE_ENV === 'production'
            ? allowedOrigins
            : this.config.cors.origin,
        credentials: this.config.cors.credentials,
      })
    );

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use(requestLogger);

    // Global rate limiting (applied to all routes) - disabled in test mode
    if (process.env.NODE_ENV !== 'test') {
      this.app.use('/api', apiLimiter);
    }
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: process.env.npm_package_version || '1.0.0',
        },
      });
    });

    // API version info
    this.app.get('/version', (req: Request, res: Response) => {
      res.json({
        success: true,
        data: {
          apiVersion: 'v1',
          serverVersion: process.env.npm_package_version || '1.0.0',
          node: process.version,
        },
      });
    });

    // Swagger/OpenAPI documentation
    this.app.use('/docs', swaggerUi.serve);
    this.app.get(
      '/docs',
      swaggerUi.setup(openApiSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'PCL Registry API Documentation',
      })
    );

    // OpenAPI spec JSON endpoint
    this.app.get('/openapi.json', (req: Request, res: Response) => {
      res.json(openApiSpec);
    });

    // Mount API routes
    this.app.use('/api/v1', routes);

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.method} ${req.path} not found`,
          timestamp: new Date().toISOString(),
        },
      });
    });
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = createServer(this.app);

        this.server.listen(this.config.port, this.config.host, () => {
          console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║              PCL HTTP Registry Server Started                  ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Server:     http://${this.config.host}:${this.config.port}                        ║
║  API:        http://${this.config.host}:${this.config.port}/api/v1                ║
║  Docs:       http://${this.config.host}:${this.config.port}/docs                  ║
║  Health:     http://${this.config.host}:${this.config.port}/health                ║
║  Version:    http://${this.config.host}:${this.config.port}/version               ║
║                                                                ║
║  Environment: ${process.env.NODE_ENV || 'development'}                            ║
║  Node.js:    ${process.version}                             ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
          `);
          resolve();
        });

        this.server.on('error', (error: Error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((error) => {
        if (error) {
          reject(error);
        } else {
          console.log('PCL HTTP Registry Server stopped');
          resolve();
        }
      });
    });
  }

  /**
   * Get Express app instance (for testing)
   */
  getApp(): Express {
    return this.app;
  }
}

/**
 * Start server if running directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new HTTPRegistryServer();

  server.start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });
}
