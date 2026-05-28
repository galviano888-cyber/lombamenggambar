import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

// ─── In-memory room storage ──────────────────────────────────────────────────
const rooms = new Map();

const PROMPT_CATEGORIES = {
  animals: [
    "Lion", "Elephant", "Penguin", "Butterfly", "Dinosaur", "Dragon",
    "Cat", "Dog", "Shark", "Eagle", "Frog", "Snake", "Dolphin", "Owl",
    "Monkey", "Bear", "Rabbit", "Horse", "Whale", "Spider", "Octopus",
    "Giraffe", "Zebra", "Kangaroo", "Panda", "Wolf", "Fox", "Deer",
    "Turtle", "Crocodile",
  ],
  food: [
    "Pizza", "Banana", "Cupcake", "Strawberry", "Ice Cream", "Burger",
    "Sushi", "Taco", "Donut", "Watermelon", "Fried Egg", "Hotdog",
    "Cake", "Cookie", "Popcorn", "Noodles", "Apple", "Cheese",
    "Chocolate", "Bread", "Pineapple", "Grapes", "Carrot", "Corn",
    "Mushroom", "Avocado", "Coconut", "Lemon", "Cherry", "Pie",
  ],
  vehicles: [
    "Bicycle", "Rocket", "Submarine", "Car", "Airplane", "Helicopter",
    "Train", "Boat", "Motorcycle", "Bus", "Truck", "Skateboard",
    "Hot Air Balloon", "Spaceship", "Ambulance", "Fire Truck",
    "Scooter", "Jet Ski", "Sailboat", "Tractor", "Tank", "UFO",
    "Canoe", "Monster Truck", "Go Kart",
  ],
  objects: [
    "Guitar", "Telescope", "House", "Castle", "Sunflower", "Cactus",
    "Umbrella", "Clock", "Camera", "Lamp", "Key", "Book", "Crown",
    "Diamond", "Sword", "Shield", "Balloon", "Candle", "Mirror",
    "Treasure Chest", "Backpack", "Headphones", "Microphone", "Globe",
    "Hourglass", "Compass", "Anchor", "Bell", "Drum", "Piano",
  ],
  places: [
    "Beach", "Mountain", "Volcano", "Island", "Forest", "Desert",
    "Waterfall", "City", "Farm", "Hospital", "School", "Library",
    "Stadium", "Airport", "Castle", "Lighthouse", "Bridge", "Park",
    "Zoo", "Museum", "Church", "Pyramid", "Igloo", "Treehouse", "Cave",
  ],
  people: [
    "Pirate", "Ninja", "Astronaut", "Chef", "Doctor", "Firefighter",
    "Wizard", "Princess", "Robot", "Zombie", "Superhero", "Clown",
    "Cowboy", "Mermaid", "Ghost", "Vampire", "Angel", "King",
    "Ballerina", "Samurai",
  ],
  nature: [
    "Rainbow", "Sun", "Moon", "Star", "Cloud", "Lightning",
    "Tornado", "Snowflake", "Tree", "Flower", "Leaf", "River",
    "Ocean Wave", "Fire", "Earth", "Raindrop", "Sunrise", "Aurora",
    "Comet", "Galaxy",
  ],
  random: [
    "Love", "Music", "Time", "Dream", "Freedom", "Happiness",
    "Anger", "Peace", "Chaos", "Magic", "Gravity", "Shadow",
    "Explosion", "Party", "Birthday", "Christmas", "Halloween",
    "Selfie", "Emoji", "WiFi",
  ],
};

