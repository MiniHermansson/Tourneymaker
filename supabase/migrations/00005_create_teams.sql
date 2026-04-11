CREATE TABLE teams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  captain_id      UUID REFERENCES profiles(id),
  name            TEXT,
  tag             TEXT,
  logo_url        TEXT,
  multi_opgg_url  TEXT,
  budget_remaining INT,
  seed            INT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teams_tournament ON teams(tournament_id);

CREATE TABLE team_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_role   lol_role,
  is_substitute   BOOLEAN DEFAULT FALSE,
  draft_value     INT,
  draft_pick_order INT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);

-- RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams are viewable by authenticated users"
  ON teams FOR SELECT TO authenticated USING (true);

CREATE POLICY "Organizers can create teams"
  ON teams FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));

CREATE POLICY "Captains can update their own team or organizers can update any"
  ON teams FOR UPDATE TO authenticated
  USING (
    auth.uid() = captain_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true)
  );

CREATE POLICY "Organizers can delete teams"
  ON teams FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));

CREATE POLICY "Team members are viewable by authenticated users"
  ON team_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Organizers can manage team members"
  ON team_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));

CREATE POLICY "Organizers can update team members"
  ON team_members FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));

CREATE POLICY "Organizers can delete team members"
  ON team_members FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));
