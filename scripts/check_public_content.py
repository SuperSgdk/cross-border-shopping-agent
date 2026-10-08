"""公开内容检查：报告文件位置，不打印命中的凭据或个人路径。"""
from __future__ import annotations

import hashlib
from pathlib import Path
import re
import subprocess
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
HOME_PATH = re.compile(r"(?i)(?:[a-z]:[\\/]+Users[\\/]+|[/]Users[/]|[/]home[/](?!runner[/]))")
CREDENTIAL = re.compile(
    r"sk-(?:proj-|lf-)?[A-Za-z0-9_-]{16,}|tvly-[A-Za-z0-9_-]{16,}|"
    r"gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}"
)
# 仅放行两个既有安全测试的合成字符串，按内容哈希限定。
SYNTHETIC = {
    "tests/test_harness_guards.py": {"82be8a4d9cdebab78235e6d0618fdea34065fcb6f498073283ff4ec7376e551a"},
    "tests/test_langfuse_verification.py": {"4a87c0e09b021d67df7919e3cc2de48d42e3a9f87de77e91add3aebcaae1e955"},
}


def scan_text(name: str, content: str) -> list[str]:
    findings = []
    for number, line in enumerate(content.splitlines(), 1):
        categories = set()
        if HOME_PATH.search(line):
            categories.add("personal-home-path")
        if re.search(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----", line):
            categories.add("private-key")
        for match in CREDENTIAL.finditer(line):
            digest = hashlib.sha256(match.group().encode()).hexdigest()
            if digest not in SYNTHETIC.get(name, set()):
                categories.add("credential-pattern")
        if any(key in line for key in ("LLM_BASE_URL", "EMBEDDING_BASE_URL", "RERANKER_BASE_URL")):
            for value in re.findall(r"https?://[^\s\"'<>`]+", line):
                host = urlsplit(value).hostname or ""
                if host and host not in {"localhost", "127.0.0.1", "::1"} and not host.endswith((".test", ".invalid", ".example")):
                    categories.add("model-service-address")
        findings.extend(f"{name}:{number}: {category}" for category in sorted(categories))
    return findings


def main() -> int:
    names = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT).decode().split("\0")
    findings = []
    for name in filter(None, names):
        path = ROOT / name
        if Path(name).name.startswith(".env") and name != ".env.example":
            findings.append(f"{name}: private-environment-file")
        if path.suffix in {".db", ".sqlite", ".sqlite3", ".pem", ".key", ".p12", ".pfx", ".har"}:
            findings.append(f"{name}: private-runtime-file")
        try:
            content = path.read_text(encoding="utf-8")
        except (UnicodeError, OSError):
            continue
        findings.extend(scan_text(name, content))
    for finding in findings:
        print(finding)
    print(f"Public-content check: {'FAIL' if findings else 'PASS'} ({len(findings)} findings)")
    return int(bool(findings))


if __name__ == "__main__":
    raise SystemExit(main())
