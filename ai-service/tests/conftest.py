"""Shared setup: make the service importable and keep tests away from real services."""

import os
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

# Never let a developer's real credentials leak into a test run.
for name in ("SUPABASE_DB_URL", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"):
    os.environ.pop(name, None)
os.environ["LOVABLE_API_KEY"] = "test-gateway-key"
os.environ.pop("AI_SERVICE_URL", None)
