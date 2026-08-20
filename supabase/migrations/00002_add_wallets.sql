-- =============================================================================
-- MIMO 2.5 Kas Digital — Add Wallets Table + Transaction Wallet Columns
-- Safe to re-run (uses IF NOT EXISTS)
-- =============================================================================

-- ── Enum: wallet_type ──────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_type') THEN
    CREATE TYPE wallet_type AS ENUM ('cash', 'bank', 'ewallet', 'other');
  END IF;
END $$;

-- ── Table: wallets ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wallets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            wallet_type NOT NULL DEFAULT 'cash',
  icon            TEXT,
  color           TEXT,
  balance         NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

COMMENT ON TABLE wallets IS 'Sumber dana / rekening pengguna (tunai, bank, e-wallet)';

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

-- Seed default wallets for existing users (only if not exist)
INSERT INTO wallets (user_id, name, type, icon, color, balance, sort_order)
SELECT id, 'Tunai', 'cash', '💵', '#3b82f6', 0, 0
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM wallets WHERE wallets.user_id = auth.users.id AND wallets.name = 'Tunai'
)
ON CONFLICT (user_id, name) DO NOTHING;

-- ── Update transactions table ──────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'wallet_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'to_wallet_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN to_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);

-- ── Trigger for wallets ────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS set_updated_at_wallets ON wallets;

CREATE TRIGGER set_updated_at_wallets
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS Policies ──────────────────────────────────────────────────────────

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can insert own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can update own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can delete own wallets" ON wallets;
DROP POLICY IF EXISTS "Admin can manage all wallets" ON wallets;

CREATE POLICY "Users can read own wallets"
  ON wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallets"
  ON wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallets"
  ON wallets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own wallets"
  ON wallets FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all wallets"
  ON wallets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );
