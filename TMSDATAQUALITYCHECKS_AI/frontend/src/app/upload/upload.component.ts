import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CsvUploadService, ValidationResult } from '../services/csv-upload.service';
import { ResultTableComponent } from '../table/result-table.component';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, ResultTableComponent],
  template: `
    <div class="card">
      <h2>Upload CSV File</h2>
      <div
        class="file-upload-area"
        [class.dragover]="isDragging"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()"
      >
        <input
          #fileInput
          type="file"
          accept=".csv"
          (change)="onFileSelected($event)"
          style="display: none"
        />
        <p *ngIf="!selectedFile">
          <strong>Click to upload</strong> or drag and drop CSV file here
        </p>
        <p *ngIf="selectedFile">
          Selected: <strong>{{ selectedFile.name }}</strong>
        </p>
      </div>

      <div *ngIf="error" class="error">{{ error }}</div>
      <div *ngIf="success" class="success">{{ success }}</div>

      <button
        class="btn btn-primary"
        (click)="uploadFile()"
        [disabled]="!selectedFile || uploading"
        style="margin-top: 15px;"
      >
        {{ uploading ? 'Validating...' : 'Validate CSV' }}
      </button>
    </div>

    <app-result-table
      *ngIf="validationResults && validationResults.length > 0"
      [results]="validationResults"
    ></app-result-table>
  `,
  styles: []
})
export class UploadComponent {
  selectedFile: File | null = null;
  isDragging = false;
  uploading = false;
  error: string | null = null;
  success: string | null = null;
  validationResults: ValidationResult[] = [];

  constructor(private csvUploadService: CsvUploadService) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.error = null;
      this.success = null;
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) {
        this.selectedFile = file;
        this.error = null;
        this.success = null;
      } else {
        this.error = 'Please select a CSV file';
      }
    }
  }

  uploadFile(): void {
    if (!this.selectedFile) {
      return;
    }

    this.uploading = true;
    this.error = null;
    this.success = null;
    this.validationResults = [];

    this.csvUploadService.validateCsv(this.selectedFile).subscribe({
      next: (response) => {
        this.uploading = false;
        this.validationResults = response.results;
        this.success = `Validation complete! Processed ${response.total_rows} rows.`;
      },
      error: (err) => {
        this.uploading = false;
        this.error = err.error?.detail || 'Error validating CSV file. Please try again.';
        console.error('Validation error:', err);
      }
    });
  }
}

