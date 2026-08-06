import type { GameSnapshot } from "@/services";
import { cn } from "@/lib/utils";

interface GameBoardProps {
  snapshot: GameSnapshot;
  className?: string;
  dimmed?: boolean;
}

export function GameBoard({ snapshot, className, dimmed }: GameBoardProps) {
  const { grid, snake, food } = snapshot;
  const cell = 100 / grid;
  const head = snake[0];

  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-surface shadow-glow",
        dimmed && "opacity-60",
        className,
      )}
      style={{
        backgroundImage:
          "linear-gradient(to right, color-mix(in oklab, var(--color-border) 55%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--color-border) 55%, transparent) 1px, transparent 1px)",
        backgroundSize: `${cell}% ${cell}%`,
      }}
      role="img"
      aria-label={`Snake board, score ${snapshot.score}`}
    >
      <span
        className="absolute rounded-full bg-destructive animate-pulse"
        style={{
          left: `${food.x * cell}%`,
          top: `${food.y * cell}%`,
          width: `${cell}%`,
          height: `${cell}%`,
        }}
      />
      {snake.map((segment, index) => (
        <span
          key={`${segment.x}-${segment.y}-${index}`}
          className={cn(
            "absolute rounded-[2px]",
            index === 0 ? "bg-primary" : "bg-snake",
          )}
          style={{
            left: `${segment.x * cell}%`,
            top: `${segment.y * cell}%`,
            width: `${cell}%`,
            height: `${cell}%`,
            opacity: index === 0 ? 1 : Math.max(0.35, 1 - index / (snake.length + 6)),
          }}
        />
      ))}
      {head && snapshot.status === "over" && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <p className="font-display text-2xl tracking-widest text-destructive">CRASHED</p>
        </div>
      )}
    </div>
  );
}
