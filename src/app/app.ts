import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <a class="visually-hidden-focusable position-absolute p-2 bg-white" href="#main">Skip to content</a>
    @if (auth.currentUser(); as user) {
      <nav class="navbar navbar-expand navbar-dark bg-dark">
        <div class="container-fluid gap-2">
          <a class="navbar-brand fw-semibold" routerLink="/dashboard">
            <span class="d-none d-sm-inline">Merchant Payments</span><span class="d-sm-none">MP</span>
          </a>
          <ul class="navbar-nav me-auto">
            <li class="nav-item">
              <a class="nav-link" routerLink="/dashboard" routerLinkActive="active" ariaCurrentWhenActive="page">
                Applications
              </a>
            </li>
            @if (auth.hasRole('SALES', 'ADMIN')) {
              <li class="nav-item">
                <a class="nav-link" routerLink="/applications/new" routerLinkActive="active" ariaCurrentWhenActive="page">
                  New
                </a>
              </li>
            }
          </ul>
          <span class="navbar-text text-light small d-none d-md-inline">
            {{ user.name }}
          </span>
          <span class="badge text-bg-secondary">{{ user.role }}</span>
          <button type="button" class="btn btn-sm btn-outline-light" (click)="auth.logout()">Sign out</button>
        </div>
      </nav>
    }
    <div id="main">
      <router-outlet />
    </div>
  `,
})
export class App {
  protected readonly auth = inject(AuthService);
}
