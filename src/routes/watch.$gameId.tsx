import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameBoard } from "@/components/GameBoard";
import { backend } from "@/services";

export const Route = createFileRoute("/watch/$gameId")({
  head: () => ({
    meta: [
      { title: "Spectating a live game — Neon Serpent" },
      {
        name: "description",
        content: "Follow a single Snake run live, tile by tile.",
      },
      { property: "og:title", content: "Spectating a live game — Neon Serpent" },
      {
        property: "og:description",
        content: "Watch a Neon Serpent player's run unfold in real time.",
      },
    ],
  }),
  component: SpectatePage,
});

function SpectatePage() {
  const { gameId } = Route.useParams();

  const { data, isPending } = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => backend.games.get(gameId),
    refetchInterval: 400,
  });

  if (isPending) {
    return <main className="px-4 py-16 text-center text-muted-foreground">Connecting…</main>;
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Game finished</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This run is no longer live.
        </p>
        <Button asChild className="mt-6">
          <Link to="/watch">Back to live games</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">@{data.username}</h1>
        <Badge variant="secondary">{data.mode}</Badge>
        <span className="ml-auto font-display text-3xl text-primary">{data.score}</span>
      </div>

      <Card className="mt-5 border-border bg-surface p-4">
        <GameBoard snapshot={data.snapshot} />
      </Card>

      <div className="mt-5 flex gap-3">
        <Button asChild variant="outline">
          <Link to="/watch">All live games</Link>
        </Button>
        <Button asChild>
          <Link to="/play" search={{ mode: data.mode }}>
            Play {data.mode} yourself
          </Link>
        </Button>
      </div>
    </main>
  );
}
