import {
  DIRECTION_VECTORS,
  type Direction,
  type GameState,
  isOpposite,
  samePoint,
} from "./engine";

const ORDER: Direction[] = ["up", "right", "down", "left"];

/**
 * Deterministic greedy bot: heads toward the food, avoiding immediate death.
 * Used to simulate other players' games in the mock backend.
 */
export function chooseBotDirection(state: GameState): Direction {
  const head = state.snake[0]!;
  const scored = ORDER.filter((dir) => !isOpposite(state.dir, dir)).map((dir) => {
    const vector = DIRECTION_VECTORS[dir];
    let next = { x: head.x + vector.x, y: head.y + vector.y };
    const outside =
      next.x < 0 || next.y < 0 || next.x >= state.grid || next.y >= state.grid;
    if (outside) {
      if (state.mode === "walls") return { dir, cost: Number.POSITIVE_INFINITY };
      next = {
        x: (next.x + state.grid) % state.grid,
        y: (next.y + state.grid) % state.grid,
      };
    }
    const body = state.snake.slice(0, -1);
    if (body.some((segment) => samePoint(segment, next))) {
      return { dir, cost: Number.POSITIVE_INFINITY };
    }
    const dx = Math.abs(next.x - state.food.x);
    const dy = Math.abs(next.y - state.food.y);
    const distance =
      state.mode === "pass-through"
        ? Math.min(dx, state.grid - dx) + Math.min(dy, state.grid - dy)
        : dx + dy;
    return { dir, cost: distance };
  });

  scored.sort((a, b) => a.cost - b.cost);
  return scored[0]?.dir ?? state.dir;
}
