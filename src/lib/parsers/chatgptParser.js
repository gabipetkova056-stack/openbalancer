/**
 * chatgptParser.js
 * Parses ChatGPT export format — conversations.json
 *
 * Expected shape (array of conversation objects):
 * [
 *   {
 *     id, title, create_time, update_time,
 *     mapping: {
 *       [node-id]: {
 *         id, parent, children,
 *         message: { id, author: { role }, content: { content_type, parts }, create_time }
 *       }
 *     }
 *   }
 * ]
 */
import { buildMessage, finalizeDocument, generateId } from '../schema.js';

/** Detect if raw JSON looks like a ChatGPT export */
export function isChatGPTExport(data) {
  if (!Array.isArray(data) || data.length === 0) return false;
  const first = data[0];
  return (
    typeof first.mapping === 'object' &&
    first.mapping !== null &&
    (first.create_time !== undefined || first.id !== undefined)
  );
}

/** Traverse the mapping tree and return messages in order */
function traverseMapping(mapping) {
  if (!mapping) return [];

  // Find root node (no parent or parent not in mapping)
  const ids = Object.keys(mapping);
  const childSet = new Set(ids.flatMap((id) => mapping[id].children || []));
  const roots = ids.filter((id) => !mapping[id].parent || !mapping[mapping[id].parent]);

  const messages = [];

  function walk(nodeId, depth = 0) {
    if (depth > 2000) return; // safety guard
    const node = mapping[nodeId];
    if (!node) return;

    const msg = node.message;
    if (msg && msg.author && msg.content) {
      const role = msg.author.role === 'user' ? 'human' : 'assistant';
      // Skip system messages and tool messages from the replay view
      if (role === 'human' || role === 'assistant') {
        const parts = msg.content.parts || [];
        const text = parts
          .map((p) => (typeof p === 'string' ? p : p?.text || ''))
          .join('\n')
          .trim();

        if (text) {
          messages.push(
            buildMessage({
              id:         msg.id || generateId(),
              role,
              content:    text,
              created_at: msg.create_time
                ? new Date(msg.create_time * 1000).toISOString()
                : new Date().toISOString(),
            })
          );
        }
      }
    }

    for (const childId of node.children || []) {
      walk(childId, depth + 1);
    }
  }

  for (const rootId of roots) walk(rootId);

  // Deduplicate by id
  const seen = new Set();
  return messages.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

/** Parse a single ChatGPT conversation object → StandardizedDocument */
function parseConversation(conv, fileName) {
  const messages = traverseMapping(conv.mapping);

  return finalizeDocument({
    id:         conv.id || generateId(),
    type:       'conversation',
    source:     'chatgpt',
    title:      conv.title || 'Untitled ChatGPT Chat',
    fileName,
    created_at: conv.create_time ? new Date(conv.create_time * 1000).toISOString() : new Date().toISOString(),
    updated_at: conv.update_time ? new Date(conv.update_time * 1000).toISOString() : new Date().toISOString(),
    messages,
    rawSource:  conv,
  });
}

/**
 * Parse ChatGPT export JSON.
 * @param {*} data   Parsed JSON (array of conversations)
 * @param {string} fileName
 * @returns {import('../schema.js').StandardizedDocument[]}
 */
export function parseChatGPTExport(data, fileName = 'conversations.json') {
  if (!Array.isArray(data)) {
    if (data && data.mapping) return [parseConversation(data, fileName)];
    return [];
  }
  return data.filter((c) => c.mapping).map((conv) => parseConversation(conv, fileName));
}
