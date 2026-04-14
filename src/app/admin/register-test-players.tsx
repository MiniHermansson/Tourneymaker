"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  TOURNAMENT_STATUS_LABELS,
  type TournamentStatus,
} from "@/lib/constants";

interface Tournament {
  id: string;
  name: string;
  status: string;
}

export function RegisterTestPlayers({
  tournaments,
}: {
  tournaments: Tournament[];
}) {
  const router = useRouter();
  const [tournamentId, setTournamentId] = useState("");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournamentId) return;

    setLoading(true);
    setMessage("");
    setIsError(false);

    const response = await fetch("/api/admin/register-test-players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tournamentId, count }),
    });

    const data = await response.json();

    if (response.ok) {
      setMessage(
        `Registered ${data.registered} test players (${data.created} newly created).`
      );
      setIsError(false);
      router.refresh();
    } else {
      setMessage(data.error ?? "Something went wrong.");
      setIsError(true);
    }

    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register Test Players</CardTitle>
        <CardDescription>
          Create and register dummy players to a tournament for testing. New test
          accounts are created automatically if needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tournament</Label>
              <Select value={tournamentId} onValueChange={(v) => setTournamentId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a tournament" />
                </SelectTrigger>
                <SelectContent>
                  {tournaments.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-2">
                        {t.name}
                        <Badge variant="outline" className="text-xs">
                          {TOURNAMENT_STATUS_LABELS[
                            t.status as TournamentStatus
                          ] ?? t.status}
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Number of players</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </div>
          </div>

          {message && (
            <p
              className={`text-sm ${isError ? "text-destructive" : "text-muted-foreground"}`}
            >
              {message}
            </p>
          )}

          <Button type="submit" disabled={loading || !tournamentId}>
            {loading ? "Registering..." : "Register Test Players"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
