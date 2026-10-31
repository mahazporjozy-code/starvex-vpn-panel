# STARVEX NEXUS — Security Review & Release Notes

Review date: 2026-10-31

## Changes in this branch

- Replaced dashboard `select("*")` calls with explicit per-table column allowlists.
- Customer dashboard reads now omit email, notes, auth user IDs, and assignment internals.
- Subscription dashboard reads omit `subscription_token`.
- Table rendering continues to use DOM `textContent`, not HTML interpolation.
- Login and table-load errors shown to end users are now generic; detailed errors remain in the browser console for authorized troubleshooting.
- The dashboard only requests known table names and a fixed set of columns.

## Important findings requiring owner review

1. The `plans` table has an ALL policy whose condition compares the JWT email to the literal `ADMIN_EMAIL`. Replace this with the trusted `app_metadata.role = 'admin'` claim only after confirming that admin role assignment is restricted to trusted server-side code.
2. `plans` also has a public SELECT policy. Confirm that plan names/prices/status are intentionally public; otherwise narrow it.
3. The `create-customer` and `create-reseller` Edge Functions currently have platform JWT verification disabled. Both perform their own token validation in code, but enabling platform JWT verification and retaining server-side role checks is preferable after testing clients and deployment compatibility.
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
- No database schema, row data, policies, functions, or Auth settings were modified by this branch.

## Release safety

This branch intentionally changes only the root `index.html`. The root file is the repository's top-level entry point. The two nested HTML copies are legacy/alternate versions and were not changed because their deployment purpose has not yet been confirmed.

Do not merge this branch or treat the application as production-ready until the remaining findings are resolved and admin/reseller/customer access tests pass using separate test accounts.
