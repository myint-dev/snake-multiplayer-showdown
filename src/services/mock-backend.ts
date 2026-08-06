/**
 * Mock backend: a full in-memory implementation of `BackendService`.
 *
 * Users, scores and live games are persisted to localStorage (when available)
 * so the app behaves like a real multi-user product across reloads and tabs.
 * Other players' games are deterministic bot replays derived from a seed and
 * the clock, so spectating works with no server loop.
 */
import { chooseBotDirection } from "@/game/bot";
import {
  createGame,
  step,
  turn,
  type GameMode,
  type GameState,
} from "@/game/engine";
import {
  BackendError,
  type ActiveGame,
  type BackendService,
  type GameSnapshot,
  type ScoreEntry,
  type Session,
  type User,
} from "./types";

const STORAGE_KEY = "snake.mock.v1";
const BOT_EPOCH = 1_700_000_000_000;
const MAX_REPLAY_STEPS = 1200;

interface StoredUser extends User {
  passwordHash: string;
}

interface LiveGame {
  id: string;
  userId: string;
  username: string;
  mode: GameMode;
  startedAt: number;
  updatedAt: number;
  snapshot: GameSnapshot;
}

interface Db {
  users: StoredUser[];
  scores: ScoreEntry[];
  session: Session | null;
  live: LiveGame[];
}

interface BotConfig {
  id: string;
  username: string;
  mode: GameMode;
  seed: number;
  speedMs: number;
}

const BOTS: BotConfig[] = [
  { id: "bot-viper", username: "viper", mode: "walls", seed: 7, speedMs: 130 },
  { id: "bot-mamba", username: "mamba_9", mode: "pass-through", seed: 21, speedMs: 110 },
  { id: "bot-kaa", username: "kaa", mode: "walls", seed: 55, speedMs: 160 },
  { id: "bot-nyx", username: "nyx", mode: "pass-through", seed: 91, speedMs: 145 },
];

const SEED_SCORES: Array<{ username: string; mode: GameMode; score: number }> = [
  { username: "viper", mode: "walls", score: 420 },
  { username: "mamba_9", mode: "walls", score: 350 },
  { username: "kaa", mode: "walls", score: 280 },
  { username: "nyx", mode: "walls", score: 190 },
  { username: "mamba_9", mode: "pass-through", score: 610 },
  { username: "nyx", mode: "pass-through", score: 540 },
  { username: "viper", mode: "pass-through", score: 330 },
  { username: "kaa", mode: "pass-through", score: 260 },
];

