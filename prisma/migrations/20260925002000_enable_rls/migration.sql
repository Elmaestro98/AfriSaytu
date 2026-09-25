-- Enable Row Level Security on every table, with NO policy.
--
-- Supabase exposes the "public" schema through a public REST API. Without RLS, anyone holding
-- the project's public key could read or write these tables. With RLS enabled and no policy,
-- that API is denied by default.
--
-- The application is not affected: it connects with the "postgres" role, which bypasses RLS.
-- FORCE ROW LEVEL SECURITY is deliberately NOT used, for that same reason.
--
-- To revert one table: ALTER TABLE "<Table>" DISABLE ROW LEVEL SECURITY;

ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Branch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Member" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MemberBranch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OperatorCatalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrgOperator" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LedgerEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InternalMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommissionRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyClosing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClosingLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Prisma's own bookkeeping table is exposed by the same API.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
