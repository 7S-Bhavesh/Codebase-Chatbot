import 'dotenv/config';
import { Worker } from 'bullmq';
import connection from './config/bullmq.config.js';
import { indexProcessor } from './handler/indexer.js';

const queue_name = "repo-index-queue";
console.log("Starting...\n");
await new Worker(
    queue_name,
    indexProcessor,
    {
        connection,
        concurrency : 5,
    }
);