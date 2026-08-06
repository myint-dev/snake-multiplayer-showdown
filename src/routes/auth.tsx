import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Neon Serpent" },
      {
        name: "description",
        content: "Create a Neon Serpent account or sign in to save scores and go live.",
      },
      { property: "og:title", content: "Sign in — Neon Serpent" },
      {
        property: "og:description",
        content: "Create an account to save your Snake scores to the leaderboard.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const submit = (kind: "signin" | "signup") => async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") ?? "");
    const password = String(form.get("password") ?? "");
    setBusy(true);
    try {
      if (kind === "signup") {
        await signUp(username, password);
        toast.success(`Welcome, ${username}!`);
      } else {
        await signIn(username, password);
        toast.success("Signed in.");
      }
      void navigate({ to: "/play", search: { mode: "walls" } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <h1 className="text-center text-3xl font-bold">Enter the arena</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Accounts live in the mock backend — no email needed.
      </p>

      <Card className="mt-8 border-border bg-surface p-6">
        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form className="space-y-4 pt-4" onSubmit={submit("signin")}>
              <Field label="Username" name="username" />
              <Field label="Password" name="password" type="password" />
              <Button type="submit" className="w-full" disabled={busy}>
                Sign in
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form className="space-y-4 pt-4" onSubmit={submit("signup")}>
              <Field label="Username" name="username" autoComplete="off" />
              <Field label="Password" name="password" type="password" autoComplete="new-password" />
              <p className="text-xs text-muted-foreground">
                Minimum 3 characters for the username, 6 for the password.
              </p>
              <Button type="submit" className="w-full" disabled={busy}>
                Create account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`${name}-${type}`}>{label}</Label>
      <Input id={`${name}-${type}`} name={name} type={type} required autoComplete={autoComplete} />
    </div>
  );
}
