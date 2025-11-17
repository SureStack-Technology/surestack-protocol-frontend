// src/diagnostics/runtimeProbe.js
import { log } from './logger';

export function installRuntimeProbe() {
  if (window.__surestackRuntimeProbeInstalled) return;
  window.__surestackRuntimeProbeInstalled = true;

  log('DeepProbe.Install', { ok: true });

  window.addEventListener('error', (e) => {
    log('DeepProbe.WindowError', {
      message: e?.error?.message || e?.message,
      stack: e?.error?.stack,
      filename: e?.filename,
      lineno: e?.lineno,
      colno: e?.colno,
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    log('DeepProbe.UnhandledPromise', {
      reason: e?.reason?.message || String(e?.reason),
      stack: e?.reason?.stack,
    });
  });

  // Toggle tracing at runtime
  // In DevTools you can set: window.__SURESTACK_TRACE = true/false
  if (typeof window.__SURESTACK_TRACE === 'undefined') {
    window.__SURESTACK_TRACE = (import.meta.env.VITE_SURESTACK_TRACE === '1');
  }

  log('DeepProbe.RuntimeFlags', {
    TRACE: !!window.__SURESTACK_TRACE,
    VITE_SURESTACK_TRACE: import.meta.env.VITE_SURESTACK_TRACE,
  });
}


