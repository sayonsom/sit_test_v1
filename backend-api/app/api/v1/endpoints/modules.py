from fastapi import APIRouter, HTTPException, Depends, Path, UploadFile, File, Form
from uuid import UUID
import openai
from openai import AsyncOpenAI
import asyncio
from typing import List, Dict
from ....schemas.schemas import ModuleCreate, ModuleInDBBase
from ....crud.modules import create_module, get_modules_for_course, get_module_by_id, get_module_assignments, update_module, delete_module, get_questions_and_options_by_module
from ....db.connection import get_db_connection
from ....storage.local_storage import get_local_storage
import random
import os

router = APIRouter()

# Initialize the asynchronous OpenAI client from environment variable
async_openai_client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))

async def rephrase_text_with_openai(text: str) -> str:
    list_of_prompts = ["analogy", "example", "metaphor", "simile"]
    chat_completion = await async_openai_client.chat.completions.create(
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": f"Add some {random.choice(list_of_prompts)} related to every day world that a young person living in Singapore can relate to, and then rewrite this in a different way: \"{text}\". Keep it between 500-700 characters max."}
        ],
        model="gpt-3.5-turbo",  # Use an appropriate model
    )
    # Assuming the response structure, adjust if necessary based on the actual response
    response_message = chat_completion.choices[0].message.content.strip() if chat_completion.choices else "Could not generate alternative text."
    return response_message

async def fun_fact_finding_with_openai(text: str) -> str:
    list_of_prompts = ["Who invented discovered the concept", "The origin story", "Make it relevant to Singapore and tell something ", "Do you something about the worlds largest or smallest example", "Tell something interesting", "From when did people start using"]
    chat_completion = await async_openai_client.chat.completions.create(
        messages=[
            {"role": "system", "content": "You are a professor teaching undergraduate electrical engineering students."},
            {"role": "user", "content": f"{random.choice(list_of_prompts)} about \"{text}\". Keep it under 600 characters."}
        ],
        model="gpt-3.5-turbo",  # Use an appropriate model
    )
    # Assuming the response structure, adjust if necessary based on the actual response
    response_message = chat_completion.choices[0].message.content.strip() if chat_completion.choices else "Could not generate fun fact."
    return response_message

@router.post("/rephrase/")
async def rephrase(text: str):
    try:
        # Since FastAPI supports asynchronous functions, you can await the rephrasing function directly
        rephrased_text = await rephrase_text_with_openai(text)
        return {"rephrased_text": rephrased_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.post("/funfact/")
async def funfact(text: str):
    try:
        # Since FastAPI supports asynchronous functions, you can await the fun fact function directly
        fun_fact = await fun_fact_finding_with_openai(text)
        return {"fun_fact": fun_fact}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Endpoint to create a new module
@router.post("/modules/", response_model=dict)
async def add_new_module(course_id: int, module: ModuleCreate, conn = Depends(get_db_connection)):
    try:
        return await create_module(conn, course_id, module)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating module: {str(e)}")

# Endpoint to list all the modules for a course
@router.get("/courses/{course_id}/modules", response_model=List[Dict])
async def list_modules_for_course(course_id: int, conn = Depends(get_db_connection)):
    try:
        modules = await get_modules_for_course(conn, course_id)
        return modules
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

# Endpoint to get a module by id
@router.get("/modules/{module_id}", response_model=ModuleInDBBase)
async def read_module(module_id: UUID = Path(..., title="The ID of the module to get"), conn = Depends(get_db_connection)):
    try:
        db_module = await get_module_by_id(conn, module_id)
        return db_module
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

# Endpoint to update a module
@router.put("/modules/{module_id}", response_model=Dict)
async def update_module_endpoint(module_id: UUID, module: ModuleCreate, conn = Depends(get_db_connection)):
    try:
        updated_module = await update_module(conn, module_id, module)
        return updated_module
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

# Endpoint to delete a module
@router.delete("/modules/{module_id}")
async def delete_module_endpoint(module_id: UUID, conn = Depends(get_db_connection)):
    try:
        deleted_module = await delete_module(conn, module_id)
        return deleted_module
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

# Endpoint to get all the assignments and their Q&A for a module
@router.get("/modules/{module_id}/assignments", response_model=List[Dict])
async def get_questions_endpoint(module_id: UUID = Path(..., title="The UUID of the module to retrieve questions for"), conn = Depends(get_db_connection)):
    try:
        questions_and_options = await get_questions_and_options_by_module(conn, module_id)
        return questions_and_options
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


# Endpoint to upload content files (markdown, JSON configs, JS compute scripts, 3D models)
@router.post("/upload-content/")
async def upload_content_file(
    file: UploadFile = File(...),
    folder: str = Form(...),
):
    try:
        storage = get_local_storage()
        bucket_name = os.environ.get("STORAGE_BUCKET_NAME", "align-hvl-2024-release1")
        blob_name = f"{folder}/{file.filename}"
        file_data = await file.read()
        storage.upload_file(bucket_name, blob_name, file_data)
        return {"path": blob_name, "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")
