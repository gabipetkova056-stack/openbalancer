/**
 * ingestionRouter.js
 * Central routing logic: given a virtual file {name, content, ext},
 * detect the AI source format and return StandardizedDocument[].
 */
import { isClaudeExport, parseClaudeExport } from './claudeParser.js';
import { isChatGPTExport, parseChatGPTExport } from './chatgptParser.js';
import { parseMarkdownText, parseGenericJSON, parseCSV } from './genericParser.js';

/**
 * Attempt to parse a JSON string and return the parsed value,
 * or null if it fails.
 */
function tryParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Mask potential secrets in content (API keys, tokens, passwords).
 * Returns masked content for safety.
 */
function maskSecrets(text) {
  return text
    // Generic API keys (32+ hex/alphanum chars after key-like prefix)
    .replace(/(api[_-]?key|secret|token|password|passwd|bearer|access[_-]?key)(["'\s:=]+)(['"]?)([A-Za-z0-9_\-./+]{20,})(\3)/gi,
      (_, prefix, sep, q, val, q2) => `${prefix}${sep}${q}***REDACTED(${val.length}chars)***${q2}`)
    // sk- style OpenAI keys
    .replace(/\bsk-[A-Za-z0-9]{20,}/g, 'sk-***REDACTED***')
    // Claude API keys
    .replace(/\bsk-ant-[A-Za-z0-9\-]{20,}/g, 'sk-ant-***REDACTED***');
}

/**
 * Route a single virtual file to the correct parser.
 *
 * @param {{ name: string, content: string, ext: string }} vfile
 * @returns {{ docs: StandardizedDocument[], errors: string[] }}
 */
export function routeFile(vfile) {
  const { name, content, ext } = vfile;
  const errors = [];
  let docs = [];

  try {
    const safeContent = maskSecrets(content);

    if (ext === '.json') {
      const data = tryParseJSON(safeContent);
      if (!data) {
        errors.push(`${name}: invalid JSON — could not parse`);
        return { docs: [], errors };
      }

      if (isClaudeExport(data)) {
        docs = parseClaudeExport(data, name);
      } else if (isChatGPTExport(data)) {
        docs = parseChatGPTExport(data, name);
      } else {
        docs = [parseGenericJSON(data, name)];
      }

    } else if (ext === '.md' || ext === '.txt' || ext === '.log') {
      docs = [parseMarkdownText(safeContent, name)];

    } else if (ext === '.csv') {
      docs = [parseCSV(safeContent, name)];

    } else {
      // Unknown but text-based — treat as markdown
      docs = [parseMarkdownText(safeContent, name)];
    }

    // Filter out empty documents
    docs = docs.filter((d) => d.messages.length > 0 || d.metadata.totalChars > 0);

  } catch (err) {
    errors.push(`${name}: parse error — ${err.message}`);
  }

  return { docs, errors };
}

/**
 * Route multiple virtual files and return aggregated results.
 *
 * @param {Array<{name: string, content: string, ext: string}>} vfiles
 * @returns {{ docs: StandardizedDocument[], errors: string[] }}
 */
export function routeFiles(vfiles) {
  const allDocs = [];
  const allErrors = [];

  for (const vfile of vfiles) {
    const { docs, errors } = routeFile(vfile);
    allDocs.push(...docs);
    allErrors.push(...errors);
  }

  return { docs: allDocs, errors: allErrors };
}
