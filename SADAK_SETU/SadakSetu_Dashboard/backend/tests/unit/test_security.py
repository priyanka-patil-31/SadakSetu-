from app.core.security import hash_password, hash_session_token, verify_password


def test_password_hashing_uses_argon2id_and_rejects_wrong_password() -> None:
    password_hash = hash_password("correct horse battery staple")

    assert password_hash.startswith("$argon2id$")
    assert verify_password("correct horse battery staple", password_hash)
    assert not verify_password("wrong password", password_hash)


def test_session_tokens_are_one_way_and_deterministic_for_lookup() -> None:
    token = "test-session-token"

    assert hash_session_token(token) == hash_session_token(token)
    assert hash_session_token(token) != token
