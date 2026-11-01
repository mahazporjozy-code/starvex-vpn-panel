# STARVEX NEXUS — read-only VPS Agent

This agent reports CPU, memory and root-disk utilization to Cloudflare Pages.
It has **no shell, SSH listener, command execution, file upload, or remote-control feature**.

## Cloudflare Pages setup

1. In the Cloudflare dashboard, open **Workers & Pages → starvex-vpn-panel → Settings → Bindings**.
2. Add a **KV namespace** binding named exactly `SERVER_STATE`. Create a namespace such as `starvex-server-state` first if needed.
3. Add a secret environment variable named `SERVER_AGENT_TOKENS`. Its value must be a JSON object mapping each server ID to a unique, high-entropy token, for example:
   `{"YOUR_SERVER_ID":"PASTE_A_UNIQUE_RANDOM_SECRET_HERE"}`
4. Add the same binding and secret to both Production and Preview only if Preview is intentionally used. Prefer Production only.
5. Save and trigger a new deployment. Do not put the token in GitHub, browser JavaScript, a URL, or a screenshot.

The server ID must match the ID of the corresponding row in the `servers` table. Use a unique token per server. Keep a secure offline copy so it can be rotated.

## VPS setup (after a VPS has been provisioned)

Copy `agent.py` to the VPS over a trusted administrative channel. It uses Python 3 standard-library modules only and reads Linux metrics from `/proc` and disk usage from the root filesystem.

Set these environment variables in a root-readable service environment file (permissions 600):

- `STARVEX_HEARTBEAT_URL=https://starvex-vpn-panel.pages.dev/api/server/agent/heartbeat`
- `STARVEX_SERVER_ID=YOUR_SERVER_ID`
- `STARVEX_AGENT_TOKEN=THE_MATCHING_UNIQUE_TOKEN`
- Optional: `STARVEX_INTERVAL_SECONDS=30`

Run the script under a dedicated unprivileged account. Do not run it as root. Restrict outbound networking to HTTPS (TCP 443) to the panel domain. Keep the host firewall enabled. The agent should be supervised by systemd after the initial manual test.

## API behavior

- `POST /api/server/agent/heartbeat`: bearer-token authenticated, accepts only server ID and three percentages (0–100), maximum request body 4 KiB.
- `GET /api/server/status`: requires the verified primary-admin Supabase session; reads the latest KV heartbeat.
- A heartbeat is considered connected for 90 seconds. KV records expire after 5 minutes.
- The status card currently reports the first heartbeat record. The multi-server inventory endpoint remains separate.

## Security notes

This is a telemetry-only first stage. It does not provision VPN users, alter firewall rules, create tunnels, run shell commands, or accept arbitrary commands. Do not add a remote shell endpoint. Rotate a server token immediately if it is exposed.
