import { Brush, Palette, Pencil, Droplets, PenTool, Star } from "lucide-react"

const SPLAT_COLORS = [
  "#E52521", "#43B047", "#5C94FC", "#FBD000", "#B83000",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
]

function PaintSplat({ color, size, top, left, delay }: {
  color: string; size: number; top: string; left: string; delay: number
}) {
  return (
    <div
      className="paint-splat animate-splat"
      style={{
        background: color,
        width: size,
        height: size,
        top,
        left,
        animationDelay: `${delay}s`,
        opacity: 0,
      }}
    />
  )
}

function InkDrip({ color, height, top, left, delay }: {
  color: string; height: number; top: string; left: string; delay: number
}) {
  return (
    <div
      className="ink-drip animate-drip"
      style={{
        background: color,
        height,
        top,
        left,
        animationDelay: `${delay}s`,
        animationDuration: `${3 + Math.random() * 2}s`,
      }}
    />
  )
}

function FloatingIcon({ children, top, left, delay, duration }: {
  children: React.ReactNode; top: string; left: string; delay: number; duration?: number
}) {
  return (
    <div
      className="absolute pointer-events-none animate-float"
      style={{
        top,
        left,
        animationDelay: `${delay}s`,
        animationDuration: `${duration || 4}s`,
        opacity: 0.5,
      }}
    >
      {children}
    </div>
  )
}

// ─── Cute Mascot Characters ──────────────────────────────────────────────────

function DinoMascot() {
  return (
    <div className="absolute left-[3%] top-[15%] animate-float-slow hidden lg:block" style={{ animationDelay: "0.5s" }}>
      <div className="relative" style={{ width: 120, height: 140 }}>
        {/* Dino body */}
        <div className="absolute" style={{ width: 70, height: 60, background: "#43B047", border: "3px solid #000", borderRadius: "30% 30% 20% 20%", top: 50, left: 20 }} />
        {/* Dino head */}
        <div className="absolute" style={{ width: 50, height: 45, background: "#43B047", border: "3px solid #000", borderRadius: "40% 50% 20% 20%", top: 15, left: 30 }} />
        {/* Eye */}
        <div className="absolute" style={{ width: 12, height: 14, background: "#fff", border: "2px solid #000", borderRadius: "50%", top: 25, left: 52 }}>
          <div className="absolute" style={{ width: 6, height: 6, background: "#000", borderRadius: "50%", top: 4, left: 4 }} />
        </div>
        {/* Mouth smile */}
        <div className="absolute" style={{ width: 20, height: 8, borderBottom: "3px solid #000", borderRadius: "0 0 50% 50%", top: 42, left: 45 }} />
        {/* Dino spikes */}
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="absolute" style={{
            width: 0, height: 0,
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderBottom: `10px solid #E52521`,
            top: 8 + i * 14,
            left: 22 + i * 5,
          }} />
        ))}
        {/* Arm holding brush */}
        <div className="absolute animate-wiggle" style={{ width: 30, height: 8, background: "#43B047", border: "2px solid #000", borderRadius: 4, top: 70, left: 75, transformOrigin: "left center" }}>
          {/* Brush */}
          <div className="absolute" style={{ width: 6, height: 25, background: "#B83000", border: "2px solid #000", borderRadius: "2px 2px 0 0", top: -20, left: 20 }}>
            <div className="absolute" style={{ width: 10, height: 10, background: "#FBD000", border: "2px solid #000", borderRadius: "50% 50% 20% 20%", top: -8, left: -2 }} />
          </div>
        </div>
        {/* Legs */}
        <div className="absolute" style={{ width: 18, height: 20, background: "#43B047", border: "3px solid #000", borderRadius: "0 0 30% 30%", top: 105, left: 30 }} />
        <div className="absolute" style={{ width: 18, height: 20, background: "#43B047", border: "3px solid #000", borderRadius: "0 0 30% 30%", top: 105, left: 55 }} />
        {/* Tail */}
        <div className="absolute" style={{ width: 25, height: 12, background: "#43B047", border: "3px solid #000", borderRadius: "50% 0 50% 50%", top: 90, left: 0 }} />
        {/* Speech bubble */}
        <div className="absolute pixel-sm text-center" style={{
          background: "#fff",
          border: "2px solid #000",
          padding: "4px 8px",
          top: -15,
          left: 50,
          whiteSpace: "nowrap",
          fontSize: "8px",
          boxShadow: "2px 2px 0 rgba(0,0,0,0.3)",
        }}>
          Let's draw!
        </div>
      </div>
    </div>
  )
}

