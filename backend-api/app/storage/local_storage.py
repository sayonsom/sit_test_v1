"""
Local file storage module to replace Google Cloud Storage functionality.
This module provides local file access for development without GCP dependencies.
"""
import os
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional
import base64
import json


class LocalStorage:
    """
    Local storage handler that mimics Google Cloud Storage signed URL functionality.
    Files are served from a local directory structure.
    """
    
    def __init__(self, base_path: str = "/code/local_storage"):
        """
        Initialize local storage with a base path.
        
        Args:
            base_path: Root directory for local file storage
        """
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    def generate_signed_url(
        self, 
        bucket_name: str, 
        blob_name: str, 
        expiration: timedelta = timedelta(seconds=3600),
        method: str = "GET"
    ) -> str:
        """
        Generate a local file URL that mimics GCS signed URLs.
        In local mode, this returns a direct file path or API endpoint.
        
        Args:
            bucket_name: Bucket name (used as subdirectory)
            blob_name: File path within bucket
            expiration: URL expiration time (ignored in local mode)
            method: HTTP method (ignored in local mode)
            
        Returns:
            Local file URL/path
        """
        # Create bucket directory if it doesn't exist
        bucket_path = self.base_path / bucket_name
        bucket_path.mkdir(parents=True, exist_ok=True)
        
        # Construct full file path
        file_path = bucket_path / blob_name
        
        # In local mode, we return an API endpoint URL that serves the file
        # This mimics the signed URL behavior
        encoded_path = base64.urlsafe_b64encode(f"{bucket_name}/{blob_name}".encode()).decode()
        
        # Return a local API endpoint URL
        return f"/api/v1/local-storage/{encoded_path}"
    
    def get_file_path(self, bucket_name: str, blob_name: str) -> Path:
        """
        Get the actual file system path for a blob.
        
        Args:
            bucket_name: Bucket name (subdirectory)
            blob_name: File path within bucket
            
        Returns:
            Full file system path
        """
        return self.base_path / bucket_name / blob_name
    
    def file_exists(self, bucket_name: str, blob_name: str) -> bool:
        """
        Check if a file exists in local storage.
        
        Args:
            bucket_name: Bucket name
            blob_name: File path within bucket
            
        Returns:
            True if file exists, False otherwise
        """
        file_path = self.get_file_path(bucket_name, blob_name)
        return file_path.exists() and file_path.is_file()
    
    def upload_file(self, bucket_name: str, blob_name: str, file_data: bytes) -> bool:
        """
        Upload/save a file to local storage.
        
        Args:
            bucket_name: Bucket name (subdirectory)
            blob_name: File path within bucket
            file_data: File content as bytes
            
        Returns:
            True if successful
        """
        file_path = self.get_file_path(bucket_name, blob_name)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(file_path, 'wb') as f:
            f.write(file_data)
        
        return True
    
    def decode_signed_url_path(self, encoded_path: str) -> tuple[str, str]:
        """
        Decode the encoded path from a local signed URL.
        
        Args:
            encoded_path: Base64 encoded bucket/blob path
            
        Returns:
            Tuple of (bucket_name, blob_name)
        """
        decoded = base64.urlsafe_b64decode(encoded_path.encode()).decode()
        parts = decoded.split('/', 1)
        if len(parts) == 2:
            return parts[0], parts[1]
        raise ValueError(f"Invalid encoded path: {encoded_path}")


# Singleton instance for use across the application
_local_storage_instance: Optional[LocalStorage] = None


def get_local_storage() -> LocalStorage:
    """
    Get the singleton LocalStorage instance.
    
    Returns:
        LocalStorage instance
    """
    global _local_storage_instance
    if _local_storage_instance is None:
        base_path = os.getenv('LOCAL_STORAGE_PATH', '/code/local_storage')
        _local_storage_instance = LocalStorage(base_path)
    return _local_storage_instance
