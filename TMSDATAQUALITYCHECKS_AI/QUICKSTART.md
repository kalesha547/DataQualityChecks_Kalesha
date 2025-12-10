# Quick Start Guide

## Prerequisites
- Python 3.8+
- Node.js 18+
- npm

## Backend Setup (5 minutes)

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

Backend will run at: http://localhost:8000

## Frontend Setup (3 minutes)

**Important**: If you encounter dependency conflicts, use `--legacy-peer-deps` flag.

```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

**Alternative**: Use the provided install script:
- Windows: Double-click `install.bat` in the frontend folder
- Or run: `cmd /c npm install --legacy-peer-deps`

Frontend will run at: http://localhost:4200

## Test the Application

1. Open http://localhost:4200 in your browser
2. Upload the `sample_data.csv` file from the root directory
3. Click "Validate CSV"
4. Review the validation results
5. Export results if needed

## Sample CSV Format

Your CSV should have these columns:
- Ticket ID (or TicketID)
- First Name
- Last Name (or LastName)
- EmailID (or Email)
- Wife Name
- Address1
- Address2 (optional)
- Address3 (optional)
- State
- City
- Country
- ZipCode

## Troubleshooting

**Backend won't start?**
- Check Python version: `python --version`
- Make sure virtual environment is activated
- Install dependencies: `pip install -r requirements.txt`

**Frontend won't start?**
- Check Node version: `node --version`
- Use `npm install --legacy-peer-deps` instead of `npm install`
- Clear cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then reinstall
- See `frontend/INSTALL.md` for detailed troubleshooting

**CORS errors?**
- Make sure backend is running on port 8000
- Check `backend/app.py` CORS settings

**LLM validation not working?**
- It's optional! The app works without it
- To enable: Set `USE_LLM_VALIDATOR=true` environment variable
- Requires 2-4GB RAM and internet connection for model download

