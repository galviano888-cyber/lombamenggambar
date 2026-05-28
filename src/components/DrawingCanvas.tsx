import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react"
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
    const [color, setColor] = useState("#000000")
    const [brushSize, setBrushSize] = useState(6)
    const [isEraser, setIsEraser] = useState(false)
    const [history, setHistory] = useState<ImageData[]>([])
    const [showColors, setShowColors] = useState(false)

    const isDrawing = useRef(false)
    const lastX = useRef(0)
    const lastY = useRef(0)
    const historySaved = useRef(false)

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

    // Simple, reliable coordinate calculation
    const getXY = (e: PointerEvent | React.PointerEvent): [number, number] => {
      const canvas = canvasRef.current!
      const rect = canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left) * (canvas.width / rect.width)
      const y = (e.clientY - rect.top) * (canvas.height / rect.height)
      return [x, y]
    }

    const handleDown = useCallback((e: React.PointerEvent) => {
      if (disabled) return
      if (e.pointerType === "touch" && e.isPrimary === false) return // ignore multi-touch
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)

      if (!historySaved.current) {
        saveHistory()
        historySaved.current = true
      }

      const [x, y] = getXY(e)
      lastX.current = x
      lastY.current = y
      isDrawing.current = true

      // Draw a dot at the start point
      const canvas = canvasRef.current!
      const ctx = canvas.getContext("2d")!
      ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over"
      ctx.fillStyle = isEraser ? "rgba(0,0,0,1)" : color
      const size = isEraser ? brushSize * 2 : brushSize
      ctx.beginPath()
      ctx.arc(x, y, size / 2, 0, Math.PI * 2)
      ctx.fill()
    }, [disabled, isEraser, color, brushSize, saveHistory])

    const handleMove = useCallback((e: React.PointerEvent) => {
      if (!isDrawing.current || disabled) return
      if (e.pointerType === "touch" && e.isPrimary === false) return
      e.preventDefault()

      const [x, y] = getXY(e)
      const canvas = canvasRef.current!
      const ctx = canvas.getContext("2d")!

      ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over"
      ctx.strokeStyle = isEraser ? "rgba(0,0,0,1)" : color
      ctx.lineWidth = isEraser ? brushSize * 2 : brushSize
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      ctx.beginPath()
      ctx.moveTo(lastX.current, lastY.current)
      ctx.lineTo(x, y)
      ctx.stroke()

      lastX.current = x
      lastY.current = y
    }, [disabled, isEraser, color, brushSize])

    const handleUp = useCallback((e: React.PointerEvent) => {
      e.currentTarget.releasePointerCapture(e.pointerId)
      isDrawing.current = false
      historySaved.current = false
    }, [])

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {/* Player label */}
        <div className="flex items-center gap-2">
          <div className="size-3 border-2 border-black" style={{ backgroundColor: playerColor }} />
          <span className="pixel-sm text-foreground">{playerName}</span>
        </div>

        {/* Canvas — simple, no transform wrapper */}
        <div className="relative border-4 border-black bg-black overflow-hidden" style={{ boxShadow: "4px 4px 0 rgba(0,0,0,0.3)" }}>
          <canvas
            ref={canvasRef}
            width={1024}
            height={1024}
            className={cn(
              "w-full h-auto block touch-none",
              disabled ? "opacity-50 pointer-events-none" : "cursor-crosshair"
            )}
            onPointerDown={handleDown}
            onPointerMove={handleMove}
            onPointerUp={handleUp}
            onPointerLeave={handleUp}
          />
          {disabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
              <div className="pixel-sm sm:pixel-md text-primary" style={{ textShadow: "2px 2px 0 #fff", background: "rgba(255,255,255,0.85)", padding: "6px 14px", border: "2px solid #000" }}>
                {disabledReason === "opponent" ? "OPPONENT'S CANVAS" : "TIME'S UP!"}
              </div>
            </div>
          )}
        </div>

        {/* Floating Toolbar */}
        {!disabled && (
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-full border border-white/30 dark:border-white/10 bg-white/70 dark:bg-black/50 backdrop-blur-xl shadow-lg">
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

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Color */}
            <button
              onClick={() => setShowColors(!showColors)}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="size-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: color }} />
            </button>

            {/* Brush size */}
            <input
              type="range"
              min={2}
              max={30}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-16 sm:w-20 h-1.5 accent-primary cursor-pointer"
            />

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
        )}

        {/* Color palette popup */}
        {showColors && !disabled && (
          <div className="flex flex-wrap justify-center gap-1.5 px-3 py-2 rounded-2xl border border-white/30 dark:border-white/10 bg-white/80 dark:bg-black/60 backdrop-blur-xl shadow-lg">
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
    )
  }
)

DrawingCanvas.displayName = "DrawingCanvas"
export default DrawingCanvas
