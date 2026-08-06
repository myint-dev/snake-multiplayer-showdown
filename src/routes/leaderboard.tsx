import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { backend, type GameMode } from "@/services";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Neon Serpent" },
      {
        name: "description",
        content: "Top Snake scores for walls mode and pass-through mode.",
      },
      { property: "og:title", content: "Leaderboard — Neon Serpent" },
      {
        property: "og:description",
        content: "See who tops the walls and pass-through Snake charts.",
      },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const [mode, setMode] = useState<GameMode>("walls");
  const { session } = useAuth();

  const { data, isPending } = useQuery({
    queryKey: ["leaderboard", mode],
    queryFn: () => backend.scores.leaderboard(mode, 10),
    refetchInterval: 5000,
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Leaderboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Best single run per player, per mode.
      </p>

      <Tabs value={mode} onValueChange={(value) => setMode(value as GameMode)} className="mt-6">
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="walls">Walls</TabsTrigger>
          <TabsTrigger value="pass-through">Pass-through</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="mt-6 divide-y divide-border border-border bg-surface p-0">
        {isPending && <p className="p-6 text-sm text-muted-foreground">Loading scores…</p>}
        {data?.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">
            No scores yet.{" "}
            <Link to="/play" search={{ mode }} className="text-primary underline">
              Be the first.
            </Link>
          </p>
        )}
        {data?.map((entry, index) => (
          <div key={entry.id} className="flex items-center gap-4 px-5 py-3">
            <span className="w-8 font-display text-lg text-muted-foreground">
              {index + 1}
            </span>
            <span className="flex-1 truncate">
              @{entry.username}
              {session?.user.id === entry.userId && (
                <Badge variant="secondary" className="ml-2">
                  you
                </Badge>
              )}
            </span>
            <span className="font-display text-lg text-primary">{entry.score}</span>
          </div>
        ))}
      </Card>
    </main>
  );
}
