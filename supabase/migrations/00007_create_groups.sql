CREATE TABLE groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  display_order   INT NOT NULL DEFAULT 0
);

CREATE TABLE group_teams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  wins            INT DEFAULT 0,
  losses          INT DEFAULT 0,
  map_wins        INT DEFAULT 0,
  map_losses      INT DEFAULT 0,
  points          INT DEFAULT 0,
  seed_position   INT,

  UNIQUE(group_id, team_id)
);

CREATE INDEX idx_group_teams_group ON group_teams(group_id);

-- RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Groups viewable" ON groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Organizers manage groups" ON groups FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));

CREATE POLICY "Group teams viewable" ON group_teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Organizers manage group teams" ON group_teams FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));
