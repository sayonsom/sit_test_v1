"""
Configuration management for LTI Backend Service
Reads from environment variables with sensible defaults
"""
import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # LTI 1.3 Configuration
    CLIENT_ID: str = os.getenv("CLIENT_ID", "")
    DEPLOYMENT_ID: str = os.getenv("DEPLOYMENT_ID", "")
    ISSUER: str = os.getenv("ISSUER", "")
    AUTHORIZATION_ENDPOINT: str = os.getenv("AUTHORIZATION_ENDPOINT", "")
    KEY_SET_URL: str = os.getenv("KEY_SET_URL", "")
    
    # Tool Configuration
    TOOL_URL: str = os.getenv("TOOL_URL", "http://localhost:8000")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # Redis Configuration for Session Management
    REDIS_HOST: str = os.getenv("REDIS_HOST", "redis")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD", "")
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    REDIS_SSL: bool = os.getenv("REDIS_SSL", "false").lower() == "true"
    
    # Session Configuration
    SESSION_TTL: int = int(os.getenv("SESSION_TTL", "28800"))  # 8 hours default
    STATE_TTL: int = int(os.getenv("STATE_TTL", "300"))  # 5 minutes for state/nonce
    
    # CORS Configuration
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8000")
    
    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse comma-separated ALLOWED_ORIGINS into list"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(',')]
    
    # Application Settings
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Backend API (for creating/syncing students)
    BACKEND_API_URL: str = os.getenv("BACKEND_API_URL", "http://localhost:8080/api/v1")

    # Staff/Admin OIDC (server-side exchange to avoid browser CORS on ADFS token endpoint)
    STAFF_OIDC_CLIENT_ID: str = os.getenv("STAFF_OIDC_CLIENT_ID", "")
    STAFF_OIDC_AUTHORITY: str = os.getenv("STAFF_OIDC_AUTHORITY", "")
    STAFF_OIDC_REDIRECT_URI: str = os.getenv("STAFF_OIDC_REDIRECT_URI", "")
    STAFF_OIDC_SCOPES: str = os.getenv("STAFF_OIDC_SCOPES", "openid")
    STAFF_OIDC_METADATA_URL: str = os.getenv("STAFF_OIDC_METADATA_URL", "")

    @property
    def staff_oidc_scopes_list(self) -> List[str]:
        raw = self.STAFF_OIDC_SCOPES.replace(",", " ")
        values = [item.strip() for item in raw.split(" ") if item.strip()]
        return values if values else ["openid"]

    @property
    def staff_oidc_redirect_uri(self) -> str:
        if self.STAFF_OIDC_REDIRECT_URI:
            return self.STAFF_OIDC_REDIRECT_URI
        return f"{self.FRONTEND_URL.rstrip('/')}/oauth2/callback"

    @property
    def staff_oidc_metadata_url(self) -> str:
        if self.STAFF_OIDC_METADATA_URL:
            return self.STAFF_OIDC_METADATA_URL
        if not self.STAFF_OIDC_AUTHORITY:
            return ""
        return f"{self.STAFF_OIDC_AUTHORITY.rstrip('/')}/.well-known/openid-configuration"

    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
