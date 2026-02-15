// ─── Watermark utility — Client-side Canvas API ─────────────────────────────
// Applies a diagonal text watermark on an image before upload.
// This runs in the browser (not 'use server') and returns a watermarked Blob.

/**
 * Load an image File into an HTMLImageElement.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Impossible de charger l\'image'))
    }
    img.src = url
  })
}

/**
 * Apply a repeating diagonal text watermark to an image file.
 *
 * @param imageFile  The original image (JPEG, PNG)
 * @param text       The watermark text (e.g. "COPIE — NOMADAYS — 15/02/2026")
 * @returns          A JPEG Blob with the watermark baked in
 */
export async function applyWatermark(
  imageFile: File,
  text: string
): Promise<Blob> {
  const img = await loadImage(imageFile)

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!

  // 1. Draw the original image
  ctx.drawImage(img, 0, 0)

  // 2. Configure watermark text style
  const fontSize = Math.max(16, Math.round(canvas.width * 0.035))
  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.fillStyle = 'rgba(128, 128, 128, 0.15)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // 3. Measure text to calculate spacing
  const metrics = ctx.measureText(text)
  const textWidth = metrics.width
  const lineHeight = fontSize * 1.6
  const spacingX = textWidth + fontSize * 3
  const spacingY = lineHeight + fontSize * 3

  // 4. Rotate canvas and draw repeating text
  ctx.save()
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(-Math.PI / 4) // -45 degrees

  // Calculate how many rows/cols we need to cover the rotated canvas
  const diagonal = Math.sqrt(canvas.width ** 2 + canvas.height ** 2)
  const halfDiag = diagonal / 2
  const startX = -halfDiag
  const startY = -halfDiag

  for (let y = startY; y < halfDiag; y += spacingY) {
    for (let x = startX; x < halfDiag; x += spacingX) {
      ctx.fillText(text, x, y)
    }
  }

  ctx.restore()

  // 5. Export as JPEG blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Erreur lors de la génération de l\'image filigranée'))
      },
      'image/jpeg',
      0.92
    )
  })
}

/**
 * Generate a watermarked preview as a data URL (for display in <img>).
 */
export async function applyWatermarkPreview(
  imageFile: File,
  text: string
): Promise<string> {
  const blob = await applyWatermark(imageFile, text)
  return URL.createObjectURL(blob)
}

/**
 * Build the standard Nomadays watermark text with today's date.
 */
export function buildWatermarkText(): string {
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = now.getFullYear()
  return `COPIE — NOMADAYS — ${dd}/${mm}/${yyyy}`
}
