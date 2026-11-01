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

  // Restrict this endpoint to the verified primary administrator account.
  // This avoids depending on client-readable profile rows for privileged access.
  const adminEmail = "mahazporjozy@gmail.com";
  if ((user.email || "").toLowerCase() !== adminEmail || !user.email_confirmed_at) {
    return { error: "forbidden", status: 403 };
  }
  return { user };
}

export async function onRequestGet({ request, env }) {
  const authResult = await getAdminUser(request, env);
  if (authResult.error) return json({ error: authResult.error }, authResult.status);

  return json({
    ok: true,
    authorized: true,
    connected: false,
    state: "awaiting_vps",
    metrics: { cpu: null, memory: null, disk: null },
    message: "VPS has not been provisioned."
  });
}
