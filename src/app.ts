import dotenv from 'dotenv';
import apiApp from '../services/api/src/app';
import { connectDB } from './config/db';
import logger, { setupErrorHandlers } from './config/logger';

setupErrorHandlers();
dotenv.config();

connectDB().catch((err) => {
  logger.warn(`Database connection warning: ${err.message}`);
});

const PORT = process.env.PORT || 3001;

apiApp.listen(PORT, () => {
  logger.info(`Riona API Server running on port ${PORT}`);
});

export default apiApp;


