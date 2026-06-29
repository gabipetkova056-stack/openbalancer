/**
 * useStore.js — Zustand global store for OpenBalancer Dashboard.
 *
 * Holds all parsed documents, active view state, error log, toast queue,
 * and search index — with clean actions for each domain.
 */
import { create } from 'zustand';
import { createSearchIndex } from '../lib/search.js';

const useStore = create((set, get) => ({
  // ── Documents ────────────────────────────────────────────────────────────────
  documents: [],      // StandardizedDocument[]
  activeDoc: null,    // string | null (document id)

  addDocuments(newDocs) {
    set((s) => {
      const existing = new Set(s.documents.map((d) => d.id));
      const fresh = newDocs.filter((d) => !existing.has(d.id));
      const documents = [...s.documents, ...fresh];
      const searchIndex = createSearchIndex(documents);
      return { documents, searchIndex };
    });
  },

  removeDocument(id) {
    set((s) => {
      const documents = s.documents.filter((d) => d.id !== id);
      const searchIndex = createSearchIndex(documents);
      return {
        documents,
        searchIndex,
        activeDoc: s.activeDoc === id ? (documents[0]?.id ?? null) : s.activeDoc,
      };
    });
  },

  setActiveDoc(id) {
    set({ activeDoc: id, activeView: 'replay' });
  },

  getActiveDoc() {
    const { documents, activeDoc } = get();
    return documents.find((d) => d.id === activeDoc) ?? null;
  },

  clearAllDocuments() {
    set({ documents: [], activeDoc: null, searchIndex: null });
  },

  // ── Active View ───────────────────────────────────────────────────────────────
  activeView: 'home',   // 'home' | 'replay' | 'insights' | 'crossref' | 'logs'
  setActiveView(view) { set({ activeView: view }); },

  // ── Error Log ─────────────────────────────────────────────────────────────────
  errorLog: [],   // [{ id, message, timestamp, source }]
  addError(message, source = 'unknown') {
    const entry = typeof message === 'string'
      ? { id: Date.now() + Math.random(), message, timestamp: new Date().toISOString(), source }
      : { id: Date.now() + Math.random(), timestamp: new Date().toISOString(), source, ...message };
    set((s) => ({ errorLog: [...s.errorLog, entry] }));
  },
  clearErrorLog() { set({ errorLog: [] }); },
  clearErrors()   { set({ errorLog: [] }); }, // alias

  // ── Toasts ───────────────────────────────────────────────────────────────────
  toasts: [],   // [{ id, type, message }]
  addToast(message, type = 'success') {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  dismissToast(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  // ── Search ───────────────────────────────────────────────────────────────────
  searchIndex: null,    // Fuse instance
  cmdOpen: false,
  openCmd()    { set({ cmdOpen: true }); },
  closeCmd()   { set({ cmdOpen: false }); },
  toggleCmd()  { set((s) => ({ cmdOpen: !s.cmdOpen })); },

  // ── Ingestion Loading State ───────────────────────────────────────────────────
  isIngesting: false,
  ingestionProgress: '',
  setIngesting(flag, progress = '') { set({ isIngesting: flag, ingestionProgress: progress }); },
}));

export default useStore;
