/**
 * claudeParser.js
 * Parses Claude AI export format — conversations.json
 *
 * Expected shape (array or object with .conversations):
 * {
 *   conversations: [
 *     {
 *       uuid, name, created_at, updated_at,
 *       chat_messages: [{ uuid, text, sender, created_at, attachments, files }]
 *     }
 *   ]
 * }
 */
import { buildMessage, finalizeDocument, generateId } from '../schema.js';

/** Detect if raw JSON looks like a Claude export */
export function isClaudeExport(data) {
  if (Array.isArray(data)) {
    return data.length > 0 && (data[0].chat_messages !== undefined || data[0].sender !== undefined);
  }
  if (data && typeof data === 'object') {
    return Array.isArray(data.conversations) &&
      data.conversations.length > 0 &&
      data.conversations[0].chat_messages !== undefined;
  }
  return false;
}

/** Map a single Claude chat_message to StandardizedMessage */
function mapMessage(msg) {
  const role = msg.sender === 'human' ? 'human' : 'assistant';
  const content =
    typeof msg.text === 'string'
      ? msg.text
      : Array.isArray(msg.content)
      ? msg.content.map((c) => (typeof c === 'string' ? c : c.text || '')).join('\n')
      : String(msg.text || '');

  return buildMessage({
    id:         msg.uuid || generateId(),
    role,
    content,
    created_at: msg.created_at || new Date().toISOString(),
  });
}

/** Parse a single Claude conversation object → StandardizedDocument */
function parseConversation(conv, fileName) {
  const messages = (conv.chat_messages || []).map(mapMessage);

  return finalizeDocument({
    id:         conv.uuid || generateId(),
    type:       'conversation',
    source:     'claude',
    title:      conv.name || conv.title || 'Untitled Claude Chat',
    fileName,
    created_at: conv.created_at || new Date().toISOString(),
    updated_at: conv.updated_at || new Date().toISOString(),
    messages,
    rawSource:  conv,
  });
}

/**
 * Parse Claude export JSON.
 * @param {*} data   Parsed JSON
 * @param {string} fileName
 * @returns {import('../schema.js').StandardizedDocument[]}
 */
export function parseClaudeExport(data, fileName = 'conversations.json') {
  let conversations = [];

  if (Array.isArray(data)) {
    // Direct array of conversations
    conversations = data.filter((c) => c.chat_messages);
    if (conversations.length === 0 && data[0]?.text !== undefined) {
      // Single conversation passed as array of messages
      conversations = [{ uuid: generateId(), name: fileName, chat_messages: data, created_at: new Date().toISOString() }];
    }
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data.conversations)) {
      conversations = data.conversations;
    } else if (data.chat_messages) {
      conversations = [data];
    }
  }

  return conversations.map((conv) => parseConversation(conv, fileName));
}
