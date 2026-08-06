import { describe, expect, it } from "vitest";
import {
  createGame,
  isOpposite,
  step,
  tickInterval,
  turn,
  type GameState,
} from "./engine";

function drive(state: GameState, steps: number): GameState {
  let current = state;
  for (let i = 0; i < steps; i++) current = step(current);
  return current;
}

describe("createGame", () => {
  it("starts with a 3-segment snake heading right", () => {
    const game = createGame({ mode: "walls", grid: 10, seed: 3 });
    expect(game.snake).toHaveLength(3);
    expect(game.dir).toBe("right");
    expect(game.status).toBe("running");
    expect(game.score).toBe(0);
  });

  it("never spawns food on the snake", () => {
    for (let seed = 0; seed < 50; seed++) {
      const game = createGame({ mode: "walls", grid: 8, seed });
      expect(game.snake.some((s) => s.x === game.food.x && s.y === game.food.y)).toBe(false);
    }
  });

  it("is deterministic for a given seed", () => {
    expect(createGame({ mode: "walls", seed: 42 })).toEqual(
      createGame({ mode: "walls", seed: 42 }),
    );
  });
});

describe("turn", () => {
  it("ignores reversing onto itself", () => {
    const game = createGame({ mode: "walls", grid: 10, seed: 1 });
    expect(turn(game, "left").pendingDir).toBe("right");
  });

  it("accepts perpendicular turns", () => {
    const game = createGame({ mode: "walls", grid: 10, seed: 1 });
    expect(turn(game, "up").pendingDir).toBe("up");
  });

  it("knows opposites", () => {
    expect(isOpposite("up", "down")).toBe(true);
    expect(isOpposite("up", "left")).toBe(false);
  });
});

describe("walls mode", () => {
  it("ends the game when the snake reaches the edge", () => {
    const game = createGame({ mode: "walls", grid: 6, seed: 999 });
    const dead = drive(game, 10);
    expect(dead.status).toBe("over");
  });

  it("does not mutate the input state", () => {
    const game = createGame({ mode: "walls", grid: 10, seed: 5 });
    const before = structuredClone(game);
    step(game);
    expect(game).toEqual(before);
  });
});

describe("pass-through mode", () => {
  it("wraps around the horizontal edge instead of dying", () => {
    const game = createGame({ mode: "pass-through", grid: 6, seed: 12345 });
    const later = drive(game, 6);
    expect(later.status).toBe("running");
    expect(later.snake[0]!.x).toBeLessThan(game.grid);
    expect(later.snake[0]!.x).toBeGreaterThanOrEqual(0);
  });

  it("wraps vertically too", () => {
    let game = turn(createGame({ mode: "pass-through", grid: 6, seed: 7 }), "up");
    game = drive(game, 8);
    expect(game.status).toBe("running");
    expect(game.snake[0]!.y).toBeGreaterThanOrEqual(0);
  });
});

describe("eating and growth", () => {
  it("grows and scores when the head lands on food", () => {
    const base = createGame({ mode: "pass-through", grid: 10, seed: 1 });
    const head = base.snake[0]!;
    const staged: GameState = { ...base, food: { x: head.x + 1, y: head.y } };
    const after = step(staged);
    expect(after.score).toBe(10);
    expect(after.snake).toHaveLength(base.snake.length + 1);
    expect(after.food).not.toEqual(staged.food);
  });

  it("keeps length constant when not eating", () => {
    const game = createGame({ mode: "pass-through", grid: 12, seed: 4 });
    const after = step({ ...game, food: { x: 0, y: 0 } });
    expect(after.snake).toHaveLength(game.snake.length);
    expect(after.score).toBe(0);
  });
});

describe("self collision", () => {
  it("ends the game when the snake bites its body", () => {
    const game: GameState = {
      ...createGame({ mode: "pass-through", grid: 10, seed: 2 }),
      snake: [
        { x: 5, y: 5 },
        { x: 4, y: 5 },
        { x: 4, y: 4 },
        { x: 5, y: 4 },
        { x: 6, y: 4 },
      ],
      dir: "right",
      pendingDir: "up",
      food: { x: 0, y: 0 },
    };
    expect(step(game).status).toBe("over");
  });
});

describe("tickInterval", () => {
  it("speeds up as score grows and clamps", () => {
    expect(tickInterval(0)).toBe(150);
    expect(tickInterval(100)).toBeLessThan(150);
    expect(tickInterval(100000)).toBe(70);
  });
});
