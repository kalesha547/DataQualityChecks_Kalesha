import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ValidationResult, DescriptionIssue } from '../services/csv-upload.service';

@Component({
  selector: 'app-result-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="font-size: 18px;">Validation Results</h2>
        <button class="btn btn-success" (click)="exportToCsv()" style="font-size: 12px; padding: 8px 16px;">
          Export to CSV
        </button>
      </div>

      <div style="overflow-x: auto; width: 100%;">
        <table class="table" style="width: 100%; min-width: 1400px;">
          <thead>
            <tr>
              <th *ngFor="let header of displayHeaders">{{ header }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let result of results" [class.invalid-row]="result.Status === 'Invalid'">
              <td>
                <span [class]="getStatusClass(result.Status)">
                  {{ result.Status }}
                </span>
              </td>
              <td style="min-width: 80px;">{{ result.TicketID || '-' }}</td>
              <td style="min-width: 100px;">{{ result['First Name'] || result['FirstName'] || '-' }}</td>
              <td style="min-width: 100px;">{{ result['Last Name'] || result['LastName'] || '-' }}</td>
              <td style="min-width: 180px;">{{ result['EmailID'] || result['Email'] || '-' }}</td>
              <td style="min-width: 120px;">{{ result['Wife Name'] || '-' }}</td>
              <td style="min-width: 100px;">{{ result['City'] || '-' }}</td>
              <td style="min-width: 60px;">{{ result['State'] || '-' }}</td>
              <td style="min-width: 80px;">{{ result['Country'] || '-' }}</td>
              <td style="min-width: 80px;">{{ result['ZipCode'] || '-' }}</td>
              <td style="min-width: 500px; max-width: 600px; white-space: normal;">
                <div *ngIf="result.Description && result.Description.length > 0" class="description-card">
                  <div class="description-header">
                    <strong>Filename:</strong> {{ result.Filename || 'N/A' }}
                  </div>
                  <ul class="description-list">
                    <li *ngFor="let issue of result.Description" class="description-item">
                      <div class="issue-field"><strong>Field:</strong> {{ issue.field }}</div>
                      <div class="issue-reason"><strong>Reason:</strong> {{ issue.reason }}</div>
                      <div class="issue-suggested"><strong>Suggested Value:</strong> {{ issue.suggestedValue }}</div>
                    </li>
                  </ul>
                </div>
                <span *ngIf="!result.Description || result.Description.length === 0" class="no-issues">
                  No issues found
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-top: 15px; color: #666; font-size: 12px;">
        <p>Total rows: {{ results.length }}</p>
        <p>
          Valid: <span style="color: #28a745;">{{ getValidCount() }}</span> | 
          Invalid: <span style="color: #dc3545;">{{ getInvalidCount() }}</span>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .invalid-row {
      background-color: #ffe6e6 !important;
    }
    .invalid-row:hover {
      background-color: #ffcccc !important;
    }
    .description-card {
      background-color: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      padding: 8px;
      margin: 4px 0;
    }
    .description-header {
      font-size: 11px;
      color: #495057;
      margin-bottom: 6px;
      padding-bottom: 6px;
      border-bottom: 1px solid #dee2e6;
    }
    .description-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .description-item {
      background-color: white;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      padding: 6px;
      margin-bottom: 6px;
    }
    .description-item:last-child {
      margin-bottom: 0;
    }
    .issue-field, .issue-reason, .issue-suggested {
      font-size: 11px;
      margin: 3px 0;
      color: #495057;
      line-height: 1.4;
    }
    .issue-field strong, .issue-reason strong, .issue-suggested strong {
      color: #212529;
      margin-right: 4px;
      font-size: 11px;
    }
    .issue-reason {
      color: #dc3545;
    }
    .issue-suggested {
      color: #28a745;
    }
    .no-issues {
      color: #28a745;
      font-size: 11px;
      font-style: italic;
    }
  `]
})
export class ResultTableComponent {
  @Input() results: ValidationResult[] = [];

  displayHeaders: string[] = [
    'Status',
    'Ticket ID',
    'First Name',
    'Last Name',
    'Email',
    'Wife Name',
    'City',
    'State',
    'Country',
    'Zip Code',
    'Description'
  ];

  get headers(): string[] {
    if (this.results.length === 0) {
      return [];
    }
    return Object.keys(this.results[0]);
  }

  getStatusClass(status: string): string {
    return status === 'Valid' ? 'badge badge-valid' : 'badge badge-invalid';
  }

  getValidCount(): number {
    return this.results.filter(r => r.Status === 'Valid').length;
  }

  getInvalidCount(): number {
    return this.results.filter(r => r.Status === 'Invalid').length;
  }

  exportToCsv(): void {
    if (this.results.length === 0) {
      return;
    }

    const headers = this.headers.filter(h => h !== 'Description');
    const csvRows = [];

    // Add header row
    csvRows.push(headers.join(','));

    // Add data rows
    for (const result of this.results) {
      const row = headers.map(header => {
        let value = result[header] || '';
        
        // Format Description as readable text
        if (header === 'Description' && Array.isArray(value)) {
          value = value.map((issue: DescriptionIssue) => 
            `${issue.field}: ${issue.reason} (Suggested: ${issue.suggestedValue})`
          ).join('; ');
        }
        
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(row.join(','));
    }

    // Create CSV content
    const csvContent = csvRows.join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `validation_results_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

