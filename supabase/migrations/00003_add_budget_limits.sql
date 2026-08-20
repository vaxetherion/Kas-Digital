-- =============================================================================
-- MIMO 2.5 Kas Digital — Add Budget Limits Table
-- Safe to re-run (uses IF NOT EXISTS)
-- =============================================================================

-- ── Table: budget_limits ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS budget_limits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  monthly_limit   NUMERIC(15,2) NOT NULL CHECK (monthly_limit > 0),
  alert_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.80,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id)
);

COMMENT ON TABLE budget_limits IS 'Batas anggaran bulanan per kategori untuk monitoring pengeluaran';

CREATE INDEX IF NOT EXISTS idx_budget_limits_user_id ON budget_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_limits_category_id ON budget_limits(category_id);

-- ── Trigger ───────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS set_updated_at_budget_limits ON budget_limits;

CREATE TRIGGER set_updated_at_budget_limits
  BEFORE UPDATE ON budget_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS Policies ──────────────────────────────────────────────────────────

ALTER TABLE budget_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own budget limits" ON budget_limits;
DROP POLICY IF EXISTS "Users can insert own budget limits" ON budget_limits;
DROP POLICY IF EXISTS "Users can update own budget limits" ON budget_limits;
DROP POLICY IF EXISTS "Users can delete own budget limits" ON budget_limits;
DROP POLICY IF EXISTS "Admin can manage all budget limits" ON budget_limits;

CREATE POLICY "Users can read own budget limits"
  ON budget_limits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budget limits"
  ON budget_limits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budget limits"
  ON budget_limits FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own budget limits"
  ON budget_limits FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all budget limits"
  ON budget_limits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );
