from typing import Dict, Any, List
import gender_guesser.detector as gender


class GenderValidator:
    """
    Validates gender mismatch in Wife Name field.
    Uses gender-guesser library to detect if a male name is used in wife field.
    """
    
    def __init__(self):
        self.detector = gender.Detector()
    
    def validate(self, record: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Check if Wife Name contains a male name.
        Returns list of issues if gender mismatch is detected.
        """
        issues = []
        
        wife_name = record.get("Wife Name", "").strip()
        if not wife_name:
            return issues
        
        # Extract first name (first word)
        first_name = wife_name.split()[0] if wife_name else ""
        if not first_name:
            return issues
        
        # Detect gender
        detected_gender = self.detector.get_gender(first_name)
        
        # Check if it's a male name
        if detected_gender in ['male', 'mostly_male']:
            issues.append({
                "field": "Wife Name",
                "reason": f"Male name detected: '{first_name}'",
                "expected": f"Suggested correction: Replace '{first_name}' with a female name"
            })
        elif detected_gender == 'andy':  # Ambiguous/unisex names
            # Could flag as warning, but not invalid
            pass
        
        return issues

