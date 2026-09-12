import { Worker, Job } from 'bullmq';
import { connection } from './QueueManager';

export interface ResearchJobData {
  topic: string;
  reference_urls?: string[];
  target_brand?: string;
  workspace_id?: string;
}

export interface ContentJobData {
  topic: string;
  brandId?: string;
  platform?: string;
  contentType?: string;
}

export interface DispatchJobData {
  contentId: string;
  scheduledAt: string;
  timezone?: string;
  brandId?: string;
}

// 1. Research Worker
export const researchWorker = new Worker<ResearchJobData>(
  'research-queue',
  async (job: Job<ResearchJobData>) => {
    console.log(`[BullMQ Worker #01] Processing Research Job ID #${job.id}: Topic "${job.data.topic}"`);
    // Simulated background CrewAI scraping & hook synthesis
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      status: 'completed',
      topic: job.data.topic,
      processedBy: 'ResearchWorker-Pool-01',
      timestamp: new Date().toISOString(),
    };
  },
  { connection, concurrency: 3 }
);

// 2. Content Generation Worker
export const contentWorker = new Worker<ContentJobData>(
  'content-queue',
  async (job: Job<ContentJobData>) => {
    console.log(`[BullMQ Worker #02] Processing Content Job ID #${job.id}: "${job.data.topic}"`);
    await new Promise((resolve) => setTimeout(resolve, 600));
    return {
      status: 'completed',
      title: job.data.topic,
      processedBy: 'ContentWorker-Pool-02',
      timestamp: new Date().toISOString(),
    };
  },
  { connection, concurrency: 5 }
);

// 3. Social Media Dispatch Worker
export const dispatchWorker = new Worker<DispatchJobData>(
  'dispatch-queue',
  async (job: Job<DispatchJobData>) => {
    console.log(`[BullMQ Worker #03] Processing Social Dispatch Job ID #${job.id}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      status: 'dispatched',
      contentId: job.data.contentId,
      processedBy: 'DispatchWorker-Pool-03',
      timestamp: new Date().toISOString(),
    };
  },
  { connection, concurrency: 5 }
);

researchWorker.on('completed', (job) => {
  console.log(`[BullMQ Worker] Job #${job.id} (Research) completed successfully!`);
});

contentWorker.on('completed', (job) => {
  console.log(`[BullMQ Worker] Job #${job.id} (Content) completed successfully!`);
});

dispatchWorker.on('completed', (job) => {
  console.log(`[BullMQ Worker] Job #${job.id} (Dispatch) completed successfully!`);
});
