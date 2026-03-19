from fastapi import APIRouter, HTTPException, Depends, Path, File, UploadFile, Form, Query, UploadFile
from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime, timedelta
from ....schemas.schemas import AssignmentCreate, AssignmentData
from ....crud.assignments import create_questions_and_options, create_assignment, get_assignments_for_module, create_assignment_and_questions_from_csv, delete_assignment_and_related_questions
from ....db.connection import get_db_connection
import pandas as pd
from io import BytesIO

import logging
logging.basicConfig(level=logging.INFO)

router = APIRouter()

@router.post("/upload_csv/")
async def upload_csv(file: UploadFile, module_id, conn= Depends(get_db_connection)):
    try:
        contents = await file.read()
        logging.info(f"Received file with contents: {contents}")
        df = pd.read_csv(BytesIO(contents))
        duedate = datetime.now().date() + timedelta(days=90)

        async with conn.transaction():
            # assignment_id = await create_assignment(conn, data.module_id, data.assignment_title, data.due_date)
            assignment_id = await create_assignment(conn, module_id=module_id, assignment_title="Default Assignment", description="Basic questions to demonstrate fundamental understanding of the topic", due_date=duedate)
            await create_questions_and_options(conn, assignment_id, df)

        return {
            "assignment_id": assignment_id,
            "module_id": module_id,
            "title": "Default Assignment",
            "due_date": duedate.strftime('%Y-%m-%d'),
            "message": "Assignment and questions created successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"An error occurred: {str(e)}")

# @router.post("/modules/{module_id}/questions/upload_csv")
# async def upload_questions_csv(
#     module_id: UUID = Path(..., description="The UUID of the module"),
#     assignment_title: str = Form(..., description="The title of the assignment"),
#     due_date_str: str = Form(..., description="The due date for the assignment in 'YYYY-MM-DD' format"),
#     file: UploadFile = File(...),
#     conn = Depends(get_db_connection)
# ):
#     try:
#         # Parse the due_date from string to datetime object
#         try:
#             due_date = datetime.strptime(due_date_str, '%Y-%m-%d')
#         except ValueError as e:
#             raise HTTPException(status_code=400, detail="Due date must be in 'YYYY-MM-DD' format.")

#         # Read CSV content
#         csv_content = await file.read()
#         result = await create_assignment_and_questions_from_csv(conn, module_id, assignment_title, due_date, csv_content)

#         return result
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"An error occurred while processing the CSV file: {str(e)}")

@router.delete("/modules/{module_id}/assignments/", response_model=dict)
async def delete_assignment_endpoint(module_id: UUID = Path(..., title="The UUID of the module"), conn = Depends(get_db_connection)):
    try:
        result = await delete_assignment_and_related_questions(conn, module_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred while deleting the assignment: {str(e)}")

@router.post("/modules/{module_id}/assignments/", response_model=dict)
async def create_assignment_endpoint(module_id: UUID, assignment: AssignmentCreate, conn = Depends(get_db_connection)):
    try:
        assignment.module_id = module_id
        result = await create_assignment(conn, assignment)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating assignment: {str(e)}")

@router.get("/modules/{module_id}/assignments/", response_model=List[Dict[str, Any]])
async def list_assignments_for_module(module_id: UUID, conn = Depends(get_db_connection)):
    try:
        assignments = await get_assignments_for_module(conn, module_id)
        return assignments
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

    


    
# # List all the assignments for given module
# @router.get("/modules/{module_id}/assignments", response_model=List[Dict])
# def list_assignments_for_module(module_id: UUID = Path(..., title="The ID of the module to get")):
#     try:
#         assignments = get_assignments_for_module(module_id)
#         return assignments
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")