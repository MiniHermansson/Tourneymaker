import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  TOURNAMENT_STATUS_LABELS,
  type TournamentStatus,
  type TournamentFormat,
} from "@/lib/constants";
import { getVisiblePages } from "@/lib/tournament/state-machine";

interface TournamentLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

const PAGE_LABELS: Record<string, string> = {
  overview: "Overview",
  register: "Registration",
  planning: "Planning",
  scouting: "Scouting",
  draft: "Draft",
  teams: "Teams",
  groups: "Groups",
  playoffs: "Playoffs",
  results: "Results",
  archive: "Archive",
};

const PAGE_ROUTES: Record<string, string> = {
  overview: "",
  register: "/register",
  planning: "/planning",
  scouting: "/scouting",
  draft: "/draft",
  teams: "/teams",
  groups: "/groups",
  playoffs: "/playoffs",
  results: "/results",
  archive: "/archive",
};

export default async function TournamentLayout({
  children,
  params,
}: TournamentLayoutProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (!tournament) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isOrganizer = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_organizer")
      .eq("id", user.id)
      .single();
    isOrganizer = profile?.is_organizer ?? false;
  }

  const status = tournament.status as TournamentStatus;
  const format = tournament.format as TournamentFormat;
  const visiblePages = getVisiblePages(status, format, isOrganizer);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold">{tournament.name}</h1>
          <Badge
            variant={status === "archived" ? "outline" : "default"}
          >
            {TOURNAMENT_STATUS_LABELS[status]}
          </Badge>
        </div>
        {tournament.description && (
          <p className="text-muted-foreground">{tournament.description}</p>
        )}
      </div>

      <nav className="mb-6 flex gap-1 overflow-x-auto border-b">
        {visiblePages.map((page) => (
          <Link
            key={page}
            href={`/tournament/${id}${PAGE_ROUTES[page]}`}
            className="whitespace-nowrap px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-foreground/30 transition-colors"
          >
            {PAGE_LABELS[page]}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
