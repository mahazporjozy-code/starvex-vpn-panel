# STARVEX NEXUS

## Server management backend

Cloudflare Pages Functions are deployed from the `functions/` directory. The admin-only status endpoint is:

- `GET /api/server/status`
- Requires `Authorization: Bearer <Supabase access token>`
- Verifies the token against Supabase Auth and requires `app_metadata.role === "admin"`.
- Returns an offline/awaiting-VPS status. It does not execute shell commands or connect to SSH.

### Cloudflare Pages environment variables

In Cloudflare Dashboard → Workers & Pages → starvex-vpn-panel → Settings → Variables and Secrets, add these for Production (and Preview if you use preview deployments):

- `SUPABASE_URL`: the Supabase project URL.
- `SUPABASE_ANON_KEY`: the Supabase publishable/anon key.

These values are used only by the Pages Function to ask Supabase Auth to validate the signed-in user. Never add a Supabase service-role key, SSH private key, VPS password, or server-agent secret to the frontend or GitHub repository.

After adding variables, trigger a new deployment.

### Security status and next step

The web terminal is intentionally disabled. Do not expose a general-purpose shell over a public browser endpoint. Before connecting a VPS, deploy a small server-side agent reachable only through a private authenticated channel (for example, Cloudflare Tunnel with Access service authentication). Start with read-only health metrics and a strict allowlist of administrative actions. Keep SSH credentials and agent secrets on the VPS/server side, and audit every privileged action.
