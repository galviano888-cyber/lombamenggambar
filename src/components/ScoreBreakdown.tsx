import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Crown, Cpu, Zap } from "lucide-react"
import type { ScoreResult } from "@/types/game"

interface CriterionRowProps {
  label: string
  score: number
  max: number
  color: string
}

function CriterionRow({ label, score, max, color }: CriterionRowProps) {
  const pct = Math.round((score / max) * 100)
  return (
    <div className="border-2 border-black p-2.5 bg-white">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-foreground uppercase">{label}</span>
        <span className="pixel-sm text-foreground tabular-nums">
          {score}/{max}
        </span>
      </div>
      <div className="h-3 w-full border-2 border-black overflow-hidden">
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

const CRITERION_COLORS = {
  shape: "#5C94FC",
  color: "#FBD000",
  quality: "#43B047",
  prompt_match: "#E52521",
}

interface Props {
  playerName: string
  playerColor: string
  score: ScoreResult
  isWinner: boolean
  drawingDataUrl?: string
  className?: string
}

export default function ScoreBreakdown({
  playerName,
  playerColor,
  score,
  isWinner,
  drawingDataUrl,
  className,
}: Props) {
  const total = score.shape + score.color + score.quality + score.prompt_match

  return (
    <div
      className={cn(
        "flex flex-col border-4 border-black overflow-hidden transition-all",
        isWinner && "ring-4 ring-offset-0",
        className
      )}
      style={isWinner ? { outline: `4px solid ${playerColor}` } : {}}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b-4 border-black"
        style={{ backgroundColor: playerColor }}
      >
        <div className="flex items-center gap-2">
          <div
            className="size-4 border-2 border-white"
            style={{ backgroundColor: playerColor }}
          />
          <span className="pixel-md text-white" style={{ textShadow: "1px 1px 0 rgba(0,0,0,0.5)" }}>{playerName}</span>
          {isWinner && (
            <Badge className="gap-1 text-xs px-2 border-2 border-white bg-yellow-300 text-black font-bold ml-auto">
              <Crown className="size-3" />
              WINNER
            </Badge>
          )}
        </div>
        <div className="text-right ml-auto">
          <div className="pixel-md tabular-nums text-white" style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.5)" }}>
            {total}
          </div>
          <div className="text-xs text-white font-bold">/100</div>
        </div>
      </div>

      {/* Drawing preview */}
      {drawingDataUrl && (
        <div className="p-3 border-b-4 border-black bg-white">
          <img
            src={drawingDataUrl}
            alt={`${playerName}'s drawing`}
            className="w-full border-2 border-black object-cover bg-white"
            style={{ maxHeight: 140 }}
          />
        </div>
      )}

      {/* Criteria breakdown */}
      <div className="flex flex-col gap-2 p-3 bg-card">
        <CriterionRow
          label="Shape Similarity"
          score={score.shape}
          max={25}
          color={CRITERION_COLORS.shape}
        />
        <CriterionRow
          label="Color Accuracy"
          score={score.color}
          max={25}
          color={CRITERION_COLORS.color}
        />
        <CriterionRow
          label="Quality & Effort"
          score={score.quality}
          max={25}
          color={CRITERION_COLORS.quality}
        />
        <CriterionRow
          label="Prompt Matching"
          score={score.prompt_match}
          max={25}
          color={CRITERION_COLORS.prompt_match}
        />
      </div>

      {/* AI Critique */}
      <div className="flex items-start gap-2 px-3 py-3 border-t-4 border-black bg-muted">
        <div className="mt-0.5 shrink-0">
          {score.source === "gemini" ? (
            <Zap className="size-4 text-primary" />
          ) : (
            <Cpu className="size-4 text-primary" />
          )}
        </div>
        <p className="text-xs text-muted-foreground font-medium leading-relaxed">
          "{score.critique}"
        </p>
      </div>
    </div>
  )
}