function PenguinMascot() {
  return (
    <div className="absolute right-[3%] top-[20%] animate-float-slow hidden lg:block" style={{ animationDelay: "1.5s" }}>
      <div className="relative" style={{ width: 110, height: 140 }}>
        {/* Body */}
        <div className="absolute" style={{ width: 60, height: 70, background: "#202020", border: "3px solid #000", borderRadius: "40% 40% 30% 30%", top: 35, left: 25 }} />
        {/* Belly */}
        <div className="absolute" style={{ width: 36, height: 45, background: "#fff", border: "2px solid #000", borderRadius: "50%", top: 45, left: 37 }} />
        {/* Head */}
        <div className="absolute" style={{ width: 50, height: 45, background: "#202020", border: "3px solid #000", borderRadius: "50% 50% 40% 40%", top: 0, left: 30 }} />
        {/* Eyes */}
        <div className="absolute" style={{ width: 14, height: 16, background: "#fff", border: "2px solid #000", borderRadius: "50%", top: 12, left: 38 }}>
          <div className="absolute" style={{ width: 6, height: 6, background: "#000", borderRadius: "50%", top: 5, left: 5 }} />
        </div>
        <div className="absolute" style={{ width: 14, height: 16, background: "#fff", border: "2px solid #000", borderRadius: "50%", top: 12, left: 58 }}>
          <div className="absolute" style={{ width: 6, height: 6, background: "#000", borderRadius: "50%", top: 5, left: 5 }} />
        </div>
        {/* Beak */}
        <div className="absolute" style={{ width: 16, height: 10, background: "#FBD000", border: "2px solid #000", borderRadius: "0 0 50% 50%", top: 28, left: 47 }} />
        {/* Blush */}
        <div className="absolute" style={{ width: 8, height: 5, background: "#ec4899", borderRadius: "50%", top: 25, left: 34, opacity: 0.6 }} />
        <div className="absolute" style={{ width: 8, height: 5, background: "#ec4899", borderRadius: "50%", top: 25, left: 68, opacity: 0.6 }} />
        {/* Wing left holding palette */}
        <div className="absolute animate-wiggle" style={{ width: 20, height: 35, background: "#202020", border: "2px solid #000", borderRadius: "50% 0 50% 50%", top: 50, left: 10, transformOrigin: "top center", animationDelay: "0.3s" }}>
          {/* Palette */}
          <div className="absolute" style={{ width: 28, height: 22, background: "#B83000", border: "2px solid #000", borderRadius: "50%", top: 25, left: -10 }}>
            {/* Paint dots on palette */}
            <div className="absolute" style={{ width: 6, height: 6, background: "#E52521", borderRadius: "50%", top: 3, left: 4 }} />
            <div className="absolute" style={{ width: 5, height: 5, background: "#5C94FC", borderRadius: "50%", top: 4, left: 14 }} />
            <div className="absolute" style={{ width: 5, height: 5, background: "#FBD000", borderRadius: "50%", top: 12, left: 8 }} />
            <div className="absolute" style={{ width: 4, height: 4, background: "#43B047", borderRadius: "50%", top: 12, left: 18 }} />
          </div>
        </div>
        {/* Wing right */}
        <div className="absolute" style={{ width: 18, height: 30, background: "#202020", border: "2px solid #000", borderRadius: "0 50% 50% 50%", top: 50, left: 80 }} />
        {/* Feet */}
        <div className="absolute" style={{ width: 20, height: 10, background: "#FBD000", border: "2px solid #000", borderRadius: "0 0 50% 50%", top: 102, left: 30 }} />
        <div className="absolute" style={{ width: 20, height: 10, background: "#FBD000", border: "2px solid #000", borderRadius: "0 0 50% 50%", top: 102, left: 58 }} />
        {/* Speech bubble */}
        <div className="absolute pixel-sm text-center" style={{
          background: "#fff",
          border: "2px solid #000",
          padding: "4px 8px",
          top: -15,
          right: 40,
          whiteSpace: "nowrap",
          fontSize: "8px",
          boxShadow: "2px 2px 0 rgba(0,0,0,0.3)",
        }}>
          I'll win!
        </div>
      </div>
    </div>
  )
}

