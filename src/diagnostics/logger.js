// src/diagnostics/logger.js
let buffer = [];

const MAX_BUFFER = 2000;

export function log(tag, payload = {}) {
  const entry = {
    ts: new Date().toISOString(),
    tag,
    ...payload,
  };

  buffer.push(entry);
  if (buffer.length > MAX_BUFFER) buffer = buffer.slice(-MAX_BUFFER);

  // Pretty console logging (grouped)
  if (import.meta.env.DEV) {
    try {
      console.groupCollapsed(`[SureStack] ${tag}`);
      console.log(entry);
      console.groupEnd();
    } catch {}
  }

  // Expose for manual inspection in DevTools
  window.__surestackLogs = buffer;
}

export function getLogs() {
  return buffer;
}

export function clearLogs() {
  buffer = [];
}


