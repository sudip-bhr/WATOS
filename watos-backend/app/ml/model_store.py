"""
Model Storage Abstraction Layer.
Provides pluggable backends for ML model persistence:
  - LocalStore: Default, saves .joblib files to local filesystem.
  - S3Store: For multi-instance deployments, saves to S3/MinIO.

Backend is selected via MODEL_STORE_BACKEND env var ("local" or "s3").
"""
import os
import io
import joblib
from abc import ABC, abstractmethod
from typing import Any, Optional
from app.core.logging import get_logger

logger = get_logger("model_store")


class ModelStore(ABC):
    """Abstract base class for model storage backends."""

    @abstractmethod
    def save(self, model: Any, name: str) -> str:
        """Save a model. Returns the storage path/key."""
        ...

    @abstractmethod
    def load(self, name: str) -> Any:
        """Load a model by name. Raises FileNotFoundError if missing."""
        ...

    @abstractmethod
    def exists(self, name: str) -> bool:
        """Check if a model exists in storage."""
        ...

    @abstractmethod
    def list_models(self) -> list:
        """List all available model files."""
        ...


class LocalStore(ModelStore):
    """Local filesystem storage (default for development)."""

    def __init__(self, base_dir: str):
        self.base_dir = base_dir
        os.makedirs(base_dir, exist_ok=True)

    def save(self, model: Any, name: str) -> str:
        path = os.path.join(self.base_dir, name)
        joblib.dump(model, path)
        logger.info(f"Model saved locally: {name}")
        return path

    def load(self, name: str) -> Any:
        path = os.path.join(self.base_dir, name)
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model not found: {path}")
        return joblib.load(path)

    def exists(self, name: str) -> bool:
        return os.path.exists(os.path.join(self.base_dir, name))

    def list_models(self) -> list:
        return [f for f in os.listdir(self.base_dir) if f.endswith(".joblib")]


class S3Store(ModelStore):
    """
    S3/MinIO storage for production multi-instance deployments.
    Requires boto3 and AWS credentials configured.
    """

    def __init__(self, bucket: str, prefix: str = "ml-models"):
        try:
            import boto3
            self.s3 = boto3.client("s3")
        except ImportError:
            raise ImportError("boto3 is required for S3 model storage. Install with: pip install boto3")
        self.bucket = bucket
        self.prefix = prefix

    def _key(self, name: str) -> str:
        return f"{self.prefix}/{name}"

    def save(self, model: Any, name: str) -> str:
        buf = io.BytesIO()
        joblib.dump(model, buf)
        buf.seek(0)
        key = self._key(name)
        self.s3.upload_fileobj(buf, self.bucket, key)
        logger.info(f"Model saved to S3: s3://{self.bucket}/{key}")
        return f"s3://{self.bucket}/{key}"

    def load(self, name: str) -> Any:
        buf = io.BytesIO()
        key = self._key(name)
        try:
            self.s3.download_fileobj(self.bucket, key, buf)
        except Exception as e:
            raise FileNotFoundError(f"Model not found in S3: {key}") from e
        buf.seek(0)
        return joblib.load(buf)

    def exists(self, name: str) -> bool:
        try:
            self.s3.head_object(Bucket=self.bucket, Key=self._key(name))
            return True
        except Exception:
            return False

    def list_models(self) -> list:
        try:
            response = self.s3.list_objects_v2(Bucket=self.bucket, Prefix=self.prefix)
            return [
                obj["Key"].split("/")[-1]
                for obj in response.get("Contents", [])
                if obj["Key"].endswith(".joblib")
            ]
        except Exception:
            return []


# ── Factory / Singleton ───────────────────────────────────────────────

_store_instance: Optional[ModelStore] = None


def get_model_store() -> ModelStore:
    """
    Returns the configured ModelStore singleton.
    Backend selected via settings.MODEL_STORE_BACKEND.
    """
    global _store_instance
    if _store_instance is not None:
        return _store_instance

    from app.core.config import settings

    backend = getattr(settings, "MODEL_STORE_BACKEND", "local")

    if backend == "s3":
        bucket = getattr(settings, "S3_BUCKET", "watos-models")
        _store_instance = S3Store(bucket=bucket)
        logger.info(f"Using S3 model store: bucket={bucket}")
    else:
        models_dir = os.path.join(os.path.dirname(__file__), "models")
        _store_instance = LocalStore(base_dir=models_dir)
        logger.info(f"Using local model store: {models_dir}")

    return _store_instance
