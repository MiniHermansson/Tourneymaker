-- Each captain reports the full score line (team_a wins, team_b wins)
ALTER TABLE matches ADD COLUMN team_a_reported_score_a INT DEFAULT NULL;
ALTER TABLE matches ADD COLUMN team_a_reported_score_b INT DEFAULT NULL;
ALTER TABLE matches ADD COLUMN team_b_reported_score_a INT DEFAULT NULL;
ALTER TABLE matches ADD COLUMN team_b_reported_score_b INT DEFAULT NULL;
