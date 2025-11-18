// src/diagnostics/ErrorBoundary.jsx
import React from 'react';
import { log } from './logger';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }

  static getDerivedStateFromError(error) {
    return { err: error };
  }

  componentDidCatch(error, info) {
    log('ReactErrorBoundary', {
      message: error?.message,
      stack: error?.stack,
      componentStack: info?.componentStack,
    });
  }

  render() {
    if (this.state.err) {
      // Use custom fallback if provided, otherwise default error UI
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div style={{ padding: 16, color: '#f33', fontFamily: 'ui-monospace, Menlo, monospace' }}>
          <strong>SureStack — React crashed</strong>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{String(this.state.err)}</pre>
          <div>Open console for <code>[SureStack] ReactErrorBoundary</code> details.</div>
        </div>
      );
    }

    return this.props.children;
  }
}


