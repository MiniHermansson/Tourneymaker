import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy } from "lucide-react";

interface ResultsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: results } = await supabase
    .from("tournament_results")
    .select("*")
    .eq("tournament_id", id)
    .single();

  if (!results) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-4">Results</h2>
        <p className="text-muted-foreground">
          Results have not been finalized yet.
        </p>
      </div>
    );
  }

  // Fetch placement teams
  const teamIds = [
    results.first_place_id,
    results.second_place_id,
    results.third_place_id,
  ].filter(Boolean) as string[];

  const { data: teams } = await supabase
    .from("teams")
    .select("*, team_members(*, profiles(*))")
    .in("id", teamIds);

  const teamMap = new Map(teams?.map((t) => [t.id, t]) ?? []);

  const firstPlace = results.first_place_id
    ? teamMap.get(results.first_place_id)
    : null;
  const secondPlace = results.second_place_id
    ? teamMap.get(results.second_place_id)
    : null;
  const thirdPlace = results.third_place_id
    ? teamMap.get(results.third_place_id)
    : null;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-8">Tournament Results</h2>

        {/* Podium */}
        <div className="flex items-end justify-center gap-4 mb-8">
          {/* 2nd Place */}
          {secondPlace && (
            <div className="flex flex-col items-center">
              <Badge variant="secondary" className="mb-2 text-lg px-4 py-1">
                2nd
              </Badge>
              <Card className="w-48">
                <CardContent className="pt-4 text-center">
                  {secondPlace.logo_url ? (
                    <Avatar className="h-16 w-16 mx-auto mb-2">
                      <AvatarImage src={secondPlace.logo_url} />
                      <AvatarFallback>
                        {(secondPlace.tag ?? secondPlace.name ?? "2").charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-16 w-16 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center text-xl font-bold text-muted-foreground">
                      2
                    </div>
                  )}
                  <p className="font-semibold">
                    {secondPlace.name ?? "Unnamed"}
                  </p>
                  {secondPlace.tag && (
                    <p className="text-xs text-muted-foreground">
                      [{secondPlace.tag}]
                    </p>
                  )}
                </CardContent>
              </Card>
              <div className="h-24 w-48 bg-muted rounded-t-lg mt-2 flex items-center justify-center text-4xl font-bold text-muted-foreground">
                2
              </div>
            </div>
          )}

          {/* 1st Place */}
          {firstPlace && (
            <div className="flex flex-col items-center">
              <Trophy className="h-8 w-8 text-yellow-500 mb-2" />
              <Badge className="mb-2 text-lg px-4 py-1 bg-yellow-500 text-black hover:bg-yellow-500">
                1st
              </Badge>
              <Card className="w-56 border-yellow-500/50">
                <CardContent className="pt-4 text-center">
                  {firstPlace.logo_url ? (
                    <Avatar className="h-20 w-20 mx-auto mb-2">
                      <AvatarImage src={firstPlace.logo_url} />
                      <AvatarFallback>
                        {(firstPlace.tag ?? firstPlace.name ?? "1").charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-20 w-20 mx-auto mb-2 rounded-full bg-yellow-500/20 flex items-center justify-center text-2xl font-bold text-yellow-600">
                      1
                    </div>
                  )}
                  <p className="font-bold text-lg">
                    {firstPlace.name ?? "Unnamed"}
                  </p>
                  {firstPlace.tag && (
                    <p className="text-sm text-muted-foreground">
                      [{firstPlace.tag}]
                    </p>
                  )}
                </CardContent>
              </Card>
              <div className="h-32 w-56 bg-yellow-500/20 rounded-t-lg mt-2 flex items-center justify-center text-5xl font-bold text-yellow-600">
                1
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {thirdPlace && (
            <div className="flex flex-col items-center">
              <Badge variant="outline" className="mb-2 text-lg px-4 py-1">
                3rd
              </Badge>
              <Card className="w-44">
                <CardContent className="pt-4 text-center">
                  {thirdPlace.logo_url ? (
                    <Avatar className="h-14 w-14 mx-auto mb-2">
                      <AvatarImage src={thirdPlace.logo_url} />
                      <AvatarFallback>
                        {(thirdPlace.tag ?? thirdPlace.name ?? "3").charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-14 w-14 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
                      3
                    </div>
                  )}
                  <p className="font-semibold text-sm">
                    {thirdPlace.name ?? "Unnamed"}
                  </p>
                  {thirdPlace.tag && (
                    <p className="text-xs text-muted-foreground">
                      [{thirdPlace.tag}]
                    </p>
                  )}
                </CardContent>
              </Card>
              <div className="h-16 w-44 bg-muted rounded-t-lg mt-2 flex items-center justify-center text-3xl font-bold text-muted-foreground">
                3
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Team Rosters */}
      {[firstPlace, secondPlace, thirdPlace]
        .filter(Boolean)
        .map((team, i) => {
          if (!team) return null;
          const members = (team.team_members ?? []) as Array<{
            user_id: string;
            profiles: Record<string, unknown>;
          }>;
          return (
            <Card key={team.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {["1st", "2nd", "3rd"][i]} Place — {team.name ?? "Unnamed"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => (
                    <Badge key={m.user_id} variant="secondary">
                      {(m.profiles?.discord_username as string) ?? "Unknown"}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

      {results.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{results.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
