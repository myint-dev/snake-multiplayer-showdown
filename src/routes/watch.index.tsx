import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameBoard } from "@/components/GameBoard";
import { backend } from "@/services";

export const Route = createFileRoute("/watch/")({
  head: () => ({
    meta: [
      { title: "Watch live games — Neon Serpent" },
      {
        name: "description",
        content: "Spectate active Snake runs from other players in both game modes.",
      },
      { property: "og:title", content: "Watch live games — Neon Serpent" },
      {
        property: "og:description",
        content: "Live Snake spectating: follow other players' runs in real time.",
      },
    ],
  }),
  component: WatchPage,
});

function WatchPage() {
  const { data, isPending } = useQuery({
    queryKey: ["active-games"],
    queryFn: () => backend.games.listActive(),
    refetchInterval: 1200,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold">Live games</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {data?.length ?? 0} players in the arena right now.
      </p>

      {isPending && <p className="mt-8 text-sm text-muted-foreground">Finding games…</p>}

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((game) => (
          <Link key={game.id} to="/watch/$gameId" params={{ gameId: game.id }}>
            <Card className="border-border bg-surface p-4 transition-colors hover:border-primary">
              <GameBoard snapshot={game.snapshot} />
              <div className="mt-3 flex items-center gap-2">
                <span className="flex-1 truncate text-sm">@{game.username}</span>
                <Badge variant="secondary">{game.mode}</Badge>
                <span className="font-display text-primary">{game.score}</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
