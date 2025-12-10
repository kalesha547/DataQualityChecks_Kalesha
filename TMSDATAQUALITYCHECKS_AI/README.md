# CSV Data Quality Validator

A full-stack application that uses open-source AI models to validate CSV data for spelling mistakes, address correctness, city/state/country/zip mismatches, gender mismatches, and email validation.

## Features

- **Spell Check**: Validates spelling in names and address fields using `pyspellchecker`
- **Address Validation**: Validates address format, city-state-country relationships using `libpostal`
- **Gender Validation**: Detects gender mismatches (e.g., male names in Wife Name field) using `gender-guesser`
- **Email Validation**: Validates email format and domain structure
- **AI Reasoning**: Optional LLM-based validation using HuggingFace models (phi-3-mini or qwen2.5-1.5B-instruct)

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **pyspellchecker**: Spell checking
- **gender-guesser**: Gender detection from names
- **pypostal**: Address parsing and normalization
- **transformers**: HuggingFace transformers for LLM validation (optional)

### Frontend
- **Angular 19**: Modern frontend framework
- **TypeScript**: Type-safe development
- **PapaParse**: CSV parsing (optional, can use native File API)

## Project Structure

```
TMSDATAQUALITYCHECKS_AI/
├── backend/
│   ├── app.py                 # FastAPI application
│   ├── requirements.txt       # Python dependencies
│   ├── validators/
│   │   ├── __init__.py
│   │   ├── spell_validator.py
│   │   ├── address_validator.py
│   │   ├── gender_validator.py
│   │   ├── email_validator.py
│   │   └── llm_validator.py
│   └── models/
│       ├── __init__.py
│       └── record_model.py
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── app.component.ts
│   │   │   ├── app.routes.ts
│   │   │   ├── upload/
│   │   │   │   └── upload.component.ts
│   │   │   ├── table/
│   │   │   │   └── result-table.component.ts
│   │   │   └── services/
│   │   │       └── csv-upload.service.ts
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── styles.css
│   ├── package.json
│   ├── angular.json
│   └── tsconfig.json
└── README.md
```

## Installation

### Prerequisites

- Python 3.8 or higher
- Node.js 18 or higher
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
```

3. Activate the virtual environment:
   - **Windows**:
     ```bash
     venv\Scripts\activate
     ```
   - **Linux/Mac**:
     ```bash
     source venv/bin/activate
     ```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. (Optional) For LLM validation, set environment variable:
```bash
# Windows
set USE_LLM_VALIDATOR=true
set LLM_MODEL=microsoft/phi-3-mini-4k-instruct

# Linux/Mac
export USE_LLM_VALIDATOR=true
export LLM_MODEL=microsoft/phi-3-mini-4k-instruct
```

**Note**: LLM validation requires significant memory (2-4GB RAM). The application works without it.

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

### Backend

1. Activate your virtual environment (if not already activated):
```bash
cd backend
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

2. Start the FastAPI server:
```bash
uvicorn app:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

API Documentation (Swagger UI): `http://localhost:8000/docs`

### Frontend

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Start the Angular development server:
```bash
npm start
```

The application will be available at `http://localhost:4200`

## Usage

1. **Start both servers** (backend on port 8000, frontend on port 4200)

2. **Open the application** in your browser at `http://localhost:4200`

3. **Upload a CSV file** with the following columns:
   - Ticket ID (or TicketID)
   - First Name
   - Last Name (or LastName)
   - EmailID (or Email)
   - Wife Name
   - Address1
   - Address2
   - Address3
   - State
   - City
   - Country
   - ZipCode

4. **Click "Validate CSV"** to process the file

5. **Review results** in the table:
   - Status badges (Valid/Invalid)
   - Description column with detailed issues
   - Field-level error messages

6. **Export results** by clicking "Export to CSV"

## API Endpoints

### POST /validate-csv

Upload and validate a CSV file.

**Request**: Multipart form data with `file` field containing CSV file

**Response**:
```json
{
  "results": [
    {
      "TicketID": "T123",
      "FirstName": "John",
      "LastName": "Andersan",
      "Status": "Invalid",
      "Description": "Last Name: Possible spelling error: 'Andersan' (Expected: anderson, anders, andersen)"
    }
  ],
  "total_rows": 1
}
```

### GET /health

Health check endpoint.

**Response**:
```json
{
  "status": "healthy"
}
```

## Validation Rules

### Spell Check
- Validates spelling in: First Name, Last Name, Wife Name, Address fields, City
- Uses dictionary-based spell checking
- Provides suggestions for misspelled words

### Address Validation
- Validates US state code format (2-letter codes)
- Checks state-country consistency
- Validates zip code format (5-digit or 9-digit)
- Ensures required fields for US addresses (City, State, Zip)

### Gender Validation
- Checks if Wife Name contains a male name
- Uses name-to-gender prediction
- Flags male names in wife field as invalid

### Email Validation
- Validates email format (RFC 5322 compliant)
- Checks domain structure
- Optional domain resolution (commented out by default)

### LLM Validation (Optional)
- Uses small open-source LLM for reasoning
- Identifies inconsistencies and data quality issues
- Provides structured feedback

## Configuration

### Environment Variables

- `USE_LLM_VALIDATOR`: Set to `true` to enable LLM validation (default: `false`)
- `LLM_MODEL`: HuggingFace model name (default: `microsoft/phi-3-mini-4k-instruct`)

### CORS Configuration

The backend is configured to allow requests from `http://localhost:4200`. To change this, edit `backend/app.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],  # Update this
    ...
)
```

## Troubleshooting

### Backend Issues

1. **Import errors**: Make sure all dependencies are installed:
   ```bash
   pip install -r requirements.txt
   ```

2. **Postal library issues**: `pypostal` requires system libraries. On Linux:
   ```bash
   sudo apt-get install libpostal-dev
   ```

3. **LLM model loading fails**: This is optional. The application works without LLM validation. If you want to use it:
   - Ensure you have enough RAM (2-4GB)
   - Check internet connection for model download
   - Set `USE_LLM_VALIDATOR=true`

### Frontend Issues

1. **CORS errors**: Ensure backend is running and CORS is configured correctly

2. **API connection errors**: Check that backend is running on port 8000

3. **Build errors**: Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

## Development

### Adding New Validators

1. Create a new file in `backend/validators/`
2. Implement a `validate(record: Dict[str, Any]) -> List[Dict[str, Any]]` method
3. Add the validator to `backend/app.py` in the `validate_record` function

### Modifying Frontend

The frontend uses Angular standalone components. To add new features:
1. Create components in `frontend/src/app/`
2. Update routes in `frontend/src/app/app.routes.ts`
3. Add services in `frontend/src/app/services/`

## License

This project is open source and available for use.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

