from typing import Dict, Any, List
import re
import socket


class EmailValidator:
    """
    Validates email addresses using regex and domain check.
    """
    
    def __init__(self):
        # RFC 5322 compliant email regex (simplified)
        self.email_pattern = re.compile(
            r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        )
    
    def validate(self, record: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Validate email address format and domain.
        Returns list of issues found.
        """
        issues = []
        
        email = record.get("EmailID", record.get("Email", "")).strip()
        if not email:
            return issues
        
        # Check basic format
        if not self.email_pattern.match(email):
            issues.append({
                "field": "EmailID",
                "reason": f"Invalid email format: '{email}'",
                "expected": f"Suggested correction: Use valid email format like 'user@example.com' (current: '{email}')"
            })
            return issues  # Don't check domain if format is wrong
        
        # Extract domain
        try:
            domain = email.split('@')[1]
            
            # Basic domain validation (check if domain has valid structure)
            if not re.match(r'^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', domain):
                issues.append({
                    "field": "EmailID",
                    "reason": f"Invalid domain format: '{domain}'",
                    "expected": f"Suggested correction: Use a valid domain name format (e.g., 'example.com' instead of '{domain}')"
                })
            
            # Try to resolve domain (optional, can be slow)
            # Uncomment if you want to check if domain exists
            # try:
            #     socket.gethostbyname(domain)
            # except socket.gaierror:
            #     issues.append({
            #         "field": "EmailID",
            #         "reason": f"Domain does not exist: '{domain}'",
            #         "expected": "Valid domain name"
            #     })
        
        except IndexError:
            issues.append({
                "field": "EmailID",
                "reason": "Email format error",
                "expected": f"Suggested correction: Use valid email format like 'user@example.com' (current: '{email}')"
            })
        
        return issues

