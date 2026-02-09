"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";

type PendingUser = {
  user_id: string;
  email: string;
  role: string;
  created_at: string;
};

export default function UserManagement() {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState("hospital_admin");

  async function loadPending() {
    try {
      const response = await fetch("/api/developer/pending");
      const data = await response.json();
      if (response.ok) {
        setPending(data.pending ?? []);
      } else {
        console.error("Failed to load pending users", data.error);
      }
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    void loadPending();
  }, []);

  async function handleApprove(userId: string) {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/developer/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error ?? "Approve failed" });
      } else {
        setMessage({ type: 'success', text: "User approved successfully" });
        await loadPending();
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: "Approve failed" });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/developer/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createEmail,
          password: createPassword,
          role: createRole,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error ?? "Create failed" });
      } else {
        setMessage({ type: 'success', text: "Account created successfully" });
        setCreateEmail("");
        setCreatePassword("");
        await loadPending();
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: "Create failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'}`}>
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>
              Manually create Hospital or Insurance admin accounts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  id="role"
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value)}
                >
                  <option value="hospital_admin">Hospital Admin</option>
                  <option value="insurance_admin">Insurance Admin</option>
                </Select>
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Creating..." : "Create Account"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>
              Users waiting for developer approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
                      No pending users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  pending.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.email}</span>
                          <span className="text-xs text-muted-foreground">
                            {user.role} · {new Date(user.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loading}
                          onClick={() => void handleApprove(user.user_id)}
                        >
                          Approve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
