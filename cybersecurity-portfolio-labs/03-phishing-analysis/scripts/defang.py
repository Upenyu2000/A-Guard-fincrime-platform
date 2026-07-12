#!/usr/bin/env python3
"""Defang or refang URLs, domains and email addresses for safe reporting."""

from __future__ import annotations

import argparse
import re
import sys


def defang(value: str) -> str:
    value = re.sub(r"(?i)\bhttps://", "hxxps://", value)
    value = re.sub(r"(?i)\bhttp://", "hxxp://", value)
    value = value.replace("@", "[@]")
    value = re.sub(r"(?<!\[)\.(?!\])", "[.]", value)
    return value


def refang(value: str) -> str:
    value = re.sub(r"(?i)\bhxxps://", "https://", value)
    value = re.sub(r"(?i)\bhxxp://", "http://", value)
    value = value.replace("[@]", "@")
    value = value.replace("[.]", ".")
    return value


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("value", nargs="?", help="Text to transform. Reads stdin when omitted.")
    parser.add_argument("--refang", action="store_true", help="Restore common defanging.")
    args = parser.parse_args()

    text = args.value if args.value is not None else sys.stdin.read()
    print(refang(text) if args.refang else defang(text))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
