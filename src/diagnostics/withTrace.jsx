// src/diagnostics/withTrace.jsx
import React, { useEffect, useRef } from 'react';
import { log } from './logger';

export function withTrace(Component, name) {
  const display = name || Component.displayName || Component.name || 'Anonymous';

  const Traced = (props) => {
    if (window.__SURESTACK_TRACE) {
      log('Trace.Render', { component: display, propsKeys: Object.keys(props || {}) });
    }

    const first = useRef(true);

    useEffect(() => {
      if (first.current) {
        first.current = false;
        if (window.__SURESTACK_TRACE) log('Trace.Mount', { component: display });
      }

      return () => {
        if (window.__SURESTACK_TRACE) log('Trace.Unmount', { component: display });
      };
    }, []);

    return <Component {...props} />;
  };

  Traced.displayName = `Traced(${display})`;

  return Traced;
}


