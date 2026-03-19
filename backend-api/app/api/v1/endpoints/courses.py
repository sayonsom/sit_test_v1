from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict
from ....crud.courses import create_course, get_enrolled_students, get_courses, get_course_by_internal_url
from ....schemas.schemas import CourseCreate
from ....db.connection import get_db_connection

router = APIRouter()

# Endpoint to create a new course
@router.post("/courses/", response_model=dict)
async def add_new_course(course: CourseCreate, conn = Depends(get_db_connection)):
    try:
        course_data = await create_course(conn, course)
        return course_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating course: {str(e)}")

@router.get("/courses/{course_id}/students", response_model=List[Dict])
async def list_enrolled_students(course_id: int, conn = Depends(get_db_connection)):
    try:
        students = await get_enrolled_students(conn, course_id)
        return students
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

# List all the courses
@router.get("/courses", response_model=List[Dict])
async def list_courses(conn = Depends(get_db_connection)):
    try:
        courses = await get_courses(conn)
        return courses
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

# Get a course by internal URL
@router.get("/courses/{internal_url}", response_model=Dict)
async def get_course_by_internal_url_endpoint(internal_url: int, conn = Depends(get_db_connection)):
    try:
        course = await get_course_by_internal_url(conn, internal_url)
        return course
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
