'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface HtmlEmailRendererProps {
  html: string;
  className?: string;
  maxHeight?: number | string;
}

export function HtmlEmailRenderer({
  html,
  className,
  maxHeight = 800,
}: HtmlEmailRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number>(200);

  const updateHeight = useCallback(() => {
    if (iframeRef.current) {
      try {
        const doc =
          iframeRef.current.contentDocument ||
          iframeRef.current.contentWindow?.document;
        if (doc && doc.body) {
          const contentHeight = Math.max(
            doc.documentElement.scrollHeight,
            doc.body.scrollHeight,
            doc.documentElement.offsetHeight,
            doc.body.offsetHeight,
          );
          if (contentHeight > 0) {
            setHeight(contentHeight + 24);
          }
        }
      } catch {
        // Fallback for security restriction
      }
    }
  }, []);

  useEffect(() => {
    updateHeight();
    const timer = setTimeout(updateHeight, 300);
    return () => clearTimeout(timer);
  }, [html, updateHeight]);

  const srcDoc = useMemo(() => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base target="_blank">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      word-break: break-word;
    }
    img {
      max-width: 100% !important;
      height: auto !important;
    }
    table {
      max-width: 100% !important;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      onLoad={updateHeight}
      title="Email Message Body"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      className={className}
      style={{
        width: '100%',
        height: `${height}px`,
        maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
        border: 'none',
        display: 'block',
        backgroundColor: 'transparent',
        overflow: 'auto',
      }}
    />
  );
}
