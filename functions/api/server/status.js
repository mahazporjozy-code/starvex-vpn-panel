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

  // Temporary primary-admin allowlist until role-based authorization is migrated.
  const adminEmail = "mahazporjozy@gmail.com";
  if ((user.email || "").toLowerCase() !== adminEmail || !user.email_confirmed_at) {
    return { error: "forbidden", status: 403 };
  }
  return { user };
}

export async function onRequestGet({ request, env }) {
  const authResult = await getAdminUser(request, env);
  if (authResult.error) return json({ error: authResult.error }, authResult.status);

  if (!env.SERVER_STATE) {
    return json({
      ok: true,
      authorized: true,
      connected: false,
      state: "awaiting_agent_setup",
      metrics: { cpu: null, memory: null, disk: null },
      message: "Cloudflare server-state storage is not configured."
    });
  }

  // The first registered server is shown by this status card. Inventory remains
  // available through /api/servers; each agent writes only its own server key.
  let listed;
  try {
    listed = await env.SERVER_STATE.list({ prefix: "server:", limit: 1 });
  } catch {
    return json({ error: "server_state_unavailable" }, 503);
  }
  if (!listed.keys?.length) {
    return json({
      ok: true,
      authorized: true,
      connected: false,
      state: "awaiting_vps",
      metrics: { cpu: null, memory: null, disk: null },
      message: "VPS agent has not sent a heartbeat."
    });
  }

  let state;
  try {
    state = await env.SERVER_STATE.get(listed.keys[0].name, "json");
  } catch {
    return json({ error: "server_state_unavailable" }, 503);
  }
  const received = Date.parse(state?.received_at || "");
  const ageSeconds = Number.isFinite(received) ? Math.max(0, (Date.now() - received) / 1000) : Infinity;
  const connected = ageSeconds <= 90;

  return json({
    ok: true,
    authorized: true,
    connected,
    state: connected ? "connected" : "agent_offline",
    server_id: state?.server_id || null,
    last_seen_at: state?.received_at || null,
    metrics: connected ? state.metrics : { cpu: null, memory: null, disk: null },
    message: connected ? "VPS agent heartbeat is current." : "VPS agent heartbeat is stale."
  });
}
