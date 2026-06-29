/**
 * StandardizedDocument schema — canonical format for all parsed AI exports.
 *
 * Every parser MUST produce an object conforming to this shape.
 * Unknown/missing fields default to the values shown below.
 */

/**
 * @typedef {Object} StandardizedMessage
 * @property {string} id
 * @property {'human'|'assistant'|'system'} role
 * @property {string} content
 * @property {string} created_at   ISO-8601 string
 * @property {{ isCodeHeavy: boolean, hasActionItems: boolean, charCount: number, wordCount: number }} metadata
 */

/**
 * @typedef {Object} CodeSnippet
 * @property {string} language
 * @property {string} code
 * @property {string} fromMessageId
 */

/**
 * @typedef {Object} StandardizedDocument
 * @property {string} id              UUID
 * @property {'conversation'|'note'|'code'|'data'|'memory'|'unknown'} type
 * @property {'claude'|'chatgpt'|'notebooklm'|'generic'} source
 * @property {string} title
 * @property {string} fileName        Original file name
 * @property {string} created_at     ISO-8601
 * @property {string} updated_at     ISO-8601
 * @property {{ messageCount: number, humanMessages: number, aiMessages: number, totalChars: number, hasCode: boolean, hasActionItems: boolean, topics: string[], longestMessageChars: number }} metadata
 * @property {StandardizedMessage[]} messages
 * @property {{ actionItems: string[], decisions: string[], codeBlocks: CodeSnippet[] }} insights
 * @property {*} rawSource
 */

/** Generate a simple pseudo-UUID */
export function generateId() {
  return 'doc-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
}

/** Extract code blocks from a markdown string */
export function extractCodeBlocks(text, messageId = '') {
  const blocks = [];
  const re = /```(\w*)\n?([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const code = m[2].trim();
    if (code.length > 0) {
      blocks.push({ language: m[1] || 'text', code, fromMessageId: messageId });
    }
  }
  return blocks;
}

/** Strip markdown fences and return plain text */
export function stripMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, '[code block]')
    .replace(/`[^`]+`/g, (m) => m.slice(1, -1))
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Detect action-item patterns in text */
export function extractActionItems(text) {
  const items = [];
  const patterns = [
    /^[-*•]\s+(TODO|TASK|ACTION|Do|Fix|Add|Update|Remove|Implement|Create|Set up|Configure|Test)[:.]?\s+(.+)/gim,
    /^(?:\d+\.\s+)?(TODO|TASK):\s*(.+)/gim,
    /^\[[ x]\]\s+(.+)/gim,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const item = (m[2] || m[1] || '').trim();
      if (item && item.length > 5 && item.length < 300) items.push(item);
    }
  }
  return [...new Set(items)];
}

/** Detect decisions / key conclusions in text */
export function extractDecisions(text) {
  const items = [];
  const patterns = [
    /(?:decided|decision|conclusion|agreed|we will|going with|chosen|final answer|solution is)[:\s]+([^.\n]{20,200})/gi,
    /(?:## |### )(Decision|Conclusion|Summary|Final|Result)[:\s]*([\s\S]{0,300})(?=\n#{1,3}|$)/gi,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const item = (m[2] || m[1] || '').trim();
      if (item && item.length > 10) items.push(item.slice(0, 240));
    }
  }
  return [...new Set(items)].slice(0, 20);
}

/** Guess broad topic labels from text content */
export function guessTopics(text) {
  const lc = text.toLowerCase();
  const topicMap = [
    ['infrastructure', ['vps', 'nginx', 'docker', 'server', 'hostinger', 'ssh', 'tailscale', 'pm2']],
    ['automation', ['n8n', 'workflow', 'automation', 'webhook', 'trigger', 'schedule']],
    ['ai / llm', ['claude', 'openai', 'gpt', 'gemini', 'llm', 'prompt', 'anthropic', 'token']],
    ['database', ['supabase', 'postgres', 'sql', 'query', 'table', 'rls', 'schema']],
    ['development', ['react', 'javascript', 'python', 'typescript', 'code', 'function', 'component', 'api']],
    ['business', ['wallester', 'registration', 'invoice', 'ocr', 'eik', 'vat', 'microinvest']],
    ['security', ['api key', 'secret', 'credentials', 'auth', 'zero trust', 'encryption']],
    ['agents', ['openclaw', 'leon', 'molti', 'agent', 'heartbeat', 'task', 'fleet']],
  ];
  return topicMap
    .filter(([, keywords]) => keywords.some((kw) => lc.includes(kw)))
    .map(([label]) => label)
    .slice(0, 5);
}

/**
 * Build a StandardizedMessage from raw fields.
 */
export function buildMessage({ id, role, content, created_at }) {
  const hasCode = /```/.test(content);
  const hasAI = /(action|todo|fix|implement|set up|task)[:\s]/i.test(content);
  return {
    id: id || generateId(),
    role: role || 'assistant',
    content: content || '',
    created_at: created_at || new Date().toISOString(),
    metadata: {
      isCodeHeavy: hasCode,
      hasActionItems: hasAI,
      charCount: content.length,
      wordCount: content.split(/\s+/).filter(Boolean).length,
    },
  };
}

/**
 * Finalize a StandardizedDocument from its messages array.
 * Computes all derived metadata and insight fields.
 */
export function finalizeDocument({ id, type, source, title, fileName, created_at, updated_at, messages, rawSource }) {
  const allText = messages.map((m) => m.content).join('\n\n');
  const allCode = messages.flatMap((m) => extractCodeBlocks(m.content, m.id));

  const humanMsgs = messages.filter((m) => m.role === 'human');
  const aiMsgs    = messages.filter((m) => m.role === 'assistant');

  return {
    id:         id || generateId(),
    type:       type || 'conversation',
    source:     source || 'generic',
    title:      title || 'Untitled',
    fileName:   fileName || '',
    created_at: created_at || new Date().toISOString(),
    updated_at: updated_at || new Date().toISOString(),
    metadata: {
      messageCount:       messages.length,
      humanMessages:      humanMsgs.length,
      aiMessages:         aiMsgs.length,
      totalChars:         allText.length,
      hasCode:            allCode.length > 0,
      hasActionItems:     messages.some((m) => m.metadata.hasActionItems),
      topics:             guessTopics(allText),
      longestMessageChars: Math.max(0, ...messages.map((m) => m.content.length)),
    },
    messages,
    insights: {
      actionItems: extractActionItems(allText).slice(0, 30),
      decisions:   extractDecisions(allText).slice(0, 20),
      codeBlocks:  allCode.slice(0, 50),
    },
    rawSource: rawSource || null,
  };
}