// Flat list of all prompts
const ALL_PROMPTS = Object.values(PROMPT_CATEGORIES).flat();

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "DRAW-";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function pickPrompt(category) {
  const pool = category && category !== "all"
    ? PROMPT_CATEGORIES[category] || ALL_PROMPTS
    : ALL_PROMPTS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Punishment Cards ────────────────────────────────────────────────────────
const PUNISHMENT_CARDS = [
  { id: 1, text: "Push-up 10x!", icon: "💪", category: "physical" },
  { id: 2, text: "Squat 15x!", icon: "🦵", category: "physical" },
  { id: 3, text: "Plank 30 detik!", icon: "🧘", category: "physical" },
  { id: 6, text: "Sit-up 10x!", icon: "🔥", category: "physical" },
  { id: 7, text: "Tirukan suara hewan selama 10 detik!", icon: "🐔", category: "funny" },
  { id: 8, text: "Nyanyi satu bait lagu favorit!", icon: "🎤", category: "funny" },
  { id: 9, text: "Joget freestyle 15 detik!", icon: "💃", category: "funny" },
  { id: 10, text: "Buat muka lucu dan tahan 10 detik!", icon: "🤪", category: "funny" },
  { id: 11, text: "Ceritakan joke/lelucon!", icon: "😂", category: "funny" },
  { id: 13, text: "Pemenang boleh minta 1 permintaan wajar!", icon: "👑", category: "dare" },
  { id: 14, text: "Belikan pemenang snack/minuman!", icon: "🍫", category: "dare" },
  { id: 15, text: "Jadi asisten pemenang selama 5 menit!", icon: "🫡", category: "dare" },
  { id: 16, text: "Tulis pesan pujian untuk pemenang!", icon: "✍️", category: "dare" },
  { id: 17, text: "Foto selfie muka kalah dan kirim ke grup!", icon: "📸", category: "dare" },
  { id: 18, text: "Ganti profile picture selama 1 jam (pilihan pemenang)!", icon: "🖼️", category: "dare" },
  { id: 24, text: "Tiru pose patung terkenal selama 15 detik!", icon: "🗽", category: "funny" },
  { id: 26, text: "Kirim pap muka lucu ke lawan!", icon: "🤳", category: "dare" },
];

function pickRandomPunishment(excludeId) {
  const available = PUNISHMENT_CARDS.filter(c => c.id !== excludeId);
  return available[Math.floor(Math.random() * available.length)];
}

// ─── Gemini API Proxy ────────────────────────────────────────────────────────
app.post("/api/score", async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(400).json({ error: "No API key configured on server" });
  }

  const { imageBase64, drawingPrompt } = req.body;
  if (!imageBase64 || !drawingPrompt) {
    return res.status(400).json({ error: "Missing imageBase64 or drawingPrompt" });
  }

  const systemPrompt = `You are an expert and slightly funny art judge evaluating a hand-drawn sketch made on a digital canvas.

The player was asked to draw: "${drawingPrompt}"

Analyze the image and return ONLY a valid JSON object (no markdown, no explanation) with these exact keys:
{
  "shape": <integer 0-25>,
  "color": <integer 0-25>,
  "quality": <integer 0-25>,
  "prompt_match": <integer 0-25>,
  "critique": "<one short funny sentence about the drawing, max 15 words>"
}

Scoring criteria:
- shape (0-25): Does the drawing match the silhouette or key anatomical/structural features of "${drawingPrompt}"?
- color (0-25): Did the player use appropriate colors for "${drawingPrompt}"? Penalize wildly wrong colors.
- quality (0-25): Complexity of strokes and visible effort. Penalize blank or near-blank canvases heavily.
- prompt_match (0-25): Overall recognizability — can you actually identify "${drawingPrompt}" from this drawing?

If the canvas appears mostly blank or empty, all scores should be 0-3.`;

  try {
    const requestBody = {
      contents: [
        {
          parts: [
            { text: systemPrompt },
            { inline_data: { mime_type: "image/png", data: imageBase64 } },
          ],
        },
      ],
      generationConfig: { temperature: 0.4, maxOutputTokens: 256 },
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: `Gemini API error: ${err}` });
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const jsonText = rawText.replace(/```json?\n?/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonText);

    const result = {
      shape: Math.min(25, Math.max(0, Math.round(parsed.shape ?? 0))),
      color: Math.min(25, Math.max(0, Math.round(parsed.color ?? 0))),
      quality: Math.min(25, Math.max(0, Math.round(parsed.quality ?? 0))),
      prompt_match: Math.min(25, Math.max(0, Math.round(parsed.prompt_match ?? 0))),
      critique: parsed.critique ?? "Nice try, I guess?",
      source: "gemini",
    };

    res.json(result);
  } catch (err) {
    console.error("Gemini scoring error:", err);
    res.status(500).json({ error: "Scoring failed", details: err.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", hasApiKey: !!GEMINI_API_KEY, rooms: rooms.size });
});

// ─── Socket.io — Multiplayer Logic (2-5 players) ─────────────────────────────
io.on("connection", (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // ── Create Room ──
  socket.on("create_room", ({ playerName, password, duration, maxPlayers, category }) => {
    const code = generateRoomCode();
    const room = {
      code,
      password: password || null,
      duration: Math.min(300, Math.max(60, duration || 60)),
      maxPlayers: Math.min(5, Math.max(2, maxPlayers || 2)),
      category: category || "all",
      hostId: socket.id,
      players: [{ id: socket.id, name: playerName, index: 0 }],
      phase: "waiting",
      prompt: null,
      drawings: {},
      scores: {},
      punishment: null,
    };
    rooms.set(code, room);
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.playerIndex = 0;

    socket.emit("room_created", { code, duration: room.duration, maxPlayers: room.maxPlayers, category: room.category });
    console.log(`[Room] Created: ${code} by ${playerName} (${room.duration}s, max ${room.maxPlayers}, cat: ${room.category})`);
  });

  // ── Join Room ──
  socket.on("join_room", ({ playerName, code, password }) => {
    const room = rooms.get(code);

    if (!room) {
      socket.emit("join_error", "Room not found. Check the code and try again.");
      return;
    }
    if (room.players.length >= room.maxPlayers) {
      socket.emit("join_error", `Room is full. Max ${room.maxPlayers} players.`);
      return;
    }
    if (room.phase !== "waiting") {
      socket.emit("join_error", "Game already in progress.");
      return;
    }
    if (room.password && room.password !== password) {
      socket.emit("join_error", "Wrong password.");
      return;
    }

    const playerIndex = room.players.length;
    room.players.push({ id: socket.id, name: playerName, index: playerIndex });
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.playerIndex = playerIndex;

    socket.emit("join_success", {
      code,
      playerIndex,
      players: room.players.map(p => ({ name: p.name, index: p.index })),
      maxPlayers: room.maxPlayers,
    });

    // Notify all players in room about the new player
    io.to(code).emit("player_list_updated", {
      players: room.players.map(p => ({ name: p.name, index: p.index })),
      maxPlayers: room.maxPlayers,
    });

    console.log(`[Room] ${playerName} joined ${code} (${room.players.length}/${room.maxPlayers})`);
  });

  // ── Start Game (host only) ──
  socket.on("start_game", () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || socket.id !== room.hostId) return;
    if (room.players.length < 2) return;

    room.prompt = pickPrompt(room.category);
    room.phase = "countdown";
    room.drawings = {};
    room.scores = {};
    room.punishment = null;

    io.to(code).emit("game_started", {
      prompt: room.prompt,
      duration: room.duration,
      players: room.players.map(p => ({ name: p.name, index: p.index })),
    });
    console.log(`[Game] Started in ${code}, prompt: ${room.prompt}, ${room.players.length} players`);

    let count = 3;
    const countdownInterval = setInterval(() => {
      io.to(code).emit("countdown_tick", { count });
      count--;
      if (count < 0) {
        clearInterval(countdownInterval);
        room.phase = "drawing";
        io.to(code).emit("drawing_start", { duration: room.duration });
      }
    }, 1000);
  });

  // ── Submit Drawing ──
  socket.on("submit_drawing", ({ imageDataUrl, metrics }) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;

    room.drawings[socket.id] = { imageDataUrl, metrics: metrics || null };

    // Notify others that this player submitted
    const playerIndex = socket.data.playerIndex;
    socket.to(code).emit("player_submitted", { playerIndex });

    // Check if all players submitted
    const allSubmitted = room.players.every(p => room.drawings[p.id]);
    if (allSubmitted) {
      room.phase = "scoring";
      io.to(code).emit("scoring_start");
      performScoring(room, code);
    }
  });

  // ── End Round (host can force end) ──
  socket.on("end_round", () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || socket.id !== room.hostId) return;

    io.to(code).emit("force_submit");
  });

  // ── Play Again ──
  socket.on("play_again", () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || socket.id !== room.hostId) return;

    room.prompt = pickPrompt(room.category);
    room.phase = "countdown";
    room.drawings = {};
    room.scores = {};
    room.punishment = null;

    io.to(code).emit("game_started", {
      prompt: room.prompt,
      duration: room.duration,
      players: room.players.map(p => ({ name: p.name, index: p.index })),
    });

    let count = 3;
    const countdownInterval = setInterval(() => {
      io.to(code).emit("countdown_tick", { count });
      count--;
      if (count < 0) {
        clearInterval(countdownInterval);
        room.phase = "drawing";
        io.to(code).emit("drawing_start", { duration: room.duration });
      }
    }, 1000);
  });

  // ── Request Punishment Card ──
  socket.on("request_punishment", ({ loserIndex }) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;

    const card = pickRandomPunishment(null);
    room.punishment = { card, rerollsLeft: 3, loserIndex };
    io.to(code).emit("punishment_phase", { card, rerollsLeft: 3, loserIndex });
  });

  // ── Chat Message ──
  socket.on("chat_message", ({ message }) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || !message || !message.trim()) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    const chatMsg = {
      playerName: player.name,
      playerIndex: player.index,
      message: message.trim().slice(0, 200), // max 200 chars
      timestamp: Date.now(),
    };

    io.to(code).emit("chat_message", chatMsg);
  });

  // ── Reroll Punishment Card (max 3x) ──
  socket.on("reroll_punishment", () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || !room.punishment) return;

    if (room.punishment.rerollsLeft <= 0) {
      socket.emit("reroll_denied", { message: "No rerolls left!" });
      return;
    }

    const prevId = room.punishment.card.id;
    const newCard = pickRandomPunishment(prevId);
    room.punishment.rerollsLeft--;
    room.punishment.card = newCard;

    io.to(code).emit("punishment_updated", {
      card: newCard,
      rerollsLeft: room.punishment.rerollsLeft,
    });
  });

  // ── Disconnect ──
  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    if (!code) return;

    const room = rooms.get(code);
    if (!room) return;

    const leavingPlayer = room.players.find(p => p.id === socket.id);
    if (!leavingPlayer) return;

    if (socket.id === room.hostId) {
      // Host left — destroy room, notify everyone
      io.to(code).emit("host_disconnected");
      rooms.delete(code);
      console.log(`[Room] Destroyed: ${code} (host left)`);
    } else {
      // Non-host left — remove from players, notify others
      room.players = room.players.filter(p => p.id !== socket.id);
      io.to(code).emit("player_left", {
        playerName: leavingPlayer.name,
        players: room.players.map(p => ({ name: p.name, index: p.index })),
      });
      console.log(`[Room] ${leavingPlayer.name} left: ${code} (${room.players.length}/${room.maxPlayers})`);
    }
  });
});

// ─── Scoring Logic (server-side) — Multi-player support ──────────────────────

const BLANK_CRITIQUES = [
  "You submitted a blank canvas. Bold strategy, didn't pay off.",
  "Nothing here. Literally nothing. Zero effort detected.",
  "The canvas is as empty as my faith in your drawing skills.",
  "Did you fall asleep? The canvas is blank.",
  "A white canvas is not modern art in this game.",
];

const EFFORT_CRITIQUES = [
  "A few scribbles don't make a masterpiece.",
  "I can see you tried... barely.",
  "That's... something. Not much, but something.",
  "Points for participation, I guess.",
  "The effort is there, the talent... less so.",
];

const GOOD_CRITIQUES = [
  "Not bad! I can actually tell what this is.",
  "Decent work! Your art teacher would be mildly proud.",
  "Hey, this actually looks like something!",
  "Solid effort. Approved.",
  "You've got some skill! Or at least persistence.",
];

const GREAT_CRITIQUES = [
  "Impressive! This is genuinely recognizable.",
  "Wow, actual talent detected!",
  "This belongs on a fridge — in a good way.",
  "The Picasso of DrawBattle has entered the chat.",
  "Outstanding work. The judge is impressed.",
];

function pickCritique(list) {
  return list[Math.floor(Math.random() * list.length)];
}

async function performScoring(room, code) {
  try {
    const results = {};
    const playerDrawings = room.players.map(p => ({
      id: p.id,
      name: p.name,
      index: p.index,
      drawing: room.drawings[p.id] || null,
    }));

    // Check blanks and score
    const blanks = playerDrawings.filter(p => !p.drawing || p.drawing.metrics?.isBlank);
    const nonBlanks = playerDrawings.filter(p => p.drawing && !p.drawing.metrics?.isBlank);

    // Score blank players
    for (const p of blanks) {
      results[p.id] = blankScore();
    }

    // Score non-blank players
    if (nonBlanks.length === 0) {
      // All blank — done
    } else if (nonBlanks.length === 1) {
      // Only one drew — score individually
      results[nonBlanks[0].id] = await scoreSingle(nonBlanks[0].drawing, room.prompt);
    } else if (GEMINI_API_KEY && nonBlanks.length <= 5) {
      // Multiple drawings + API key — comparative scoring
      const comparative = await scoreMultiComparative(nonBlanks, room.prompt);
      for (const [id, score] of Object.entries(comparative)) {
        results[id] = score;
      }
    } else {
      // Fallback for each
      for (const p of nonBlanks) {
        results[p.id] = fallbackScore(p.drawing.metrics, room.prompt);
      }
    }

    room.scores = results;
    room.phase = "result";

    // Build ranked results
    const ranked = room.players.map(p => ({
      index: p.index,
      name: p.name,
      score: results[p.id] || blankScore(),
      total: totalScore(results[p.id] || blankScore()),
      drawingDataUrl: room.drawings[p.id]?.imageDataUrl || "",
    })).sort((a, b) => b.total - a.total);

    io.to(code).emit("scores_ready", { prompt: room.prompt, ranked });
    console.log(`[Scoring] ${code}: ${ranked.map(r => `${r.name}=${r.total}`).join(", ")}`);
  } catch (err) {
    console.error("Scoring error:", err);
    io.to(code).emit("scoring_error", { message: "Scoring failed. Try again." });
  }
}

function totalScore(s) {
  return (s?.shape || 0) + (s?.color || 0) + (s?.quality || 0) + (s?.prompt_match || 0);
}

function blankScore() {
  return {
    shape: 0, color: 0, quality: 0, prompt_match: 0,
    critique: pickCritique(BLANK_CRITIQUES),
    source: "fallback",
  };
}

// ─── Multi-player Comparative Gemini Scoring ─────────────────────────────────
async function scoreMultiComparative(playerDrawings, drawingPrompt) {
  try {
    const parts = [];
    const playerLabels = playerDrawings.map((p, i) => `Player ${i + 1} (${p.name})`);

    const systemPrompt = `You are an EXTREMELY STRICT art judge in a competitive drawing game. ${playerDrawings.length} players were asked to draw: "${drawingPrompt}"

Score ALL drawings comparatively. Be HARSH and FAIR. Do NOT inflate scores.

STRICT SCORING RULES:
COLOR (0-25): Black-only → 0-3. Wrong colors → 3-7. Some correct → 8-14. Good → 15-20. Perfect → 21-25.
SHAPE (0-25): Random scribbles → 0-3. Vague → 4-8. Basic outline → 9-14. Clear shape → 15-20. Detailed → 21-25.
QUALITY (0-25): Minimal effort → 0-4. Basic → 5-10. Moderate → 11-16. Good detail → 17-21. Exceptional → 22-25.
PROMPT MATCH (0-25): Unidentifiable → 0-4. Barely → 5-9. Somewhat → 10-15. Clearly → 16-21. Unmistakable → 22-25.

CRITICAL: Random black scribbles = total 5-15. Better drawings MUST score higher. Most casual = 30-60 total.

Players: ${playerLabels.join(", ")}
Images are in order: ${playerLabels.join(", ")}

Return ONLY valid JSON array (no markdown):
[
  { "shape": <int>, "color": <int>, "quality": <int>, "prompt_match": <int>, "critique": "<funny, max 15 words>" },
  ...
]
Array must have exactly ${playerDrawings.length} items, one per player in order.`;

    parts.push({ text: systemPrompt });
    for (const p of playerDrawings) {
      const base64 = p.drawing.imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
      parts.push({ inline_data: { mime_type: "image/png", data: base64 } });
    }

    const requestBody = {
      contents: [{ parts }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) throw new Error(`Gemini ${response.status}`);

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const jsonText = rawText.replace(/```json?\n?/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonText);

    const clamp = (v) => Math.min(25, Math.max(0, Math.round(v ?? 0)));
    const results = {};

    for (let i = 0; i < playerDrawings.length; i++) {
      const s = parsed[i] || {};
      results[playerDrawings[i].id] = {
        shape: clamp(s.shape),
        color: clamp(s.color),
        quality: clamp(s.quality),
        prompt_match: clamp(s.prompt_match),
        critique: s.critique || "No comment.",
        source: "gemini",
      };
    }

    return results;
  } catch (err) {
    console.warn("Multi-comparative Gemini scoring failed, using fallback:", err.message);
    const results = {};
    for (const p of playerDrawings) {
      results[p.id] = fallbackScore(p.drawing.metrics, drawingPrompt);
    }
    return results;
  }
}

