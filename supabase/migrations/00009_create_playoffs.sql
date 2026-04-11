CREATE TABLE playoff_bracket_slots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id        UUID REFERENCES matches(id),
  position        TEXT NOT NULL,
  round           INT NOT NULL,
  slot_index      INT NOT NULL,
  is_losers_bracket BOOLEAN DEFAULT FALSE,
  next_slot_id    UUID REFERENCES playoff_bracket_slots(id),
  loser_slot_id   UUID REFERENCES playoff_bracket_slots(id),

  UNIQUE(tournament_id, position)
);

CREATE TABLE tournament_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID UNIQUE NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  first_place_id  UUID REFERENCES teams(id),
  second_place_id UUID REFERENCES teams(id),
  third_place_id  UUID REFERENCES teams(id),
  mvp_user_id     UUID REFERENCES profiles(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE playoff_bracket_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bracket slots viewable" ON playoff_bracket_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Organizers manage bracket slots" ON playoff_bracket_slots FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));

CREATE POLICY "Results viewable" ON tournament_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Organizers manage results" ON tournament_results FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_organizer = true));
