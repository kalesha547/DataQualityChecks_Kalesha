import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DescriptionIssue {
  field: string;
  reason: string;
  suggestedValue: string;
}

export interface ValidationResult {
  TicketID: string;
  [key: string]: any;
  Status: string;
  Filename: string;
  Description: DescriptionIssue[];
}

export interface ValidationResponse {
  results: ValidationResult[];
  total_rows: number;
  filename: string;
}

@Injectable({
  providedIn: 'root'
})
export class CsvUploadService {
  private apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  validateCsv(file: File): Observable<ValidationResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ValidationResponse>(`${this.apiUrl}/validate-csv`, formData);
  }
}

