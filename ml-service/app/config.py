import os
from pathlib import Path
from dotenv import load_dotenv

_BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(_BASE_DIR / ".env")


class Settings:
    # Server
    HOST: str = os.getenv("ML_SERVICE_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("ML_SERVICE_PORT", "8001"))

    # Database
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "3306"))
    DB_NAME: str = os.getenv("DB_NAME", "cod_crm")
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")

    # Google Gemini
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # API Authentication (empty = disabled, for dev; set in production)
    ML_API_KEY: str = os.getenv("ML_API_KEY", "")

    # Paths
    BASE_DIR: Path = _BASE_DIR
    MODEL_DIR: Path = Path(os.getenv("MODEL_DIR", str(Path(__file__).resolve().parent.parent / "trained_models")))
    DATA_DIR: Path = Path(os.getenv("DATA_DIR", str(Path(__file__).resolve().parent.parent / "data" / "olist")))

    # CORS
    _allowed_origins_raw: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000",
    )
    ALLOWED_ORIGINS: list = [o.strip() for o in _allowed_origins_raw.split(",") if o.strip()]


settings = Settings()
