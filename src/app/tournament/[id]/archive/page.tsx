import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Download } from "lucide-react";

interface ArchivePageProps {
  params: Promise<{ id: string }>;
}

export default async function ArchivePage({ params }: ArchivePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  const { count: registrationCount } = await supabase
    .from("registrations")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", id);

  const { count: teamCount } = await supabase
    .from("teams")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", id);

  const { count: matchCount } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", id);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Archive & Export</h2>

      <Card>
        <CardHeader>
          <CardTitle>Tournament Summary</CardTitle>
          <CardDescription>{tournament?.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Participants</span>
            <span>{registrationCount ?? 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Teams</span>
            <span>{teamCount ?? 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Matches Played</span>
            <span>{matchCount ?? 0}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export Data</CardTitle>
          <CardDescription>
            Download the full tournament data as JSON. Includes participants,
            teams, matches, results, and bracket information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a href={`/api/tournament/${id}/export`} download>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Export as JSON
            </Button>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
