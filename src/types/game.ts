export interface ScoreResult {
  shape: number
  color: number
  quality: number
  prompt_match: number
  critique: string
  source: "gemini" | "fallback"
}

export type GamePhase =
  | "lobby"
  | "countdown"
  | "drawing"
  | "scoring"
  | "result"
  | "punishment"

export interface PlayerInfo {
  name: string
  index: number
}

export interface RankedPlayer {
  index: number
  name: string
  score: ScoreResult
  total: number
  drawingDataUrl: string
}

export interface RoundResult {
  prompt: string
  ranked: RankedPlayer[]
}

export interface PunishmentCard {
  id: number
  text: string
  icon: string
  category: string
}
