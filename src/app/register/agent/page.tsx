"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgentRegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          role: "agent",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Registration failed");
        return;
      }

      setMessage("Registration submitted. Awaiting developer approval.");
      setEmail("");
      setPassword("");
    } catch (err) {
      console.error(err);
      setError("Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/40 px-6 py-16">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>Agent Registration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {message ? (
            <div className="rounded-md border border-emerald-400/40 bg-emerald-100/40 p-3 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input
                name="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <input
                name="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Submitting..." : "Submit registration"}
            </Button>
          </form>
          <div className="text-center text-sm text-muted-foreground">
            Already registered?{" "}
            <Link className="underline" href="/login/agent">
              Login here
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
