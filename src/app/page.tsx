import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, ArrowRight } from "lucide-react";
import {
  TOURNAMENT_STATUS_LABELS,
  type TournamentStatus,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let tournament = null;

  try {
    const supabase = await createClient();
    const { data: activeTournament } = await supabase
      .from("tournaments")
      .select("*")
      .not("status", "eq", "archived")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    tournament = activeTournament;
  } catch {
    // Supabase not configured yet
  }

  if (!tournament) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4">
              <Trophy className="h-12 w-12 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">TourneyMaker</CardTitle>
            <CardDescription>
              No tournaments are currently active. Check back soon!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button variant="outline">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = tournament.status as TournamentStatus;

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <div className="text-center mb-8">
        <Trophy className="h-12 w-12 mx-auto mb-4 text-primary" />
        <h1 className="text-3xl font-bold mb-2">TourneyMaker</h1>
        <p className="text-muted-foreground">
          League of Legends Tournament Management
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{tournament.name}</CardTitle>
              {tournament.description && (
                <CardDescription className="mt-1">
                  {tournament.description}
                </CardDescription>
              )}
            </div>
            <Badge
              variant={status === "results" ? "default" : "secondary"}
              className="text-sm"
            >
              {TOURNAMENT_STATUS_LABELS[status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={`/tournament/${tournament.id}`}>
              <Button>
                View Tournament
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            {status === "registration" && (
              <Link href={`/tournament/${tournament.id}/register`}>
                <Button variant="outline">Register Now</Button>
              </Link>
            )}
            {status === "results" && (
              <Link href={`/tournament/${tournament.id}/results`}>
                <Button variant="outline">View Results</Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
