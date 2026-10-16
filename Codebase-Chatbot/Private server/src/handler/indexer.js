import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { glob } from "glob";
import client from '../config/vectordb.config.js';
import { ensureSchema } from './schemaSetup.js';
import { extractAndChunk } from './treesitter.js';

const BATCH_SIZE = 50;

// Files we know how to parse (tree-sitter language key as value).
const EXTENSION_MAP = {
  ".py":   "python",
  ".js":   "js",
  ".jsx":  "js",
  ".ts":   "ts",
  ".tsx":  "ts",
  ".go":   "go",
  ".java": "java",
  ".rs":   "rust",
  ".cpp":  "cpp",
  ".cc":   "cpp",
  ".cxx":  "cpp",
  ".c":    "c",
  ".h":    "c",
  ".cs":   "csharp",
  ".rb":   "ruby",
  // The following have no tree-sitter grammar loaded; they fall back to
  // whole-file-as-unit chunking via the graceful fallback in treesitter.js.
  ".kt":   null,
  ".kts":  null,
  ".php":  null,
  ".proto":null,
  ".rst":  null,
  ".scala":null,
  ".swift":null,
  ".md":   null,
  ".tex":  null,
  ".html": null,
  ".htm":  null,
  ".sol":  null,
  ".cob":  null,
  ".cbl":  null,
  ".lua":  null,
  ".pl":   null,
  ".pm":   null,
  ".hs":   null,
  ".tf":   null,
  ".yaml": null,
  ".yml":  null,
  ".sh":   null,
  ".bash": null,
  ".ps1":  null,
  ".toml": null,
  ".css":  null,
  ".scss": null,
};

// Ensure schema exists once, the first time a worker starts.
let schemaPromise;
async function initSchema() {
  schemaPromise ??= ensureSchema().catch(error => {
    schemaPromise = undefined;
    throw error;
  });
  await schemaPromise;
}

/**
 * BullMQ job processor.
 * job.data = { repo_url, email, repo_id }
 *
 * repo_id is the integer PK from PostgreSQL REPO_INPUT — it is now passed
 * through the queue so Weaviate chunks can be filtered by integer instead of
 * URL string.
 */
export const indexProcessor = async (job) => {
  const { repo_url, email, repo_id } = job.data;

  if (!repo_id) {
    throw new Error('job.data.repo_id is required — update repoInputController.js to include it in the queue payload');
  }

  await initSchema();

  const prefix    = path.join(os.tmpdir(), 'repo-clone-');
  const localPath = fs.mkdtempSync(prefix);

  try {
    console.log(`[indexer] Cloning ${repo_url} into ${localPath}`);
    execFileSync('git', ['clone', '--depth', '1', '--', repo_url, '.'], { cwd: localPath, stdio: 'ignore' });

    const allowedExtensions = Object.keys(EXTENSION_MAP);
    const patterns = [...allowedExtensions.map(ext => `**/*${ext}`), '**/Dockerfile', '**/Dockerfile.*', '**/Jenkinsfile', '**/Makefile'];

    const files = await glob(patterns, {
      cwd: localPath,
      nodir: true,
      absolute: true,
      ignore: [
        "**/node_modules/**",
        "**/.git/**",
        "**/dist/**",
        "**/build/**",
        "**/venv/**",
        "**/__pycache__/**",
        "**/.next/**",
        "**/target/**",
      ]
    });

    console.log(`[indexer] Found ${files.length} files to index for repo_id=${repo_id}`);

    const allObjects = [];
    const failedFiles = [];
    const collection = client.collections.use('RepoCodeChunk');
    const existingPaths = new Set();
    if (job.data.onlyMissingFiles) {
      let after;
      while (true) {
        const page = await collection.query.fetchObjects({
          filters: collection.filter.byProperty('repo_id').equal(repo_id),
          returnProperties: ['file_path', 'userid'], limit: 500, after,
        });
        for (const object of page.objects) {
          if (object.properties.userid === email) existingPaths.add(object.properties.file_path);
        }
        if (page.objects.length < 500) break;
        after = page.objects.at(-1).uuid;
      }
      console.log(`[indexer] Preserving ${existingPaths.size} already indexed files`);
    }

    for (const filePath of files) {
      const ext      = path.extname(filePath).toLowerCase();
      const language = EXTENSION_MAP[ext] ?? null;

      // Relative path from the cloned root (stored in Weaviate)
      const relFilePath = path.relative(localPath, filePath).replace(/\\/g, '/');
      if (existingPaths.has(relFilePath)) continue;

      try {
        const chunks = await extractAndChunk(
          filePath,
          relFilePath,
          repo_id,
          language,
          repo_url,
          email
        );
        allObjects.push(...chunks);
      } catch (fileErr) {
        console.warn(`[indexer] Skipping ${relFilePath}: ${fileErr.message}`);
        failedFiles.push(relFilePath);
      }
    }

    if (failedFiles.length) throw new Error(`Could not index files: ${failedFiles.join(', ')}`);
    console.log(`[indexer] Inserting ${allObjects.length} chunks for repo_id=${repo_id}`);

    // Strip internal ephemeral fields (_unit_token_count) before inserting
    const weaviateObjects = allObjects.map(obj => {
      const { _unit_token_count, ...rest } = obj;
      return rest;
    });

    for (let i = 0; i < weaviateObjects.length; i += BATCH_SIZE) {
      const batch = weaviateObjects.slice(i, i + BATCH_SIZE);
      const result = await collection.data.insertMany(batch);
      if (result.hasErrors) {
        const messages = Object.values(result.errors).map(error => error.message);
        throw new Error(`Vector insert failed: ${messages.join('; ')}`);
      }
    }

    console.log(`[indexer] Done indexing repo_id=${repo_id}. Total chunks: ${weaviateObjects.length}`);

  } catch (error) {
    console.error(`[indexer] Error processing repo_id=${repo_id}:`, error);
    throw error;
  } finally {
    if (fs.existsSync(localPath)) {
      fs.rmSync(localPath, { recursive: true, force: true });
      console.log(`[indexer] Cleaned up ${localPath}`);
    }
  }
};
