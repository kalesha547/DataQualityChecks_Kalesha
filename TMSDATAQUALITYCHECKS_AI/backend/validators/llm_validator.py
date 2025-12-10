from typing import Dict, Any, List
import json
import os


class LLMValidator:
    """
    Uses open-source LLM (phi-3-mini or qwen2.5-1.5B-instruct) for reasoning
    about data quality issues.
    """
    
    def __init__(self):
        self.model_loaded = False
        self.model = None
        self.tokenizer = None
        self.torch = None
        self.use_llm = os.getenv("USE_LLM_VALIDATOR", "false").lower() == "true"
        
        if self.use_llm:
            try:
                from transformers import AutoModelForCausalLM, AutoTokenizer
                try:
                    import torch
                    self.torch = torch
                except ImportError:
                    self.torch = None
                
                # Use a small model - phi-3-mini or qwen2.5-1.5B-instruct
                model_name = os.getenv("LLM_MODEL", "microsoft/phi-3-mini-4k-instruct")
                
                print(f"Loading LLM model: {model_name}")
                self.tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
                if self.torch and self.torch.cuda.is_available():
                    self.model = AutoModelForCausalLM.from_pretrained(
                        model_name,
                        torch_dtype=self.torch.float16,
                        device_map="auto",
                        trust_remote_code=True
                    )
                else:
                    self.model = AutoModelForCausalLM.from_pretrained(
                        model_name,
                        trust_remote_code=True
                    )
                self.model_loaded = True
                print("LLM model loaded successfully")
            except Exception as e:
                print(f"Warning: Could not load LLM model: {e}")
                print("LLM validator will be disabled. Set USE_LLM_VALIDATOR=true to enable.")
                self.use_llm = False
    
    def validate(self, record: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Use LLM to identify data quality issues.
        Returns list of issues found.
        """
        if not self.use_llm or not self.model_loaded:
            return []  # Skip if LLM not available
        
        try:
            # Prepare prompt
            prompt = self._create_prompt(record)
            
            # Generate response
            inputs = self.tokenizer(prompt, return_tensors="pt", truncation=True, max_length=2048)
            
            if self.torch:
                with self.torch.no_grad():
                    outputs = self.model.generate(
                        **inputs,
                        max_new_tokens=512,
                        temperature=0.3,
                        do_sample=True
                    )
            else:
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=512,
                    temperature=0.3,
                    do_sample=True
                )
            
            response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            # Extract JSON from response
            issues = self._parse_response(response, record)
            
            return issues
        
        except Exception as e:
            print(f"Error in LLM validation: {e}")
            return []
    
    def _create_prompt(self, record: Dict[str, Any]) -> str:
        """
        Create prompt for LLM validation.
        """
        record_json = json.dumps(record, indent=2)
        
        prompt = f"""You are a data quality expert. Analyze the following record JSON and identify any inconsistencies, errors, or data quality issues.

Record:
{record_json}

Identify issues in:
- Name plausibility and spelling
- Gender mismatch (especially in Wife Name field)
- Address correctness and format
- City-State-Country-Zip relationships
- Email structure
- Any other data quality issues

Return a JSON array of issues in this format:
[
  {{
    "field": "Field Name",
    "reason": "Description of the issue",
    "expected": "What should be expected"
  }}
]

If no issues are found, return an empty array [].

Response (JSON only):"""
        
        return prompt
    
    def _parse_response(self, response: str, record: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Parse LLM response and extract issues.
        """
        issues = []
        
        try:
            # Try to extract JSON from response
            # Look for JSON array pattern
            json_start = response.find('[')
            json_end = response.rfind(']') + 1
            
            if json_start != -1 and json_end > json_start:
                json_str = response[json_start:json_end]
                parsed_issues = json.loads(json_str)
                
                if isinstance(parsed_issues, list):
                    for issue in parsed_issues:
                        if isinstance(issue, dict) and "field" in issue:
                            issues.append({
                                "field": issue.get("field", "Unknown"),
                                "reason": issue.get("reason", ""),
                                "expected": issue.get("expected", "")
                            })
        except Exception as e:
            print(f"Error parsing LLM response: {e}")
        
        return issues