// ─── Single Drawing Gemini Scoring (when one player is blank) ────────────────
async function scoreSingle(drawingData, drawingPrompt) {
  if (!GEMINI_API_KEY) {
    return fallbackScore(drawingData.metrics, drawingPrompt);
  }

  try {
    const base64Data = drawingData.imageDataUrl.replace(/^data:image\/\w+;base64,/, "");

    const systemPrompt = `You are an EXTREMELY STRICT art judge. The player was asked to draw: "${drawingPrompt}"

STRICT SCORING RULES (FOLLOW EXACTLY):

COLOR ACCURACY (0-25):
- ONLY black/dark colors, no actual colors → 0-3 MAXIMUM
- Random colors not matching "${drawingPrompt}" → 3-7
- Some correct colors → 8-14
- Good matching colors → 15-20
- Perfect realistic coloring → 21-25

SHAPE (0-25):
- Random scribbles → 0-3
- Vague unrecognizable shape → 4-8
- Basic outline of "${drawingPrompt}" → 9-14
- Clear recognizable shape → 15-20
- Detailed accurate proportions → 21-25

QUALITY (0-25):
- Minimal effort, few strokes → 0-4
- Basic simple lines → 5-10
- Moderate detail → 11-16
- Good detail, clean work → 17-21
- Exceptional craftsmanship → 22-25

PROMPT MATCH (0-25):
- Cannot identify "${drawingPrompt}" → 0-4
- Barely recognizable → 5-9
- Somewhat recognizable → 10-15
- Clearly "${drawingPrompt}" → 16-21
- Unmistakable → 22-25

CRITICAL: Black-only scribbles = total 5-15. Do NOT inflate. Most drawings score 30-60 total.

Return ONLY valid JSON:
{ "shape": <int 0-25>, "color": <int 0-25>, "quality": <int 0-25>, "prompt_match": <int 0-25>, "critique": "<funny sentence, max 15 words>" }`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: systemPrompt },
            { inline_data: { mime_type: "image/png", data: base64Data } },
          ],
        },
      ],
      generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) throw new Error(`Gemini ${response.status}`);

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const jsonText = rawText.replace(/```json?\n?/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonText);

    const clamp = (v) => Math.min(25, Math.max(0, Math.round(v ?? 0)));

    return {
      shape: clamp(parsed.shape),
      color: clamp(parsed.color),
      quality: clamp(parsed.quality),
      prompt_match: clamp(parsed.prompt_match),
      critique: parsed.critique || "No comment.",
      source: "gemini",
    };
  } catch (err) {
    console.warn("Single Gemini scoring failed, using fallback:", err.message);
    return fallbackScore(drawingData.metrics, drawingPrompt);
  }
}

// ─── Metrics-based Fallback Scoring (no API key, uses real drawing data) ─────
function fallbackScore(metrics, drawingPrompt) {
  if (!metrics || metrics.isBlank) {
    return blankScore();
  }

  const { coverage, colorCount, complexity } = metrics;

  // ── Shape score: based on coverage ──
  // Need enough pixels to form a recognizable shape
  let shape;
  if (coverage < 1) shape = 0;
  else if (coverage < 3) shape = Math.round(1 + coverage);
  else if (coverage < 8) shape = Math.round(3 + (coverage / 8) * 6);
  else if (coverage < 20) shape = Math.round(7 + ((coverage - 8) / 12) * 7);
  else if (coverage < 40) shape = Math.round(12 + ((coverage - 20) / 20) * 5);
  else shape = Math.round(14 + Math.min(4, (coverage - 40) / 20));
  shape = Math.min(18, shape); // Hard cap — can't judge actual shape without AI

  // ── Color score: STRICT & DETERMINISTIC — same colors = same score ──
  let color;
  if (colorCount <= 1) color = 1; // Black only = always 1
  else if (colorCount === 2) color = 3;
  else if (colorCount === 3) color = 5;
  else if (colorCount === 4) color = 7;
  else if (colorCount <= 6) color = 9;
  else if (colorCount <= 8) color = 11;
  else if (colorCount <= 10) color = 13;
  else if (colorCount <= 14) color = 15;
  else color = Math.min(18, 15 + Math.floor((colorCount - 14) / 3));

  // ── Quality score: based on complexity (edge density) — deterministic ──
  let quality;
  if (complexity < 1) quality = 1;
  else if (complexity < 3) quality = Math.round(2 + complexity);
  else if (complexity < 8) quality = Math.round(4 + (complexity / 8) * 5);
  else if (complexity < 20) quality = Math.round(7 + ((complexity - 8) / 12) * 5);
  else if (complexity < 40) quality = Math.round(11 + ((complexity - 20) / 20) * 4);
  else quality = Math.round(13 + Math.min(4, (complexity - 40) / 20));
  quality = Math.min(18, quality); // Hard cap

  // ── Prompt match: can't verify without AI, so very conservative ──
  const effortScore = (
    Math.min(coverage, 30) / 30 * 0.3 +
    Math.min(complexity, 30) / 30 * 0.3 +
    Math.min(colorCount, 8) / 8 * 0.4
  );
  let prompt_match;
  if (effortScore < 0.1) prompt_match = 1;
  else if (effortScore < 0.3) prompt_match = Math.round(2 + effortScore * 10);
  else if (effortScore < 0.6) prompt_match = Math.round(4 + effortScore * 10);
  else prompt_match = Math.round(7 + effortScore * 8);
  prompt_match = Math.min(15, prompt_match); // Very hard cap

  // Pick appropriate critique based on total
  const total = shape + color + quality + prompt_match;
  let critique;
  if (total < 15) critique = pickCritique(BLANK_CRITIQUES);
  else if (total < 30) critique = pickCritique(EFFORT_CRITIQUES);
  else if (total < 50) critique = pickCritique(GOOD_CRITIQUES);
  else critique = pickCritique(GREAT_CRITIQUES);

  return {
    shape: Math.max(0, shape),
    color: Math.max(0, color),
    quality: Math.max(0, quality),
    prompt_match: Math.max(0, prompt_match),
    critique,
    source: "fallback",
  };
}

// ─── Start Server ────────────────────────────────────────────────────────────
server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🎮 DrawBattle Multiplayer Server running on port ${PORT}`);
  console.log(`   Gemini API: ${GEMINI_API_KEY ? "✅ Active" : "❌ Not configured (fallback mode)"}`);
  console.log(`   WebSocket: Ready for connections\n`);
});
