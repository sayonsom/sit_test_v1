from fastapi import APIRouter, HTTPException, Path, Body, Depends
from typing import List, Dict, Any, Optional
from ....schemas.schemas import ResponseCreate
from ....crud.responses import create_student_response, get_student_assignments_responses
from uuid import UUID
from ....db.connection import get_db_connection

router = APIRouter()

@router.post("/modules/{module_id}/assignments/{assignment_id}/questions/{question_id}/responses", response_model=Dict)
async def save_student_response(
    module_id: UUID = Path(..., title="The ID of the module"),
    assignment_id: int = Path(..., title="The ID of the assignment"),
    question_id: int = Path(..., title="The ID of the question"),
    student_id: int = Body(..., embed=True, title="The ID of the student"),
    response_text: str = Body(..., embed=True, title="The student's response"),
    conn = Depends(get_db_connection)
):
    try:
        response = await create_student_response(conn, student_id, question_id, response_text)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    

@router.get("/students/{student_id}/assignments/responses", response_model=List[Dict[str, Any]])
async def read_student_assignments_responses(
    student_id: int = Path(..., title="The ID of the student"),
    conn = Depends(get_db_connection)
):
    try:
        student_data = await get_student_assignments_responses(conn, student_id)
        if not student_data:
            raise HTTPException(status_code=404, detail="No assignment responses found for the student")
        return student_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

