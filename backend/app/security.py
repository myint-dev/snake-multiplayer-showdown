import hashlib
import hmac
import os
import secrets

_DEFAULT_ITERATIONS = 310_000


def _get_iterations() -> int:
    try:
        return int(os.getenv("PBKDF2_ITERATIONS", str(_DEFAULT_ITERATIONS)))
    except ValueError:
        return _DEFAULT_ITERATIONS


def hash_password(password: str) -> str:
    iterations = _get_iterations()
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    return f"pbkdf2_sha256${iterations}${salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    parts = encoded.split("$", 3)
    if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
        return False
    _, iterations, salt, expected = parts
    try:
        actual = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt), int(iterations)
        ).hex()
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(actual, expected)
