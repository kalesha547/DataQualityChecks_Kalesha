# Starting the Application

## Current Status

✅ **Backend Server**: Running on http://localhost:8000
⏳ **Frontend Server**: Starting...

## Quick Start Commands

### If Frontend Dependencies Are Not Installed:

1. **Open Command Prompt** (not PowerShell) and run:
   ```cmd
   cd D:\GenAI\TMSDATAQUALITYCHECKS_AI\frontend
   npm install --legacy-peer-deps
   npm start
   ```

2. **Or use the install script**:
   - Double-click `frontend\install.bat`
   - Then run `npm start`

### If Dependencies Are Already Installed:

Just start the frontend:
```cmd
cd D:\GenAI\TMSDATAQUALITYCHECKS_AI\frontend
npm start
```

## Access the Application

Once both servers are running:

- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Verify Servers Are Running

**Backend (Port 8000)**:
- Open browser: http://localhost:8000/health
- Should see: `{"status":"healthy"}`

**Frontend (Port 4200)**:
- Open browser: http://localhost:4200
- Should see the CSV Validator interface

## Troubleshooting

**Backend not running?**
```cmd
cd D:\GenAI\TMSDATAQUALITYCHECKS_AI\backend
python -m uvicorn app:app --reload --port 8000
```

**Frontend not starting?**
- Make sure node_modules exists in frontend folder
- If not, run: `npm install --legacy-peer-deps`
- Check for errors in the terminal

**Port already in use?**
- Backend: Change port in command to `--port 8001`
- Frontend: Angular will automatically use next available port (4201, 4202, etc.)

