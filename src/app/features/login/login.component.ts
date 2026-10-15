import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { UserRole } from '../../core/models/user.model';

interface DemoAccount {
  email: string;
  name: string;
  role: UserRole;
}

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <main class="login-page d-flex align-items-center justify-content-center px-3 py-5">
      <div class="card shadow-sm login-card w-100">
        <div class="card-body p-4 p-md-5">
          <h1 class="h4 mb-1">Merchant Payments Portal</h1>
          <p class="text-muted mb-4">Sign in to manage merchant applications.</p>

          @if (error()) {
            <div class="alert alert-danger py-2" role="alert">{{ error() }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="mb-3">
              <label for="email" class="form-label">Email</label>
              <input
                id="email"
                type="email"
                class="form-control"
                formControlName="email"
                autocomplete="username"
                [class.is-invalid]="showError('email')"
                aria-describedby="email-error"
              />
              @if (showError('email')) {
                <div id="email-error" class="invalid-feedback">Enter a valid email address.</div>
              }
            </div>
            <div class="mb-4">
              <label for="password" class="form-label">Password</label>
              <input
                id="password"
                type="password"
                class="form-control"
                formControlName="password"
                autocomplete="current-password"
                [class.is-invalid]="showError('password')"
                aria-describedby="password-error"
              />
              @if (showError('password')) {
                <div id="password-error" class="invalid-feedback">Password is required.</div>
              }
            </div>
            <button type="submit" class="btn btn-primary w-100" [disabled]="submitting()">
              @if (submitting()) {
                <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Signing in…
              } @else {
                Sign in
              }
            </button>
          </form>

          <hr class="my-4" />
          <p class="small text-muted mb-2">
            Demo accounts (mock API — any non-empty password works):
          </p>
          <div class="d-flex flex-wrap gap-2">
            @for (account of demoAccounts; track account.email) {
              <button type="button" class="btn btn-sm btn-outline-secondary" (click)="useDemo(account)">
                {{ account.name }} <span class="text-muted">· {{ account.role }}</span>
              </button>
            }
          </div>
        </div>
      </div>
    </main>
  `,
  styles: `
    .login-page { min-height: 100vh; }
    .login-card { max-width: 440px; }
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  // fake users from mock-api/db.json
  readonly demoAccounts: DemoAccount[] = [
    { email: 'alice@portal.example', name: 'Alice', role: 'SALES' },
    { email: 'bob@portal.example', name: 'Bob', role: 'SALES' },
    { email: 'carol@portal.example', name: 'Carol', role: 'REVIEWER' },
    { email: 'dave@portal.example', name: 'Dave', role: 'ADMIN' },
  ];

  showError(name: 'email' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.invalid && control.touched;
  }

  useDemo(account: DemoAccount): void {
    this.form.setValue({ email: account.email, password: 'demo' });
    this.submit();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.error.set(null);
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigateByUrl(this.safeReturnUrl()),
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.error.set(
          err.status === 401 ? 'Invalid email or password.' : 'Unable to sign in. Is the mock API running?',
        );
      },
    });
  }

  // only allow internal paths (no open redirect)
  private safeReturnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    const isInternal = !!url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\');
    return isInternal && !url.startsWith('/login') ? url : '/dashboard';
  }
}
