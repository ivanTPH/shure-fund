-- 023_stage_comments.sql
-- Internal notes / comments on payment stages
-- Visible to all project members; useful for approval chain discussion

CREATE TABLE IF NOT EXISTS stage_comments (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id   uuid NOT NULL REFERENCES contract_stages(id) ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES users(id),
  content    text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stage_comments_stage_id   ON stage_comments(stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_comments_created_at ON stage_comments(created_at DESC);

ALTER TABLE stage_comments ENABLE ROW LEVEL SECURITY;

-- Project members can read comments on stages belonging to their projects
CREATE POLICY "stage_comments_read" ON stage_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM contract_stages cs
      JOIN contracts      c  ON c.id = cs.contract_id
      JOIN project_members pm ON pm.project_id = c.project_id
      WHERE cs.id = stage_comments.stage_id
        AND pm.user_id = auth.uid()
    )
  );

-- Any project member can post a comment
CREATE POLICY "stage_comments_insert" ON stage_comments
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM contract_stages cs
      JOIN contracts       c  ON c.id = cs.contract_id
      JOIN project_members pm ON pm.project_id = c.project_id
      WHERE cs.id = stage_comments.stage_id
        AND pm.user_id = auth.uid()
    )
  );

-- Authors can delete their own comments; admins can delete any
CREATE POLICY "stage_comments_delete" ON stage_comments
  FOR DELETE USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
