/**
 * treesitter.js — tree-sitter-based unit extraction + chunking
 *
 * Exports:
 *   extractAndChunk(filePath, relFilePath, repoId, language)
 *     → Promise<Chunk[]>
 *
 * Each Chunk:
 *   { chunk_id, repo_id, file_path, start_line, end_line,
 *     unit_id, signature, is_signature_chunk, chunk_index,
 *     token_count, text, repourl, userid }
 *
 * Falls back to RecursiveCharacterTextSplitter (whole-file-as-unit)
 * when tree-sitter grammar is unavailable or parse fails.
 */

import { createHash } from 'crypto';
import fs from 'fs';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

// ── Token counting ────────────────────────────────────────────────────────────
// js-tiktoken uses cl100k_base as a Gemini proxy (no exact match exists).
let enc = null;
async function getEncoder() {
  if (enc) return enc;
  try {
    const { get_encoding } = await import('js-tiktoken');
    enc = get_encoding('cl100k_base');
  } catch {
    enc = null; // count chars/4 as fallback
  }
  return enc;
}

function countTokens(text, encoder) {
  if (encoder) return encoder.encode(text).length;
  return Math.ceil(text.length / 4); // rough approximation
}

// ── Tree-sitter grammar registry ──────────────────────────────────────────────
// Map language name → lazy loader returning { Parser, Language } or null.
const GRAMMAR_LOADERS = {
  python: async () => {
    const Parser = (await import('tree-sitter')).default;
    const Python = (await import('tree-sitter-python')).default;
    return { Parser, Language: Python };
  },
  js: async () => {
    const Parser = (await import('tree-sitter')).default;
    const JS = (await import('tree-sitter-javascript')).default;
    return { Parser, Language: JS };
  },
  ts: async () => {
    const Parser = (await import('tree-sitter')).default;
    const TS = (await import('tree-sitter-typescript')).default.typescript;
    return { Parser, Language: TS };
  },
  go: async () => {
    const Parser = (await import('tree-sitter')).default;
    const Go = (await import('tree-sitter-go')).default;
    return { Parser, Language: Go };
  },
  java: async () => {
    const Parser = (await import('tree-sitter')).default;
    const Java = (await import('tree-sitter-java')).default;
    return { Parser, Language: Java };
  },
  rust: async () => {
    const Parser = (await import('tree-sitter')).default;
    const Rust = (await import('tree-sitter-rust')).default;
    return { Parser, Language: Rust };
  },
  cpp: async () => {
    const Parser = (await import('tree-sitter')).default;
    const Cpp = (await import('tree-sitter-cpp')).default;
    return { Parser, Language: Cpp };
  },
  c: async () => {
    const Parser = (await import('tree-sitter')).default;
    const C = (await import('tree-sitter-c')).default;
    return { Parser, Language: C };
  },
  csharp: async () => {
    const Parser = (await import('tree-sitter')).default;
    const CS = (await import('tree-sitter-c-sharp')).default;
    return { Parser, Language: CS };
  },
  ruby: async () => {
    const Parser = (await import('tree-sitter')).default;
    const Ruby = (await import('tree-sitter-ruby')).default;
    return { Parser, Language: Ruby };
  },
};

// ── Node types that constitute "units" per language ──────────────────────────
const UNIT_NODE_TYPES = {
  python: ['function_definition', 'async_function_definition', 'class_definition'],
  js: ['function_declaration', 'function_expression', 'arrow_function',
       'method_definition', 'class_declaration', 'export_statement'],
  ts: ['function_declaration', 'function_expression', 'arrow_function',
       'method_definition', 'class_declaration', 'export_statement',
       'interface_declaration', 'type_alias_declaration'],
  go: ['function_declaration', 'method_declaration'],
  java: ['method_declaration', 'class_declaration', 'interface_declaration',
         'constructor_declaration', 'enum_declaration'],
  rust: ['function_item', 'impl_item', 'trait_item', 'struct_item', 'enum_item'],
  cpp: ['function_definition', 'class_specifier', 'struct_specifier'],
  c: ['function_definition'],
  csharp: ['method_declaration', 'class_declaration', 'interface_declaration',
            'constructor_declaration', 'property_declaration'],
  ruby: ['method', 'singleton_method', 'class', 'module'],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function sha256(str) {
  return createHash('sha256').update(str).digest('hex').slice(0, 32);
}

function makeChunkId(repoId, filePath, startLine) {
  return sha256(`${repoId}:${filePath}:${startLine}`);
}

function makeUnitId(repoId, filePath, unitName, startLine) {
  return sha256(`${repoId}:${filePath}:${unitName}:${startLine}`);
}

/**
 * Extract the "name" of a unit node for ID generation.
 * Tries common child node types; falls back to line number.
 */
function getUnitName(node) {
  const nameNode =
    node.childForFieldName?.('name') ||
    node.children?.find(c => c.type === 'identifier' || c.type === 'property_identifier');
  return nameNode ? nameNode.text : `anon_${node.startPosition.row}`;
}

/**
 * Recursively collect all top-level unit nodes from a tree.
 * Does NOT recurse into already-collected units (no nested units).
 */
function collectUnits(node, unitTypes, results = []) {
  if (unitTypes.includes(node.type)) {
    results.push(node);
    return results; // don't recurse into this unit
  }
  for (const child of node.children) {
    collectUnits(child, unitTypes, results);
  }
  return results;
}

/**
 * Split `text` into overlapping character-based chunks, tracking absolute
 * line numbers by counting newlines in the prefix before each chunk.
 */
async function chunkText(text, fileStartLine, chunkSize = 800, chunkOverlap = 150, language = null) {
  const splitter = language
    ? RecursiveCharacterTextSplitter.fromLanguage(language, { chunkSize, chunkOverlap })
    : new RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap });

  const docs = await splitter.createDocuments([text]);

  let searchOffset = 0;
  return docs.map(doc => {
    // Find the character offset of this chunk within text
    const chunkText = doc.pageContent;
    const idx = text.indexOf(chunkText, searchOffset);
    const prefix = idx >= 0 ? text.slice(0, idx) : '';
    searchOffset = idx >= 0 ? idx + chunkText.length : searchOffset;

    const linesInPrefix = (prefix.match(/\n/g) || []).length;
    const linesInChunk  = (chunkText.match(/\n/g) || []).length;

    return {
      text: chunkText,
      startLine: fileStartLine + linesInPrefix,
      endLine:   fileStartLine + linesInPrefix + linesInChunk,
    };
  });
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Parse a source file with tree-sitter and produce chunks.
 * Each chunk belongs to exactly one syntactic unit (function/class).
 * Files with no detectable units are treated as a single unit.
 *
 * @param {string} filePath    Absolute path to the source file.
 * @param {string} relFilePath Relative path from the repo root (stored in Weaviate).
 * @param {number} repoId      Integer FK from PostgreSQL REPO_INPUT.
 * @param {string} language    Language key from EXTENSION_MAP.
 * @param {string} repoUrl     Stored for backward compat.
 * @param {string} userId      Stored for backward compat.
 * @returns {Promise<object[]>} Array of Weaviate data objects.
 */
export async function extractAndChunk(filePath, relFilePath, repoId, language, repoUrl, userId) {
  const encoder = await getEncoder();
  const source = fs.readFileSync(filePath, 'utf8');
  const lines = source.split('\n');

  const chunkSize    = 800;
  const chunkOverlap = 150;

  // ── Attempt tree-sitter parse ─────────────────────────────────────────────
  let units = null;

  try {
    const loader = GRAMMAR_LOADERS[language];
    if (loader) {
      const { Parser, Language } = await loader();
      const parser = new Parser();
      parser.setLanguage(Language);
      const tree = parser.parse(source);

      const unitTypes = UNIT_NODE_TYPES[language] || [];
      const unitNodes = collectUnits(tree.rootNode, unitTypes);

      if (unitNodes.length > 0) {
        units = unitNodes.map(node => ({
          name:      getUnitName(node),
          startLine: node.startPosition.row,     // 0-indexed
          endLine:   node.endPosition.row,
          text:      source.slice(
            node.startIndex,
            node.endIndex
          ),
        }));
      }
    }
  } catch (err) {
    console.warn(`[treesitter] Parse failed for ${relFilePath} (${language}): ${err.message} — using fallback`);
  }

  // ── Fallback: whole file = one unit ──────────────────────────────────────
  if (!units || units.length === 0) {
    units = [{
      name: 'file',
      startLine: 0,
      endLine: lines.length - 1,
      text: source,
    }];
  }

  // ── Build chunk objects ───────────────────────────────────────────────────
  const dataObjects = [];

  for (const unit of units) {
    const unitId    = makeUnitId(repoId, relFilePath, unit.name, unit.startLine);
    const signature = unit.text.split('\n')[0].trim();

    // Split the unit's text into sub-chunks
    const subChunks = await chunkText(
      unit.text,
      unit.startLine + 1,  // convert to 1-indexed
      chunkSize,
      chunkOverlap,
      language
    );

    // Compute total unit token count (sum of sub-chunk counts)
    let unitTokenCount = 0;
    for (const sc of subChunks) {
      unitTokenCount += countTokens(sc.text, encoder);
    }

    subChunks.forEach((sc, idx) => {
      const chunkId = makeChunkId(repoId, relFilePath, sc.startLine);
      const tokens  = countTokens(sc.text, encoder);

      dataObjects.push({
        chunk_id:           chunkId,
        repo_id:            repoId,
        file_path:          relFilePath,
        start_line:         sc.startLine,
        end_line:           sc.endLine,
        unit_id:            unitId,
        signature:          signature,
        is_signature_chunk: idx === 0,
        chunk_index:        idx,
        token_count:        tokens,
        text:               sc.text,
        repourl:            repoUrl,
        userid:             userId,
        // Attach unit token count so expand stage can check LARGE_UNIT_TOKENS
        // without an extra Weaviate round-trip (not stored — used ephemerally).
        _unit_token_count:  unitTokenCount,
      });
    });
  }

  return dataObjects;
}
