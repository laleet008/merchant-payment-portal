import { Routes } from '@angular/router';
import { ApplicationWizardComponent } from './wizard.component';

export const wizardRoutes: Routes = [
  { path: '', component: ApplicationWizardComponent, title: 'New application · Merchant Payments' },
];
