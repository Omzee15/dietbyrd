-- Migration 022: reviews.is_featured
-- The admin "feature review" endpoint (PATCH /api/admin/reviews/:id/feature)
-- has always lazily added this column via ALTER TABLE ADD COLUMN IF NOT EXISTS
-- on first use, but the two read-only endpoints (GET /api/reviews, the public
-- reviews page, and GET /api/admin/reviews, the admin dashboard) reference
-- r.is_featured unconditionally and have no such guard. On a database where
-- no admin has ever used the feature-toggle yet, the column genuinely does
-- not exist, and both read endpoints 500 on every call ("column
-- r.is_featured does not exist"). This formalizes the column as a real,
-- tracked migration instead of leaving it to only exist as a side effect of
-- an unrelated write endpoint having been hit once. Safe to run even if the
-- column already exists (idempotent).

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
