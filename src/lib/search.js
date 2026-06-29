/**
 * search.js
 * Fuzzy search across all loaded StandardizedDocuments using Fuse.js.
 */
import Fuse from 'fuse.js';

/** Build a flat index of searchable items from an array of StandardizedDocuments */
export function buildSearchIndex(docs) {
  const items = [];

  for (const doc of docs) {
    // Index the document itself
    items.push({
      type:    'document',
      docId:   doc.id,
      id:      doc.id,
      title:   doc.title,
      source:  doc.source,
      text:    doc.title + ' ' + doc.metadata.topics.join(' '),
      preview: `${doc.metadata.messageCount} messages · ${doc.source}`,
    });

    // Index top-level insights
    for (const item of doc.insights.actionItems.slice(0, 10)) {
      items.push({
        type:    'action',
        docId:   doc.id,
        id:      doc.id + '-action-' + items.length,
        title:   item,
        source:  doc.source,
        text:    item,
        preview: `Action item in "${doc.title}"`,
      });
    }

    for (const item of doc.insights.decisions.slice(0, 5)) {
      items.push({
        type:    'decision',
        docId:   doc.id,
        id:      doc.id + '-decision-' + items.length,
        title:   item,
        source:  doc.source,
        text:    item,
        preview: `Decision in "${doc.title}"`,
      });
    }

    // Index first 20 messages content (truncated)
    for (const msg of doc.messages.slice(0, 20)) {
      if (msg.content.length < 20) continue;
      items.push({
        type:    'message',
        docId:   doc.id,
        id:      msg.id,
        title:   msg.content.slice(0, 120),
        source:  doc.source,
        text:    msg.content.slice(0, 500),
        preview: `${msg.role} in "${doc.title}"`,
      });
    }
  }

  return items;
}

const FUSE_OPTIONS = {
  keys: [
    { name: 'title', weight: 0.5 },
    { name: 'text',  weight: 0.4 },
    { name: 'preview', weight: 0.1 },
  ],
  threshold:          0.35,
  includeScore:       true,
  includeMatches:     true,
  minMatchCharLength: 2,
  shouldSort:         true,
  useExtendedSearch:  false,
};

/**
 * Create a Fuse instance for the given documents.
 * @param {import('./schema.js').StandardizedDocument[]} docs
 * @returns {Fuse}
 */
export function createSearchIndex(docs) {
  const items = buildSearchIndex(docs);
  return new Fuse(items, FUSE_OPTIONS);
}

/**
 * Run a search query and return results.
 * @param {Fuse} fuse
 * @param {string} query
 * @param {number} [limit=12]
 */
export function search(fuse, query, limit = 12) {
  if (!query || query.trim().length < 2) return [];
  return fuse.search(query.trim(), { limit }).map((r) => r.item);
}
