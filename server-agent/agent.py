#!/usr/bin/env python3
"""STARVEX NEXUS read-only VPS metrics agent. No shell or remote command endpoint."""
import json
import os
import shutil
import time
import urllib.request
from pathlib import Path

API_URL = os.environ.get("STARVEX_HEARTBEAT_URL", "").strip()
SERVER_ID = os.environ.get("STARVEX_SERVER_ID", "").strip()
TOKEN = os.environ.get("STARVEX_AGENT_TOKEN", "")
INTERVAL = max(20, int(os.environ.get("STARVEX_INTERVAL_SECONDS", "30")))

def cpu_snapshot():
    fields = Path("/proc/stat").read_text().splitlines()[0].split()[1:]
    nums = [int(x) for x in fields]
    idle = nums[3] + (nums[4] if len(nums) > 4 else 0)
    return sum(nums), idle

def cpu_percent():
    first = cpu_snapshot()
    time.sleep(0.25)
    second = cpu_snapshot()
    total = second[0] - first[0]
    idle = second[1] - first[1]
    return round(100 * (1 - idle / total), 1) if total > 0 else 0.0

def memory_percent():
    info = {}
    for line in Path("/proc/meminfo").read_text().splitlines():
        key, value = line.split(":", 1)
        info[key] = int(value.strip().split()[0])
    total = info.get("MemTotal", 0)
    available = info.get("MemAvailable", info.get("MemFree", 0))
    return round(100 * (total - available) / total, 1) if total else 0.0

def disk_percent():
    usage = shutil.disk_usage("/")
    return round(100 * usage.used / usage.total, 1) if usage.total else 0.0

def send_heartbeat():
    payload = {
        "server_id": SERVER_ID,
        "agent_version": "1.0.0",
        "metrics": {
            "cpu": cpu_percent(),
            "memory": memory_percent(),
            "disk": disk_percent()
        }
    }
    request = urllib.request.Request(
        API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": "Bearer " + TOKEN,
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        method="POST"
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        if response.status != 200:
            raise RuntimeError("heartbeat rejected: HTTP " + str(response.status))
        result = json.loads(response.read().decode("utf-8"))
        if not result.get("accepted"):
            raise RuntimeError("heartbeat was not accepted")

def main():
    if not API_URL.startswith("https://") or not SERVER_ID or not TOKEN:
        raise SystemExit("Set STARVEX_HEARTBEAT_URL, STARVEX_SERVER_ID and STARVEX_AGENT_TOKEN.")
    while True:
        try:
            send_heartbeat()
        except Exception as exc:
            # Do not print environment variables, request headers, or the token.
            print("STARVEX heartbeat failed:", type(exc).__name__, flush=True)
        time.sleep(INTERVAL)

if __name__ == "__main__":
    main()
