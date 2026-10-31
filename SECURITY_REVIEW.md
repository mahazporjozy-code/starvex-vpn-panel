# STARVEX NEXUS — Security Review & Release Notes

Review date: 2026-10-31

## Scope

This review covers the root `index.html` dashboard and the Supabase database / Edge Function changes recorded for 2026-10-31. It is not a production security certification or an end-to-end acceptance test.

## GitHub dashboard changes in this branch

- Replaced wildcard dashboard table reads with fixed per-table column allowlists.
- Customer list omits email, notes, auth user identifiers, and other internal assignment fields.
- Subscription list omits `subscription_token`.
- Dashboard rendering uses DOM `textContent`, not HTML string interpolation.
- The browser only requests a fixed set of known table names and selected columns.
- Login and table-load errors shown in the interface are generic; technical table-load details are logged to the browser console.
- Role gating reads the trusted `app_metadata.role` claim. Admin-only navigation and views are hidden for reseller accounts; database RLS remains the actual data-access boundary.
- Added the STARVEX NEXUS dragon hero banner above the dashboard overview. The image asset is referenced at `nexus/assets/file_00000000b1f4820c901f9e6629678079.png`.
- Preserved the customer creation requirements: no phone-number field and no multi-messaging-account setup in the customer flow.
- Current dashboard scope is primarily read-only for customers, servers, and subscriptions. Full create/edit/delete workflows for those areas are not implemented in this PR. Reseller creation and reseller-capacity controls are present but have not been verified end-to-end.

## Supabase changes recorded as applied

- Migration `20261031110235_optimize_rls_policies_and_fk_indexes` rewrote ten RLS policies using scalar SELECT wrappers around stable auth helpers and added six foreign-key indexes: `orders.customer_id`, `orders.plan_id`, `resellers.created_by`, `subscriptions.plan_id`, `vpn_configs.server_id`, and `vpn_users.server_id`.
- Migration `20261031110412_revoke_unneeded_anon_and_trigger_privileges` revoked anonymous privileges from public tables except SELECT on the intentionally public `plans` catalog, revoked anonymous sequence privileges, removed unnecessary authenticated TRUNCATE/REFERENCES/TRIGGER privileges, and restricted execution of helper/trigger routines.
- The `plans` admin policy uses trusted `app_metadata.role = 'admin'`.
- All 15 reviewed public tables had RLS enabled after these changes. RLS is not FORCE-enabled; table-owner and service-role access are outside normal client RLS enforcement.
- The two SQL files under `database/applied/` are audit records of changes already applied; they are not a replacement migration history.

## Edge Function state recorded during review

- `create-customer`: version 7 ACTIVE, `verify_jwt=true`; validates the authenticated user and enforces reseller capacity.
- `configure-customer-accounts`: version 4 ACTIVE, `verify_jwt=true`; restricted to the admin role.
- `create-reseller`: version 2 ACTIVE, `verify_jwt=false`. It performs its own Bearer-token validation using `auth.getUser(token)` and requires `app_metadata.role === 'admin'`; the service-role key is server-side only. Because platform JWT verification is disabled and a POST/OPTIONS method guard has not been independently verified, this endpoint remains a release-hardening follow-up.
- Browser-facing Edge Functions were configured with the allowed origin `https://mahazporjozy-code.github.io`. If the deployed origin changes, update and verify CORS for every browser-facing function.
- Rate limiting / abuse controls for account creation remain to be assessed.

## Verification performed

- The PR branch root HTML was fetched from GitHub.
- The embedded JavaScript passed a JavaScript syntax parse.
- Static checks confirmed the fixed table allowlist, trusted app-metadata role check, dragon banner markup and asset path, and absence of a phone input or customer multi-account setup UI.
- The PR branch references the existing dragon image asset in `nexus/assets/`.
- Database role simulations previously showed admin visibility of the expected operational tables and reseller isolation from admin-only server/config/user tables. These are database simulations, not full browser/API tests.
- An admin login to the deployed panel was previously observed. Separate full end-to-end tests of reseller login, reseller creation, capacity updates, customer creation, and admin-only operations remain incomplete.
- GitHub Pages previously had a successful deployment from `main`; publication of this PR branch must be confirmed by a new deployment run and a live browser check after merge.

## Remaining production sign-off items

1. Review `create-reseller` platform JWT verification and HTTP method handling. Do not rely solely on frontend role hiding.
2. Confirm Supabase leaked-password protection is enabled in Auth settings.
3. Add or verify rate limiting and abuse monitoring for account-creation endpoints.
4. Review the two tables without primary keys (`test_starvex` and `subscription_servers`) before making schema changes.
5. Review multiple permissive RLS policies for intended access behavior; do not remove overlapping policies without tests.
6. Review unused-index notices before dropping any index.
7. Map dependencies among legacy/parallel objects (`representatives` / `resellers`, `vpn_servers` / `servers`, and `starvex_plans` / `plans`) before retiring anything.
8. Complete separate admin and reseller browser/API acceptance tests.
9. Implement and test full customer, server, and subscription CRUD workflows before describing those modules as complete.

## Release statement

This PR hardens the dashboard's data reads and adds the dragon banner. It does not complete every operational workflow and is not, by itself, evidence that the whole application is production-ready. Existing customer records were not deleted by the recorded migrations.
