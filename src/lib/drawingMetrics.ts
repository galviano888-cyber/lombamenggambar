/**
 * Drawing Metrics — Analyzes canvas pixel data to compute objective metrics.
 * These metrics are sent to the server alongside the image for fair scoring.
 */

export interface DrawingMetrics {
  /** Percentage of canvas that has been drawn on (0-100) */
  coverage: number
  /** Number of distinct color groups used */
  colorCount: number
  /** Edge density as proxy for stroke detail/complexity (0-100) */
  complexity: number
  /** Whether the canvas is effectively blank */
  isBlank: boolean
  /** Total non-white pixels */
  pixelCount: number
}

/**
 * Analyzes a canvas data URL and returns objective drawing metrics.
 */
export function computeDrawingMetrics(imageDataUrl: string): Promise<DrawingMetrics> {
  return new Promise((resolve) => {
    if (!imageDataUrl) {
      resolve({ coverage: 0, colorCount: 0, complexity: 0, isBlank: true, pixelCount: 0 })
      return
    }

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0)

      const { data: pixels, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const totalPixels = width * height

      let nonWhitePixels = 0
      let strokeEdges = 0
      const colorSet = new Set<string>()

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i]
        const g = pixels[i + 1]
        const b = pixels[i + 2]
        const a = pixels[i + 3]

        if (a < 10) continue

        const brightness = (r + g + b) / 3
        if (brightness < 240) {
          nonWhitePixels++

          // Quantize color to reduce noise (group into 8 levels per channel)
          const qr = Math.floor(r / 32)
          const qg = Math.floor(g / 32)
          const qb = Math.floor(b / 32)
          colorSet.add(`${qr}-${qg}-${qb}`)
        }

        // Edge detection: compare with previous pixel
        if (i > 4) {
          const prevBrightness = (pixels[i - 4] + pixels[i - 3] + pixels[i - 2]) / 3
          if (Math.abs(brightness - prevBrightness) > 60) {
            strokeEdges++
          }
        }
      }

      const coverage = (nonWhitePixels / totalPixels) * 100
      const complexity = Math.min(100, (strokeEdges / totalPixels) * 200)
      const colorCount = colorSet.size
      const isBlank = coverage < 1

      resolve({
        coverage: Math.round(coverage * 100) / 100,
        colorCount,
        complexity: Math.round(complexity * 100) / 100,
        isBlank,
        pixelCount: nonWhitePixels,
      })
    }

    img.onerror = () => {
      resolve({ coverage: 0, colorCount: 0, complexity: 0, isBlank: true, pixelCount: 0 })
    }

    img.src = imageDataUrl
  })
}
