import { InstagramAdapter } from '../../platforms/instagram/src/InstagramAdapter';
import defaultLogger from '../config/logger';

export async function runInstagram(): Promise<void> {
  const adapter = new InstagramAdapter();
  defaultLogger.info('Initializing Instagram Adapter...');

  try {
    await adapter.authenticate({ sessionToken: 'boundary_check' });
    defaultLogger.info('Instagram Adapter boundary check completed.');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    defaultLogger.warn(`Instagram execution boundary state: ${message}`);
  }
}
