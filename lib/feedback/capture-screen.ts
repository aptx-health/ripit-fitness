import { CAPTURE_SKIP_ATTR } from './screenshot'

const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

/**
 * A JPEG of what is on screen now: the viewport, at up to 2x pixel density.
 * An image that can't be fetched is drawn as a blank placeholder rather than
 * failing the capture. Rejects only when the page itself can't be drawn.
 */
export async function captureScreen(): Promise<Blob> {
  // Loaded on first use: only admins ever capture.
  const { domToBlob } = await import('modern-screenshot')
  const body = document.body
  const blob = await domToBlob(body, {
    type: 'image/jpeg',
    quality: 0.85,
    width: window.innerWidth,
    height: window.innerHeight,
    scale: Math.min(window.devicePixelRatio || 1, 2),
    backgroundColor: getComputedStyle(body).backgroundColor,
    filter: (node) => !(node instanceof Element && node.hasAttribute(CAPTURE_SKIP_ATTR)),
    // The clone drops body's own margin and falls back to the 8px browser
    // default inside the SVG; on the Safari path that showed as a black band.
    style: { margin: '0' },
    // Hide scroll containers' scrollbars: browsers with classic scrollbars
    // (desktop WebKit) drew them as a black strip down the right edge.
    onCloneEachNode: (cloned) => {
      if (cloned instanceof HTMLElement) cloned.style.scrollbarWidth = 'none'
    },
    // Give up on a slow image after 10s (default 30s); it becomes the placeholder.
    timeout: 10_000,
    fetch: { placeholderImage: TRANSPARENT_PIXEL },
  })
  if (!blob || blob.size === 0) throw new Error('Screen capture returned nothing')
  return blob
}
