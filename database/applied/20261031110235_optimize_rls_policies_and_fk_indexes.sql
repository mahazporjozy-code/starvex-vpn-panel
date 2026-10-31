-- Applied to Supabase project hbjonoxlasbhbusctmom on 2026-10-31.
-- This repository copy is an audit record, not a replacement for Supabase's migration history.
-- Authorization semantics are unchanged; auth.jwt()/auth.uid() calls are cached per statement.

drop policy if exists "Only admin can manage customer accounts" on public.customer_accounts;
create policy "Only admin can manage customer accounts" on public.customer_accounts
for all to authenticated
using ((select auth.jwt())->'app_metadata'->>'role' = 'admin')
with check ((select auth.jwt())->'app_metadata'->>'role' = 'admin');

drop policy if exists "Customers can view own profile" on public.customers;
create policy "Customers can view own profile" on public.customers
for select to authenticated
using (auth_user_id = (select auth.uid()) and (select auth.jwt())->'app_metadata'->>'role' = 'customer');

drop policy if exists "Only admin can manage customers" on public.customers;
create policy "Only admin can manage customers" on public.customers
for all to authenticated
using ((select auth.jwt())->'app_metadata'->>'role' = 'admin')
with check ((select auth.jwt())->'app_metadata'->>'role' = 'admin');

drop policy if exists "Only admin can view plans" on public.plans;
create policy "Only admin can view plans" on public.plans
for select to authenticated
using ((select auth.jwt())->'app_metadata'->>'role' = 'admin');

drop policy if exists "Only admin can manage plans" on public.plans;
create policy "Only admin can manage plans" on public.plans
for all to authenticated
using ((select auth.jwt())->'app_metadata'->>'role' = 'admin')
with check ((select auth.jwt())->'app_metadata'->>'role' = 'admin');

drop policy if exists "Only admin can manage resellers" on public.resellers;
create policy "Only admin can manage resellers" on public.resellers
for all to authenticated
using ((select auth.jwt())->'app_metadata'->>'role' = 'admin')
with check ((select auth.jwt())->'app_metadata'->>'role' = 'admin');

drop policy if exists "Admin full access to servers" on public.servers;
create policy "Admin full access to servers" on public.servers
for all to authenticated
using ((select auth.jwt())->'app_metadata'->>'role' = 'admin')
with check ((select auth.jwt())->'app_metadata'->>'role' = 'admin');

drop policy if exists "Only admin can manage subscriptions" on public.subscriptions;
create policy "Only admin can manage subscriptions" on public.subscriptions
for all to authenticated
using ((select auth.jwt())->'app_metadata'->>'role' = 'admin')
with check ((select auth.jwt())->'app_metadata'->>'role' = 'admin');

drop policy if exists "Only admin can manage VPN configs" on public.vpn_configs;
create policy "Only admin can manage VPN configs" on public.vpn_configs
for all to authenticated
using ((select auth.jwt())->'app_metadata'->>'role' = 'admin')
with check ((select auth.jwt())->'app_metadata'->>'role' = 'admin');

drop policy if exists "Admin full access to VPN servers" on public.vpn_servers;
create policy "Admin full access to VPN servers" on public.vpn_servers
for all to authenticated
using ((select auth.jwt())->'app_metadata'->>'role' = 'admin')
with check ((select auth.jwt())->'app_metadata'->>'role' = 'admin');

drop policy if exists "Only admin can manage VPN users" on public.vpn_users;
create policy "Only admin can manage VPN users" on public.vpn_users
for all to authenticated
using ((select auth.jwt())->'app_metadata'->>'role' = 'admin')
with check ((select auth.jwt())->'app_metadata'->>'role' = 'admin');

create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists orders_plan_id_idx on public.orders(plan_id);
create index if not exists resellers_created_by_idx on public.resellers(created_by);
create index if not exists subscriptions_plan_id_idx on public.subscriptions(plan_id);
create index if not exists vpn_configs_server_id_idx on public.vpn_configs(server_id);
create index if not exists vpn_users_server_id_idx on public.vpn_users(server_id);
