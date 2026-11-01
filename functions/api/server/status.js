const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, max-age=0",
    "x-content-type-options": "nosniff"
  }
});

export async function onRequestGet({ request, env }) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return json({ error: "unauthorized" }, 401);

  const supabaseUrl = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const supabaseKey = env.SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !supabaseKey) {
    return json({ error: "backend_not_configured" }, 503);
  }

  let userResponse;
  try {
    userResponse = await fetch(supabaseUrl + "/auth/v1/user", {
      method: "GET",
      headers: {
        "apikey": supabaseKey,
        "Authorization": "Bearer " + token,
        "Accept": "application/json"
      }
    });
  } catch {
    return json({ error: "auth_service_unavailable" }, 502);
  }

  if (!userResponse.ok) return json({ error: "unauthorized" }, 401);
  const user = await userResponse.json();
  if (!user || !user.id || user.app_metadata?.role !== "admin") {
    return json({ error: "forbidden" }, 403);
  }

  // VPS connectivity is intentionally not attempted until a server-side agent
  // and a private authenticated transport have been provisioned.
  return json({
    ok: true,
    authorized: true,
    connected: false,
    state: "awaiting_vps",
    metrics: { cpu: null, memory: null, disk: null },
    message: "VPS has not been provisioned."
  });
}
