import {
  BackendError,
  type ActiveGame,
  type BackendService,
  type GameSnapshot,
  type ScoreEntry,
  type Session,
} from "./types";
import type { GameMode } from "@/game/engine";

const SESSION_TOKEN_KEY = "snake.session-token.v1";
const DEFAULT_API_BASE_URL = "http://localhost:8000/api";

function getDefaultApiBaseUrl(): string {
  if (typeof window !== "undefined" && window.location.port !== "5173" && window.location.port !== "3000") {
    return "/api";
  }
  return DEFAULT_API_BASE_URL;
}

class HttpBackendError extends BackendError {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** REST implementation of the shared backend contract. */
export class RealBackend implements BackendService {
  readonly name = "api";
  private session: Session | null = null;
  private listeners = new Set<(session: Session | null) => void>();
  private readonly baseUrl: string;

  constructor(baseUrl = import.meta.env.VITE_API_BASE_URL ?? getDefaultApiBaseUrl()) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private get token(): string | null {
    return this.session?.token ?? safeStorage()?.getItem(SESSION_TOKEN_KEY) ?? null;
  }

  private setSession(session: Session | null) {
    this.session = session;
    const storage = safeStorage();
    if (session) storage?.setItem(SESSION_TOKEN_KEY, session.token);
    else storage?.removeItem(SESSION_TOKEN_KEY);
    for (const listener of this.listeners) listener(session);
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body) headers.set("Content-Type", "application/json");
    const token = this.token;
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new HttpBackendError(body?.message ?? `Request failed (${response.status})`, response.status);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  auth = {
    signUp: async (username: string, password: string) => {
      const session = await this.request<Session>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      this.setSession(session);
      return session;
    },

    signIn: async (username: string, password: string) => {
      const session = await this.request<Session>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      this.setSession(session);
      return session;
    },

    signOut: async () => {
      try {
        await this.request<void>("/auth/logout", { method: "POST" });
      } finally {
        this.setSession(null);
      }
    },

    getSession: async () => {
      if (!this.token) return null;
      try {
        const session = await this.request<Session>("/auth/me");
        this.setSession(session);
        return session;
      } catch (error) {
        if (error instanceof HttpBackendError && error.status === 401) {
          this.setSession(null);
          return null;
        }
        throw error;
      }
    },

    onAuthStateChange: (listener: (session: Session | null) => void) => {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    },
  };

  scores = {
    submit: (input: { mode: GameMode; score: number }) =>
      this.request<ScoreEntry>("/leaderboard", { method: "POST", body: JSON.stringify(input) }),
    leaderboard: (mode: GameMode, limit = 10) =>
      this.request<ScoreEntry[]>(`/leaderboard?${new URLSearchParams({ mode, limit: String(limit) })}`),
    personalBest: (mode: GameMode) =>
      this.request<number>(`/leaderboard/personal-best?${new URLSearchParams({ mode })}`),
  };

  games = {
    start: (input: { mode: GameMode; snapshot: GameSnapshot }) =>
      this.request<ActiveGame>("/games", { method: "POST", body: JSON.stringify(input) }),
    publish: (gameId: string, snapshot: GameSnapshot) =>
      this.request<void>(`/games/${encodeURIComponent(gameId)}/snapshot`, {
        method: "PUT",
        body: JSON.stringify(snapshot),
      }),
    finish: (gameId: string, score: number) =>
      this.request<void>(`/games/${encodeURIComponent(gameId)}/finish`, {
        method: "POST",
        body: JSON.stringify({ score }),
      }),
    listActive: () => this.request<ActiveGame[]>("/games/active"),
    get: async (gameId: string) => {
      try {
        return await this.request<ActiveGame>(`/games/${encodeURIComponent(gameId)}`);
      } catch (error) {
        if (error instanceof HttpBackendError && error.status === 404) return null;
        throw error;
      }
    },
  };
}

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
