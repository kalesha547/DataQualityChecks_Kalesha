from typing import Dict, Any, List
from spellchecker import SpellChecker
import re


class SpellValidator:
    """
    Validates spelling for name and address fields using pyspellchecker.
    """
    
    def __init__(self):
        self.spell = SpellChecker()
        # Common name patterns that might not be in dictionary
        self.name_fields = ["First Name", "LastName", "Last Name", "Wife Name"]
        # Note: Address1, Address2, Address3 are NOT validated per requirements
        self.address_fields = ["City", "State"]
    
    def validate(self, record: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Validate spelling in name and address fields.
        Returns list of issues found.
        """
        issues = []
        
        # Check name fields
        for field in self.name_fields:
            if field in record:
                value = str(record[field]).strip()
                if value:
                    issues.extend(self._check_spelling(field, value))
        
        # Check address fields
        for field in self.address_fields:
            if field in record:
                value = str(record[field]).strip()
                if value:
                    issues.extend(self._check_spelling(field, value))
        
        return issues
    
    def _check_spelling(self, field: str, text: str) -> List[Dict[str, Any]]:
        """
        Check spelling of a text field.
        """
        issues = []
        
        # Split text into words
        words = re.findall(r'\b\w+\b', text)
        
        for word in words:
            # Skip if word is all uppercase (might be acronym)
            if word.isupper() and len(word) > 1:
                continue
            
            # Skip single characters
            if len(word) <= 1:
                continue
            
            # Check if word is misspelled
            word_lower = word.lower()
            if word_lower not in self.spell:
                # Get suggestions
                candidates = self.spell.candidates(word_lower)
                if candidates:
                    suggestions = list(candidates)[:3]  # Top 3 suggestions
                    expected = ", ".join(suggestions)
                else:
                    expected = "Check spelling"
                
                if candidates:
                    suggested = f"Suggested correction: Replace '{word}' with one of: {expected}"
                else:
                    suggested = f"Suggested correction: Verify spelling of '{word}'"
                
                issues.append({
                    "field": field,
                    "reason": f"Possible spelling error: '{word}'",
                    "expected": suggested
                })
        
        return issues

