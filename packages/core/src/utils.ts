import fs from 'fs';
import path from 'path';
import { defaultLogger, Logger } from './logger';

export function setup_HandleError(error: unknown, contextMessage: string = 'Application Error:', logger: Logger = defaultLogger): void {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(`${contextMessage} ${message}`, { error });
}

export async function saveScrapedData(url: string, content: string): Promise<string> {
  const outputDir = path.join(process.cwd(), 'scraped_data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `${url.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.txt`;
  const filePath = path.join(outputDir, filename);
  await fs.promises.writeFile(filePath, content, 'utf-8');
  return filePath;
}
