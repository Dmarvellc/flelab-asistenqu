"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const registerRoles = [
  { value: "hospital_admin", label: "Hospital Admin" },
  { value: "insurance_admin", label: "Insurance Admin" },
];

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(registerRoles[0].value);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Register failed");
        return;
      }

      setMessage("Registration submitted. Await developer approval.");
    } catch (error) {
      console.error(error);
      setMessage("Register failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/40 px-6 py-16">
      <div className="mx-auto w-full max-w-md space-y-6 rounded-2xl border bg-background p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Account</p>
          <h1 className="text-2xl font-semibold">Register</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="name@company.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Register as</label>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {registerRoles.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Submitting..." : "Register"}
          </Button>
        </form>

        {message ? (
          <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            {message}
          </div>
        ) : null}

        <div className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground">
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
}
