"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  generateOpggUrl,
  LOL_SERVERS,
  LOL_SERVER_LABELS,
  type LolServer,
} from "@/lib/constants";
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

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [gamertag, setGamertag] = useState("");
  const [server, setServer] = useState<LolServer>("euw");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate format: "Name#Tag"
    const parts = gamertag.split("#");
    if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
      setError('Please use the format "Username#Tag" (e.g., "Miniluva#EUW")');
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const opggUrl = generateOpggUrl(gamertag.trim(), server);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        lol_gamertag: gamertag.trim(),
        lol_region: server,
        opgg_url: opggUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      setError("Failed to save profile. Please try again.");
      setLoading(false);
      return;
    }

    // Fetch ranks immediately after saving profile
    try {
      await fetch("/api/scrape-rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gamertag: gamertag.trim(),
          userId: user.id,
          region: server,
        }),
      });
    } catch {
      // Rank fetch failure is non-blocking — user can update later from profile
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set Up Your Profile</CardTitle>
          <CardDescription>
            Enter your Riot ID and server to get started. This will be used to
            look up your rank and create your op.gg link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gamertag">Riot ID</Label>
              <Input
                id="gamertag"
                placeholder="e.g., Miniluva#EUW"
                value={gamertag}
                onChange={(e) => setGamertag(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Format: Username#Tag (no spaces)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Server</Label>
              <Select
                value={server}
                onValueChange={(v) => setServer(v as LolServer)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOL_SERVERS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {LOL_SERVER_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
