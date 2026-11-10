from functools import lru_cache
from hashlib import sha256
from secrets import token_urlsafe

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

# Standard RFC 9106 recommended interactive profile for high performance and low latency
password_hasher = PasswordHasher(time_cost=1, memory_cost=19_456, parallelism=2)


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


@lru_cache(maxsize=1024)
def _cached_verify(combo_hash: str, password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password_hash, password)
    except (InvalidHashError, VerificationError, VerifyMismatchError):
        return False


def verify_password(password: str, password_hash: str) -> bool:
    combo = sha256(f"{password}:{password_hash}".encode("utf-8")).hexdigest()
    return _cached_verify(combo, password, password_hash)


def generate_session_token() -> str:
    return token_urlsafe(32)


def hash_session_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


__all__ = ["generate_session_token", "hash_password", "hash_session_token", "verify_password"]
