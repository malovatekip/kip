"""
Storage for field photos (shop frontages taken by collectors).

Two backends, chosen by environment:
  - S3-compatible bucket (Cloudflare R2, Backblaze, MinIO...) when
    FIELD_MEDIA_S3_BUCKET is set. This is the production path: the hosting
    platform's local disk does not survive a redeploy.
  - Local folder (FIELD_MEDIA_DIR, default backend/data/field_media) for
    development and single-machine pilots.

Either way the bucket/folder is KIP's own; photos are never sent to a
third-party map or photo service.
"""
import hashlib
import os

MAX_PHOTO_BYTES = 1_500_000
ALLOWED_TYPES = {"image/jpeg": "jpg", "image/webp": "webp", "image/png": "png"}

_LOCAL_DIR = os.getenv(
    "FIELD_MEDIA_DIR",
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "field_media"),
)
_S3_BUCKET = os.getenv("FIELD_MEDIA_S3_BUCKET", "")


class MediaRejected(ValueError):
    pass


def _s3_client():
    import boto3  # optional dependency: only needed when a bucket is configured
    return boto3.client(
        "s3",
        endpoint_url=os.getenv("FIELD_MEDIA_S3_ENDPOINT") or None,
        aws_access_key_id=os.getenv("FIELD_MEDIA_S3_KEY_ID"),
        aws_secret_access_key=os.getenv("FIELD_MEDIA_S3_SECRET"),
        region_name=os.getenv("FIELD_MEDIA_S3_REGION", "auto"),
    )


def store_photo(data: bytes, content_type: str) -> tuple[str, str]:
    """Persist a photo; returns (storage_key, sha256). Content-addressed, so
    re-uploading the same photo is a no-op."""
    ext = ALLOWED_TYPES.get(content_type)
    if not ext:
        raise MediaRejected("Unsupported image type.")
    if not data or len(data) > MAX_PHOTO_BYTES:
        raise MediaRejected(f"Photo must be under {MAX_PHOTO_BYTES // 1000} KB.")
    digest = hashlib.sha256(data).hexdigest()
    key = f"photos/{digest[:2]}/{digest}.{ext}"

    if _S3_BUCKET:
        _s3_client().put_object(Bucket=_S3_BUCKET, Key=key, Body=data, ContentType=content_type)
    else:
        path = os.path.join(_LOCAL_DIR, *key.split("/"))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        if not os.path.exists(path):
            with open(path, "wb") as f:
                f.write(data)
    return key, digest


def load_photo(storage_key: str) -> bytes:
    if _S3_BUCKET:
        return _s3_client().get_object(Bucket=_S3_BUCKET, Key=storage_key)["Body"].read()
    with open(os.path.join(_LOCAL_DIR, *storage_key.split("/")), "rb") as f:
        return f.read()
