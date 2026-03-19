from fastapi import FastAPI, Form, Request, status, HTTPException
from fastapi.responses import HTMLResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware

# Try both import locations for ProxyHeadersMiddleware; fallback if unavailable
ProxyHeadersMiddleware = None
try:
    from starlette.middleware.proxy_headers import ProxyHeadersMiddleware as _PHM
    ProxyHeadersMiddleware = _PHM
except Exception:
    try:
        from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware as _PHM
        ProxyHeadersMiddleware = _PHM
    except Exception:
        ProxyHeadersMiddleware = None

# Load .env early so router modules can read env vars at import time
from dotenv import load_dotenv
load_dotenv()

from app.api.v1.endpoints import (
    students,
    instructors,
    courses,
    modules,
    assignments,
    questions,
    responses,
)
from app.api.v1.endpoints.lti_routes import router as lti_router
from app.api.v1.endpoints.session_routes import session as session_router

import uvicorn
import os

app = FastAPI()

# Ensure external scheme/host are derived from X-Forwarded-* headers (Cloud Run, proxies)
if ProxyHeadersMiddleware is not None:
    app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

# Define a list of allowed origins (i.e., the frontend URLs that you want to allow to access your backend)
origins = [
    "http://localhost:3000",
    "http://localhost:3100",
    "https://virtualhvlab.com",
    "https://sithvl.vercel.app",
    "https://hvlabonline-uat.singaporetech.edu.sg",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")



# Routers
app.include_router(students.router, prefix="/api/v1", tags=["Students"])
app.include_router(instructors.router, prefix="/api/v1", tags=["Instructors"])
app.include_router(courses.router, prefix="/api/v1", tags=["Courses"])
app.include_router(modules.router, prefix="/api/v1", tags=["Modules"])
app.include_router(assignments.router, prefix="/api/v1", tags=["Assignments"])

app.include_router(questions.router, prefix="/api/v1", tags=["Questions"])
app.include_router(responses.router, prefix="/api/v1", tags=["Responses"])
app.include_router(lti_router)
app.include_router(session_router)


@app.get("/health")
async def health():
    return {"status": "200 ok"}

# Index and other routes
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    print('Request for index page received')
    return templates.TemplateResponse('index.html', {"request": request})

@app.get('/favicon.ico')
async def favicon():
    file_name = 'favicon.ico'
    file_path = './static/' + file_name
    return FileResponse(path=file_path, headers={'mimetype': 'image/vnd.microsoft.icon'})

@app.post('/hello', response_class=HTMLResponse)
async def hello(request: Request, name: str = Form(...)):
    if name:
        print('Request for hello page received with name=%s' % name)
        return templates.TemplateResponse('hello.html', {"request": request, 'name': f"user_{name}"})
    else:
        print('Request for hello page received with no name or blank name -- redirecting')
        return RedirectResponse(request.url_for("index"), status_code=status.HTTP_302_FOUND)