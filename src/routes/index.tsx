import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GameBoard } from "@/components/GameBoard";
import { backend } from "@/services";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Neon Serpent — Multiplayer Snake Arena" },
      {
        name: "description",
        content:
          "Two modes, one arena: die on the walls or wrap through them. Compete on the leaderboard and spectate live games.",
      },
      { property: "og:title", content: "Neon Serpent — Multiplayer Snake Arena" },
      {
        property: "og:description",
        content: "Walls or pass-through Snake, live leaderboards and spectating.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: live } = useQuery({
    queryKey: ["active-games"],
    queryFn: () => backend.games.listActive(),
    refetchInterval: 3000,
  });

  const featured = live?.[0];

  return (
    <main className="mx-auto max-w-6xl px-4 py-14">
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.35em] text-accent">
            Multiplayer arcade
          </p>
          <h1 className="mt-4 text-5xl font-bold leading-[1.05] sm:text-6xl">
            Snake, but the <span className="text-primary">walls</span> are optional.
          </h1>
          <p className="mt-5 max-w-lg text-muted-foreground">
            Pick your ruleset, chase the high score, and watch other players crash in
            real time.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/play" search={{ mode: "walls" }}>
                Play walls mode
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/play" search={{ mode: "pass-through" }}>
                Play pass-through
              </Link>
            </Button>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <Card className="border-border bg-surface p-4">
              <h2 className="font-display text-sm text-primary">Walls</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Touch the edge and it's over. Pure precision.
              </p>
            </Card>
            <Card className="border-border bg-surface p-4">
              <h2 className="font-display text-sm text-accent">Pass-through</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Edges wrap around, so your own tail is the only wall.
              </p>
            </Card>
          </div>
        </div>

        <div>
          {featured ? (
            <div className="space-y-3">
              <GameBoard snapshot={featured.snapshot} />
              <p className="text-center text-sm text-muted-foreground">
                Live: <span className="text-foreground">@{featured.username}</span> ·{" "}
                {featured.mode} · {featured.score} pts ·{" "}
                <Link to="/watch" className="text-primary underline">
                  watch all games
                </Link>
              </p>
            </div>
          ) : (
            <div className="aspect-square w-full animate-pulse rounded-lg border border-border bg-surface" />
          )}
        </div>
      </section>
    </main>
  );
}
