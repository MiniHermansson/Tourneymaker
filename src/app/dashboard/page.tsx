import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { TOURNAMENT_STATUS_LABELS, type TournamentStatus } from "@/lib/constants";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_organizer")
    .eq("id", user.id)
    .single();

  if (!profile?.is_organizer) redirect("/");

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Organizer Dashboard</h1>
        <Link href="/tournament/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Tournament
          </Button>
        </Link>
      </div>

      {!tournaments || tournaments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No tournaments yet. Create your first one!
            </p>
            <Link href="/tournament/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Tournament
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tournaments.map((tournament) => (
            <Link
              key={tournament.id}
              href={`/tournament/${tournament.id}`}
            >
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {tournament.name}
                    </CardTitle>
                    <Badge
                      variant={
                        tournament.status === "archived"
                          ? "outline"
                          : "default"
                      }
                    >
                      {TOURNAMENT_STATUS_LABELS[tournament.status as TournamentStatus]}
                    </Badge>
                  </div>
                  {tournament.description && (
                    <CardDescription>{tournament.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>
                      Format:{" "}
                      {tournament.format === "captains_draft"
                        ? "Captains Draft"
                        : "Premade Teams"}
                    </span>
                    <span>
                      Created:{" "}
                      {new Date(tournament.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