function hash(value: string): string {
  let h = 5381;
  for (let i = 0; i < value.length; i++) h = (h * 33) ^ value.charCodeAt(i);
  return (h >>> 0).toString(16);
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function emptyDb(): Db {
  return {
    users: [],
    scores: SEED_SCORES.map((entry, index) => ({
      id: `seed_${index}`,
      userId: `bot_${entry.username}`,
      username: entry.username,
      mode: entry.mode,
      score: entry.score,
      createdAt: BOT_EPOCH + index * 60_000,
    })),
    session: null,
    live: [],
  };
}

/** Replays a bot's game from its seed so every viewer sees the same board. */
function botGame(bot: BotConfig, now: number): ActiveGame {
  const elapsed = Math.max(0, now - BOT_EPOCH);
  const totalSteps = Math.floor(elapsed / bot.speedMs) % MAX_REPLAY_STEPS;
  const round = Math.floor(Math.floor(elapsed / bot.speedMs) / MAX_REPLAY_STEPS);
  let state: GameState = createGame({ mode: bot.mode, seed: bot.seed + round });
  for (let i = 0; i < totalSteps; i++) {
    if (state.status === "over") {
      state = createGame({ mode: bot.mode, seed: bot.seed + round + i });
      continue;
    }
    state = step(turn(state, chooseBotDirection(state)));
  }
  return {
    id: bot.id,
    userId: `bot_${bot.username}`,
    username: bot.username,
    mode: bot.mode,
    score: state.score,
    startedAt: now - totalSteps * bot.speedMs,
    isBot: true,
    snapshot: {
      grid: state.grid,
      snake: state.snake,
      food: state.food,
      dir: state.dir,
      score: state.score,
      status: state.status,
    },
  };
}

export class MockBackend implements BackendService {
  readonly name = "mock";
  private db: Db;
  private listeners = new Set<(session: Session | null) => void>();

  constructor(private readonly storage: Storage | null = safeStorage()) {
    this.db = this.load();
  }

  private load(): Db {
    if (!this.storage) return emptyDb();
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return emptyDb();
      return { ...emptyDb(), ...(JSON.parse(raw) as Db) };
    } catch {
      return emptyDb();
    }
  }

  private save() {
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.db));
  }

  private emit() {
    for (const listener of this.listeners) listener(this.db.session);
  }

  private requireSession(): Session {
    const { session } = this.db;
    if (!session) throw new BackendError("You must be signed in.");
    return session;
  }

  /** Test helper: wipes all mock data. */
  reset() {
    this.db = emptyDb();
    this.save();
    this.emit();
  }

  auth = {
    signUp: async (username: string, password: string): Promise<Session> => {
      const name = username.trim();
      if (name.length < 3) throw new BackendError("Username must be at least 3 characters.");
      if (password.length < 6) throw new BackendError("Password must be at least 6 characters.");
      if (this.db.users.some((u) => u.username.toLowerCase() === name.toLowerCase())) {
        throw new BackendError("That username is already taken.");
      }
      const user: StoredUser = {
        id: randomId("user"),
        username: name,
        createdAt: Date.now(),
        passwordHash: hash(password),
      };
      this.db.users.push(user);
      this.db.session = { token: randomId("tok"), user: publicUser(user) };
      this.save();
      this.emit();
      return this.db.session;
    },

    signIn: async (username: string, password: string): Promise<Session> => {
      const user = this.db.users.find(
        (u) => u.username.toLowerCase() === username.trim().toLowerCase(),
      );
      if (!user || user.passwordHash !== hash(password)) {
        throw new BackendError("Invalid username or password.");
      }
      this.db.session = { token: randomId("tok"), user: publicUser(user) };
      this.save();
      this.emit();
      return this.db.session;
    },

    signOut: async () => {
      const session = this.db.session;
      if (session) {
        this.db.live = this.db.live.filter((game) => game.userId !== session.user.id);
      }
      this.db.session = null;
      this.save();
      this.emit();
    },

    getSession: async () => {
      this.db = this.load();
      return this.db.session;
    },

    onAuthStateChange: (listener: (session: Session | null) => void) => {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    },
  };

  scores = {
    submit: async ({ mode, score }: { mode: GameMode; score: number }) => {
      const session = this.requireSession();
      const entry: ScoreEntry = {
        id: randomId("score"),
        userId: session.user.id,
        username: session.user.username,
        mode,
        score,
        createdAt: Date.now(),
      };
      this.db.scores.push(entry);
      this.save();
      return entry;
    },

    leaderboard: async (mode: GameMode, limit = 10) => {
      this.db = this.load();
      const best = new Map<string, ScoreEntry>();
      for (const entry of this.db.scores.filter((s) => s.mode === mode)) {
        const current = best.get(entry.userId);
        if (!current || entry.score > current.score) best.set(entry.userId, entry);
      }
      return [...best.values()]
        .sort((a, b) => b.score - a.score || a.createdAt - b.createdAt)
        .slice(0, limit);
    },

    personalBest: async (mode: GameMode) => {
      const session = this.db.session;
      if (!session) return 0;
      return this.db.scores
        .filter((s) => s.mode === mode && s.userId === session.user.id)
        .reduce((max, s) => Math.max(max, s.score), 0);
    },
  };

  games = {
    start: async ({ mode, snapshot }: { mode: GameMode; snapshot: GameSnapshot }) => {
      const session = this.requireSession();
      this.db.live = this.db.live.filter((game) => game.userId !== session.user.id);
      const game: LiveGame = {
        id: randomId("game"),
        userId: session.user.id,
        username: session.user.username,
        mode,
        startedAt: Date.now(),
        updatedAt: Date.now(),
        snapshot,
      };
      this.db.live.push(game);
      this.save();
      return toActive(game);
    },

    publish: async (gameId: string, snapshot: GameSnapshot) => {
      this.db = this.load();
      const game = this.db.live.find((g) => g.id === gameId);
      if (!game) return;
      game.snapshot = snapshot;
      game.updatedAt = Date.now();
      this.save();
    },

    finish: async (gameId: string, score: number) => {
      this.db = this.load();
      const game = this.db.live.find((g) => g.id === gameId);
      if (game) {
        game.snapshot = { ...game.snapshot, status: "over", score };
        game.updatedAt = Date.now();
      }
      this.db.live = this.db.live.filter((g) => g.id !== gameId);
      this.save();
    },

    listActive: async () => {
      this.db = this.load();
      const now = Date.now();
      const human = this.db.live
        .filter((game) => now - game.updatedAt < 15_000)
        .map(toActive);
      return [...human, ...BOTS.map((bot) => botGame(bot, now))].sort(
        (a, b) => b.score - a.score,
      );
    },

    get: async (gameId: string) => {
      const now = Date.now();
      const bot = BOTS.find((b) => b.id === gameId);
      if (bot) return botGame(bot, now);
      this.db = this.load();
      const game = this.db.live.find((g) => g.id === gameId);
      return game ? toActive(game) : null;
    },
  };
}

function publicUser(user: StoredUser): User {
  return { id: user.id, username: user.username, createdAt: user.createdAt };
}

function toActive(game: LiveGame): ActiveGame {
  return {
    id: game.id,
    userId: game.userId,
    username: game.username,
    mode: game.mode,
    score: game.snapshot.score,
    startedAt: game.startedAt,
    isBot: false,
    snapshot: game.snapshot,
  };
}

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
