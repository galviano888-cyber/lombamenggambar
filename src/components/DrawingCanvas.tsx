import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react"
import { cn } from "@/lib/utils"
import { Eraser, Pencil, Trash2, Undo2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"

const COLORS = [
  "#000000", "#ffffff", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
  "#a16207", "#6b7280", "#1d4ed8", "#15803d", "#be123c",
  "#7c3aed", "#0e7490", "#92400e",
]

export interface DrawingCanvasHandle {
  getDataUrl: () => string
  clear: () => void
}

interface Props {
  playerName: string
  playerColor: string
  disabled?: boolean
  disabledReason?: "time" | "opponent"
  className?: string
}

interface Point {
  x: number
  y: number
  pressure: number
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle, Props>(
  ({ playerName, playerColor, disabled = false, disabledReason = "time", className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Drawing state
    const [color, setColor] = useState("#000000")
    const [brushSize, setBrushSize] = useState(6)
    const [isEraser, setIsEraser] = useState(false)
    const [history, setHistory] = useState<ImageData[]>([])
    const [showColors, setShowColors] = useState(false)

    // Zoom & Pan state
    const [zoom, setZoom] = useState(1)
    const [panX, setPanX] = useState(0)
    const [panY, setPanY] = useState(0)

    // Refs for gesture handling
    const isDrawing = useRef(false)
    const lastPoint = useRef<Point | null>(null)
    const points = useRef<Point[]>([])
    const isPinching = useRef(false)
    const pinchStartDist = useRef(0)
    const pinchStartZoom = useRef(1)
    const pinchMidpoint = useRef({ x: 0, y: 0 })
    const panStartX = useRef(0)
    const panStartY = useRef(0)
    const panOffsetX = useRef(0)
    const panOffsetY = useRef(0)
    const historySaved = useRef(false)

    // ── Imperative handle for parent ──
    useImperativeHandle(ref, () => ({
      getDataUrl: () => canvasRef.current?.toDataURL("image/png") ?? "",
      clear: () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        setHistory([])
      },
    }))

    // ── Init canvas ──
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }, [])

    // ── History management ──
    const saveHistory = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      setHistory((prev) => [...prev.slice(-29), imageData])
    }, [])

    const undo = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx || history.length === 0) return
      const prev = history[history.length - 1]
      ctx.putImageData(prev, 0, 0)
      setHistory((h) => h.slice(0, -1))
    }, [history])

    // ── Smooth Bezier drawing ──
    const drawStroke = useCallback((from: Point, to: Point) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over"
      ctx.strokeStyle = isEraser ? "rgba(0,0,0,1)" : color
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      // Pressure-sensitive line width
      const pressure = to.pressure || 0.5
      const dynamicWidth = isEraser
        ? brushSize * 3
        : brushSize * (0.5 + pressure * 0.8)

      ctx.lineWidth = dynamicWidth

      // Midpoint Quadratic Bezier for smooth curves
      const midX = (from.x + to.x) / 2
      const midY = (from.y + to.y) / 2

      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.quadraticCurveTo(from.x, from.y, midX, midY)
      ctx.stroke()
    }, [color, brushSize, isEraser])

    // ── Pointer Events (unified mouse/touch/stylus) ──
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
      if (disabled || isPinching.current) return
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)

      if (!historySaved.current) {
        saveHistory()
        historySaved.current = true
      }

      const canvas = canvasRef.current!
      const container = containerRef.current!
      const rect = container.getBoundingClientRect()
      const containerX = e.clientX - rect.left
      const containerY = e.clientY - rect.top
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height

      const realX = ((containerX - panX) / zoom) * scaleX
      const realY = ((containerY - panY) / zoom) * scaleY

      const point: Point = { x: realX, y: realY, pressure: e.pressure || 0.5 }
      lastPoint.current = point
      points.current = [point]
      isDrawing.current = true
    }, [disabled, zoom, panX, panY, saveHistory])

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
      if (!isDrawing.current || disabled || isPinching.current) return
      e.preventDefault()

      const canvas = canvasRef.current!
      const container = containerRef.current!
      const rect = container.getBoundingClientRect()
      const containerX = e.clientX - rect.left
      const containerY = e.clientY - rect.top
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height

      const realX = ((containerX - panX) / zoom) * scaleX
      const realY = ((containerY - panY) / zoom) * scaleY

      const point: Point = { x: realX, y: realY, pressure: e.pressure || 0.5 }

      if (lastPoint.current) {
        drawStroke(lastPoint.current, point)
      }

      lastPoint.current = point
      points.current.push(point)
    }, [disabled, zoom, panX, panY, drawStroke])

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
      e.currentTarget.releasePointerCapture(e.pointerId)
      isDrawing.current = false
      lastPoint.current = null
      points.current = []
      historySaved.current = false
    }, [])

    // ── Touch Events for Pinch-to-Zoom & Pan (2 fingers) ──
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
      if (disabled) return

      if (e.touches.length === 2) {
        // 2 fingers → zoom/pan mode
        e.preventDefault()
        isPinching.current = true
        isDrawing.current = false
        lastPoint.current = null

        const t1 = e.touches[0]
        const t2 = e.touches[1]
        const dx = t1.clientX - t2.clientX
        const dy = t1.clientY - t2.clientY
        pinchStartDist.current = Math.sqrt(dx * dx + dy * dy)
        pinchStartZoom.current = zoom
        pinchMidpoint.current = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        }
        panStartX.current = pinchMidpoint.current.x
        panStartY.current = pinchMidpoint.current.y
        panOffsetX.current = panX
        panOffsetY.current = panY
      }
      // 1 finger → handled by pointer events (draw)
    }, [disabled, zoom, panX, panY])

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
      if (!isPinching.current || e.touches.length < 2) return
      e.preventDefault()

      const t1 = e.touches[0]
      const t2 = e.touches[1]

      // Calculate new zoom from pinch distance
      const dx = t1.clientX - t2.clientX
      const dy = t1.clientY - t2.clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const newZoom = Math.min(5, Math.max(0.5, pinchStartZoom.current * (dist / pinchStartDist.current)))
      setZoom(newZoom)

      // Calculate pan from midpoint movement
      const midX = (t1.clientX + t2.clientX) / 2
      const midY = (t1.clientY + t2.clientY) / 2
      const deltaX = midX - panStartX.current
      const deltaY = midY - panStartY.current
      setPanX(panOffsetX.current + deltaX)
      setPanY(panOffsetY.current + deltaY)
    }, [])

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
      if (e.touches.length < 2) {
        isPinching.current = false
      }
    }, [])

    // ── Wheel zoom (desktop) ──
    const handleWheel = useCallback((e: React.WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.15 : 0.15
      setZoom((z) => Math.min(5, Math.max(0.5, z + delta)))
    }, [])

    // ── Zoom controls ──
    const zoomIn = useCallback(() => setZoom((z) => Math.min(5, z + 0.25)), [])
    const zoomOut = useCallback(() => setZoom((z) => Math.max(0.5, z - 0.25)), [])
    const resetView = useCallback(() => { setZoom(1); setPanX(0); setPanY(0) }, [])

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {/* Player label */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-3 border-2 border-black" style={{ backgroundColor: playerColor }} />
            <span className="pixel-sm text-foreground">{playerName}</span>
          </div>
          {zoom !== 1 && (
            <span className="text-[10px] font-bold text-foreground bg-card/80 px-2 py-0.5 border border-black/20 rounded">
              {Math.round(zoom * 100)}%
            </span>
          )}
        </div>

        {/* Canvas container */}
        <div className="relative">
          <div
            ref={containerRef}
            className="relative border-4 border-black bg-white dark:bg-gray-100 overflow-hidden sm:aspect-[3/2] touch-none"
            style={{ boxShadow: "4px 4px 0 rgba(0,0,0,0.3)" }}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              style={{
                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                transformOrigin: "0 0",
                width: "100%",
                height: "100%",
              }}
            >
              <canvas
                ref={canvasRef}
                width={1024}
                height={1024}
                className={cn(
                  "w-full h-auto sm:h-full block",
                  disabled ? "opacity-50 pointer-events-none" : "cursor-crosshair",
                )}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />
            </div>

            {/* Disabled overlay */}
            {disabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                <div className="pixel-sm sm:pixel-md text-primary" style={{ textShadow: "2px 2px 0 #fff", background: "rgba(255,255,255,0.85)", padding: "6px 14px", border: "2px solid #000" }}>
                  {disabledReason === "opponent" ? "OPPONENT'S CANVAS" : "TIME'S UP!"}
                </div>
              </div>
            )}
          </div>

          {/* ── Floating Toolbar (Glassmorphism) ── */}
          {!disabled && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none z-10">
              <div className="pointer-events-auto flex items-center gap-1 px-2 py-1.5 rounded-full border border-white/30 dark:border-white/10 bg-white/70 dark:bg-black/50 backdrop-blur-xl shadow-lg">
                {/* Pen */}
                <button
                  onClick={() => { setIsEraser(false); setShowColors(false) }}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    !isEraser ? "bg-primary text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                >
                  <Pencil className="size-4" />
                </button>

                {/* Eraser */}
                <button
                  onClick={() => { setIsEraser(true); setShowColors(false) }}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    isEraser ? "bg-primary text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                >
                  <Eraser className="size-4" />
                </button>

                {/* Divider */}
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

                {/* Color indicator / toggle */}
                <button
                  onClick={() => setShowColors(!showColors)}
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <div
                    className="size-6 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                </button>

                {/* Brush size */}
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-16 sm:w-20 h-1.5 accent-primary cursor-pointer"
                />

                {/* Divider */}
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

                {/* Zoom controls */}
                <button onClick={zoomOut} className="p-1.5 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <ZoomOut className="size-3.5" />
                </button>
                <button onClick={resetView} className="p-1.5 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <RotateCcw className="size-3.5" />
                </button>
                <button onClick={zoomIn} className="p-1.5 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <ZoomIn className="size-3.5" />
                </button>

                {/* Divider */}
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

                {/* Undo */}
                <button
                  onClick={undo}
                  disabled={history.length === 0}
                  className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                >
                  <Undo2 className="size-4" />
                </button>

                {/* Clear */}
                <button
                  onClick={() => {
                    const canvas = canvasRef.current
                    if (!canvas) return
                    const ctx = canvas.getContext("2d")
                    if (!ctx) return
                    saveHistory()
                    ctx.fillStyle = "#ffffff"
                    ctx.fillRect(0, 0, canvas.width, canvas.height)
                  }}
                  className="p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              {/* Color palette popup */}
              {showColors && (
                <div className="pointer-events-auto mt-2 flex flex-wrap justify-center gap-1.5 px-3 py-2 rounded-2xl border border-white/30 dark:border-white/10 bg-white/80 dark:bg-black/60 backdrop-blur-xl shadow-lg max-w-[280px] mx-auto">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setColor(c); setIsEraser(false); setShowColors(false) }}
                      className={cn(
                        "size-7 rounded-full border-2 transition-transform hover:scale-125",
                        color === c && !isEraser ? "border-primary scale-125 ring-2 ring-primary/50" : "border-white/50 dark:border-gray-600"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }
)

DrawingCanvas.displayName = "DrawingCanvas"
export default DrawingCanvas
