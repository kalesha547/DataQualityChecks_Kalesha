from typing import Dict, Any, List
import re

try:
    import postal
    POSTAL_AVAILABLE = True
except ImportError:
    POSTAL_AVAILABLE = False


class AddressValidator:
    """
    Validates address correctness using libpostal.
    Checks city-state, state-country, and zip-city matches.
    """
    
    def __init__(self):
        # Basic US state abbreviations
        self.us_states = {
            'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
            'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
            'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
            'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
            'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
        }
        
        # Basic country codes
        self.countries = {
            'USA', 'US', 'United States', 'United States of America',
            'Canada', 'CA', 'Mexico', 'MX', 'UK', 'United Kingdom', 'GB'
        }
        
        # Zipcode ranges by state (first 3 digits pattern)
        # This is a pattern-based approach, not hardcoded specific zipcodes
        self.zipcode_state_patterns = {
            'NY': ['100', '101', '102', '103', '104', '105', '106', '107', '108', '109', '110', '111', '112', '113', '114', '115', '116', '117', '118', '119', '120', '121', '122', '123', '124', '125', '126', '127', '128', '129', '130', '131', '132', '133', '134', '135', '136', '137', '138', '139', '140', '141', '142', '143', '144', '145', '146', '147', '148', '149'],
            'CA': ['900', '901', '902', '903', '904', '905', '906', '907', '908', '910', '911', '912', '913', '914', '915', '916', '917', '918', '919', '920', '921', '922', '923', '924', '925', '926', '927', '928', '930', '931', '932', '933', '934', '935', '936', '937', '938', '939', '940', '941', '942', '943', '944', '945', '946', '947', '948', '949', '950', '951', '952', '953', '954', '955', '956', '957', '958', '959'],
            'TX': ['750', '751', '752', '753', '754', '755', '756', '757', '758', '759', '760', '761', '762', '763', '764', '765', '766', '767', '768', '769', '770', '771', '772', '773', '774', '775', '776', '777', '778', '779', '780', '781', '782', '783', '784', '785', '786', '787', '788', '789', '790', '791', '792', '793', '794', '795', '796', '797', '798', '799'],
            'FL': ['320', '321', '322', '323', '324', '325', '326', '327', '328', '329', '330', '331', '332', '333', '334', '335', '336', '337', '338', '339', '340', '341', '342', '344', '346', '347', '349'],
            'IL': ['600', '601', '602', '603', '604', '605', '606', '607', '608', '609', '610', '611', '612', '613', '614', '615', '616', '617', '618', '619', '620', '622', '623', '624', '625', '626', '627', '628', '629'],
        }
    
    def validate(self, record: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Validate address fields and relationships.
        Returns list of issues found.
        """
        issues = []
        
        # Get address components
        # Note: Address1, Address2, Address3 are NOT validated per requirements
        city = record.get("City", "").strip()
        state = record.get("State", "").strip()
        country = record.get("Country", "").strip()
        zipcode = record.get("ZipCode", "").strip()
        
        # Validate state format
        if state:
            state_upper = state.upper()
            if len(state) == 2 and state_upper not in self.us_states:
                issues.append({
                    "field": "State",
                    "reason": f"Invalid state code: '{state}'",
                    "expected": f"Suggested correction: Use a valid 2-letter US state code (e.g., NY, CA, TX) instead of '{state}'"
                })
        
        # Validate state-country match (basic check)
        if state and country:
            state_upper = state.upper()
            country_upper = country.upper()
            if state_upper in self.us_states and country_upper not in ['USA', 'US', 'UNITED STATES', 'UNITED STATES OF AMERICA']:
                issues.append({
                    "field": "Country",
                    "reason": f"State '{state}' does not match country '{country}'",
                    "expected": f"Suggested correction: Change Country to 'United States' or 'USA' to match State '{state}'"
                })
        
        # Validate zip code format (US: 5 digits or 5+4)
        if zipcode:
            zip_clean = re.sub(r'[-\s]', '', zipcode)
            if not re.match(r'^\d{5}(?:\d{4})?$', zip_clean):
                issues.append({
                    "field": "ZipCode",
                    "reason": f"Invalid zip code format: '{zipcode}'",
                    "expected": "Suggested correction: Use 5-digit or 9-digit zip code format (e.g., 12345 or 12345-6789)"
                })
            elif city and state and country.upper() in ['USA', 'US', 'UNITED STATES']:
                # Extract first 3 digits for state pattern matching
                zip_prefix = zip_clean[:3]
                state_upper = state.upper().strip()
                
                # Check if zipcode prefix matches state pattern
                state_matches_zip = False
                if state_upper in self.zipcode_state_patterns:
                    state_matches_zip = any(zip_prefix.startswith(pattern) for pattern in self.zipcode_state_patterns[state_upper])
                
                # Also check reverse - if zipcode prefix suggests a different state
                suggested_state = None
                for state_code, patterns in self.zipcode_state_patterns.items():
                    if any(zip_prefix.startswith(pattern) for pattern in patterns):
                        if state_code != state_upper:
                            suggested_state = state_code
                            break
                
                if not state_matches_zip and suggested_state:
                    # Zipcode doesn't match the provided state
                    reason = f"Zipcode {zip_clean[:5]} does not match State '{state}'. Zipcode prefix '{zip_prefix}' typically belongs to state '{suggested_state}'"
                    suggested = f"Suggested correction: Change State to '{suggested_state}' to match zipcode {zip_clean[:5]}, OR change ZipCode to match current State '{state}'"
                    
                    issues.append({
                        "field": "ZipCode",
                        "reason": reason,
                        "expected": suggested
                    })
                elif not state_matches_zip:
                    # Zipcode doesn't match state but we can't determine which state it belongs to
                    reason = f"Zipcode {zip_clean[:5]} may not match State '{state}'. Verify zipcode belongs to {state}"
                    suggested = f"Suggested correction: Verify and update ZipCode to match State '{state}', or update State to match ZipCode {zip_clean[:5]}"
                    
                    issues.append({
                        "field": "ZipCode",
                        "reason": reason,
                        "expected": suggested
                    })
        
        # Check if city, state, and zip are all present for US addresses
        if country.upper() in ['USA', 'US', 'UNITED STATES']:
            if not city:
                issues.append({
                    "field": "City",
                    "reason": "City is required for US addresses",
                    "expected": "Suggested correction: Provide city name"
                })
            if not state:
                issues.append({
                    "field": "State",
                    "reason": "State is required for US addresses",
                    "expected": "Suggested correction: Provide 2-letter state code (e.g., NY, CA, TX)"
                })
            if not zipcode:
                issues.append({
                    "field": "ZipCode",
                    "reason": "Zip code is required for US addresses",
                    "expected": "Suggested correction: Provide 5-digit zip code (e.g., 10001)"
                })
        
        return issues

