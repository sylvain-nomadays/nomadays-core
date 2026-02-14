'use client'

import { useEffect, useRef, useState } from 'react'

interface InvoiceIframeProps {
  html: string
}

/**
 * Renders the invoice HTML inside an isolated iframe.
 * This prevents the Jinja2 template CSS (which includes `* { margin: 0; padding: 0 }`,
 * `position: fixed` for the footer, etc.) from bleeding into the parent page.
 * The iframe auto-resizes to fit its content.
 */
export function InvoiceIframe({ html }: InvoiceIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(800) // sensible default

  // Modify the HTML to:
  // 1. Remove `position: fixed` from .legal-footer (not needed in web view)
  // 2. Add padding to body for comfortable reading
  // 3. Remove @page rules (PDF-only)
  const modifiedHtml = html
    .replace(/position:\s*fixed;/g, 'position: relative;')
    .replace(/@page\s*\{[^}]*\}/g, '')
    .replace(
      '</style>',
      `
      body {
        padding: 40px;
        background: white;
      }
      .legal-footer {
        position: relative !important;
        left: 0 !important;
        right: 0 !important;
        bottom: auto !important;
        margin-top: 30px;
      }
      </style>`
    )

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const resizeObserver = new ResizeObserver(() => {
      try {
        const doc = iframe.contentDocument
        if (doc?.body) {
          const newHeight = doc.body.scrollHeight
          if (newHeight > 0) {
            setHeight(newHeight + 20) // small buffer
          }
        }
      } catch {
        // cross-origin errors — ignore
      }
    })

    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument
        if (doc?.body) {
          const newHeight = doc.body.scrollHeight
          if (newHeight > 0) {
            setHeight(newHeight + 20)
          }
          resizeObserver.observe(doc.body)
        }
      } catch {
        // ignore
      }
    }

    iframe.addEventListener('load', handleLoad)

    return () => {
      iframe.removeEventListener('load', handleLoad)
      resizeObserver.disconnect()
    }
  }, [modifiedHtml])

  return (
    <iframe
      ref={iframeRef}
      srcDoc={modifiedHtml}
      style={{
        width: '100%',
        height: `${height}px`,
        border: 'none',
        display: 'block',
      }}
      title="Facture"
      sandbox="allow-same-origin"
    />
  )
}
