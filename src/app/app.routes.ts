import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';
import { UserRole } from './core/models/user.model';

export const appRoutes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Sign in · Merchant Payments',
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.routes').then((m) => m.dashboardRoutes),
      },
      {
        path: 'applications/new',
        canActivate: [roleGuard],
        data: { roles: ['SALES', 'ADMIN'] satisfies UserRole[] },
        loadChildren: () =>
          import('./features/application-wizard/application-wizard.routes').then((m) => m.wizardRoutes),
      },
      {
        path: 'applications/:id',
        loadChildren: () =>
          import('./features/application-detail/application-detail.routes').then((m) => m.detailRoutes),
      },
    ],
  },
  { path: '**', redirectTo: '/dashboard' },
];
