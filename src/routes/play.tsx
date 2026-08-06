import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameBoard } from "@/components/GameBoard";
import { useAuth } from "@/hooks/use-auth";
import { backend, type GameMode } from "@/services";
import {
  createGame,
  step,
  tickInterval,
  turn,
  type Direction,
  type GameState,
} from "@/game/engine";

const searchSchema = z.object({
  mode: z.enum(["walls", "pass-through"]).default("walls"),
});

export const Route = createFileRoute("/play")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Play Snake — Neon Serpent" },
      {
        name: "description",
        content: "Play Snake in walls or pass-through mode and broadcast your run live.",
      },
      { property: "og:title", content: "Play Snake — Neon Serpent" },
      {
        property: "og:description",
        content: "Walls or pass-through Snake, with live scoring.",
      },
    ],
  }),
  component: PlayPage,
});

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

function PlayPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  const [game, setGame] = useState<GameState>(() => createGame({ mode, seed: 1 }));
  const [running, setRunning] = useState(false);
  const [best, setBest] = useState(0);
  const gameIdRef = useRef<string | null>(null);
  const gameRef = useRef(game);
  gameRef.current = game;

  useEffect(() => {
    setGame(createGame({ mode, seed: Math.floor(Date.now() % 100000) }));
    setRunning(false);
  }, [mode]);

  useEffect(() => {
    if (!session) return;
    void backend.scores.personalBest(mode).then(setBest);
  }, [session, mode, game.status]);

  const snapshot = useCallback(
    (state: GameState) => ({
      grid: state.grid,
      snake: state.snake,
      food: state.food,
      dir: state.dir,
      score: state.score,
      status: state.status,
    }),
    [],
  );

  const start = async () => {
    const fresh = createGame({ mode, seed: Math.floor(Date.now() % 100000) });
    setGame(fresh);
    setRunning(true);
    if (session) {
      const live = await backend.games.start({ mode, snapshot: snapshot(fresh) });
      gameIdRef.current = live.id;
    }
  };

  // Game loop
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setGame((current) => step(current));
    }, tickInterval(game.score));
    return () => window.clearInterval(timer);
  }, [running, game.score]);

  // Broadcast for spectators
  useEffect(() => {
    if (!running || !gameIdRef.current) return;
    const timer = window.setInterval(() => {
      const id = gameIdRef.current;
      if (id) void backend.games.publish(id, snapshot(gameRef.current));
    }, 400);
    return () => window.clearInterval(timer);
  }, [running, snapshot]);

  // Game over: persist score
  useEffect(() => {
    if (game.status !== "over" || !running) return;
    setRunning(false);
    const id = gameIdRef.current;
    gameIdRef.current = null;
    if (!session) {
      toast.info("Sign in to save this score to the leaderboard.");
      return;
    }
    void (async () => {
      if (id) await backend.games.finish(id, game.score);
      await backend.scores.submit({ mode, score: game.score });
      setBest(await backend.scores.personalBest(mode));
      toast.success(`Run saved — ${game.score} points`);
    })();
  }, [game.status, game.score, running, session, mode]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const dir = KEY_MAP[event.key];
      if (!dir) return;
      event.preventDefault();
      setGame((current) => turn(current, dir));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (loading) {
    return <main className="px-4 py-16 text-center text-muted-foreground">Loading…</main>;
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-[1fr_18rem]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">Arena</h1>
          <Badge variant={mode === "walls" ? "default" : "secondary"}>{mode}</Badge>
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant={mode === "walls" ? "default" : "outline"}
              onClick={() => void navigate({ to: "/play", search: { mode: "walls" } })}
            >
              Walls
            </Button>
            <Button
              size="sm"
              variant={mode === "pass-through" ? "default" : "outline"}
              onClick={() =>
                void navigate({ to: "/play", search: { mode: "pass-through" as GameMode } })
              }
            >
              Pass-through
            </Button>
          </div>
        </div>

        <GameBoard snapshot={snapshot(game)} dimmed={!running && game.status === "running"} />

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void start()}>
            {game.status === "over" ? "Play again" : running ? "Restart" : "Start"}
          </Button>
          {running && (
            <Button variant="outline" onClick={() => setRunning(false)}>
              Pause
            </Button>
          )}
          {!running && game.status === "running" && game.tick > 0 && (
            <Button variant="outline" onClick={() => setRunning(true)}>
              Resume
            </Button>
          )}
          <p className="text-sm text-muted-foreground">Arrow keys or WASD</p>
        </div>
      </div>

      <aside className="space-y-4">
        <Card className="border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Score</p>
          <p className="font-display text-4xl text-primary">{game.score}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Personal best ({mode}): <span className="text-foreground">{best}</span>
          </p>
        </Card>

        {!session && (
          <Card className="border-border bg-surface p-5 text-sm">
            <p className="text-muted-foreground">
              You're playing as a guest. Scores aren't saved and your game isn't
              broadcast.
            </p>
            <Button asChild size="sm" className="mt-3 w-full">
              <Link to="/auth">Sign in or sign up</Link>
            </Button>
          </Card>
        )}

        <Card className="border-border bg-surface p-5 text-sm text-muted-foreground">
          <p className="font-display text-sm text-foreground">Rules</p>
          <p className="mt-2">
            {mode === "walls"
              ? "Hitting a wall ends the run."
              : "Edges wrap: leave the right side, appear on the left."}
          </p>
          <p className="mt-2">Each pellet is 10 points and speeds you up.</p>
        </Card>
      </aside>
    </main>
  );
}
