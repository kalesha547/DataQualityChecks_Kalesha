import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./upload/upload.component').then(m => m.UploadComponent)
  }
];

