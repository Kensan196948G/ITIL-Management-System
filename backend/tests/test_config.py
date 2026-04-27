from app.core.config import Settings


class TestSettings:
    def test_env_override_from_conftest(self):
        settings = Settings()
        assert settings.database_url == "postgresql+asyncpg://test:test@localhost:9999/test_db"
        assert settings.secret_key == "test-secret-key-for-testing-only"
        assert settings.environment == "test"

    def test_default_algorithm(self):
        assert Settings().algorithm == "HS256"

    def test_default_token_expire_values(self):
        settings = Settings()
        assert settings.access_token_expire_minutes == 30
        assert settings.refresh_token_expire_days == 7

    def test_default_log_level(self):
        assert Settings().log_level == "INFO"

    def test_cors_origin_list_property(self):
        settings = Settings()
        expected = ["http://localhost:5173", "http://localhost:3000"]
        assert settings.cors_origin_list == expected

    def test_cors_origin_list_parses_valid_json(self):
        settings = Settings(cors_origins='["http://example.com"]')
        assert settings.cors_origin_list == ["http://example.com"]

    def test_env_override(self, monkeypatch):
        monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://override:pass@host:5432/db")
        monkeypatch.setenv("SECRET_KEY", "override-secret")
        monkeypatch.setenv("ENVIRONMENT", "production")
        settings = Settings()
        assert settings.database_url == "postgresql+asyncpg://override:pass@host:5432/db"
        assert settings.secret_key == "override-secret"
        assert settings.environment == "production"

    def test_cors_origin_list_empty_fallback(self):
        settings = Settings(cors_origins="[]")
        assert settings.cors_origin_list == []

    def test_env_file_config_present(self):
        assert Settings.model_config.get("env_file") == ".env"
