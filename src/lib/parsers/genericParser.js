/**
 * genericParser.js
 * Fallback parser for .md, .txt, plain JSON, and CSV files.
 * Converts them into a StandardizedDocument with type 'note' or 'data'.
 */
import { buildMessage, finalizeDocument, generateId } from '../schema.js';

/** Split text into chunks at heading boundaries or double-newlines */
function splitIntoBlocks(text) {
  // Split at ## headings first, then at paragraph breaks
  return text
    .split(/\n(?=#{1,3}\s)|(?:\n{2,})/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Parse a Markdown/TXT string into a single-document conversation replay */
export function parseMarkdownText(text, fileName = 'document.md') {
  // Try to detect Q&A / chat pattern: lines starting with > or "User:", "Assistant:"
  const chatLineRe = /^(User|Human|You|Me|Assistant|AI|Bot|Claude|GPT)[:\s]+/i;
  const blockQuoteRe = /^>\s*/;

  const lines = text.split('\n');
  const isChatLike = lines.filter((l) => chatLineRe.test(l) || blockQuoteRe.test(l)).length >= 3;

  let messages;

  if (isChatLike) {
    messages = [];
    let buffer = '';
    let currentRole = 'human';

    for (const line of lines) {
      const humanMatch = /^(?:User|Human|You|Me)[:\s]+(.*)$/i.exec(line);
      const aiMatch    = /^(?:Assistant|AI|Bot|Claude|GPT)[:\s]+(.*)$/i.exec(line);

      if (humanMatch) {
        if (buffer.trim()) {
          messages.push(buildMessage({ id: generateId(), role: currentRole, content: buffer.trim(), created_at: new Date().toISOString() }));
        }
        buffer = humanMatch[1];
        currentRole = 'human';
      } else if (aiMatch) {
        if (buffer.trim()) {
          messages.push(buildMessage({ id: generateId(), role: currentRole, content: buffer.trim(), created_at: new Date().toISOString() }));
        }
        buffer = aiMatch[1];
        currentRole = 'assistant';
      } else {
        buffer += '\n' + line;
      }
    }
    if (buffer.trim()) {
      messages.push(buildMessage({ id: generateId(), role: currentRole, content: buffer.trim(), created_at: new Date().toISOString() }));
    }
  } else {
    // Treat the document as sections / "messages" split by headings
    const blocks = splitIntoBlocks(text);
    messages = blocks.map((block) =>
      buildMessage({
        id:         generateId(),
        role:       block.startsWith('#') ? 'system' : 'assistant',
        content:    block,
        created_at: new Date().toISOString(),
      })
    );
    if (messages.length === 0) {
      messages = [buildMessage({ id: generateId(), role: 'assistant', content: text.slice(0, 50000), created_at: new Date().toISOString() })];
    }
  }

  // Extract title from first heading or file name
  const headingMatch = /^#{1,2}\s+(.+)/m.exec(text);
  const title = headingMatch ? headingMatch[1].trim() : fileName.replace(/\.\w+$/, '');

  return finalizeDocument({
    id:         generateId(),
    type:       'note',
    source:     'generic',
    title,
    fileName,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    messages,
    rawSource:  text,
  });
}

/** Parse a raw JSON object that isn't a known AI export */
export function parseGenericJSON(data, fileName = 'data.json') {
  const text = JSON.stringify(data, null, 2);

  const messages = [
    buildMessage({
      id:         generateId(),
      role:       'assistant',
      content:    '```json\n' + text.slice(0, 40000) + (text.length > 40000 ? '\n// ... truncated' : '') + '\n```',
      created_at: new Date().toISOString(),
    }),
  ];

  return finalizeDocument({
    id:         generateId(),
    type:       'data',
    source:     'generic',
    title:      fileName.replace(/\.\w+$/, '') || 'JSON Data',
    fileName,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    messages,
    rawSource:  data,
  });
}

/** Parse CSV text into a tabular document */
export function parseCSV(text, fileName = 'data.csv') {
  const lines = text.trim().split('\n');
  const headers = lines[0]?.split(',').map((h) => h.trim().replace(/^"|"$/g, '')) || [];
  const rows = lines.slice(1, 201); // cap at 200 rows for preview

  const tableText = [
    '| ' + headers.join(' | ') + ' |',
    '| ' + headers.map(() => '---').join(' | ') + ' |',
    ...rows.map((row) =>
      '| ' + row.split(',').map((c) => c.trim().replace(/^"|"$/g, '')).join(' | ') + ' |'
    ),
  ].join('\n');

  const content = `**${fileName}** — ${lines.length - 1} rows, ${headers.length} columns\n\n` + tableText +
    (lines.length > 201 ? `\n\n*…and ${lines.length - 201} more rows (truncated)*` : '');

  const messages = [buildMessage({ id: generateId(), role: 'assistant', content, created_at: new Date().toISOString() })];

  return finalizeDocument({
    id:         generateId(),
    type:       'data',
    source:     'generic',
    title:      fileName,
    fileName,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    messages,
    rawSource:  text,
  });
}
