import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Eraser, Pencil, Trash2, Undo2, ZoomIn, ZoomOut, Hand } from "lucide-react"

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

const DrawingCanvas = forwardRef<DrawingCanvasHandle, Props>(
  ({ playerName, playerColor, disabled = false, disabledReason = "time", className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [color, setColor] = useState("#000000")
    const [brushSize, setBrushSize] = useState(6)
    const [isEraser, setIsEraser] = useState(false)
    const [history, setHistory] = useState<ImageData[]>([])
    const lastPoint = useRef<{ x: number; y: number } | null>(null)

    // Zoom & Pan state
    const [zoom, setZoom] = useState(1)
    const [pan, setPan] = useState({ x: 0, y: 0 })
    const [mode, setMode] = useState<"draw" | "zoom">("draw")
    const pinchStartDist = useRef<number | null>(null)
    const pinchStartZoom = useRef(1)
    const panStart = useRef<{ x: number; y: number } | null>(null)
    const panStartOffset = useRef({ x: 0, y: 0 })

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

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }, [])

    const saveHistory = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      setHistory((prev) => [...prev.slice(-19), imageData])
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

    const getPos = (
      e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ): { x: number; y: number } => {
      const canvas = canvasRef.current!
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height

      if ("touches" in e) {
        const touch = e.touches[0] ?? e.changedTouches[0]
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        }
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      }
    }

    const startDraw = useCallback(
      (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (disabled) return
        e.preventDefault()
        saveHistory()
        const pos = getPos(e)
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        ctx.beginPath()
        ctx.moveTo(pos.x, pos.y)
        lastPoint.current = pos
        setIsDrawing(true)
      },
      [disabled, saveHistory]
    )

    const draw = useCallback(
      (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing || disabled) return
        e.preventDefault()
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        const pos = getPos(e)
        const last = lastPoint.current ?? pos

        ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over"
        ctx.strokeStyle = isEraser ? "rgba(0,0,0,1)" : color
        ctx.lineWidth = isEraser ? brushSize * 3 : brushSize
        ctx.lineCap = "round"
        ctx.lineJoin = "round"

        // Smooth curve through midpoints
        const midX = (last.x + pos.x) / 2
        const midY = (last.y + pos.y) / 2
        ctx.beginPath()
        ctx.moveTo(last.x, last.y)
        ctx.quadraticCurveTo(last.x, last.y, midX, midY)
        ctx.stroke()

        lastPoint.current = pos
      },
      [isDrawing, disabled, color, brushSize, isEraser]
    )

    const stopDraw = useCallback(() => {
      setIsDrawing(false)
      lastPoint.current = null
    }, [])

    // ── Zoom & Pan handlers ──
    const handleWheel = useCallback((e: React.WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom((z) => Math.min(5, Math.max(0.5, z + delta)))
    }, [])

    const zoomIn = useCallback(() => setZoom((z) => Math.min(5, z + 0.25)), [])
    const zoomOut = useCallback(() => setZoom((z) => Math.max(0.5, z - 0.25)), [])
    const resetZoom = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }) }, [])

    // Pinch-to-zoom for mobile (in zoom mode)
    const handleTouchStartZoom = useCallback((e: React.TouchEvent) => {
      if (mode !== "zoom") return
      e.preventDefault()
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        pinchStartDist.current = Math.sqrt(dx * dx + dy * dy)
        pinchStartZoom.current = zoom
      } else if (e.touches.length === 1) {
        panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        panStartOffset.current = { ...pan }
      }
    }, [mode, zoom, pan])

    const handleTouchMoveZoom = useCallback((e: React.TouchEvent) => {
      if (mode !== "zoom") return
      e.preventDefault()
      if (e.touches.length === 2 && pinchStartDist.current) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const scale = dist / pinchStartDist.current
        setZoom(Math.min(5, Math.max(0.5, pinchStartZoom.current * scale)))
      } else if (e.touches.length === 1 && panStart.current) {
        const dx = e.touches[0].clientX - panStart.current.x
        const dy = e.touches[0].clientY - panStart.current.y
        setPan({ x: panStartOffset.current.x + dx, y: panStartOffset.current.y + dy })
      }
    }, [mode])

    const handleTouchEndZoom = useCallback(() => {
      pinchStartDist.current = null
      panStart.current = null
    }, [])

    return (
      <div className={cn("flex flex-col gap-2 sm:gap-4", className)}>
        {/* Player label */}
        <div className="flex items-center gap-3">
          <div
            className="size-4 border-2 border-black"
            style={{ backgroundColor: playerColor }}
          />
          <span className="pixel-md text-foreground" style={{ textShadow: "1px 1px 0 rgba(0,0,0,0.2)" }}>{playerName}</span>
        </div>

        {/* Canvas with zoom/pan */}
        <div
          ref={wrapperRef}
          className="relative border-4 border-black bg-white dark:bg-gray-100 overflow-hidden sm:aspect-[3/2]"
          style={{ boxShadow: "6px 6px 0 rgba(0,0,0,0.3)" }}
          onWheel={handleWheel}
        >
          <div
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transformOrigin: "center center",
              width: "100%",
              height: "100%",
            }}
          >
            <canvas
              ref={canvasRef}
              width={600}
              height={600}
              className={cn(
                "w-full h-auto sm:h-full block",
                disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "",
                mode === "draw" ? "cursor-crosshair touch-none" : "cursor-grab touch-auto"
              )}
              onMouseDown={mode === "draw" ? startDraw : undefined}
              onMouseMove={mode === "draw" ? draw : undefined}
              onMouseUp={mode === "draw" ? stopDraw : undefined}
              onMouseLeave={mode === "draw" ? stopDraw : undefined}
              onTouchStart={mode === "draw" ? startDraw : handleTouchStartZoom}
              onTouchMove={mode === "draw" ? draw : handleTouchMoveZoom}
              onTouchEnd={mode === "draw" ? stopDraw : handleTouchEndZoom}
            />
          </div>
          {disabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
              <div className="pixel-md text-primary" style={{ textShadow: "2px 2px 0 #fff", background: "rgba(255,255,255,0.8)", padding: "8px 16px", border: "2px solid #000" }}>
                {disabledReason === "opponent" ? "OPPONENT'S CANVAS" : "TIME'S UP!"}
              </div>
            </div>
          )}
          {/* Zoom indicator */}
          {zoom !== 1 && (
            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded font-bold pointer-events-none">
              {Math.round(zoom * 100)}%
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 border-4 border-black bg-card p-2 sm:p-3">
          <TooltipProvider>
            {/* Mode toggle: Draw / Zoom */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setMode("draw")}
                  disabled={disabled}
                  className={cn("arcade-btn px-2 sm:px-3 py-2 text-sm font-bold flex items-center gap-1", mode === "draw" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
                >
                  <Pencil className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Draw Mode</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setMode("zoom")}
                  disabled={disabled}
                  className={cn("arcade-btn px-2 sm:px-3 py-2 text-sm font-bold flex items-center gap-1", mode === "zoom" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
                >
                  <Hand className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Zoom/Pan Mode</TooltipContent>
            </Tooltip>

            <div className="border-r-2 border-black h-6" />

            {/* Zoom controls */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={zoomOut} disabled={disabled || zoom <= 0.5} className="arcade-btn px-2 py-2 text-sm font-bold bg-muted text-muted-foreground disabled:opacity-50 flex items-center">
                  <ZoomOut className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>

            <button onClick={resetZoom} disabled={disabled} className="text-xs font-bold text-foreground min-w-[40px] text-center">
              {Math.round(zoom * 100)}%
            </button>

            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={zoomIn} disabled={disabled || zoom >= 5} className="arcade-btn px-2 py-2 text-sm font-bold bg-muted text-muted-foreground disabled:opacity-50 flex items-center">
                  <ZoomIn className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>

            <div className="border-r-2 border-black h-6" />

            {/* Eraser */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { setIsEraser(true); setMode("draw") }}
                  disabled={disabled}
                  className={cn("arcade-btn px-2 sm:px-3 py-2 text-sm font-bold flex items-center gap-1", isEraser && mode === "draw" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
                >
                  <Eraser className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Eraser</TooltipContent>
            </Tooltip>

            <div className="border-r-2 border-black h-6" />

            {/* Brush size */}
            <div className="flex items-center gap-2">
              <div
                className="border-2 border-black shrink-0"
                style={{
                  width: Math.max(4, brushSize),
                  height: Math.max(4, brushSize),
                  backgroundColor: "#000",
                }}
              />
              <Slider
                min={2}
                max={30}
                step={1}
                value={[brushSize]}
                onValueChange={([v]) => setBrushSize(v)}
                className="w-16"
                disabled={disabled}
              />
            </div>

            <div className="border-r-2 border-black h-6" />

            {/* Color palette */}
            <div className="flex flex-wrap gap-0.5 sm:gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  disabled={disabled}
                  onClick={() => { setColor(c); setIsEraser(false) }}
                  className={cn(
                    "size-5 sm:size-6 border-2 transition-transform hover:scale-110 focus:outline-none",
                    color === c && !isEraser ? "border-black scale-110 ring-2 ring-primary" : "border-black"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <div className="border-r-2 border-black h-6" />

            {/* Undo / Clear */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={undo}
                  disabled={disabled || history.length === 0}
                  className="arcade-btn px-3 py-2 text-sm font-bold bg-muted text-muted-foreground disabled:opacity-50 flex items-center"
                >
                  <Undo2 className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Undo</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
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
                  disabled={disabled}
                  className="arcade-btn px-3 py-2 text-sm font-bold bg-destructive text-destructive-foreground flex items-center"
                >
                  <Trash2 className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Clear canvas</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    )
  }
)

DrawingCanvas.displayName = "DrawingCanvas"
export default DrawingCanvas
