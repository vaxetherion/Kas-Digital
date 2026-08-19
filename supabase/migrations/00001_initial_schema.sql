-- =============================================================================
-- MIMO 2.5 Kas Digital — Initial Schema
-- Run this migration in Supabase SQL Editor or via `supabase db push`
-- =============================================================================

-- ── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('admin', 'staff');
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');
CREATE TYPE transaction_status AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE backup_status AS ENUM ('pending', 'completed', 'failed');
CREATE TYPE attachment_type AS ENUM ('receipt', 'invoice', 'photo', 'document', 'other');

-- ── Table: users ─────────────────────────────────────────────────────────────

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id     BIGINT UNIQUE,
  telegram_username TEXT,
  email           TEXT UNIQUE,
  full_name       TEXT NOT NULL,
  avatar_url      TEXT,
  role            user_role NOT NULL DEFAULT 'staff',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE users IS 'Pengguna sistem, termasuk yang terhubung via Telegram';

-- ── Table: categories ────────────────────────────────────────────────────────

CREATE TABLE categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,
  description     TEXT,
  icon            TEXT,
  color           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE categories IS 'Kategori untuk mengelompokkan transaksi';

-- Seed default categories
INSERT INTO categories (name, description, icon, color, sort_order) VALUES
  ('Makan & Minum',      'Pengeluaran untuk makanan dan minuman',  '🍽️', '#ef4444', 1),
  ('Transportasi',       'Biaya transportasi dan perjalanan',      '🚗', '#f59e0b', 2),
  ('Belanja',            'Pembelian barang dan kebutuhan',         '🛒', '#8b5cf6', 3),
  ('Gaji & Bonus',       'Pemasukan dari gaji atau bonus',        '💰', '#10b981', 4),
  ('Operasional',        'Biaya operasional usaha',               '⚙️', '#6b7280', 5),
  ('Pemasukan Lainnya',  'Sumber pemasukan lain',                 '📈', '#06b6d4', 6);

-- ── Table: transactions ──────────────────────────────────────────────────────

CREATE TABLE transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
  type                transaction_type NOT NULL,
  status              transaction_status NOT NULL DEFAULT 'pending',
  amount              NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  description         TEXT NOT NULL,
  reference           TEXT,
  notes               TEXT,
  transaction_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE transactions IS 'Semua transaksi kas digital (pemasukan, pengeluaran, transfer)';

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX idx_transactions_status ON transactions(status);

-- ── Table: telegram_links ────────────────────────────────────────────────────

CREATE TABLE telegram_links (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  telegram_id           BIGINT NOT NULL UNIQUE,
  telegram_username     TEXT,
  chat_id               BIGINT NOT NULL,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  connected_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_interaction_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE telegram_links IS 'Pemetaan akun Telegram ke pengguna sistem';

-- ── Table: backups ───────────────────────────────────────────────────────────

CREATE TABLE backups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename        TEXT NOT NULL,
  file_size       BIGINT,
  status          backup_status NOT NULL DEFAULT 'pending',
  backup_type     TEXT NOT NULL DEFAULT 'full',
  notes           TEXT,
  error_message   TEXT,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE backups IS 'Riwayat backup data kas digital';

-- ── Table: attachments ───────────────────────────────────────────────────────

CREATE TABLE attachments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id      UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename            TEXT NOT NULL,
  original_filename   TEXT NOT NULL,
  file_size           BIGINT,
  mime_type           TEXT,
  attachment_type     attachment_type NOT NULL DEFAULT 'other',
  storage_path        TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE attachments IS 'Lampiran terkait transaksi (bukti, foto, dll)';

CREATE INDEX idx_attachments_transaction_id ON attachments(transaction_id);

-- ── Trigger: auto-update updated_at ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_categories
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_transactions
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Row Level Security (RLS) Policies
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- ── users ────────────────────────────────────────────────────────────────────

CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin can read all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can manage all users"
  ON users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── categories ───────────────────────────────────────────────────────────────

CREATE POLICY "Anyone authenticated can read active categories"
  ON categories FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can manage categories"
  ON categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── transactions ─────────────────────────────────────────────────────────────

CREATE POLICY "Users can read own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can read all transactions"
  ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can manage all transactions"
  ON transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── telegram_links ───────────────────────────────────────────────────────────

CREATE POLICY "Users can read own telegram links"
  ON telegram_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own telegram links"
  ON telegram_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own telegram links"
  ON telegram_links FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can manage all telegram links"
  ON telegram_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── backups ──────────────────────────────────────────────────────────────────

CREATE POLICY "Users can read own backups"
  ON backups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own backups"
  ON backups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can manage all backups"
  ON backups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── attachments ──────────────────────────────────────────────────────────────

CREATE POLICY "Users can read own attachments"
  ON attachments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read attachments of own transactions"
  ON attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = attachments.transaction_id
        AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own attachments"
  ON attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own attachments"
  ON attachments FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all attachments"
  ON attachments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );
