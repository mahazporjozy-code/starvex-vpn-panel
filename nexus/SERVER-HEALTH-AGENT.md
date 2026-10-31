# STARVEX NEXUS — Secure Server Health Agent

## Current status
- Edge Function: `server-health-agent`
- Status: ACTIVE
- JWT platform verification: disabled intentionally; the function performs its own authentication.
- Health endpoint: `https://hbjonoxlasbhbusctmom.supabase.co/functions/v1/server-health-agent`
- No server-agent token has been issued yet.
- No VPS is currently connected. The three server records remain planned/unprovisioned.

## Security design
- Each installed server receives its own random, high-entropy bearer token.
- Only the SHA-256 hash is stored in `public.servers.api_secret_ref`; the raw token is returned once at issuance.
- A token is accepted only for the server record to which its hash belongs.
- Reports do not accept a caller-supplied server ID; the server identity is resolved from the token.
- The endpoint accepts only `healthy`, `unhealthy`, or `maintenance`, an optional bounded latency, a short details field, and a recent timestamp.
- Health writes use the existing service-role-only `record_server_health_check` database function.
- The service-role key is used only inside Supabase Edge Function secrets and must never be placed in the browser, GitHub, or on the server agent.
- Issuing a replacement token rotates the previous token immediately.

## Issuing a token (only after a server is installed)
Send an authenticated administrator request to the endpoint with:
```json
{
  "action": "issue-agent-token",
  "server_id": "THE_SERVER_UUID"
}
```
Use the administrator's current Supabase access token in the Authorization Bearer header. The server must have `provisioning_state` equal to `installed` or `ready`. The response contains `agent_token` once. Store it only in that server's protected environment. Do not paste it into chat, GitHub, or a public configuration file.

## Health report format
The future agent sends a POST request with its own token in the Authorization Bearer header:
```json
{
  "health_status": "healthy",
  "latency_ms": 42,
  "details": "health checks passed",
  "sent_at": "CURRENT_UTC_ISO_TIMESTAMP"
}
```
The timestamp must be recent (within three minutes, with a one-minute future allowance). The function resolves the server from the token and records the report. The agent must not send a server ID or any Supabase service-role credential.

## Still required before production
1. Provision a real VPS.
2. Install and harden the intended server software.
3. Set its database record to `installed` only after installation has been verified.
4. Issue that server's individual agent token from an authenticated administrator session.
5. Install a small health reporter that sends the format above over HTTPS.
6. Test healthy, unhealthy, expired-token, and rotated-token cases.
7. Only after successful checks, mark the server `ready` and enable it for new assignments.

This function is only the secure reporting endpoint. It does not provision VPS instances, install server software, or automatically migrate existing customers.
