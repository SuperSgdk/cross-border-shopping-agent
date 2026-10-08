"""Offline test defaults: never inherit production model credentials."""
import os

os.environ["LLM_API_KEY"] = "test-placeholder"
os.environ["LLM_BASE_URL"] = "http://127.0.0.1:1/v1"
os.environ["PYTHONUTF8"] = "1"
