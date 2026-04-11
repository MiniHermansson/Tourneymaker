CREATE TABLE draft_player_values (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  value           INT NOT NULL DEFAULT 3,

  UNIQUE(tournament_id, user_id)
);

CREATE TABLE draft_state (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID UNIQUE NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  current_pick    INT NOT NULL DEFAULT 1,
  total_picks     INT NOT NULL,
  is_active       BOOLEAN DEFAULT FALSE,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE draft_order (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  pick_number     INT NOT NULL,
  round           INT NOT NULL,
  team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  UNIQUE(tournament_id, pick_number)
);

CREATE TABLE draft_picks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  pick_number     INT NOT NULL,
  round           INT NOT NULL,
  team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  value           INT NOT NULL,
  picked_at       TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tournament_id, pick_number)
);

CREATE INDEX idx_draft_picks_tournament ON draft_picks(tournament_id);

-- RLS
ALTER TABLE draft_player_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_picks ENABLE ROW LEVEL SECURITY;

-- All draft tables: viewable by authenticated, writable by organizers
CREATE POLICY "Draft values viewable" ON draft_player_values FOR SELECT TO authenticated USING (true);
CREATE POLICY "Organizers manage draft values" ON draft_player_values FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));

CREATE POLICY "Draft state viewable" ON draft_state FOR SELECT TO authenticated USING (true);
CREATE POLICY "Organizers manage draft state" ON draft_state FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));

CREATE POLICY "Draft order viewable" ON draft_order FOR SELECT TO authenticated USING (true);
CREATE POLICY "Organizers manage draft order" ON draft_order FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));

CREATE POLICY "Draft picks viewable" ON draft_picks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Organizers manage draft picks" ON draft_picks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));