function CatMascot() {
  return (
    <div className="absolute left-[5%] bottom-[15%] animate-float hidden lg:block" style={{ animationDelay: "2s", animationDuration: "5s" }}>
      <div className="relative" style={{ width: 80, height: 90 }}>
        {/* Body */}
        <div className="absolute" style={{ width: 45, height: 35, background: "#f97316", border: "3px solid #000", borderRadius: "40%", top: 40, left: 15 }} />
        {/* Head */}
        <div className="absolute" style={{ width: 40, height: 35, background: "#f97316", border: "3px solid #000", borderRadius: "50% 50% 40% 40%", top: 10, left: 18 }} />
        {/* Ears */}
        <div className="absolute" style={{ width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderBottom: "14px solid #f97316", top: 0, left: 18 }} />
        <div className="absolute" style={{ width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderBottom: "14px solid #f97316", top: 0, left: 42 }} />
        {/* Inner ears */}
        <div className="absolute" style={{ width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderBottom: "8px solid #ec4899", top: 3, left: 22 }} />
        <div className="absolute" style={{ width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderBottom: "8px solid #ec4899", top: 3, left: 46 }} />
        {/* Eyes */}
        <div className="absolute" style={{ width: 10, height: 12, background: "#fff", border: "2px solid #000", borderRadius: "50%", top: 20, left: 24 }}>
          <div className="absolute" style={{ width: 5, height: 8, background: "#000", borderRadius: "50%", top: 2, left: 3 }} />
        </div>
        <div className="absolute" style={{ width: 10, height: 12, background: "#fff", border: "2px solid #000", borderRadius: "50%", top: 20, left: 42 }}>
          <div className="absolute" style={{ width: 5, height: 8, background: "#000", borderRadius: "50%", top: 2, left: 3 }} />
        </div>
        {/* Nose */}
        <div className="absolute" style={{ width: 6, height: 4, background: "#ec4899", borderRadius: "50%", top: 32, left: 35 }} />
        {/* Whiskers */}
        <div className="absolute" style={{ width: 15, height: 1, background: "#000", top: 34, left: 5 }} />
        <div className="absolute" style={{ width: 15, height: 1, background: "#000", top: 37, left: 7 }} />
        <div className="absolute" style={{ width: 15, height: 1, background: "#000", top: 34, left: 55 }} />
        <div className="absolute" style={{ width: 15, height: 1, background: "#000", top: 37, left: 53 }} />
        {/* Tail */}
        <div className="absolute animate-wiggle" style={{ width: 30, height: 8, background: "#f97316", border: "2px solid #000", borderRadius: "50%", top: 55, left: -5, transformOrigin: "right center" }} />
        {/* Paws */}
        <div className="absolute" style={{ width: 12, height: 10, background: "#f97316", border: "2px solid #000", borderRadius: "0 0 50% 50%", top: 72, left: 20 }} />
        <div className="absolute" style={{ width: 12, height: 10, background: "#f97316", border: "2px solid #000", borderRadius: "0 0 50% 50%", top: 72, left: 42 }} />
      </div>
    </div>
  )
}

function StarBurst({ top, right, delay }: { top: string; right: string; delay: number }) {
  return (
    <div className="absolute animate-float hidden lg:block" style={{ top, right, animationDelay: `${delay}s`, animationDuration: "3s" }}>
      <Star className="size-6 text-yellow-300 fill-yellow-300" style={{ filter: "drop-shadow(0 0 4px rgba(251,208,0,0.6))" }} />
    </div>
  )
}

function RocketMascot() {
  return (
    <div className="absolute right-[5%] bottom-[15%] animate-float hidden lg:block" style={{ animationDelay: "1s", animationDuration: "4s" }}>
      <div className="relative" style={{ width: 70, height: 120 }}>
        {/* Rocket body */}
        <div className="absolute" style={{ width: 36, height: 60, background: "#fff", border: "3px solid #000", borderRadius: "50% 50% 20% 20%", top: 15, left: 17 }} />
        {/* Rocket nose */}
        <div className="absolute" style={{ width: 0, height: 0, borderLeft: "18px solid transparent", borderRight: "18px solid transparent", borderBottom: "25px solid #E52521", top: -5, left: 17, filter: "drop-shadow(0 -2px 0 #000)" }} />
        {/* Window */}
        <div className="absolute" style={{ width: 18, height: 18, background: "#5C94FC", border: "3px solid #000", borderRadius: "50%", top: 28, left: 26 }}>
          <div className="absolute" style={{ width: 6, height: 6, background: "rgba(255,255,255,0.6)", borderRadius: "50%", top: 3, left: 3 }} />
        </div>
        {/* Fins */}
        <div className="absolute" style={{ width: 14, height: 25, background: "#E52521", border: "2px solid #000", borderRadius: "50% 0 0 50%", top: 50, left: 5 }} />
        <div className="absolute" style={{ width: 14, height: 25, background: "#E52521", border: "2px solid #000", borderRadius: "0 50% 50% 0", top: 50, left: 51 }} />
        {/* Flame */}
        <div className="absolute animate-wiggle" style={{ transformOrigin: "top center" }}>
          <div className="absolute" style={{ width: 12, height: 20, background: "#FBD000", border: "2px solid #f97316", borderRadius: "0 0 50% 50%", top: 75, left: 22 }} />
          <div className="absolute" style={{ width: 8, height: 14, background: "#f97316", borderRadius: "0 0 50% 50%", top: 78, left: 24 }} />
        </div>
        {/* Stars around rocket */}
        <div className="absolute" style={{ top: 5, left: -5 }}>
          <Star className="size-4 text-yellow-300 fill-yellow-300" />
        </div>
        <div className="absolute" style={{ top: 40, right: -8 }}>
          <Star className="size-3 text-yellow-300 fill-yellow-300" />
        </div>
      </div>
    </div>
  )
}

