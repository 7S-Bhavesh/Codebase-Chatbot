import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extractAndChunk } from './treesitter.js';

for (const [extension, language, source] of [
  ['ts', 'ts', 'export function greet(name: string): string { return `Hello ${name}`; }'],
  ['tsx', 'ts', 'export const App = () => <main>Hello</main>;'],
  ['c', 'c', 'int add(int a, int b) { return a + b; }'],
  ['cs', 'csharp', 'class App { public int Add(int a, int b) { return a + b; } }'],
  ['tf', null, 'resource "aws_eks_cluster" "main" {\n  name = "test-cluster"\n}'],
]) {
  test(`${extension} files produce searchable chunks`, async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chunk-regression-'));
    try {
      const filename = `fixture.${extension}`;
      const fullpath = path.join(dir, filename);
      fs.writeFileSync(fullpath, source);
      const chunks = await extractAndChunk(fullpath, filename, 999999, language, 'test-repo', 'test-user');
      assert.ok(chunks.length > 0);
      assert.ok(chunks.every(chunk => chunk.file_path === filename && chunk.text && chunk.token_count > 0));
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
}
