CREATE TABLE matches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  stage           match_stage NOT NULL,
  group_id        UUID REFERENCES groups(id) ON DELETE SET NULL,
  bracket_position TEXT,
  round           INT,

  team_a_id       UUID REFERENCES teams(id),
  team_b_id       UUID REFERENCES teams(id),
  bo_format       bo_format NOT NULL,

  team_a_score    INT DEFAULT 0,
  team_b_score    INT DEFAULT 0,
  winner_id       UUID REFERENCES teams(id),
  is_completed    BOOLEAN DEFAULT FALSE,

  team_a_reported_winner UUID REFERENCES teams(id),
  team_b_reported_winner UUID REFERENCES teams(id),
  is_disputed     BOOLEAN DEFAULT FALSE,

  is_losers_bracket BOOLEAN DEFAULT FALSE,

  scheduled_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE match_games (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  game_number     INT NOT NULL,
  winner_id       UUID REFERENCES teams(id),
  screenshot_urls TEXT[] DEFAULT '{}',
  duration        TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_matches_group ON matches(group_id);
CREATE INDEX idx_match_games_match ON match_games(match_id);

-- RLS
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Matches viewable" ON matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Organizers can create matches" ON matches FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));

-- Captains can update matches they're involved in (for reporting), or organizers
CREATE POLICY "Captains and organizers can update matches" ON matches FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true)
    OR EXISTS (
      SELECT 1 FROM teams
      WHERE (teams.id = matches.team_a_id OR teams.id = matches.team_b_id)
      AND teams.captain_id = auth.uid()
    )
  );

CREATE POLICY "Match games viewable" ON match_games FOR SELECT TO authenticated USING (true);

-- Captains of involved teams or organizers can manage match games
CREATE POLICY "Captains and organizers manage match games" ON match_games FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true)
    OR EXISTS (
      SELECT 1 FROM matches
      JOIN teams ON (teams.id = matches.team_a_id OR teams.id = matches.team_b_id)
      WHERE matches.id = match_games.match_id AND teams.captain_id = auth.uid()
    )
  );
