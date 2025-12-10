from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import csv
import io
import json
from typing import List, Dict, Any
from validators.spell_validator import SpellValidator
from validators.address_validator import AddressValidator
from validators.gender_validator import GenderValidator
from validators.email_validator import EmailValidator
from validators.llm_validator import LLMValidator

app = FastAPI(title="CSV Data Quality Validator", version="1.0.0")

# CORS middleware for Angular frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],  # Angular default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize validators
spell_validator = SpellValidator()
address_validator = AddressValidator()
gender_validator = GenderValidator()
email_validator = EmailValidator()
llm_validator = LLMValidator()


def validate_record(record: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main validation pipeline that combines all validators.
    Returns status and description of issues.
    """
    issues = []
    
    # Run all validators
    spell_issues = spell_validator.validate(record)
    gender_issues = gender_validator.validate(record)
    address_issues = address_validator.validate(record)
    email_issues = email_validator.validate(record)
    llm_issues = llm_validator.validate(record)
    
    # Combine all issues
    issues.extend(spell_issues)
    issues.extend(gender_issues)
    issues.extend(address_issues)
    issues.extend(email_issues)
    issues.extend(llm_issues)
    
    # Determine status
    status = "Valid" if len(issues) == 0 else "Invalid"
    
    return {
        "status": status,
        "description": issues
    }


@app.post("/validate-csv")
async def validate_csv(file: UploadFile = File(...)):
    """
    Accept CSV file upload and validate each row.
    Returns validation results for all rows.
    """
    try:
        # Get filename
        filename = file.filename or "uploaded_file.csv"
        
        # Read CSV file
        contents = await file.read()
        csv_content = contents.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_content))
        
        results = []
        
        # Process each row
        for row in csv_reader:
            # Extract Ticket ID
            ticket_id = row.get("Ticket ID", row.get("TicketID", ""))
            
            # Create JSON object from all fields except Ticket ID
            record = {}
            for key, value in row.items():
                if key not in ["Ticket ID", "TicketID"]:
                    record[key] = value if value else ""
            
            # Validate the record
            validation_result = validate_record(record)
            
            # Build structured description with issues
            description_issues = []
            if validation_result["description"]:
                for issue in validation_result["description"]:
                    description_issues.append({
                        "field": issue.get("field", "Unknown"),
                        "reason": issue.get("reason", ""),
                        "suggestedValue": issue.get("expected", "N/A")
                    })
            
            # Build result row
            result_row = {
                "TicketID": ticket_id,
                **record,  # Include all original fields
                "Status": validation_result["status"],
                "Filename": filename,
                "Description": description_issues if description_issues else []
            }
            
            results.append(result_row)
        
        return {"results": results, "total_rows": len(results), "filename": filename}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")


@app.get("/")
async def root():
    return {"message": "CSV Data Quality Validator API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}

