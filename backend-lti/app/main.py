"""
FastAPI LTI 1.3 Backend Service
Handles LTI login, launch, and session management for SIT Brightspace integration
"""
from fastapi import FastAPI, Request, Form, Header, HTTPException, Depends
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import logging
import httpx
from typing import Optional

from .config import settings
from .lti_handler import LTIHandler
from .session_manager import SessionManager
from .models import SessionResponse, LogoutRequest

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="LTI 1.3 Backend Service",
    description="Handles LTI 1.3 authentication for SIT Brightspace integration",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Initialize LTI Handler and Session Manager
lti_handler = LTIHandler()
session_manager = SessionManager()


async def sync_student_to_backend(user_data: dict) -> bool:
    """
    Sync student to alignbackendapis database.
    Creates student if they don't exist, updates login info if they do.
    """
    try:
        email = user_data.get('email')
        name = user_data.get('name', 'Unknown User')
        
        if not email:
            logger.warning("No email in user_data, skipping backend sync")
            return False
        
        backend_url = settings.BACKEND_API_URL
        
        # Check if student exists
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                # Try to get student
                response = await client.get(f"{backend_url}/students/{email}")
                
                if response.status_code == 200:
                    # Student exists, update login info
                    logger.info(f"Student {email} exists, updating login info")
                    login_response = await client.put(f"{backend_url}/students/{email}/login")
                    if login_response.status_code == 200:
                        logger.info(f"Updated login info for {email}")
                    return True
                    
            except httpx.HTTPStatusError:
                pass  # Student doesn't exist, create them
            
            # Student doesn't exist, create them
            logger.info(f"Creating new student: {email}")
            
            # Get profile picture or use a default placeholder
            profile_pic = user_data.get('picture')
            if not profile_pic or profile_pic.strip() == '':
                # Use a default gravatar or placeholder
                profile_pic = f"https://ui-avatars.com/api/?name={name.replace(' ', '+')}&size=200"
            
            student_data = {
                "name": name,
                "email": email,
                "date_of_birth": None,
                "profile_picture": profile_pic,
                "location": None
            }
            
            create_response = await client.post(
                f"{backend_url}/students/",
                json=student_data
            )
            
            if create_response.status_code in [200, 201]:
                logger.info(f"Successfully created student {email}")
                return True
            else:
                logger.error(f"Failed to create student: {create_response.status_code} - {create_response.text}")
                return False
                
    except Exception as e:
        logger.error(f"Error syncing student to backend: {str(e)}", exc_info=True)
        return False


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "lti-backend"}


@app.post("/lti/login")
async def lti_login(
    request: Request,
    iss: str = Form(...),
    login_hint: str = Form(...),
    target_link_uri: str = Form(...),
    lti_message_hint: Optional[str] = Form(None),
    client_id: Optional[str] = Form(None)
):
    """
    Handle LTI 1.3 login initiation from Brightspace
    
    This endpoint receives the initial LTI login request, generates state/nonce,
    and redirects to Brightspace authorization endpoint.
    """
    try:
        logger.info(f"LTI Login Initiation received from issuer: {iss}")
        logger.debug(f"Login hint: {login_hint}, Target: {target_link_uri}")
        
        # Validate required parameters
        if not iss or not login_hint or not target_link_uri:
            logger.error("Missing required parameters in LTI login")
            raise HTTPException(status_code=400, detail="Missing required parameters")
        
        # Handle the login initiation
        auth_url = lti_handler.handle_login(
            iss=iss,
            login_hint=login_hint,
            target_link_uri=target_link_uri,
            lti_message_hint=lti_message_hint,
            client_id=client_id
        )
        
        logger.info(f"Redirecting to authorization URL")
        return RedirectResponse(url=auth_url, status_code=302)
        
    except Exception as e:
        logger.error(f"Error in LTI login: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Login initiation failed: {str(e)}")


@app.post("/lti/launch")
async def lti_launch(
    request: Request,
    id_token: str = Form(...),
    state: str = Form(...)
):
    """
    Handle LTI 1.3 launch request from Brightspace
    
    This endpoint receives the JWT ID token, validates it, extracts user/course info,
    creates a session, and redirects to the frontend with a session token.
    """
    try:
        logger.info(f"LTI Launch received with state: {state}")
        
        # Validate required parameters
        if not id_token or not state:
            logger.error("Missing required parameters in LTI launch")
            raise HTTPException(status_code=400, detail="Missing required parameters")
        
        # Handle the launch and validate token
        user_data, course_data = lti_handler.handle_launch(id_token, state)
        
        # Sync student with backend API
        await sync_student_to_backend(user_data)
        
        # Create session
        session_token = session_manager.create_session(user_data, course_data)
        
        logger.info(f"Session created for user: {user_data.get('email', 'unknown')}")
        
        # Redirect to frontend with session token
        redirect_url = f"{settings.FRONTEND_URL}/app?session_token={session_token}"
        logger.debug(f"Redirecting to: {redirect_url}")
        
        return RedirectResponse(url=redirect_url, status_code=302)
        
    except ValueError as e:
        logger.error(f"Validation error in LTI launch: {str(e)}")
        # Redirect to error page
        error_url = f"{settings.FRONTEND_URL}/lti-required?error=invalid_token"
        return RedirectResponse(url=error_url, status_code=302)
    except Exception as e:
        logger.error(f"Error in LTI launch: {str(e)}", exc_info=True)
        error_url = f"{settings.FRONTEND_URL}/lti-required?error=launch_failed"
        return RedirectResponse(url=error_url, status_code=302)


@app.get("/lti/session/validate")
async def validate_session(authorization: Optional[str] = Header(None)) -> SessionResponse:
    """
    Validate session token and return user/course information
    
    Used by frontend to check if session is still valid and get user context.
    """
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Missing authorization header")
        
        # Extract token from "Bearer <token>" format
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization format")
        
        session_token = authorization.split(" ", 1)[1]
        
        # Validate session
        session_data = session_manager.get_session(session_token)
        
        if not session_data:
            raise HTTPException(status_code=401, detail="Invalid or expired session")
        
        logger.debug(f"Session validated for user: {session_data['user'].get('email', 'unknown')}")
        
        return SessionResponse(
            user=session_data['user'],
            course=session_data['course']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating session: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Session validation failed")


@app.post("/lti/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """
    Logout endpoint - destroys the session
    """
    try:
        if not authorization:
            return JSONResponse(
                content={"message": "No session to logout"},
                status_code=200
            )
        
        # Extract token
        if authorization.startswith("Bearer "):
            session_token = authorization.split(" ", 1)[1]
            
            # Delete session
            session_manager.delete_session(session_token)
            logger.info(f"Session destroyed for token")
        
        return JSONResponse(
            content={"message": "Logged out successfully"},
            status_code=200
        )
        
    except Exception as e:
        logger.error(f"Error during logout: {str(e)}", exc_info=True)
        # Return success anyway since logout should be idempotent
        return JSONResponse(
            content={"message": "Logged out"},
            status_code=200
        )


@app.get("/lti/session/refresh")
async def refresh_session(authorization: Optional[str] = Header(None)):
    """
    Refresh session TTL
    """
    try:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization")
        
        session_token = authorization.split(" ", 1)[1]
        
        # Refresh session
        refreshed = session_manager.refresh_session(session_token)
        
        if not refreshed:
            raise HTTPException(status_code=401, detail="Session not found")
        
        return JSONResponse(
            content={"message": "Session refreshed"},
            status_code=200
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing session: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Session refresh failed")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