export function LobbyDecorations() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Paint splatters */}
      <PaintSplat color={SPLAT_COLORS[0]} size={40} top="8%" left="5%" delay={0.2} />
      <PaintSplat color={SPLAT_COLORS[1]} size={30} top="15%" left="85%" delay={0.5} />
      <PaintSplat color={SPLAT_COLORS[2]} size={50} top="70%" left="8%" delay={0.8} />
      <PaintSplat color={SPLAT_COLORS[3]} size={35} top="80%" left="90%" delay={1.1} />
      <PaintSplat color={SPLAT_COLORS[4]} size={25} top="45%" left="3%" delay={1.4} />
      <PaintSplat color={SPLAT_COLORS[5]} size={45} top="30%" left="92%" delay={0.3} />
      <PaintSplat color={SPLAT_COLORS[6]} size={28} top="60%" left="95%" delay={1.7} />
      <PaintSplat color={SPLAT_COLORS[7]} size={38} top="90%" left="15%" delay={2.0} />

      {/* Ink drips from top */}
      <InkDrip color={SPLAT_COLORS[0]} height={40} top="0" left="10%" delay={0} />
      <InkDrip color={SPLAT_COLORS[1]} height={55} top="0" left="25%" delay={1.5} />
      <InkDrip color={SPLAT_COLORS[3]} height={35} top="0" left="60%" delay={0.8} />
      <InkDrip color={SPLAT_COLORS[2]} height={45} top="0" left="75%" delay={2.2} />
      <InkDrip color={SPLAT_COLORS[5]} height={30} top="0" left="90%" delay={1.0} />

      {/* Floating art tool icons */}
      <FloatingIcon top="12%" left="12%" delay={0} duration={5}>
        <Brush className="size-8 text-white/60" strokeWidth={1.5} />
      </FloatingIcon>
      <FloatingIcon top="20%" left="80%" delay={1.2} duration={4.5}>
        <Palette className="size-10 text-white/50" strokeWidth={1.5} />
      </FloatingIcon>
      <FloatingIcon top="55%" left="6%" delay={0.8} duration={5.5}>
        <Pencil className="size-7 text-white/50" strokeWidth={1.5} />
      </FloatingIcon>
      <FloatingIcon top="65%" left="88%" delay={2} duration={4}>
        <PenTool className="size-8 text-white/60" strokeWidth={1.5} />
      </FloatingIcon>
      <FloatingIcon top="85%" left="50%" delay={1.5} duration={6}>
        <Droplets className="size-9 text-white/40" strokeWidth={1.5} />
      </FloatingIcon>
      <FloatingIcon top="40%" left="92%" delay={0.5} duration={5}>
        <Brush className="size-6 text-white/40 rotate-45" strokeWidth={1.5} />
      </FloatingIcon>

      {/* ─── Cute Mascot Characters ─── */}
      <DinoMascot />
      <PenguinMascot />
      <CatMascot />
      <RocketMascot />

      {/* Star bursts */}
      <StarBurst top="5%" right="15%" delay={0} />
      <StarBurst top="25%" right="5%" delay={1.2} />
      <StarBurst top="50%" right="8%" delay={0.6} />
      <StarBurst top="75%" right="12%" delay={1.8} />

      {/* Decorative paint strokes */}
      <div
        className="absolute animate-paint-stroke"
        style={{
          top: "35%",
          left: "0",
          height: "4px",
          background: "linear-gradient(90deg, transparent, #E52521, #FBD000, transparent)",
          animationDelay: "0.5s",
          opacity: 0,
        }}
      />
      <div
        className="absolute animate-paint-stroke"
        style={{
          top: "75%",
          right: "0",
          height: "3px",
          width: "0",
          background: "linear-gradient(270deg, transparent, #43B047, #5C94FC, transparent)",
          animationDelay: "1.5s",
          opacity: 0,
        }}
      />

      {/* Color dots floating */}
      {SPLAT_COLORS.map((color, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-float-slow"
          style={{
            width: 8 + (i % 3) * 4,
            height: 8 + (i % 3) * 4,
            background: color,
            top: `${10 + i * 10}%`,
            left: `${5 + (i * 13) % 90}%`,
            animationDelay: `${i * 0.7}s`,
            opacity: 0.4,
            border: "2px solid rgba(0,0,0,0.3)",
          }}
        />
      ))}
    </div>
  )
}
