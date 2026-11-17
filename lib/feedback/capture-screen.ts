import { CAPTURE_SKIP_ATTR } from './screenshot'

/**
 * A JPEG of what is on screen now: the viewport, at up to 2x pixel density.
 * Rejects when the page can't be drawn (for example a cross-origin image taints it).
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
  })
  if (!blob || blob.size === 0) throw new Error('Screen capture returned nothing')
  return blob
}
