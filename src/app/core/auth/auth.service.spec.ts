import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { ACCESS_TOKEN_KEY, AuthService, REFRESH_TOKEN_KEY } from './auth.service';
import { User, UserRole } from '../models/user.model';

const user = (role: UserRole): User => ({ id: `u-${role}`, name: 'Test', email: 't@portal.example', role });

/** Builds an unsigned JWT-shaped token carrying a `user` claim. */
const fakeJwt = (u: User) =>
  ['e30', btoa(JSON.stringify({ sub: u.id, user: u })).replace(/=+$/, ''), 'sig'].join('.');

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  it('login() stores both tokens in sessionStorage and sets currentUser', () => {
    const sales = user('SALES');
    service.login('alice@portal.example', 'pw').subscribe();

    const req = http.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'alice@portal.example', password: 'pw' });
    req.flush({ accessToken: 'access-1', refreshToken: 'refresh-1', user: sales });

    expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBe('access-1');
    expect(sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-1');
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(service.currentUser()).toEqual(sales);
    expect(service.isLoggedIn()).toBe(true);
    expect(service.userRole()).toBe('SALES');
  });

  it('logout() clears sessionStorage, resets the user and navigates to /login', () => {
    service.login('a@portal.example', 'pw').subscribe();
    http.expectOne('/api/auth/login').flush({ accessToken: 'a', refreshToken: 'r', user: user('ADMIN') });

    service.logout();
    http.expectOne('/api/auth/logout').flush(null);

    expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it.each<[UserRole, UserRole[], boolean]>([
    ['SALES', ['SALES'], true],
    ['SALES', ['REVIEWER', 'ADMIN'], false],
    ['REVIEWER', ['REVIEWER', 'ADMIN'], true],
    ['REVIEWER', ['SALES'], false],
    ['ADMIN', ['SALES', 'ADMIN'], true],
    ['ADMIN', ['REVIEWER'], false],
  ])('hasRole() for %s checking %j → %s', (role, allowed, expected) => {
    service.login('x@portal.example', 'pw').subscribe();
    http.expectOne('/api/auth/login').flush({ accessToken: 'a', refreshToken: 'r', user: user(role) });
    expect(service.hasRole(...allowed)).toBe(expected);
  });

  it('hasRole() is false when nobody is signed in', () => {
    expect(service.hasRole('SALES', 'REVIEWER', 'ADMIN')).toBe(false);
  });

  it('refreshAccessToken() POSTs the refresh token and stores the new access token', () => {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, 'old');
    sessionStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-1');
    const fresh = fakeJwt(user('REVIEWER'));
    let emitted: string | undefined;

    service.refreshAccessToken().subscribe((t) => (emitted = t));

    const req = http.expectOne('/api/auth/refresh');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refreshToken: 'refresh-1' });
    req.flush({ accessToken: fresh });

    expect(emitted).toBe(fresh);
    expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBe(fresh);
  });

  it('refreshAccessToken() shares a single request between concurrent callers', () => {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-1');
    const results: string[] = [];
    service.refreshAccessToken().subscribe((t) => results.push(t));
    service.refreshAccessToken().subscribe((t) => results.push(t));

    http.expectOne('/api/auth/refresh').flush({ accessToken: 'new' });
    expect(results).toEqual(['new', 'new']);
  });

  it('refreshAccessToken() logs out and errors when the refresh is rejected', () => {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, 'old');
    sessionStorage.setItem(REFRESH_TOKEN_KEY, 'revoked');
    const onError = vi.fn();

    service.refreshAccessToken().subscribe({ error: onError });
    http.expectOne('/api/auth/refresh').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/auth/logout').flush(null);

    expect(onError).toHaveBeenCalled();
    expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('restoreSession() rebuilds currentUser from the stored access token', () => {
    const reviewer = user('REVIEWER');
    sessionStorage.setItem(ACCESS_TOKEN_KEY, fakeJwt(reviewer));
    service.restoreSession();
    expect(service.currentUser()).toEqual(reviewer);
  });

  it('restoreSession() discards a malformed token', () => {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, 'not-a-jwt');
    sessionStorage.setItem(REFRESH_TOKEN_KEY, 'r');
    service.restoreSession();
    expect(service.currentUser()).toBeNull();
    expect(sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
  });
});
