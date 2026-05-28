import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Eraser, Pencil, Trash2, Undo2 } from "lucide-react"

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
    const [isDrawing, setIsDrawing] = useState(false)
    const [color, setColor] = useState("#000000")
    const [brushSize, setBrushSize] = useState(6)
    const [isEraser, setIsEraser] = useState(false)
    const [history, setHistory] = useState<ImageData[]>([])
    const lastPoint = useRef<{ x: number; y: number } | null>(null)

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

    return (
      <div className={cn("flex flex-col gap-4", className)}>
        {/* Player label */}
        <div className="flex items-center gap-3">
          <div
            className="size-4 border-2 border-black"
            style={{ backgroundColor: playerColor }}
          />
          <span className="pixel-md text-foreground" style={{ textShadow: "1px 1px 0 rgba(0,0,0,0.2)" }}>{playerName}</span>
        </div>

        {/* Canvas */}
        <div className="relative border-4 border-black bg-white dark:bg-gray-100 overflow-hidden" style={{ boxShadow: "6px 6px 0 rgba(0,0,0,0.3)" }}>
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            className={cn(
              "w-full touch-none block aspect-[4/3] sm:aspect-[3/2]",
              disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-crosshair"
            )}
            style={{ maxHeight: "calc(100svh - 180px)" }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
          {disabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
              <div className="pixel-md text-primary" style={{ textShadow: "2px 2px 0 #fff", background: "rgba(255,255,255,0.8)", padding: "8px 16px", border: "2px solid #000" }}>
                {disabledReason === "opponent" ? "OPPONENT'S CANVAS" : "TIME'S UP!"}
              </div>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 border-4 border-black bg-card p-2 sm:p-3">
          <TooltipProvider>
            {/* Tool buttons */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsEraser(false)}
                  disabled={disabled}
                  className={cn("arcade-btn px-3 py-2 text-sm font-bold flex items-center gap-1", !isEraser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
                >
                  <Pencil className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Pen</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsEraser(true)}
                  disabled={disabled}
                  className={cn("arcade-btn px-3 py-2 text-sm font-bold flex items-center gap-1", isEraser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
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
