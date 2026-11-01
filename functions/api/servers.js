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

  const base = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = env.SUPABASE_ANON_KEY || "";
  if (!base || !key) return json({ error: "backend_not_configured" }, 503);

  let userResponse;
  try {
    userResponse = await fetch(base + "/auth/v1/user", {
      headers: { apikey: key, Authorization: "Bearer " + token, Accept: "application/json" }
    });
  } catch {
    return json({ error: "auth_service_unavailable" }, 502);
  }
  if (!userResponse.ok) return json({ error: "unauthorized" }, 401);
  const user = await userResponse.json();
  if (!user?.id) return json({ error: "unauthorized" }, 401);

  let profileResponse;
  try {
    profileResponse = await fetch(
      base + "/rest/v1/profiles?id=eq." + encodeURIComponent(user.id) + "&select=role,is_active&limit=1",
      { headers: { apikey: key, Authorization: "Bearer " + token, Accept: "application/json" } }
    );
  } catch {
    return json({ error: "profile_service_unavailable" }, 502);
  }
  if (!profileResponse.ok) return json({ error: "role_lookup_failed" }, 503);
  const profiles = await profileResponse.json();
  const profile = Array.isArray(profiles) ? profiles[0] : null;
  if (profile?.role !== "admin" || profile?.is_active !== true) {
    return json({ error: "forbidden" }, 403);
  }

  let serversResponse;
  try {
    serversResponse = await fetch(
      base + "/rest/v1/servers?select=id,name,region,server_role,host,status,country_code,protocol,ip_address,domain,port,provisioning_state,health_status,is_enabled_for_new_users,is_default,priority,provider,operating_system,last_health_check_at,latency_ms,notes&order=priority.asc",
      { headers: { apikey: key, Authorization: "Bearer " + token, Accept: "application/json" } }
    );
  } catch {
    return json({ error: "servers_service_unavailable" }, 502);
  }
  if (!serversResponse.ok) return json({ error: "servers_lookup_failed" }, 503);
  return json({ ok: true, servers: await serversResponse.json() });
}
