"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExternalLink, Save } from "lucide-react";
import { RoleBadge } from "@/components/role-badge";
import { type LolRole } from "@/lib/constants";

interface TeamDetailsProps {
  team: {
    id: string;
    tournament_id: string;
    captain_id: string | null;
    name: string | null;
    tag: string | null;
    logo_url: string | null;
    multi_opgg_url: string | null;
    budget_remaining: number | null;
    profiles: Record<string, unknown> | null;
    team_members: Array<{
      user_id: string;
      assigned_role: string | null;
      draft_value: number | null;
      is_substitute: boolean;
      profiles: Record<string, unknown>;
    }>;
  };
  tournamentId: string;
  canEdit: boolean;
  isOrganizer: boolean;
}

export function TeamDetails({
  team,
  tournamentId,
  canEdit,
}: TeamDetailsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState(team.name ?? "");
  const [tag, setTag] = useState(team.tag ?? "");
  const [logoUrl, setLogoUrl] = useState(team.logo_url ?? "");
  const [multiOpgg, setMultiOpgg] = useState(team.multi_opgg_url ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const captain = team.profiles as Record<string, unknown> | null;
  const members = team.team_members ?? [];

  const handleSave = async () => {
    setLoading(true);
    setMessage("");

    const { error } = await supabase
      .from("teams")
      .update({
        name: name.trim() || null,
        tag: tag.trim() || null,
        logo_url: logoUrl.trim() || null,
        multi_opgg_url: multiOpgg.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", team.id);

    setLoading(false);
    if (error) {
      setMessage("Failed to save.");
    } else {
      setMessage("Team updated.");
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            {team.logo_url ? (
              <Avatar className="h-16 w-16">
                <AvatarImage src={team.logo_url} />
                <AvatarFallback className="text-lg">
                  {(team.tag ?? team.name ?? "T").charAt(0)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
                {(team.tag ?? team.name ?? "T").charAt(0)}
              </div>
            )}
            <div>
              <CardTitle className="text-xl">
                {team.name ?? "Unnamed Team"}
                {team.tag && (
                  <Badge variant="outline" className="ml-2">
                    [{team.tag}]
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Captain: {(captain?.discord_username as string) ?? "Unknown"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {team.multi_opgg_url && (
            <a
              href={team.multi_opgg_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-4"
            >
              View team on op.gg <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">Player</th>
                  <th className="px-3 py-2 text-left font-medium">Role</th>
                  <th className="px-3 py-2 text-left font-medium">Value</th>
                  <th className="px-3 py-2 text-left font-medium">op.gg</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const p = m.profiles;
                  const opggUrl = p?.opgg_url as string | null;
                  return (
                    <tr key={m.user_id} className="border-b">
                      <td className="px-3 py-2 font-medium">
                        {(p?.discord_username as string) ?? "Unknown"}
                        {m.user_id === team.captain_id && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Captain
                          </Badge>
                        )}
                        {m.is_substitute && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Sub
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {m.assigned_role ? (
                          <RoleBadge role={m.assigned_role as LolRole} />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {m.draft_value != null ? (
                          <Badge variant="outline">{m.draft_value}</Badge>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {opggUrl && (
                          <a
                            href={opggUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            op.gg <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit Team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Team Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter team name"
                />
              </div>
              <div className="space-y-2">
                <Label>Team Tag (max 5 chars)</Label>
                <Input
                  value={tag}
                  onChange={(e) => setTag(e.target.value.slice(0, 5))}
                  placeholder="e.g., TM1"
                  maxLength={5}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Multi-op.gg URL</Label>
              <Input
                value={multiOpgg}
                onChange={(e) => setMultiOpgg(e.target.value)}
                placeholder="https://www.op.gg/multisearch/..."
              />
            </div>

            {message && (
              <p className="text-sm text-muted-foreground">{message}</p>
            )}

            <Button onClick={handleSave} disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
