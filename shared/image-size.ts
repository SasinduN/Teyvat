/**
 * The size an image is re-encoded at before upload.
 *
 * Two limits: the width the site ever displays (2000 px), and a total pixel
 * area iOS Safari will actually allocate for a canvas (4096 × 4096). A canvas
 * over that area doesn't throw on iOS; it draws nothing. Never upscales.
 */
export const MAX_WIDTH = 2000;
export const MAX_CANVAS_AREA = 16_777_216;

export interface Size {
  width: number;
  height: number;
}

export function targetSize(
  source: Size,
  limits: { maxWidth?: number; maxArea?: number } = {}
): Size {
  const maxWidth = limits.maxWidth ?? MAX_WIDTH;
  const maxArea = limits.maxArea ?? MAX_CANVAS_AREA;

  let scale = Math.min(1, maxWidth / source.width);
  const area = source.width * scale * (source.height * scale);
  if (area > maxArea) scale *= Math.sqrt(maxArea / area);

  // Floor, so rounding can never push a dimension back over a limit.
  return {
    width: Math.max(1, Math.floor(source.width * scale)),
    height: Math.max(1, Math.floor(source.height * scale))
  };
}
