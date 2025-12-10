#!/bin/bash
echo "Starting FastAPI backend server..."
uvicorn app:app --reload --port 8000

