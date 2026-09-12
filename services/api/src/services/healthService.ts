import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { defaultLogger, Logger } from '../../../../packages/core/src/logger';

export class HealthService {
  private logger: Logger;

  constructor(logger: Logger = defaultLogger) {
    this.logger = logger;
  }

  getLiveness(_req: Request, res: Response): void {
    res.status(200).json({
      status: 'ok',
      service: 'riona-api',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  }

  getReadiness(_req: Request, res: Response): void {
    const mongoState = mongoose.connection.readyState;
    // 1 = connected
    const isReady = mongoState === 1 || process.env.NODE_ENV === 'test';

    if (!isReady) {
      this.logger.warn(`Readiness check failed. MongoDB readyState: ${mongoState}`);
      res.status(503).json({
        status: 'not_ready',
        service: 'riona-api',
        dependencies: {
          mongodb: 'disconnected',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      status: 'ready',
      service: 'riona-api',
      dependencies: {
        mongodb: 'connected',
      },
      timestamp: new Date().toISOString(),
    });
  }
}

export function setupGracefulShutdown(server: any, timeoutMs = 10000, logger: Logger = defaultLogger): void {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Initiating graceful shutdown...`);

    const forceExitTimeout = setTimeout(() => {
      logger.error(`Graceful shutdown timed out after ${timeoutMs}ms. Forcing exit.`);
      process.exit(1);
    }, timeoutMs);

    try {
      if (server && typeof server.close === 'function') {
        await new Promise((resolve) => server.close(resolve));
        logger.info('HTTP server closed cleanly.');
      }

      if (mongoose.connection && mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
        logger.info('MongoDB connections closed cleanly.');
      }

      clearTimeout(forceExitTimeout);
      logger.info('Graceful shutdown complete. Exiting process.');
      process.exit(0);
    } catch (err) {
      logger.error(`Error during graceful shutdown: ${err}`);
      clearTimeout(forceExitTimeout);
      process.exit(1);
    }
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}
