const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, max-age=0",
    "x-content-type-options": "nosniff"
  }
});

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function onRequestPost({ request, env }) {
  if (!env.SERVER_STATE || !env.SERVER_AGENT_TOKENS) {
    return json({ error: "agent_backend_not_configured" }, 503);
  }

  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return json({ error: "unauthorized" }, 401);

  let raw;
  try {
    raw = await request.text();
    if (raw.length > 4096) return json({ error: "payload_too_large" }, 413);
  } catch {
    return json({ error: "invalid_request" }, 400);
  }

  let body;
  let tokenMap;
  try {
    body = JSON.parse(raw);
    tokenMap = JSON.parse(env.SERVER_AGENT_TOKENS);
  } catch {
    return json({ error: "invalid_payload_or_agent_configuration" }, 400);
  }

  const serverId = typeof body.server_id === "string" ? body.server_id : "";
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(serverId)) return json({ error: "invalid_server_id" }, 400);
  if (!tokenMap || typeof tokenMap !== "object" ||
      !Object.prototype.hasOwnProperty.call(tokenMap, serverId)) {
    return json({ error: "unauthorized" }, 401);
  }
  const expectedToken = tokenMap[serverId];
  if (typeof expectedToken !== "string" || expectedToken.length < 32 ||
      expectedToken.length > 256 || !safeEqual(token, expectedToken)) {
    return json({ error: "unauthorized" }, 401);
  }

  const metrics = body.metrics || {};
  const values = ["cpu", "memory", "disk"];
  const clean = {};
  for (const key of values) {
    const value = metrics[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
      return json({ error: "invalid_metrics" }, 400);
    }
    clean[key] = Math.round(value * 10) / 10;
  }

  const state = {
    server_id: serverId,
    metrics: clean,
    received_at: new Date().toISOString(),
    agent_version: typeof body.agent_version === "string" ? body.agent_version.slice(0, 30) : "unknown"
  };

  try {
    await env.SERVER_STATE.put("server:" + serverId, JSON.stringify(state), { expirationTtl: 300 });
  } catch {
    return json({ error: "state_store_unavailable" }, 503);
  }
  return json({ ok: true, accepted: true, received_at: state.received_at });
}

export async function onRequestGet() {
  return json({ error: "method_not_allowed" }, 405);
}
