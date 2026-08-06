/**
 * Pure, deterministic Snake engine.
 *
 * Everything here is side-effect free: `step` returns a brand new state, and
 * randomness is driven by an explicit seed carried inside the state. That makes
 * the whole game replayable (used for spectating) and easy to unit test.
 */

export type GameMode = "walls" | "pass-through";
export type Direction = "up" | "down" | "left" | "right";

export interface Point {
  x: number;
  y: number;
}

export interface GameState {
  grid: number;
  mode: GameMode;
  snake: Point[];
  dir: Direction;
  pendingDir: Direction;
  food: Point;
  score: number;
  tick: number;
  status: "running" | "over";
  seed: number;
}

export const DIRECTION_VECTORS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const DEFAULT_GRID = 20;
export const POINTS_PER_FOOD = 10;

export function isOpposite(a: Direction, b: Direction): boolean {
  const va = DIRECTION_VECTORS[a];
  const vb = DIRECTION_VECTORS[b];
  return va.x + vb.x === 0 && va.y + vb.y === 0;
}

export function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

/** mulberry32 — small deterministic PRNG. Returns [value in [0,1), nextSeed]. */
export function nextRandom(seed: number): [number, number] {
  let t = (seed + 0x6d2b79f5) | 0;
  const s = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

function spawnFood(grid: number, occupied: Point[], seed: number): [Point, number] {
  let currentSeed = seed;
  const taken = new Set(occupied.map((p) => `${p.x},${p.y}`));
  const free: Point[] = [];
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      if (!taken.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (free.length === 0) return [{ x: 0, y: 0 }, currentSeed];
  const [r, s] = nextRandom(currentSeed);
  currentSeed = s + 1;
  return [free[Math.floor(r * free.length)], currentSeed];
}

export function createGame(options: {
  mode: GameMode;
  grid?: number;
  seed?: number;
}): GameState {
  const grid = options.grid ?? DEFAULT_GRID;
  const mid = Math.floor(grid / 2);
  const snake: Point[] = [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
  const [food, seed] = spawnFood(grid, snake, options.seed ?? 1);
  return {
    grid,
    mode: options.mode,
    snake,
    dir: "right",
    pendingDir: "right",
    food,
    score: 0,
    tick: 0,
    status: "running",
    seed,
  };
}

/** Queue a turn. Reversing onto yourself is ignored. */
export function turn(state: GameState, dir: Direction): GameState {
  if (state.status === "over") return state;
  if (isOpposite(state.dir, dir)) return state;
  return { ...state, pendingDir: dir };
}

function wrap(value: number, grid: number): number {
  return (value + grid) % grid;
}

/** Advance one frame. Never mutates the input state. */
export function step(state: GameState): GameState {
  if (state.status === "over") return state;

  const dir = state.pendingDir;
  const vector = DIRECTION_VECTORS[dir];
  const head = state.snake[0];
  let next: Point = { x: head.x + vector.x, y: head.y + vector.y };

  const outside =
    next.x < 0 || next.y < 0 || next.x >= state.grid || next.y >= state.grid;

  if (outside) {
    if (state.mode === "walls") {
      return { ...state, dir, tick: state.tick + 1, status: "over" };
    }
    next = { x: wrap(next.x, state.grid), y: wrap(next.y, state.grid) };
  }

  const willEat = samePoint(next, state.food);
  // The tail cell frees up on this same tick unless the snake grows.
  const body = willEat ? state.snake : state.snake.slice(0, -1);

  if (body.some((segment) => samePoint(segment, next))) {
    return { ...state, dir, tick: state.tick + 1, status: "over" };
  }

  const snake = [next, ...body];
  let food = state.food;
  let seed = state.seed;
  if (willEat) {
    [food, seed] = spawnFood(state.grid, snake, state.seed);
  }

  return {
    ...state,
    dir,
    snake,
    food,
    seed,
    score: state.score + (willEat ? POINTS_PER_FOOD : 0),
    tick: state.tick + 1,
  };
}

/** Speed curve: faster as the score climbs. */
export function tickInterval(score: number): number {
  return Math.max(70, 150 - Math.floor(score / 50) * 10);
}
