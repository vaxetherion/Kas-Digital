// =============================================================================
// MIMO 2.5 Kas Digital — Database Types
// Auto-generated from Supabase schema. Re-run `supabase gen types typescript`
// after schema changes to keep this in sync.
// =============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---------------------------------------------------------------------------
// Enum types
// ---------------------------------------------------------------------------

export type UserRole = "admin" | "staff";
export type TransactionType = "income" | "expense" | "transfer";
export type TransactionStatus = "pending" | "confirmed" | "cancelled";
export type BackupStatus = "pending" | "completed" | "failed";
export type AttachmentType =
  | "receipt"
  | "invoice"
  | "photo"
  | "document"
  | "other";

// ---------------------------------------------------------------------------
// Table: users
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  telegram_id: number | null;
  telegram_username: string | null;
  email: string | null;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Table: categories
// ---------------------------------------------------------------------------

export interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Table: transactions
// ---------------------------------------------------------------------------

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  description: string;
  reference: string | null;
  notes: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Table: telegram_links
// ---------------------------------------------------------------------------

export interface TelegramLink {
  id: string;
  user_id: string;
  telegram_id: number;
  telegram_username: string | null;
  chat_id: number;
  is_active: boolean;
  connected_at: string;
  last_interaction_at: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Table: backups
// ---------------------------------------------------------------------------

export interface Backup {
  id: string;
  user_id: string;
  filename: string;
  file_size: number | null;
  status: BackupStatus;
  backup_type: string;
  notes: string | null;
  error_message: string | null;
  completed_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Table: attachments
// ---------------------------------------------------------------------------

export interface Attachment {
  id: string;
  transaction_id: string;
  user_id: string;
  filename: string;
  original_filename: string;
  file_size: number | null;
  mime_type: string | null;
  attachment_type: AttachmentType;
  storage_path: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Database interface (Supabase-compatible)
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<User, "id" | "created_at">>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Category, "id" | "created_at">>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Transaction, "id" | "created_at">>;
      };
      telegram_links: {
        Row: TelegramLink;
        Insert: Omit<TelegramLink, "created_at"> & {
          created_at?: string;
        };
        Update: Partial<Omit<TelegramLink, "id" | "created_at">>;
      };
      backups: {
        Row: Backup;
        Insert: Omit<Backup, "created_at"> & {
          created_at?: string;
        };
        Update: Partial<Omit<Backup, "id" | "created_at">>;
      };
      attachments: {
        Row: Attachment;
        Insert: Omit<Attachment, "created_at"> & {
          created_at?: string;
        };
        Update: Partial<Omit<Attachment, "id" | "created_at">>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      transaction_type: TransactionType;
      transaction_status: TransactionStatus;
      backup_status: BackupStatus;
      attachment_type: AttachmentType;
    };
  };
}
