import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { catchError, of, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const API_PREFIX = '/api/';
const UNAUTHENTICATED_ENDPOINTS = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_PREFIX) || UNAUTHENTICATED_ENDPOINTS.some((url) => req.url.startsWith(url))) {
    return next(req);
  }

  const auth = inject(AuthService);
  const sentToken = auth.accessToken();

  return next(withToken(req, sentToken)).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !sentToken) {
        return throwError(() => error);
      }
      // token may already have been refreshed by another request
      const currentToken = auth.accessToken();
      const freshToken$ =
        currentToken && currentToken !== sentToken ? of(currentToken) : auth.refreshAccessToken();
      return freshToken$.pipe(switchMap((token) => next(withToken(req, token))));
    }),
  );
};

function withToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}
