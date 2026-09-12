import mongoose from 'mongoose';
import { DatabaseAdapter } from './types';
import { defaultLogger, Logger } from '../../core/src/logger';
import { DatabaseError } from '../../core/src/errors';

export class MongooseDatabaseAdapter implements DatabaseAdapter {
  private logger: Logger;

  constructor(logger: Logger = defaultLogger) {
    this.logger = logger;
  }

  async connect(): Promise<void> {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      this.logger.warn('MONGODB_URI environment variable is not defined. Database operations will operate disconnected.');
      return;
    }

    try {
      await mongoose.connect(mongoUri);
      this.logger.info('Successfully connected to MongoDB database.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new DatabaseError(`Failed to connect to MongoDB: ${message}`, error instanceof Error ? error : undefined);
    }
  }

  async disconnect(): Promise<void> {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      this.logger.info('Disconnected from MongoDB.');
    }
  }

  isConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }
}

export const connectDB = async (): Promise<void> => {
  const adapter = new MongooseDatabaseAdapter();
  await adapter.connect();
};
