# STARVEX NEXUS — Security Review & Release Notes

Review date: 2026-10-31

## Changes in this branch

- Replaced dashboard `select("*")` calls with explicit per-table column allowlists.
- Customer dashboard reads now omit email, notes, auth user IDs, and assignment internals.
- Subscription dashboard reads omit `subscription_token`.
- Table rendering continues to use DOM `textContent`, not HTML interpolation.
- Login and table-load errors shown to end users are now generic; detailed errors remain in the browser console for authorized troubleshooting.
- The dashboard only requests known table names and a fixed set of columns.

## Changes applied directly to Supabase

- Migration `20261031110235_optimize_rls_policies_and_fk_indexes` applied successfully.
- Updated ten RLS policies to wrap stable `auth.jwt()` / `auth.uid()` calls in scalar SELECTs, preserving the original authorization predicates while addressing the RLS initialization-plan performance warning.
- Added six indexes for foreign keys flagged by the performance advisor: orders.customer_id, orders.plan_id, resellers.created_by, subscriptions.plan_id, vpn_configs.server_id, vpn_users.server_id.
- Re-ran the Performance Advisor: the unindexed-foreign-key and auth-RLS-initplan findings no longer appear. Remaining findings are two tables without primary keys, unused-index notices, and multiple permissive policy notices.
- Deployed `create-customer` version 6 with platform JWT verification enabled. It now reads the reseller's configured `max_customers` value instead of assuming 200; the database trigger remains the concurrency-safe capacity enforcement.

## Important findings requiring owner review

1. FIXED in Supabase on 2026-10-31: the `plans` ALL policy now checks the trusted `app_metadata.role = 'admin'` claim, matching the other admin policies. The policy was re-read after the change to verify the condition.
2. `plans` also has a public SELECT policy. Confirm that plan names/prices/status are intentionally public; otherwise narrow it.
3. `create-customer` now has platform JWT verification enabled (version 6) and retains its own authenticated-user validation. `create-reseller` still has platform JWT verification disabled, but it validates the bearer token with `auth.getUser(token)` and requires `app_metadata.role = 'admin'`; enabling platform verification remains a follow-up.
4. Edge Function CORS currently allows all origins. Restrict browser-facing functions to the actual STARVEX NEXUS origin(s), while retaining required preflight headers.
5. Add rate limiting / abuse controls to account-creation endpoints and monitor failed attempts.
6. The `configure-customer-accounts` function contains fixed account identifiers and email addresses. Keep it unavailable to ordinary users, review whether it is still needed, and remove it only after confirming no operational dependency.
7. The database contains parallel/legacy objects (`representatives` vs `resellers`, `vpn_servers` vs `servers`, `starvex_plans` vs `plans`). Do not drop or merge them until foreign keys, triggers, views, Edge Functions, and existing rows have been mapped.
8. The SQL function `get_customer_code(bigint)` and `nexus_assign_customer_code()` currently allow EXECUTE to anon. Review their definitions and revoke public execution if they expose or mutate customer data.
9. Enable Supabase leaked-password protection in Auth settings.

## Database observations

- RLS is enabled on the reviewed public tables.
- Current policies cover customer self-read, reseller-scoped customer reads, and admin-only management for sensitive operational tables.
- The `plans` policy using the `ADMIN_EMAIL` placeholder is inconsistent with the other role-based policies.
- `test_starvex` and `subscription_servers` do not show a primary key in the inspected schema. Confirm intended key design before changing either table.
- Live Supabase changes include the `plans` policy correction, RLS policy performance rewrites, six FK indexes, and `create-customer` function version 6. No customer records were deleted or modified.

## Release safety

This branch intentionally changes only the root `index.html`. The root file is the repository's top-level entry point. The two nested HTML copies are legacy/alternate versions and were not changed because their deployment purpose has not yet been confirmed.

Do not merge this branch or treat the application as production-ready until the remaining findings are resolved and admin/reseller/customer access tests pass using separate test accounts.


## Still pending before production sign-off

- Restrict wildcard CORS origins on browser-facing Edge Functions after confirming the exact production origin(s); do not guess a custom domain.
- Add abuse/rate limiting to account-creation endpoints.
- Enable leaked-password protection in Supabase Auth if the project plan supports it; this is an Auth dashboard setting and was not changed by the database migration.
- Decide primary-key design for empty `test_starvex` and `subscription_servers` only after confirming whether these are legacy objects or active features.
- Review duplicate permissive policies for correctness and performance; do not remove overlapping policies until access tests prove the intended admin/customer/reseller paths.
- Review and possibly retire the legacy `representatives`, `vpn_servers`, and `starvex_plans` structures only after mapping every dependency.
- Test login, customer creation, reseller capacity enforcement, reseller tree visibility, and admin-only server/config/subscription access with separate test accounts.
