/**
 * Dropzone.jsx
 * Drag-and-drop file ingestion with archive extraction.
 * Accepts .zip, .tar, .json, .md, .txt, .csv files.
 */
import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileJson, FileText, Archive, Loader } from 'lucide-react';
import { extractFile } from '../../lib/parsers/archiveExtractor.js';
import { routeFiles } from '../../lib/parsers/ingestionRouter.js';
import useStore from '../../store/useStore.js';

const ACCEPT = '.zip,.tar,.tar.gz,.tgz,.json,.md,.txt,.csv';
const MAX_FILE_SIZE_MB = 50;

function FileTypeIcon({ ext }) {
  if (ext === '.json')                                return <FileJson size={18} />;
  if (ext === '.zip' || ext === '.tar' || ext === '.tgz') return <Archive size={18} />;
  return <FileText size={18} />;
}

export default function Dropzone() {
  const { addDocuments, addError, addToast, setIngesting, isIngesting, ingestionProgress } = useStore();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const processFiles = useCallback(
    async (files) => {
      if (files.length === 0) return;
      setIngesting(true, 'Reading files…');

      const allDocs = [];
      const allErrors = [];

      for (const file of files) {
        const sizeMB = file.size / 1024 / 1024;
        if (sizeMB > MAX_FILE_SIZE_MB) {
          allErrors.push(`${file.name}: file exceeds ${MAX_FILE_SIZE_MB}MB limit`);
          continue;
        }

        setIngesting(true, `Extracting ${file.name}…`);

        try {
          const vfiles = await extractFile(file);
          setIngesting(true, `Parsing ${vfiles.length} file(s)…`);
          const { docs, errors } = routeFiles(vfiles);
          allDocs.push(...docs);
          allErrors.push(...errors);
        } catch (err) {
          allErrors.push(`${file.name}: ${err.message}`);
        }
      }

      for (const err of allErrors) addError(err, 'ingestion');
      if (allDocs.length > 0) {
        addDocuments(allDocs);
        addToast(`Imported ${allDocs.length} document${allDocs.length !== 1 ? 's' : ''} successfully.`, 'success');
      } else if (allErrors.length > 0) {
        addToast('Import finished with errors. Check the Error Log.', 'warning');
      }

      setIngesting(false);
    },
    [addDocuments, addError, addToast, setIngesting]
  );

  /* Drag handlers */
  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFiles([...e.dataTransfer.files]);
  };
  const onFileChange = (e) => processFiles([...e.target.files]);

  return (
    <div
      className={`dropzone${dragging ? ' dragging' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => !isIngesting && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Drop files here or click to browse"
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        onChange={onFileChange}
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
      />

      {isIngesting ? (
        <>
          <div className="spinner" aria-hidden="true" />
          <p className="dropzone-title" aria-live="polite">
            {ingestionProgress || 'Processing…'}
          </p>
        </>
      ) : (
        <>
          <div className="dropzone-icon" aria-hidden="true">
            <Upload size={44} strokeWidth={1.5} />
          </div>
          <p className="dropzone-title">Drop files or click to import</p>
          <p className="dropzone-sub">
            Upload AI conversation exports, notes, or archives. All parsing happens
            locally — your data never leaves your browser.
          </p>
          <div className="dropzone-types" aria-label="Supported file types">
            {['.zip', '.tar', '.json', '.md', '.txt', '.csv'].map((ext) => (
              <span key={ext} className="badge badge-gray" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <FileTypeIcon ext={ext} />
                {ext}
              </span>
            ))}
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
            Max {MAX_FILE_SIZE_MB}MB per file · Claude, ChatGPT, Markdown, CSV supported
          </p>
        </>
      )}
    </div>
  );
}
