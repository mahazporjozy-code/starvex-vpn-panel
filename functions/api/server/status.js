const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, max-age=0",
    "x-content-type-options": "nosniff"
  }
});

async function getAdminUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return { error: "unauthorized", status: 401 };

  const base = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = env.SUPABASE_ANON_KEY || "";
  if (!base || !key) return { error: "backend_not_configured", status: 503 };

  let response;
  try {
    response = await fetch(base + "/auth/v1/user", {
      headers: { apikey: key, Authorization: "Bearer " + token, Accept: "application/json" }
    });
  } catch {
    return { error: "auth_service_unavailable", status: 502 };
  }
  if (!response.ok) return { error: "unauthorized", status: 401 };

  const user = await response.json();
  if (!user?.id) return { error: "unauthorized", status: 401 };

  if ((user.email || "").toLowerCase() !== "mahazporjozy@gmail.com" || !user.email_confirmed_at) {
    return { error: "forbidden", status: 403 };
  }
  return { user };
}

function cleanMetric(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100
    ? Math.round(value * 10) / 10
    : null;
}

export async function onRequestGet({ request, env }) {
  const authResult = await getAdminUser(request, env);
  if (authResult.error) return json({ error: authResult.error }, authResult.status);

  if (!env.SERVER_STATE) {
    return json({
      ok: true, authorized: true, connected: false, state: "awaiting_agent_setup",
      servers: [], connected_count: 0, total_agents: 0,
      metrics: { cpu: null, memory: null, disk: null },
      message: "Cloudflare server-state storage is not configured."
    });
  }

  let listed;
  try {
    listed = await env.SERVER_STATE.list({ prefix: "server:", limit: 1000 });
  } catch {
    return json({ error: "server_state_unavailable" }, 503);
  }

  const keys = (listed.keys || []).filter(item =>
    typeof item.name === "string" && /^server:[a-zA-Z0-9_-]{1,80}$/.test(item.name)
  );
  let records;
  try {
    records = await Promise.all(keys.map(async item => {
      const raw = await env.SERVER_STATE.get(item.name, "json");
      const serverId = item.name.slice("server:".length);
      const receivedAt = typeof raw?.received_at === "string" ? raw.received_at : null;
      const received = receivedAt ? Date.parse(receivedAt) : NaN;
      const ageSeconds = Number.isFinite(received)
        ? Math.max(0, (Date.now() - received) / 1000)
        : Infinity;
      const connected = ageSeconds <= 90;
      return {
        server_id: serverId,
        connected,
        state: connected ? "connected" : "agent_offline",
        last_seen_at: receivedAt,
        age_seconds: Number.isFinite(ageSeconds) ? Math.round(ageSeconds) : null,
        agent_version: typeof raw?.agent_version === "string" ? raw.agent_version.slice(0, 30) : "unknown",
        metrics: connected ? {
          cpu: cleanMetric(raw?.metrics?.cpu),
          memory: cleanMetric(raw?.metrics?.memory),
          disk: cleanMetric(raw?.metrics?.disk)
        } : { cpu: null, memory: null, disk: null }
      };
    }));
  } catch {
    return json({ error: "server_state_unavailable" }, 503);
  }

  records.sort((a, b) => a.server_id.localeCompare(b.server_id));
  const connected = records.filter(item => item.connected);
  const first = connected[0] || null;

  return json({
    ok: true,
    authorized: true,
    connected: connected.length > 0,
    state: connected.length ? "connected" : (records.length ? "agent_offline" : "awaiting_vps"),
    connected_count: connected.length,
    total_agents: records.length,
    checked_at: new Date().toISOString(),
    servers: records,
    metrics: first ? first.metrics : { cpu: null, memory: null, disk: null },
    message: connected.length
      ? "One or more VPS agents are reporting current heartbeats."
      : (records.length ? "No current VPS agent heartbeat." : "No VPS agent has sent a heartbeat.")
  });
}
