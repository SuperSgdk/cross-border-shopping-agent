from scripts.check_public_content import scan_text


def test_findings_do_not_echo_sensitive_values():
    token = "ghp_" + "A" * 36
    address = "https://" + "private.service.com/v1"
    home = "C:" + "\\Users\\" + "private-owner\\project"
    findings = scan_text("sample.txt", f"{token}\nLLM_BASE_URL={address}\n{home}")
    assert {row.rsplit(": ", 1)[1] for row in findings} == {
        "credential-pattern", "model-service-address", "personal-home-path",
    }
    assert not any(value in "\n".join(findings) for value in (token, address, home))


def test_offline_model_placeholder_is_allowed():
    assert scan_text(".env.example", "LLM_BASE_URL=http://127.0.0.1:1/v1") == []


def test_synthetic_exception_does_not_allow_new_credentials():
    assert scan_text("tests/test_harness_guards.py", "ghp_" + "B" * 36)
