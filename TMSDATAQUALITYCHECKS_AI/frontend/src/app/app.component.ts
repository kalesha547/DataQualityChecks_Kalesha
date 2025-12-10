import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="container">
      <header style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #007bff; margin-bottom: 10px; font-size: 24px;">CSV Data Quality Validator</h1>
        <p style="color: #666; font-size: 14px;">Validate CSV data using AI-powered quality checks</p>
      </header>
      <router-outlet></router-outlet>
    </div>
  `,
  styles: []
})
export class AppComponent {
  title = 'CSV Data Quality Validator';
}

