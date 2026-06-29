/**
 * archiveExtractor.js
 * In-browser extraction of .zip and .tar archives using JSZip.
 * Returns a flat list of { name, content, type } virtual "files".
 */
import JSZip from 'jszip';

/** Supported text extensions we attempt to parse */
const TEXT_EXTS = new Set(['.json', '.md', '.txt', '.csv', '.js', '.py', '.sh', '.yml', '.yaml', '.xml', '.html', '.log']);

/**
 * Check if a filename is a readable text file.
 */
function isTextFile(name) {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  return TEXT_EXTS.has(ext);
}

/**
 * Extract a ZIP archive from an ArrayBuffer.
 * @param {ArrayBuffer} buffer
 * @param {string} archiveName
 * @returns {Promise<Array<{name: string, content: string, ext: string, size: number}>>}
 */
export async function extractZip(buffer, archiveName = 'archive.zip') {
  const zip = await JSZip.loadAsync(buffer);
  const results = [];

  const files = Object.values(zip.files).filter((f) => !f.dir);

  for (const file of files) {
    const name = file.name.replace(/^\.\//, '');
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : '';

    if (!isTextFile(name)) continue;

    try {
      const content = await file.async('string');
      results.push({ name, content, ext, size: content.length });
    } catch (e) {
      // skip unreadable files silently
    }
  }

  return results;
}

/**
 * Simple TAR parser (supports only POSIX ustar + GNU long-name headers).
 * Reads text files from an ArrayBuffer without external dependencies.
 * @param {ArrayBuffer} buffer
 * @returns {Array<{name: string, content: string, ext: string, size: number}>}
 */
export function extractTar(buffer) {
  const bytes = new Uint8Array(buffer);
  const results = [];
  const decoder = new TextDecoder('utf-8', { fatal: false });

  let offset = 0;
  let longName = null;

  while (offset + 512 <= bytes.byteLength) {
    const header = bytes.slice(offset, offset + 512);

    // Empty block signals end of archive
    if (header.every((b) => b === 0)) break;

    const readStr = (start, len) =>
      decoder.decode(header.slice(start, start + len)).replace(/\0.*$/, '').trim();

    const typeflag = readStr(156, 1);

    // Long-name extension (GNU tar)
    if (typeflag === 'L') {
      const size = parseInt(readStr(124, 12), 8) || 0;
      longName = decoder.decode(bytes.slice(offset + 512, offset + 512 + size)).replace(/\0.*$/, '');
      offset += 512 + Math.ceil(size / 512) * 512;
      continue;
    }

    const name = longName || readStr(0, 100);
    longName = null;
    const size = parseInt(readStr(124, 12), 8) || 0;

    if (typeflag === '0' || typeflag === '' || typeflag === '\0') {
      // Regular file
      if (isTextFile(name) && size > 0 && size < 10 * 1024 * 1024) {
        const content = decoder.decode(bytes.slice(offset + 512, offset + 512 + size));
        const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : '';
        results.push({ name, content, ext, size });
      }
    }

    offset += 512 + Math.ceil(size / 512) * 512;
  }

  return results;
}

/**
 * Decompress a gzip-compressed ArrayBuffer using the browser's DecompressionStream API.
 * @param {ArrayBuffer} buffer
 * @returns {Promise<ArrayBuffer>}
 */
async function decompressGzip(buffer) {
  const ds = new DecompressionStream('gzip');
  const stream = new Blob([buffer]).stream().pipeThrough(ds);
  return new Response(stream).arrayBuffer();
}

/**
 * Route a file by extension and extract its contents.
 * For .zip → JSZip; for .tar → manual parser; for .tar.gz / .tgz → gzip decompression then manual parser; otherwise return single file.
 *
 * @param {File} file   Browser File object
 * @returns {Promise<Array<{name: string, content: string, ext: string, size: number}>>}
 */
export async function extractFile(file) {
  const name = file.name.toLowerCase();

  if (name.endsWith('.zip')) {
    const buf = await file.arrayBuffer();
    return extractZip(buf, file.name);
  }

  if (name.endsWith('.tar')) {
    const buf = await file.arrayBuffer();
    return extractTar(buf);
  }

  if (name.endsWith('.tar.gz') || name.endsWith('.tgz')) {
    const buf = await file.arrayBuffer();
    const decompressed = await decompressGzip(buf);
    return extractTar(decompressed);
  }

  // Single text file
  const content = await file.text();
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : '';
  return [{ name: file.name, content, ext, size: content.length }];
}
