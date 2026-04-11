"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  generateOpggUrl,
  LOL_SERVERS,
  LOL_SERVER_LABELS,
  type LolRank,
  type LolServer,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { RankBadge } from "@/components/rank-badge";
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
import { ExternalLink } from "lucide-react";
import type { Database } from "@/lib/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [gamertag, setGamertag] = useState("");
  const [server, setServer] = useState<LolServer>("euw");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
        setGamertag(data.lol_gamertag ?? "");
        setServer((data.lol_region as LolServer) ?? "euw");
      }
    }
    loadProfile();
  }, [supabase, router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const parts = gamertag.split("#");
    if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
      setMessage('Please use the format "Username#Tag"');
      return;
    }

    setLoading(true);
    const opggUrl = generateOpggUrl(gamertag.trim(), server);

    const { error } = await supabase
      .from("profiles")
      .update({
        lol_gamertag: gamertag.trim(),
        lol_region: server,
        opgg_url: opggUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    setLoading(false);
    if (error) {
      setMessage("Failed to update. Please try again.");
      return;
    }

    // Scrape rank after saving gamertag
    setMessage("Profile saved. Fetching rank...");
    try {
      const res = await fetch("/api/scrape-rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gamertag: gamertag.trim(),
          userId: profile.id,
          region: server,
        }),
      });
      if (res.ok) {
        setMessage("Profile updated and rank fetched!");
      } else {
        setMessage("Profile saved, but rank could not be fetched.");
      }
    } catch {
      setMessage("Profile saved, but rank fetch failed.");
    }
    router.refresh();
  };

  if (!profile) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Discord Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              <span className="text-muted-foreground">Username:</span>{" "}
              {profile.discord_username}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>League of Legends</CardTitle>
            <CardDescription>
              Your Riot ID and server are used to fetch your rank and generate
              your op.gg link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gamertag">Riot ID</Label>
                <Input
                  id="gamertag"
                  placeholder="e.g., Miniluva#EUW"
                  value={gamertag}
                  onChange={(e) => setGamertag(e.target.value)}
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

              {profile.current_rank && profile.current_rank !== "unranked" && (
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Current Rank</p>
                    <RankBadge
                      rank={profile.current_rank as LolRank}
                      tier={profile.current_rank_tier}
                    />
                  </div>
                  {profile.peak_rank && profile.peak_rank !== "unranked" && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Peak Rank</p>
                      <RankBadge
                        rank={profile.peak_rank as LolRank}
                        tier={profile.peak_rank_tier}
                      />
                    </div>
                  )}
                </div>
              )}

              {profile.opgg_url && (
                <a
                  href={profile.opgg_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  View on op.gg <ExternalLink className="h-3 w-3" />
                </a>
              )}

              {message && (
                <p className="text-sm text-muted-foreground">{message}</p>
              )}

              <div className="pt-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Update Profile"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
