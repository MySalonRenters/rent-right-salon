import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup", "reset"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in to My Salon Renters" },
      {
        name: "description",
        content:
          "Sign in or create your My Salon Renters account to manage salon chair rent, renters and rental agreements.",
      },
      { property: "og:title", content: "Sign in to My Salon Renters" },
      {
        property: "og:description",
        content: "Sign in to manage salon chair rent, renters and rental agreements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function safePath(value: string | undefined) {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"owner" | "renter">("owner");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const next = safePath(search.redirect);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: next ?? "/dashboard", replace: true });
    });
  }, [navigate, next]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent(true);
        toast.success("Check your email for a reset link.");
        return;
      }

      if (mode === "signup") {
        const parsed = z
          .object({
            email: z.string().trim().email().max(255),
            password: z.string().min(8, "Use at least 8 characters").max(72),
            fullName: z.string().trim().min(1, "Please add your name").max(100),
          })
          .safeParse({ email, password, fullName });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0]?.message ?? "Please check your details");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}${next ?? "/dashboard"}`,
            data: { full_name: parsed.data.fullName, role },
          },
        });
        if (error) throw error;
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          navigate({ to: next ?? "/dashboard", replace: true });
        } else {
          setSent(true);
          toast.success("Almost there. Confirm your email to finish signing up.");
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      navigate({ to: next ?? "/dashboard", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}${next ?? "/dashboard"}` },
      });
      if (error) {
        toast.error("Google sign in didn't work. Please try again.");
        setBusy(false);
      }
      // On success Supabase redirects the browser to Google, so nothing more to do here.
    } catch {
      toast.error("Google sign in didn't work. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="bg-leaf flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/">
          <Logo />
        </Link>

        <div className="mt-6 rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-calm)]">
          {mode !== "reset" && (
            <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          <h1 className="mt-6 text-2xl font-semibold">
            {mode === "signin"
              ? "Welcome back"
              : mode === "signup"
                ? "Create your account"
                : "Reset your password"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Salon owners set up a salon. Chair renters should use their invite link."
              : mode === "reset"
                ? "We'll email you a link to choose a new password."
                : "Sign in to your salon or your renter portal."}
          </p>

          {sent ? (
            <p className="mt-6 rounded-xl bg-accent p-4 text-sm text-accent-foreground">
              Check your inbox at <strong>{email}</strong> and follow the link to continue.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Your name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      maxLength={100}
                      autoComplete="name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>I am a</Label>
                    <RadioGroup
                      value={role}
                      onValueChange={(v) => setRole(v as "owner" | "renter")}
                      className="grid grid-cols-2 gap-3"
                    >
                      <Label
                        htmlFor="role-owner"
                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3 text-sm font-normal has-[button[data-state=checked]]:border-primary has-[button[data-state=checked]]:bg-accent"
                      >
                        <RadioGroupItem value="owner" id="role-owner" />
                        Salon owner
                      </Label>
                      <Label
                        htmlFor="role-renter"
                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3 text-sm font-normal has-[button[data-state=checked]]:border-primary has-[button[data-state=checked]]:bg-accent"
                      >
                        <RadioGroupItem value="renter" id="role-renter" />
                        Chair renter
                      </Label>
                    </RadioGroup>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                  autoComplete="email"
                  required
                />
              </div>

              {mode !== "reset" && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    maxLength={72}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    required
                  />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={busy}>
                {mode === "signin"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create account"
                    : "Email me a reset link"}
              </Button>
            </form>
          )}

          {mode !== "reset" && !sent && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogle}
                disabled={busy}
              >
                Continue with Google
              </Button>
            </>
          )}

          <div className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "reset" ? (
              <button type="button" className="underline" onClick={() => setMode("signin")}>
                Back to sign in
              </button>
            ) : (
              <button type="button" className="underline" onClick={() => setMode("reset")}>
                Forgot your password?
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
