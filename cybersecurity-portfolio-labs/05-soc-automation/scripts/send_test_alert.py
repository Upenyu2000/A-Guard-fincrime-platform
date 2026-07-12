#!/usr/bin/env python3
"""Send a synthetic SOC alert to a Shuffle webhook."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone


def build_payload(alert_id: str) -> dict:
    return {
        "alert_id": alert_id,
        "source": "portfolio-lab",
        "title": "Suspicious outbound connection",
        "severity": "high",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "host": "WS01",
        "user": r"LAB\alice",
        "indicators": [
            {"type": "domain", "value": "example.test"},
            {"type": "ip", "value": "203.0.113.50"},
            {"type": "sha256", "value": "0" * 64},
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default=os.getenv("SHUFFLE_WEBHOOK_URL"))
    parser.add_argument("--alert-id", default="LAB-2026-0001")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    payload = build_payload(args.alert_id)
    encoded = json.dumps(payload, indent=2).encode("utf-8")

    if args.dry_run:
        print(encoded.decode("utf-8"))
        return 0

    if not args.url:
        print("SHUFFLE_WEBHOOK_URL or --url is required.", file=sys.stderr)
        return 2

    request = urllib.request.Request(
        args.url,
        data=encoded,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            body = response.read().decode("utf-8", errors="replace")
            print(f"HTTP {response.status}")
            print(body)
    except urllib.error.HTTPError as exc:
        print(f"HTTP {exc.code}: {exc.read().decode('utf-8', errors='replace')}", file=sys.stderr)
        return 1
    except urllib.error.URLError as exc:
        print(f"Request failed: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
