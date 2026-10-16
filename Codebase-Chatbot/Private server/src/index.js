import 'dotenv/config';
import { Worker } from 'bullmq';
import connection from './config/bullmq.config.js';
import { indexProcessor } from './handler/indexer.js';

const queue_name = "repo-index-queue";
console.log("Starting...\n");
const worker = new Worker(
    queue_name,
    indexProcessor,
    {
        connection,
        concurrency : 5,
    }
);
worker.on('ready', () => console.log('Repository indexing worker ready'));
worker.on('completed', job => console.log(`Indexing job ${job.id} completed`));
worker.on('failed', (job, error) => console.error(`Indexing job ${job?.id} failed:`, error.message));
worker.on('error', error => console.error('Worker error:', error.message));
