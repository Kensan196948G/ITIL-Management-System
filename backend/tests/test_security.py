from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_password_returns_string(self):
        hashed = hash_password("mysecretpassword")
        assert isinstance(hashed, str)
        assert len(hashed) > 0

    def test_hash_password_produces_different_hashes(self):
        h1 = hash_password("samepassword")
        h2 = hash_password("samepassword")
        assert h1 != h2

    def test_verify_password_success(self):
        hashed = hash_password("correctpassword")
        assert verify_password("correctpassword", hashed) is True

    def test_verify_password_failure(self):
        hashed = hash_password("correctpassword")
        assert verify_password("wrongpassword", hashed) is False

    def test_verify_password_empty_string(self):
        hashed = hash_password("")
        assert verify_password("", hashed) is True
        assert verify_password("x", hashed) is False


class TestAccessToken:
    def test_create_access_token_returns_jwt(self):
        token = create_access_token(data={"sub": "user123"})
        parts = token.split(".")
        assert len(parts) == 3

    def test_create_access_token_contains_subject(self):
        token = create_access_token(data={"sub": "user123"})
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        assert payload["sub"] == "user123"

    def test_create_access_token_has_expiry(self):
        token = create_access_token(data={"sub": "user123"})
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        assert "exp" in payload

    def test_create_access_token_custom_expiry(self):
        short = timedelta(minutes=1)
        token = create_access_token(data={"sub": "user123"}, expires_delta=short)
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        now = datetime.now(timezone.utc)
        assert timedelta(minutes=0) < (exp - now) < timedelta(minutes=5)

    def test_create_access_token_with_extra_claims(self):
        token = create_access_token(data={"sub": "admin", "role": "admin"})
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        assert payload["sub"] == "admin"
        assert payload["role"] == "admin"


class TestRefreshToken:
    def test_create_refresh_token_returns_jwt(self):
        token = create_refresh_token(data={"sub": "user123"})
        parts = token.split(".")
        assert len(parts) == 3

    def test_create_refresh_token_has_longer_expiry(self):
        token = create_refresh_token(data={"sub": "user123"})
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        now = datetime.now(timezone.utc)
        assert timedelta(days=6) < (exp - now) < timedelta(days=8)

    def test_create_refresh_token_contains_subject(self):
        token = create_refresh_token(data={"sub": "user456"})
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        assert payload["sub"] == "user456"


class TestDecodeToken:
    def test_decode_valid_token(self):
        token = create_access_token(data={"sub": "user123"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "user123"

    def test_decode_expired_token_returns_none(self):
        expired = timedelta(seconds=-1)
        token = create_access_token(data={"sub": "user123"}, expires_delta=expired)
        payload = decode_token(token)
        assert payload is None

    def test_decode_invalid_token_returns_none(self):
        assert decode_token("invalid.token.string") is None

    def test_decode_malformed_token_returns_none(self):
        assert decode_token("not-a-jwt") is None

    def test_decode_token_with_modified_payload_returns_none(self):
        token = create_access_token(data={"sub": "user123"})
        parts = token.split(".")
        tampered = parts[0] + "." + parts[1] + ".invalidsignature"
        payload = decode_token(tampered)
        assert payload is None
