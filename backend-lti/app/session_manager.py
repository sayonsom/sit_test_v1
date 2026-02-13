"""
Session Manager
Handles session creation, validation, and storage using Redis
"""
import json
import logging
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import redis

from .config import settings

logger = logging.getLogger(__name__)


class SessionManager:
    """Manages user sessions in Redis"""
    
    def __init__(self):
        """Initialize Redis connection"""
        try:
            self.redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
                db=settings.REDIS_DB,
                ssl=settings.REDIS_SSL,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            # Test connection
            self.redis_client.ping()
            logger.info(f"Successfully connected to Redis at {settings.REDIS_HOST}:{settings.REDIS_PORT}")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            raise
    
    def store_state(self, state: str, data: Dict[str, Any]) -> None:
        """
        Store state data for LTI login flow
        
        Args:
            state: Unique state identifier
            data: State data including nonce
        """
        try:
            key = f"lti_state:{state}"
            value = json.dumps(data)
            # Store with short TTL (5 minutes)
            self.redis_client.setex(key, settings.STATE_TTL, value)
            logger.debug(f"Stored state: {state[:10]}...")
        except Exception as e:
            logger.error(f"Error storing state: {str(e)}")
            raise
    
    def get_state(self, state: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve and delete state data (one-time use)
        
        Args:
            state: State identifier
            
        Returns:
            State data or None if not found/expired
        """
        try:
            key = f"lti_state:{state}"
            value = self.redis_client.get(key)
            
            if value:
                # Delete after retrieval (one-time use)
                self.redis_client.delete(key)
                logger.debug(f"Retrieved and deleted state: {state[:10]}...")
                return json.loads(value)
            else:
                logger.warning(f"State not found or expired: {state[:10]}...")
                return None
        except Exception as e:
            logger.error(f"Error retrieving state: {str(e)}")
            return None
    
    def create_session(self, user_data: Dict[str, Any], course_data: Dict[str, Any]) -> str:
        """
        Create a new session
        
        Args:
            user_data: User information from LTI
            course_data: Course information from LTI
            
        Returns:
            Session token
        """
        try:
            # Generate unique session token
            session_token = secrets.token_urlsafe(48)
            
            # Prepare session data
            now = datetime.utcnow()
            expires_at = now + timedelta(seconds=settings.SESSION_TTL)
            
            session_data = {
                'session_id': str(uuid.uuid4()),
                'user': user_data,
                'course': course_data,
                'created_at': now.isoformat(),
                'expires_at': expires_at.isoformat(),
                'last_accessed': now.isoformat()
            }
            
            # Store in Redis
            key = f"lti_session:{session_token}"
            value = json.dumps(session_data)
            self.redis_client.setex(key, settings.SESSION_TTL, value)
            
            logger.info(f"Created session for user: {user_data.get('email', 'unknown')}")
            logger.debug(f"Session token: {session_token[:10]}...")
            
            return session_token
        except Exception as e:
            logger.error(f"Error creating session: {str(e)}")
            raise
    
    def get_session(self, session_token: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve session data
        
        Args:
            session_token: Session token
            
        Returns:
            Session data or None if not found/expired
        """
        try:
            key = f"lti_session:{session_token}"
            value = self.redis_client.get(key)
            
            if value:
                session_data = json.loads(value)
                
                # Update last accessed time
                session_data['last_accessed'] = datetime.utcnow().isoformat()
                self.redis_client.setex(key, settings.SESSION_TTL, json.dumps(session_data))
                
                logger.debug(f"Retrieved session for token: {session_token[:10]}...")
                return session_data
            else:
                logger.warning(f"Session not found or expired: {session_token[:10]}...")
                return None
        except Exception as e:
            logger.error(f"Error retrieving session: {str(e)}")
            return None
    
    def delete_session(self, session_token: str) -> bool:
        """
        Delete a session (logout)
        
        Args:
            session_token: Session token
            
        Returns:
            True if deleted, False if not found
        """
        try:
            key = f"lti_session:{session_token}"
            deleted = self.redis_client.delete(key)
            
            if deleted:
                logger.info(f"Deleted session: {session_token[:10]}...")
                return True
            else:
                logger.warning(f"Session not found for deletion: {session_token[:10]}...")
                return False
        except Exception as e:
            logger.error(f"Error deleting session: {str(e)}")
            return False
    
    def refresh_session(self, session_token: str) -> bool:
        """
        Refresh session TTL
        
        Args:
            session_token: Session token
            
        Returns:
            True if refreshed, False if not found
        """
        try:
            key = f"lti_session:{session_token}"
            value = self.redis_client.get(key)
            
            if value:
                # Reset TTL
                self.redis_client.expire(key, settings.SESSION_TTL)
                logger.debug(f"Refreshed session: {session_token[:10]}...")
                return True
            else:
                logger.warning(f"Session not found for refresh: {session_token[:10]}...")
                return False
        except Exception as e:
            logger.error(f"Error refreshing session: {str(e)}")
            return False
