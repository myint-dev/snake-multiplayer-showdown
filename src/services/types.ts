/**
 * The single backend contract for the whole app.
 *
 * UI code never talks to a network / database directly — it only ever calls
 * `backend` (see ./index.ts). Swapping the mock for a real implementation means
 * writing one more class that satisfies `BackendService`.
 */
import type { Direction, GameMode, Point } from "@/game/engine";

export interface User {
  id: string;
  username: string;
  createdAt: number;
}

export interface Session {
  token: string;
  user: User;
}

export interface ScoreEntry {
  id: string;
  userId: string;
  username: string;
  mode: GameMode;
  score: number;
  createdAt: number;
}

export interface GameSnapshot {
  grid: number;
  snake: Point[];
  food: Point;
  dir: Direction;
  score: number;
  status: "running" | "over";
}

export interface ActiveGame {
  id: string;
  userId: string;
  username: string;
  mode: GameMode;
  score: number;
  startedAt: number;
  isBot: boolean;
  snapshot: GameSnapshot;
}

export interface AuthApi {
  signUp(username: string, password: string): Promise<Session>;
  signIn(username: string, password: string): Promise<Session>;
  signOut(): Promise<void>;
  getSession(): Promise<Session | null>;
  onAuthStateChange(listener: (session: Session | null) => void): () => void;
}

export interface ScoresApi {
  submit(input: { mode: GameMode; score: number }): Promise<ScoreEntry>;
  leaderboard(mode: GameMode, limit?: number): Promise<ScoreEntry[]>;
  personalBest(mode: GameMode): Promise<number>;
}

export interface GamesApi {
  start(input: { mode: GameMode; snapshot: GameSnapshot }): Promise<ActiveGame>;
  publish(gameId: string, snapshot: GameSnapshot): Promise<void>;
  finish(gameId: string, score: number): Promise<void>;
  listActive(): Promise<ActiveGame[]>;
  get(gameId: string): Promise<ActiveGame | null>;
}

export interface BackendService {
  readonly name: string;
  auth: AuthApi;
  scores: ScoresApi;
  games: GamesApi;
}

export class BackendError extends Error {}
