import { KnowledgeIngester, KnowledgeInput, KnowledgeDocument } from './types';
import { parseFile, SupportedFileType } from '../../../src/Agent/training/FilesTraining';
import { KnowledgeError } from '../../core/src/errors';
import { Logger, defaultLogger } from '../../core/src/logger';

export class ModularKnowledgeIngester implements KnowledgeIngester {
  private logger: Logger;

  constructor(logger: Logger = defaultLogger) {
    this.logger = logger;
  }

  async ingest(input: KnowledgeInput): Promise<KnowledgeDocument> {
    if (!input.workspaceId) {
      throw new KnowledgeError('Workspace ID is required for knowledge ingestion.');
    }

    this.logger.info(`Starting ingestion for source type: ${input.sourceType}`, {
      workspaceId: input.workspaceId,
      sourceType: input.sourceType,
    });

    let extractedText = '';
    const title = input.title || `Document_${Date.now()}`;

    try {
      if (['pdf', 'docx', 'doc', 'csv', 'txt'].includes(input.sourceType)) {
        if (!Buffer.isBuffer(input.sourceUriOrBuffer)) {
          throw new KnowledgeError(`File ingestion requires a Buffer input.`);
        }
        extractedText = await parseFile(
          input.sourceUriOrBuffer,
          input.sourceType as SupportedFileType
        );
      } else if (input.sourceType === 'youtube' || input.sourceType === 'web' || input.sourceType === 'audio') {
        extractedText = typeof input.sourceUriOrBuffer === 'string'
          ? input.sourceUriOrBuffer
          : input.sourceUriOrBuffer.toString('utf-8');
      } else {
        throw new KnowledgeError(`Unsupported knowledge source type: ${input.sourceType}`);
      }

      return {
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        workspaceId: input.workspaceId,
        sourceType: input.sourceType,
        title,
        extractedText,
        tokenCount: Math.ceil(extractedText.length / 4),
        createdAt: new Date(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Knowledge ingestion failed: ${message}`, { input });
      throw new KnowledgeError(`Failed to ingest knowledge: ${message}`, error instanceof Error ? error : undefined);
    }
  }
}
