import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { TextLoader } from "@langchain/classic/document_loaders/fs/text"
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { glob } from "glob";
import client from '../config/vectordb.config.js';


const BATCH_SIZE = 50;
const EXTENSION_MAP = {
    ".cpp": "cpp",

    ".go": "go",

    ".java": "java",

    ".kt": "kotlin",
    ".kts": "kotlin",

    ".js": "js",

    ".ts": "ts",

    ".php": "php",

    ".proto": "proto",

    ".py": "python",

    ".rst": "rst",

    ".rb": "ruby",

    ".rs": "rust",

    ".scala": "scala",

    ".swift": "swift",

    ".md": "markdown",

    ".tex": "latex",

    ".html": "html",
    ".htm": "html",

    ".sol": "sol",

    ".cs": "csharp",

    ".cob": "cobol",
    ".cbl": "cobol",

    ".c": "c",
    ".h": "c",

    ".lua": "lua",

    ".pl": "perl",
    ".pm": "perl",

    ".hs": "haskell"
};


export const indexProcessor = async (job) => {
    const { repo_url, email } = job.data;

    const prefix = path.join(os.tmpdir(), 'repo-clone-');
    const localPath = fs.mkdtempSync(prefix);
    try {

        execSync(`git clone --depth 1 ${repo_url} .`, { cwd: localPath, stdio: 'ignore' });

        const allowedExtensions = Object.keys(EXTENSION_MAP);
        const patterns = allowedExtensions.map(ext => `**/*${ext}`);

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
                "**/__pycache__/**"
            ]
        });

        const allChunks = [];

        for (const filePath of files) {
            const ext = path.extname(filePath).toLowerCase();
            const loader = new TextLoader(filePath);
            const docs = await loader.load();

            const language = EXTENSION_MAP[ext];
            let splitter;

            if (language) {
                splitter = RecursiveCharacterTextSplitter.fromLanguage(language, {
                    chunkSize: 1000, chunkOverlap: 200,
                });
            } else {
                splitter = new RecursiveCharacterTextSplitter({
                    chunkSize: 1000, chunkOverlap: 200,
                });
            }

            const newChunks = await splitter.splitDocuments(docs);

            newChunks.forEach(chunk => {
                chunk.metadata.source = filePath;
                chunk.metadata.repo = repo_url;
                chunk.metadata.userid = email;
                chunk.pageContent = `File: ${path.basename(filePath)}\n\n${chunk.pageContent}`;
            });

            allChunks.push(...newChunks);
        }

        console.log(allChunks);
        const myCollection = client.collections.use('RepoCodeChunk');
        let dataObjects = new Array();

        for (let srcObject of allChunks) {
            dataObjects.push({
                text: srcObject.pageContent,
                repourl: srcObject.metadata.repo,
                userid: srcObject.metadata.userid
            });
        }

        const totalObjects = dataObjects.length;

        for (let i = 0; i < totalObjects; i += BATCH_SIZE) {
            const batch = dataObjects.slice(i, i + BATCH_SIZE);
            await myCollection.data.insertMany(batch);
        }

    } catch (error) {
        console.error("Error processing repo:", error);
        throw error;
    } finally {
        if (fs.existsSync(localPath)) {
            fs.rmSync(localPath, { recursive: true, force: true });
            console.log(`Cleaned up ${localPath}`);
        }
    }
}