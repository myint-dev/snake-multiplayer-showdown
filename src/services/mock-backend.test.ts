import { beforeEach, describe, expect, it, vi } from "vitest";
import { MockBackend } from "./mock-backend";
import { createGame } from "@/game/engine";
import type { GameSnapshot } from "./types";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, value),
  } as Storage;
}

function snapshotOf(score = 0): GameSnapshot {
  const game = createGame({ mode: "walls", grid: 10, seed: 1 });
  return {
    grid: game.grid,
    snake: game.snake,
    food: game.food,
    dir: game.dir,
    score,
    status: "running",
  };
}

let backend: MockBackend;

beforeEach(() => {
  backend = new MockBackend(memoryStorage());
});

describe("auth", () => {
  it("signs a user up and exposes the session", async () => {
    const session = await backend.auth.signUp("player_one", "hunter2");
    expect(session.user.username).toBe("player_one");
    expect(await backend.auth.getSession()).not.toBeNull();
  });

  it("rejects short usernames and passwords", async () => {
    await expect(backend.auth.signUp("ab", "hunter2")).rejects.toThrow(/3 characters/);
    await expect(backend.auth.signUp("abcd", "123")).rejects.toThrow(/6 characters/);
  });

  it("rejects duplicate usernames case-insensitively", async () => {
    await backend.auth.signUp("player_one", "hunter2");
    await expect(backend.auth.signUp("PLAYER_ONE", "hunter2")).rejects.toThrow(/taken/);
  });

  it("signs in with valid credentials only", async () => {
    await backend.auth.signUp("player_one", "hunter2");
    await backend.auth.signOut();
    await expect(backend.auth.signIn("player_one", "wrong")).rejects.toThrow(/Invalid/);
    const session = await backend.auth.signIn("player_one", "hunter2");
    expect(session.user.username).toBe("player_one");
  });

  it("notifies subscribers on sign in and sign out", async () => {
    const listener = vi.fn();
    const unsubscribe = backend.auth.onAuthStateChange(listener);
    await backend.auth.signUp("player_one", "hunter2");
    await backend.auth.signOut();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(null);
    unsubscribe();
  });
});

describe("scores", () => {
  it("requires a session to submit", async () => {
    await expect(backend.scores.submit({ mode: "walls", score: 10 })).rejects.toThrow(
      /signed in/,
    );
  });

  it("keeps only each player's best score per mode, sorted descending", async () => {
    await backend.auth.signUp("player_one", "hunter2");
    await backend.scores.submit({ mode: "walls", score: 50 });
    await backend.scores.submit({ mode: "walls", score: 120 });
    const board = await backend.scores.leaderboard("walls", 20);
    const mine = board.filter((entry) => entry.username === "player_one");
    expect(mine).toHaveLength(1);
    expect(mine[0]!.score).toBe(120);
    const scores = board.map((entry) => entry.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it("separates the two modes", async () => {
    await backend.auth.signUp("player_one", "hunter2");
    await backend.scores.submit({ mode: "pass-through", score: 999 });
    const walls = await backend.scores.leaderboard("walls", 20);
    expect(walls.some((entry) => entry.score === 999)).toBe(false);
    const wrap = await backend.scores.leaderboard("pass-through", 20);
    expect(wrap[0]!.score).toBe(999);
  });

  it("tracks personal bests per mode", async () => {
    await backend.auth.signUp("player_one", "hunter2");
    await backend.scores.submit({ mode: "walls", score: 30 });
    expect(await backend.scores.personalBest("walls")).toBe(30);
    expect(await backend.scores.personalBest("pass-through")).toBe(0);
  });

  it("respects the limit", async () => {
    const board = await backend.scores.leaderboard("walls", 2);
    expect(board).toHaveLength(2);
  });
});

describe("live games", () => {
  it("always lists simulated opponents for spectating", async () => {
    const games = await backend.games.listActive();
    expect(games.length).toBeGreaterThanOrEqual(4);
    for (const game of games) {
      expect(game.snapshot.snake.length).toBeGreaterThan(0);
    }
  });

  it("publishes a signed-in player's game and updates its snapshot", async () => {
    await backend.auth.signUp("player_one", "hunter2");
    const live = await backend.games.start({ mode: "walls", snapshot: snapshotOf(0) });
    await backend.games.publish(live.id, snapshotOf(70));
    const fetched = await backend.games.get(live.id);
    expect(fetched?.score).toBe(70);
    expect((await backend.games.listActive()).some((g) => g.id === live.id)).toBe(true);
  });

  it("removes the game once it is finished", async () => {
    await backend.auth.signUp("player_one", "hunter2");
    const live = await backend.games.start({ mode: "walls", snapshot: snapshotOf(0) });
    await backend.games.finish(live.id, 40);
    expect(await backend.games.get(live.id)).toBeNull();
  });

  it("requires a session to start broadcasting", async () => {
    await expect(
      backend.games.start({ mode: "walls", snapshot: snapshotOf(0) }),
    ).rejects.toThrow(/signed in/);
  });

  it("returns a deterministic bot game for the same clock", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const first = await backend.games.get("bot-viper");
    const second = await backend.games.get("bot-viper");
    expect(first?.snapshot).toEqual(second?.snapshot);
    vi.useRealTimers();
  });

  it("returns null for unknown games", async () => {
    expect(await backend.games.get("nope")).toBeNull();
  });
});
