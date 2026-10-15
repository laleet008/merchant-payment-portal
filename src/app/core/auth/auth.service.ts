import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, shareReplay, tap, throwError } from 'rxjs';
import { LoginResponse, User, UserRole } from '../models/user.model';

// Tokens go in sessionStorage, not localStorage: they're per-tab and gone when
// the tab closes, so a leaked token doesn't hang around. Still readable by
// XSS though - see README for the cookie-based alternative.
export const ACCESS_TOKEN_KEY = 'mp.accessToken';
export const REFRESH_TOKEN_KEY = 'mp.refreshToken';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _currentUser = signal<User | null>(null);
  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this._currentUser() !== null);
  readonly userRole = computed(() => this._currentUser()?.role ?? null);

  // shared between callers so concurrent 401s only refresh once
  private refreshInFlight$: Observable<string> | null = null;

  hasRole(...roles: UserRole[]): boolean {
    const role = this.userRole();
    return role !== null && roles.includes(role);
  }

  accessToken(): string | null {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  }

  login(email: string, password: string): Observable<User> {
    return this.http.post<LoginResponse>('/api/auth/login', { email, password }).pipe(
      tap(({ accessToken, refreshToken, user }) => {
        sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        this._currentUser.set(user);
      }),
      map(({ user }) => user),
    );
  }

  logout(): void {
    const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      this.http.post('/api/auth/logout', { refreshToken }).subscribe({ error: () => undefined });
    }
    this.clearSession();
    this.router.navigate(['/login']);
  }

  refreshAccessToken(): Observable<string> {
    if (this.refreshInFlight$) return this.refreshInFlight$;

    const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    this.refreshInFlight$ = this.http
      .post<{ accessToken: string }>('/api/auth/refresh', { refreshToken })
      .pipe(
        map(({ accessToken }) => accessToken),
        tap((accessToken) => {
          sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
          this._currentUser.set(decodeUser(accessToken) ?? this._currentUser());
        }),
        catchError((error: unknown) => {
          this.logout();
          return throwError(() => error);
        }),
        finalize(() => (this.refreshInFlight$ = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.refreshInFlight$;
  }

  restoreSession(): void {
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return;
    const user = decodeUser(token);
    if (user) {
      // if it's expired the interceptor will refresh on the first 401
      this._currentUser.set(user);
    } else {
      this.clearSession();
    }
  }

  private clearSession(): void {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    this._currentUser.set(null);
  }
}

// No signature check here - it's only used for the UI, the server verifies.
export function decodeUser(token: string): User | null {
  try {
    const segment = token.split('.')[1];
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(segment.length / 4) * 4, '=');
    const payload = JSON.parse(atob(base64)) as { user?: User };
    const user = payload.user;
    return user && typeof user.id === 'string' && typeof user.role === 'string' ? user : null;
  } catch {
    return null;
  }
}
