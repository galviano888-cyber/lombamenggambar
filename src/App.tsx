import { useRef, useState, useEffect, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import DrawingCanvas, { type DrawingCanvasHandle } from "@/components/DrawingCanvas"
import { LobbyDecorations } from "@/components/LobbyDecorations"
import { ChatBox } from "@/components/ChatBox"
import { connectSocket, disconnectSocket } from "@/lib/socket"
import { computeDrawingMetrics } from "@/lib/drawingMetrics"
import { playCountdownBeep, playCountdownGo, playTimerWarning, playTimerUrgent, playWinSound, playLoseSound, playSubmitSound } from "@/lib/sounds"
import { cn } from "@/lib/utils"
import {
  Brush,
  ChevronRight,
  Clock,
  RefreshCw,
  Sparkles,
  Trophy,
  Zap,
  Wifi,
  WifiOff,
} from "lucide-react"
import type { GamePhase, RoundResult, PunishmentCard, PlayerInfo, RankedPlayer } from "@/types/game"
import { ModeToggle } from "@/components/mode-toggle"
import type { Socket } from "socket.io-client"

const ROUND_DURATION = 60
const COUNTDOWN_DURATION = 3

const PLAYER_COLORS = {
  p1: "oklch(0.55 0.22 240)",
  p2: "oklch(0.55 0.22 30)",
}

// ─── Countdown ───────────────────────────────────────────────────────────────
function CountdownScreen({ count, prompt }: { count: number; prompt: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 select-none bg-gradient-to-b from-blue-400 to-blue-300">
      <div className="pixel-md text-center text-primary" style={{ textShadow: "2px 2px 0 #000, -2px -2px 0 #fff" }}>
        DRAW: {prompt.toUpperCase()}
      </div>
      <div className="pixel-lg leading-none text-primary" style={{ fontSize: "8rem", textShadow: "4px 4px 0 #000, -2px -2px 0 #fff" }}>
        {count}
      </div>
      <div className="pixel-md text-primary" style={{ textShadow: "2px 2px 0 #000" }}>GET READY!</div>
    </div>
  )
}

// ─── Timer bar ───────────────────────────────────────────────────────────────
function TimerBar({ timeLeft, total }: { timeLeft: number; total: number }) {
  const pct = (timeLeft / total) * 100
  const urgent = timeLeft <= 10
  return (
    <div className="flex items-center gap-3 w-full">
      <Clock className={cn("size-4 shrink-0", urgent ? "text-destructive animate-pulse" : "text-muted-foreground")} />
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-1000", urgent ? "bg-destructive" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn("text-sm font-bold tabular-nums w-8 text-right", urgent ? "text-destructive" : "text-foreground")}>
        {timeLeft}s
      </span>
    </div>
  )
}

// ─── Room Form Panel ────────────────────────────────────────────────────────
type RoomTab = "create" | "join"
type RoomStatus = "idle" | "waiting" | "ready" | "error"

type PlayerRole = "host" | "guest"

function RoomFormPanel({ onStart, socket }: { onStart: (role: PlayerRole) => void; socket: Socket | null }) {
  const [activeTab, setActiveTab] = useState<RoomTab>("create")

  // Create Room state
  const [hostName, setHostName] = useState("")
  const [createPassword, setCreatePassword] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [roomStatus, setRoomStatus] = useState<RoomStatus>("idle")
  const [duration, setDuration] = useState(60)
  const [maxPlayers, setMaxPlayers] = useState(2)
  const [category, setCategory] = useState("all")
  const [players, setPlayers] = useState<PlayerInfo[]>([])

  // Join Room state
  const [playerName, setPlayerName] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [joinPassword, setJoinPassword] = useState("")
  const [joinStatus, setJoinStatus] = useState<RoomStatus>("idle")
  const [joinError, setJoinError] = useState("")

  // ── Socket event listeners ──────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return

    const onRoomCreated = ({ code }: { code: string }) => {
      setRoomCode(code)
      setRoomStatus("waiting")
    }

    const onPlayerListUpdated = ({ players: pList }: { players: PlayerInfo[]; maxPlayers: number }) => {
      setPlayers(pList)
      if (pList.length >= 2) setRoomStatus("ready")
    }

    const onJoinSuccess = ({ players: pList }: { code: string; playerIndex: number; players: PlayerInfo[]; maxPlayers: number }) => {
      setPlayers(pList)
      setJoinStatus("ready")
    }

    const onJoinError = (msg: string) => {
      setJoinError(msg)
      setJoinStatus("error")
    }

    const onPlayerLeft = ({ players: pList }: { playerName: string; players: PlayerInfo[] }) => {
      setPlayers(pList)
      if (pList.length < 2) setRoomStatus("waiting")
    }

    socket.on("room_created", onRoomCreated)
    socket.on("player_list_updated", onPlayerListUpdated)
    socket.on("join_success", onJoinSuccess)
    socket.on("join_error", onJoinError)
    socket.on("player_left", onPlayerLeft)

    return () => {
      socket.off("room_created", onRoomCreated)
      socket.off("player_list_updated", onPlayerListUpdated)
      socket.off("join_success", onJoinSuccess)
      socket.off("join_error", onJoinError)
      socket.off("player_left", onPlayerLeft)
    }
  }, [socket])

  const handleCreateRoom = useCallback(() => {
    if (!hostName.trim() || !socket) return
    socket.emit("create_room", { playerName: hostName, password: createPassword || null, duration, maxPlayers, category })
  }, [hostName, createPassword, socket, duration, maxPlayers, category])

  const handleJoinRoom = useCallback(() => {
    if (!playerName.trim() || !joinCode.trim() || !socket) return
    setJoinStatus("waiting")
    setJoinError("")
    socket.emit("join_room", { playerName, code: joinCode.trim().toUpperCase(), password: joinPassword || null })
  }, [playerName, joinCode, joinPassword, socket])

  const handleResetCreate = () => {
    setRoomCode("")
    setRoomStatus("idle")
    setPlayers([])
    setHostName("")
    setCreatePassword("")
  }

  const handleResetJoin = () => {
    setJoinStatus("idle")
    setJoinError("")
    setPlayerName("")
    setJoinCode("")
    setJoinPassword("")
  }

  const canStart =
    (activeTab === "create" && players.length >= 2) ||
    (activeTab === "join" && joinStatus === "ready")

  // ── Shared input style ──────────────────────────────────────────────────────
  const inputCls =
    "w-full border-4 border-black bg-white dark:bg-input text-foreground font-bold text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:font-normal"

  return (
    <div className="w-full flex flex-col gap-0 border-4 border-black" style={{ boxShadow: "6px 6px 0 #000" }}>
      {/* ── Tab bar ── */}
      <div className="flex border-b-4 border-black">
        {(["create", "join"] as RoomTab[]).map((tab) => (
          <button
            key={tab}
            id={`room-tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={[
              "flex-1 py-3 pixel-sm font-bold uppercase transition-colors",
              activeTab === tab
                ? "bg-primary text-primary-foreground"
                : "bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground",
              tab === "create" ? "border-r-4 border-black" : "",
            ].join(" ")}
          >
            {tab === "create" ? "🎨 Create Room" : "🚪 Join Room"}
          </button>
        ))}
      </div>

      {/* ── Create Room tab ── */}
      {activeTab === "create" && (
        <div className="bg-card p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 pixel-md text-card-foreground">
            <Trophy className="size-5" />
            CREATE A ROOM
          </div>

          {roomStatus === "idle" && (
            <>
              <div className="flex flex-col gap-1 text-left">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Host Name</label>
                <input
                  id="create-host-name"
                  className={inputCls}
                  placeholder="Your nickname..."
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  maxLength={20}
                />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Room Password <span className="text-muted-foreground normal-case">(optional)</span></label>
                <input
                  id="create-room-password"
                  type="password"
                  className={inputCls}
                  placeholder="Leave blank for open room..."
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  maxLength={20}
                />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Drawing Time</label>
                <div className="flex items-center gap-3">
                  <input
                    id="create-room-duration"
                    type="range"
                    min={60}
                    max={300}
                    step={30}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="flex-1 h-2 accent-primary cursor-pointer"
                  />
                  <span className="border-2 border-black bg-white dark:bg-input px-3 py-1 text-sm font-bold min-w-[60px] text-center">
                    {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, "0")}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground font-medium">
                  <span>1 min</span>
                  <span>5 min</span>
                </div>
              </div>
              <div className="flex flex-col gap-1 text-left">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Max Players</label>
                <div className="flex items-center gap-2">
                  {[2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setMaxPlayers(n)}
                      className={[
                        "flex-1 border-4 border-black py-2 text-sm font-bold transition-colors",
                        maxPlayers === n ? "bg-primary text-primary-foreground" : "bg-white dark:bg-input text-foreground hover:bg-accent",
                      ].join(" ")}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1 text-left">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Prompt Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "all", label: "🎲 All" },
                    { value: "animals", label: "🐾 Animals" },
                    { value: "food", label: "🍕 Food" },
                    { value: "vehicles", label: "🚗 Vehicles" },
                    { value: "objects", label: "🎸 Objects" },
                    { value: "places", label: "🏝️ Places" },
                    { value: "people", label: "🧑 People" },
                    { value: "nature", label: "🌈 Nature" },
                    { value: "random", label: "🎭 Random" },
                  ].map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={[
                        "border-3 border-black py-2 px-1 text-xs font-bold transition-colors",
                        category === cat.value ? "bg-primary text-primary-foreground" : "bg-white dark:bg-input text-foreground hover:bg-accent",
                      ].join(" ")}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                id="create-room-btn"
                onClick={handleCreateRoom}
                disabled={!hostName.trim()}
                className="arcade-btn w-full bg-primary text-primary-foreground text-sm py-3 font-bold uppercase disabled:opacity-40 disabled:cursor-not-allowed"
              >
                🎲 CREATE ROOM
              </button>
            </>
          )}

          {(roomStatus === "waiting" || roomStatus === "ready") && (
            <div className="flex flex-col gap-4">
              {/* Room code display */}
              <div className="border-4 border-black bg-white dark:bg-card p-4 flex flex-col items-center gap-2" style={{ boxShadow: "4px 4px 0 #000" }}>
                <div className="text-xs font-bold text-muted-foreground uppercase">Share this code with others</div>
                <div className="pixel-md text-primary" style={{ letterSpacing: "0.15em", textShadow: "2px 2px 0 #000" }}>
                  {roomCode}
                </div>
                <div className="text-xs text-muted-foreground font-bold">Max {maxPlayers} players</div>
              </div>

              {/* Player list */}
              <div className="border-4 border-black bg-white dark:bg-card p-3 flex flex-col gap-2">
                <div className="text-xs font-bold text-muted-foreground uppercase">Players ({players.length}/{maxPlayers})</div>
                {players.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 border-2 border-black p-2 bg-accent">
                    <div className="size-3 rounded-full bg-secondary border-2 border-black shrink-0" />
                    <span className="text-sm font-bold text-foreground">{p.name} {i === 0 && "👑"}</span>
                  </div>
                ))}
                {players.length < maxPlayers && (
                  <div className="flex items-center gap-2 border-2 border-dashed border-black/30 p-2">
                    <div className="size-3 rounded-full bg-primary animate-pulse border-2 border-black shrink-0" />
                    <span className="text-sm text-muted-foreground font-bold">Waiting for players...</span>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className={["flex items-center gap-3 border-4 border-black p-3", players.length >= 2 ? "bg-secondary" : "bg-accent"].join(" ")}>
                <span className="text-sm font-bold text-foreground">
                  {players.length >= 2 ? `✅ Ready! ${players.length} players joined` : "⏳ Need at least 2 players to start"}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  id="create-room-reset"
                  onClick={handleResetCreate}
                  className="arcade-btn flex-1 bg-muted text-muted-foreground text-xs py-2 font-bold uppercase"
                >
                  ↩ New Room
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Join Room tab ── */}
      {activeTab === "join" && (
        <div className="bg-card p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 pixel-md text-card-foreground">
            <Zap className="size-5" />
            JOIN A ROOM
          </div>

          {joinStatus === "idle" && (
            <>
              <div className="flex flex-col gap-1 text-left">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Your Name</label>
                <input
                  id="join-player-name"
                  className={inputCls}
                  placeholder="Your nickname..."
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={20}
                />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Room Code</label>
                <input
                  id="join-room-code"
                  className={inputCls}
                  placeholder="DRAW-XXXX"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={9}
                />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Room Password <span className="text-muted-foreground normal-case">(if required)</span></label>
                <input
                  id="join-room-password"
                  type="password"
                  className={inputCls}
                  placeholder="Leave blank if open room..."
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  maxLength={20}
                />
              </div>
              <button
                id="join-room-btn"
                onClick={handleJoinRoom}
                disabled={!playerName.trim() || !joinCode.trim()}
                className="arcade-btn w-full bg-secondary text-secondary-foreground text-sm py-3 font-bold uppercase disabled:opacity-40 disabled:cursor-not-allowed"
              >
                🚀 JOIN ROOM
              </button>
            </>
          )}

          {joinStatus === "waiting" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex items-center gap-3 border-4 border-black bg-accent p-3 w-full">
                <div className="size-3 rounded-full bg-primary animate-pulse border-2 border-black shrink-0" />
                <span className="text-sm font-bold text-foreground">⏳ Connecting to room...</span>
              </div>
            </div>
          )}

          {joinStatus === "error" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 border-4 border-black bg-primary text-primary-foreground p-3 w-full">
                <span className="text-sm font-bold">❌ {joinError}</span>
              </div>
              <button
                id="join-room-retry"
                onClick={handleResetJoin}
                className="arcade-btn w-full bg-muted text-muted-foreground text-xs py-2 font-bold uppercase"
              >
                ↩ Try Again
              </button>
            </div>
          )}

          {joinStatus === "ready" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 border-4 border-black bg-secondary p-3 w-full">
                <div className="size-3 rounded-full bg-white border-2 border-black shrink-0" />
                <span className="text-sm font-bold text-secondary-foreground">✅ Joined! Waiting for host to start...</span>
              </div>
              <button
                id="join-room-reset"
                onClick={handleResetJoin}
                className="arcade-btn flex-1 bg-muted text-muted-foreground text-xs py-2 font-bold uppercase"
              >
                ↩ Leave Room
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── START BATTLE (shared) ── */}
      <div className="border-t-4 border-black">
        <button
          id="start-battle-btn"
          onClick={() => onStart(activeTab === "create" ? "host" : "guest")}
          disabled={!canStart}
          className="arcade-btn w-full bg-primary text-primary-foreground text-lg py-4 font-bold uppercase disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 transition-all"
        >
          {canStart ? "⚔️ START BATTLE" : "🔒 START BATTLE"}
          <ChevronRight className="inline size-5 ml-2" />
        </button>
      </div>
    </div>
  )
}

// ─── Lobby ────────────────────────────────────────────────────────────────────
function LobbyScreen({ onStart, socket }: { onStart: (role: PlayerRole) => void; socket: Socket | null }) {
  const connected = socket?.connected ?? false
  return (
    <div className="relative min-h-[70vh]">
      {/* Full-width decorations layer */}
      <LobbyDecorations />

      {/* Centered content */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-5 sm:gap-8 max-w-2xl mx-auto text-center py-4 px-2 sm:px-0">
        {/* Hero section */}
        <div className="flex flex-col items-center gap-3 sm:gap-5">
          {/* Animated logo */}
          <div className="animate-bounce-in flex items-center justify-center size-16 sm:size-24 bg-primary text-primary-foreground border-4 border-black" style={{ boxShadow: "6px 6px 0 rgba(0,0,0,0.4)" }}>
            <Brush className="size-8 sm:size-12 animate-wiggle" />
          </div>

          {/* Title */}
          <div className="relative">
            <h1 className="pixel-lg text-primary relative z-10" style={{ textShadow: "3px 3px 0 #000, -1px -1px 0 #FBD000" }}>
              DrawBattle
            </h1>
          </div>

          {/* Tagline */}
          <div className="border-4 border-black bg-white/90 dark:bg-card/90 px-4 sm:px-6 py-2 sm:py-3" style={{ boxShadow: "4px 4px 0 rgba(0,0,0,0.3)" }}>
            <p className="text-sm sm:text-base font-bold text-foreground leading-relaxed">
              Two players. One prompt. Draw and compete!
              <br />
              <span className="text-primary">Who draws better?</span> Get scored across <span className="text-secondary">4 criteria!</span>
            </p>
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-2">
            {connected ? (
              <Badge className="gap-1.5 text-xs border-2 border-black bg-secondary text-secondary-foreground">
                <Wifi className="size-3" />
                CONNECTED
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1.5 text-xs border-2 border-black bg-destructive text-destructive-foreground font-bold">
                <WifiOff className="size-3" />
                CONNECTING...
              </Badge>
            )}
          </div>
        </div>

        {/* Room form */}
        <div className="w-full">
          <RoomFormPanel onStart={onStart} socket={socket} />
        </div>
      </div>
    </div>
  )
}

// ─── Scoring screen ───────────────────────────────────────────────────────────
function ScoringScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 select-none">
      <div className="flex items-center justify-center size-24 border-4 border-black bg-accent" style={{ boxShadow: "8px 8px 0 rgba(0,0,0,0.3)" }}>
        <Sparkles className="size-12 text-accent-foreground animate-pulse" />
      </div>
      <div className="text-center">
        <h2 className="pixel-md text-primary" style={{ textShadow: "2px 2px 0 #000" }}>JUDGING...</h2>
        <p className="text-muted-foreground text-sm mt-2 font-bold">
          Analyzing your masterpiece
        </p>
      </div>
      <Spinner className="size-8 text-primary" />
    </div>
  )
}

// ─── Result screen ────────────────────────────────────────────────────────────
function ResultScreen({
  result,
  onNext,
  isHost,
}: {
  result: RoundResult
  onNext: () => void
  isHost: boolean
}) {
  const ranked = result.ranked
  const winner = ranked[0]
  const tied = ranked.length >= 2 && ranked[0].total === ranked[1].total

  return (
    <div className="flex flex-col gap-4 sm:gap-8 max-w-4xl mx-auto">
      <div className="text-center flex flex-col items-center gap-3 sm:gap-4">
        <div
          className="flex items-center justify-center size-14 sm:size-20 border-4 border-black bg-secondary"
          style={{ boxShadow: "6px 6px 0 rgba(0,0,0,0.3)" }}
        >
          <Trophy className="size-7 sm:size-10 text-white" />
        </div>
        <h2 className="pixel-md sm:pixel-lg text-primary" style={{ textShadow: "3px 3px 0 #000" }}>
          {tied ? "It's a Tie!" : `${winner.name} WINS!`}
        </h2>
        <Badge className="gap-2 text-xs sm:text-sm border-2 border-black bg-secondary text-secondary-foreground font-bold">
          <Brush className="size-3 sm:size-4" />
          {result.prompt.toUpperCase()}
        </Badge>
      </div>

      {/* Ranked results */}
      <div className="flex flex-col gap-2 sm:gap-4">
        {ranked.map((player, i) => (
          <div key={player.index} className={[
            "border-3 sm:border-4 border-black p-2.5 sm:p-4 flex items-center gap-2 sm:gap-4",
            i === 0 ? "bg-accent" : "bg-card",
          ].join(" ")} style={{ boxShadow: i === 0 ? "4px 4px 0 rgba(0,0,0,0.3)" : "3px 3px 0 rgba(0,0,0,0.2)" }}>
            {/* Rank */}
            <div className="pixel-sm sm:pixel-md text-primary shrink-0 w-8 sm:w-10 text-center" style={{ textShadow: "1px 1px 0 #000" }}>
              {i === 0 ? "👑" : `#${i + 1}`}
            </div>
            {/* Drawing thumbnail */}
            {player.drawingDataUrl && (
              <div className="border-2 border-black bg-white dark:bg-input shrink-0 hidden sm:block">
                <img src={player.drawingDataUrl} alt={`${player.name}'s drawing`} className="w-16 h-12 object-contain" />
              </div>
            )}
            {/* Player info */}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-foreground text-xs sm:text-sm truncate">{player.name}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground font-medium italic truncate">{player.score.critique}</div>
            </div>
            {/* Score */}
            <div className="pixel-sm sm:pixel-md tabular-nums text-primary shrink-0" style={{ textShadow: "1px 1px 0 #000" }}>
              {player.total}
            </div>
          </div>
        ))}
      </div>

      {/* Score breakdown */}
      {ranked.length > 0 && (
        <div className="border-3 sm:border-4 border-black bg-card p-3 sm:p-4">
          <div className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase mb-2 sm:mb-3">Score Breakdown</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[
              { label: "Shape", key: "shape" as const, color: "#5C94FC" },
              { label: "Color", key: "color" as const, color: "#FBD000" },
              { label: "Quality", key: "quality" as const, color: "#43B047" },
              { label: "Match", key: "prompt_match" as const, color: "#E52521" },
            ].map((cat) => (
              <div key={cat.key} className="border-2 border-black p-2 bg-white dark:bg-input">
                <div className="text-xs font-bold" style={{ color: cat.color }}>{cat.label}</div>
                <div className="flex flex-col gap-1 mt-1">
                  {ranked.map((p, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-foreground font-medium truncate">{p.name}</span>
                      <span className="font-bold">{p.score[cat.key]}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isHost ? (
        <button onClick={onNext} className="arcade-btn w-full bg-secondary text-secondary-foreground text-lg py-4 font-bold uppercase gap-2 flex items-center justify-center">
          <ChevronRight className="size-5" />
          Next
        </button>
      ) : (
        <div className="flex items-center justify-center gap-3 border-4 border-black bg-accent p-4">
          <div className="size-3 rounded-full bg-primary animate-pulse border-2 border-black shrink-0" />
          <span className="text-sm font-bold text-foreground uppercase">Waiting for host...</span>
        </div>
      )}
    </div>
  )
}

// ─── Punishment Screen ────────────────────────────────────────────────────────
function PunishmentScreen({
  punishment,
  rerollsLeft,
  onReroll,
  onPlayAgain,
  isHost,
  isLoser,
}: {
  punishment: PunishmentCard | null
  rerollsLeft: number
  onReroll: () => void
  onPlayAgain: () => void
  isHost: boolean
  isLoser: boolean
}) {
  return (
    <div className="flex flex-col gap-4 sm:gap-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center flex flex-col items-center gap-3 sm:gap-4">
        <div className="flex items-center justify-center size-14 sm:size-20 border-4 border-black bg-destructive" style={{ boxShadow: "6px 6px 0 rgba(0,0,0,0.3)" }}>
          <span className="text-2xl sm:text-4xl">🎴</span>
        </div>
        <h2 className="pixel-md sm:pixel-lg text-primary" style={{ textShadow: "3px 3px 0 #000" }}>
          PUNISHMENT CARD
        </h2>
        <p className="text-xs sm:text-sm font-bold text-foreground">
          {isLoser ? "Kamu kalah! Ini hukumanmu:" : "Lawan kalah! Ini hukumannya:"}
        </p>
      </div>

      {/* Punishment Card */}
      {punishment ? (
        <div className="border-4 border-black bg-card p-4 sm:p-8 flex flex-col items-center gap-4 sm:gap-6 animate-bounce-in" style={{ boxShadow: "6px 6px 0 rgba(0,0,0,0.3)" }}>
          <span className="text-4xl sm:text-6xl">{punishment.icon}</span>
          <div className="pixel-sm sm:pixel-md text-center text-card-foreground leading-relaxed" style={{ textShadow: "1px 1px 0 rgba(0,0,0,0.2)" }}>
            {punishment.text}
          </div>
          <Badge className="text-[10px] sm:text-xs border-2 border-black bg-accent text-accent-foreground font-bold uppercase">
            {punishment.category}
          </Badge>
        </div>
      ) : (
        <div className="border-4 border-black bg-card p-8 flex items-center justify-center">
          <Spinner className="size-8 text-primary" />
        </div>
      )}

      {/* Reroll button (only for loser) */}
      {isLoser && (
        <div className="flex flex-col items-center gap-2 sm:gap-3">
          <button
            onClick={onReroll}
            disabled={rerollsLeft <= 0}
            className="arcade-btn w-full bg-accent text-accent-foreground text-sm sm:text-base py-2.5 sm:py-3 font-bold uppercase disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <RefreshCw className="size-4 sm:size-5" />
            Ganti Kartu ({rerollsLeft}/3)
          </button>
          {rerollsLeft <= 0 && (
            <span className="text-[10px] sm:text-xs font-bold text-destructive">Tidak bisa ganti lagi!</span>
          )}
        </div>
      )}

      {/* Play Again button (host only) */}
      {isHost ? (
        <button onClick={onPlayAgain} className="arcade-btn w-full bg-secondary text-secondary-foreground text-base sm:text-lg py-3 sm:py-4 font-bold uppercase gap-2 flex items-center justify-center">
          <RefreshCw className="size-4 sm:size-5" />
          Play Again
        </button>
      ) : (
        <div className="flex items-center justify-center gap-2 sm:gap-3 border-4 border-black bg-accent p-3 sm:p-4">
          <div className="size-2.5 sm:size-3 rounded-full bg-primary animate-pulse border-2 border-black shrink-0" />
          <span className="text-[10px] sm:text-sm font-bold text-foreground uppercase">Waiting for host...</span>
        </div>
      )}
    </div>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export function App() {
  const [phase, setPhase] = useState<GamePhase>("lobby")
  const [prompt, setPrompt] = useState("")
  const [countdown, setCountdown] = useState(COUNTDOWN_DURATION)
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION)
  const [result, setResult] = useState<RoundResult | null>(null)
  const [isEnding, setIsEnding] = useState(false)
  const [playerRole, setPlayerRole] = useState<PlayerRole | null>(null)
  const [playerIndex, setPlayerIndex] = useState<number>(0)
  const [gamePlayers, setGamePlayers] = useState<PlayerInfo[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)
  const [punishment, setPunishment] = useState<PunishmentCard | null>(null)
  const [rerollsLeft, setRerollsLeft] = useState(3)
  const [loserIndex, setLoserIndex] = useState<number | null>(null)
  const [roundDuration, setRoundDuration] = useState(ROUND_DURATION)

  const p1Ref = useRef<DrawingCanvasHandle>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const submitRef = useRef<() => void>(() => {})

  // ── Connect socket on mount ──
  useEffect(() => {
    const s = connectSocket()
    setSocket(s)

    s.on("connect", () => {
      console.log("[Socket] Connected:", s.id)
      setSocket({ ...s } as unknown as Socket) // force re-render
      setSocket(s)
    })

    s.on("disconnect", () => {
      console.log("[Socket] Disconnected")
    })

    s.on("host_disconnected", () => {
      alert("Host has left the room. Returning to lobby.")
      resetToLobby()
    })

    s.on("player_left", () => {
      // handled in RoomFormPanel for lobby, just log here
    })

    // Set playerIndex when room is created (host = 0)
    s.on("room_created", () => {
      setPlayerIndex(0)
    })

    // Set playerIndex when joining a room
    s.on("join_success", ({ playerIndex: idx }: { playerIndex: number }) => {
      setPlayerIndex(idx)
    })

    return () => {
      disconnectSocket()
    }
  }, [])

  // ── Socket game event listeners ──
  useEffect(() => {
    if (!socket) return

    const onGameStarted = ({ prompt: p, duration: d, players: pList }: { prompt: string; duration?: number; players?: PlayerInfo[] }) => {
      // If playerRole not set yet, we must be the guest
      setPlayerRole((prev) => prev ?? "guest")
      setPrompt(p)
      if (d) setRoundDuration(d)
      if (pList) setGamePlayers(pList)
      setCountdown(COUNTDOWN_DURATION)
      setTimeLeft(d || ROUND_DURATION)
      setResult(null)
      setIsEnding(false)
      setPhase("countdown")
    }

    const onCountdownTick = ({ count }: { count: number }) => {
      setCountdown(count)
      if (count > 0) playCountdownBeep()
      else playCountdownGo()
    }

    const onDrawingStart = ({ duration }: { duration: number }) => {
      setTimeLeft(duration)
      setPhase("drawing")
      // Start local timer
      if (timerRef.current) clearInterval(timerRef.current)
      let t = duration
      timerRef.current = setInterval(() => {
        t--
        setTimeLeft(t)
        if (t <= 5 && t > 0) playTimerUrgent()
        else if (t <= 10 && t > 5) playTimerWarning()
        if (t <= 0) {
          if (timerRef.current) clearInterval(timerRef.current)
          submitRef.current()
        }
      }, 1000)
    }

    const onForceSubmit = () => {
      if (timerRef.current) clearInterval(timerRef.current)
      submitRef.current()
    }

    const onScoringStart = () => {
      setPhase("scoring")
    }

    const onScoresReady = ({ prompt: p, ranked }: {
      prompt: string
      ranked: RankedPlayer[]
    }) => {
      setResult({ prompt: p, ranked })
      setPhase("result")
      // Play win/lose sound based on player's position
      if (ranked.length > 0 && ranked[0].index === playerIndex) playWinSound()
      else playLoseSound()
    }

    const onScoringError = ({ message }: { message: string }) => {
      alert(`Scoring error: ${message}`)
      setPhase("drawing")
    }

    const onPunishmentPhase = ({ card, rerollsLeft: rolls, loserIndex: li }: { card: PunishmentCard; rerollsLeft: number; loserIndex: number }) => {
      setPunishment(card)
      setRerollsLeft(rolls)
      setLoserIndex(li)
      setPhase("punishment")
    }

    const onPunishmentUpdated = ({ card, rerollsLeft: rolls }: { card: PunishmentCard; rerollsLeft: number }) => {
      setPunishment(card)
      setRerollsLeft(rolls)
    }

    const onRerollDenied = () => {
      // Do nothing, UI already shows 0 rerolls
    }

    socket.on("game_started", onGameStarted)
    socket.on("countdown_tick", onCountdownTick)
    socket.on("drawing_start", onDrawingStart)
    socket.on("force_submit", onForceSubmit)
    socket.on("scoring_start", onScoringStart)
    socket.on("scores_ready", onScoresReady)
    socket.on("scoring_error", onScoringError)
    socket.on("punishment_phase", onPunishmentPhase)
    socket.on("punishment_updated", onPunishmentUpdated)
    socket.on("reroll_denied", onRerollDenied)

    return () => {
      socket.off("game_started", onGameStarted)
      socket.off("countdown_tick", onCountdownTick)
      socket.off("drawing_start", onDrawingStart)
      socket.off("force_submit", onForceSubmit)
      socket.off("scoring_start", onScoringStart)
      socket.off("scores_ready", onScoresReady)
      socket.off("scoring_error", onScoringError)
      socket.off("punishment_phase", onPunishmentPhase)
      socket.off("punishment_updated", onPunishmentUpdated)
      socket.off("reroll_denied", onRerollDenied)
    }
  }, [socket, playerRole])

  const resetToLobby = useCallback(() => {
    setPhase("lobby")
    setPrompt("")
    setResult(null)
    setPlayerRole(null)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const submitDrawing = useCallback(async () => {
    if (!socket || isEnding) return
    setIsEnding(true)
    playSubmitSound()
    const imageDataUrl = p1Ref.current?.getDataUrl() ?? ""
    const metrics = await computeDrawingMetrics(imageDataUrl)
    socket.emit("submit_drawing", { imageDataUrl, metrics })
  }, [socket, isEnding])

  // Keep ref in sync so interval/event closures always call latest version
  useEffect(() => {
    submitRef.current = submitDrawing
  }, [submitDrawing])

  const startGame = useCallback((role: PlayerRole) => {
    setPlayerRole(role)
    if (role === "host" && socket) {
      socket.emit("start_game")
    }
  }, [socket])

  const endRound = useCallback(() => {
    if (!socket) return
    if (playerRole === "host") {
      socket.emit("end_round")
    }
    submitDrawing()
  }, [socket, playerRole])

  const playAgain = useCallback(() => {
    if (!socket) return
    setIsEnding(false)
    setPunishment(null)
    setRerollsLeft(3)
    setLoserIndex(null)
    if (playerRole === "host") {
      socket.emit("play_again")
    }
  }, [socket, playerRole])

  const goToPunishment = useCallback(() => {
    if (!socket || !result) return
    const ranked = result.ranked
    if (ranked.length < 2) return
    // Check tie between last two
    if (ranked[0].total === ranked[ranked.length - 1].total) {
      playAgain()
      return
    }
    const loser = ranked[ranked.length - 1] // lowest score
    setLoserIndex(loser.index)
    socket.emit("request_punishment", { loserIndex: loser.index })
  }, [socket, result, playAgain])

  const rerollPunishment = useCallback(() => {
    if (!socket || rerollsLeft <= 0) return
    socket.emit("reroll_punishment")
  }, [socket, rerollsLeft])

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b-4 border-black bg-card sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 h-12 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Brush className="size-5 sm:size-6 text-foreground" />
            <span className="pixel-sm sm:pixel-md text-foreground hidden sm:inline" style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.3)" }}>DrawBattle</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {phase === "drawing" && (
              <>
                <Badge className="gap-2 font-bold hidden sm:flex border-2 border-black bg-accent text-accent-foreground">
                  <Brush className="size-4" />
                  {prompt.toUpperCase()}
                </Badge>
                <Badge className="gap-1 font-bold flex sm:hidden border-2 border-black bg-accent text-accent-foreground text-xs px-2 py-1">
                  {prompt.toUpperCase()}
                </Badge>
                {playerRole === "host" && (
                  <button
                    onClick={endRound}
                    className="arcade-btn bg-destructive text-destructive-foreground px-2 sm:px-4 py-1.5 sm:py-2 font-bold text-xs sm:text-sm gap-1.5 flex items-center"
                  >
                    END
                  </button>
                )}
              </>
            )}
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {phase === "lobby" && <LobbyScreen onStart={startGame} socket={socket} />}
        {phase === "countdown" && <CountdownScreen count={countdown} prompt={prompt} />}
        {phase === "drawing" && (
          <div className="flex flex-col gap-3 sm:gap-6">
            <TimerBar timeLeft={timeLeft} total={roundDuration} />
            {/* Role badge */}
            <div className="flex justify-center">
              <div className="flex items-center gap-2 border-3 sm:border-4 border-black px-3 sm:px-4 py-1.5 sm:py-2 bg-card" style={{ boxShadow: "3px 3px 0 #000" }}>
                <div className="size-2.5 sm:size-3 border-2 border-black bg-primary" />
                <span className="text-[10px] sm:text-xs font-bold text-foreground uppercase">
                  Draw your best! ({gamePlayers.length} players)
                </span>
              </div>
            </div>
            <div className="max-w-2xl mx-auto w-full">
              <DrawingCanvas
                ref={p1Ref}
                playerName="Your Canvas"
                playerColor={PLAYER_COLORS.p1}
                disabled={timeLeft <= 0}
                disabledReason="time"
              />
            </div>
          </div>
        )}
        {phase === "scoring" && <ScoringScreen />}
        {phase === "result" && result && (
          <ResultScreen result={result} onNext={goToPunishment} isHost={playerRole === "host"} />
        )}
        {phase === "punishment" && (
          <PunishmentScreen
            punishment={punishment}
            rerollsLeft={rerollsLeft}
            onReroll={rerollPunishment}
            onPlayAgain={playAgain}
            isHost={playerRole === "host"}
            isLoser={loserIndex === playerIndex}
          />
        )}
      </main>
      {/* Chat box — visible when in a room */}
      {phase !== "lobby" && <ChatBox socket={socket} />}
    </div>
  )
}

export default App
