import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(ACCESS_TOKEN_KEY, 'old-token');
    sessionStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-token');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => backend.verify());

  const unauthorized = { status: 401, statusText: 'Unauthorized' };

  it('attaches the Authorization header to API requests', () => {
    http.get('/api/applications').subscribe();
    const req = backend.expectOne('/api/applications');
    expect(req.request.headers.get('Authorization')).toBe('Bearer old-token');
    req.flush({});
  });

  it('does not attach the header to /auth/login', () => {
    http.post('/api/auth/login', {}).subscribe();
    const req = backend.expectOne('/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('does not leak the token to other origins', () => {
    http.get('https://third-party.example/data').subscribe();
    const req = backend.expectOne('https://third-party.example/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('on 401 refreshes the token and replays the request with it', () => {
    let body: unknown;
    http.get('/api/applications/app-001').subscribe((b) => (body = b));

    backend.expectOne('/api/applications/app-001').flush({}, unauthorized);

    const refresh = backend.expectOne('/api/auth/refresh');
    expect(refresh.request.body).toEqual({ refreshToken: 'refresh-token' });
    refresh.flush({ accessToken: 'new-token' });

    const replay = backend.expectOne('/api/applications/app-001');
    expect(replay.request.headers.get('Authorization')).toBe('Bearer new-token');
    replay.flush({ id: 'app-001' });

    expect(body).toEqual({ id: 'app-001' });
    expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBe('new-token');
  });

  it('on concurrent 401s refreshes exactly once and replays every queued request', () => {
    const urls = ['/api/applications?page=1', '/api/users', '/api/applications/app-002'];
    const results: unknown[] = [];
    urls.forEach((url) => http.get(url).subscribe((r) => results.push(r)));

    // All three fail with 401 before the refresh responds.
    urls.forEach((url) => backend.expectOne(url).flush({}, unauthorized));

    // Only ONE refresh call despite three 401s.
    const refreshes = backend.match('/api/auth/refresh');
    expect(refreshes.length).toBe(1);
    refreshes[0].flush({ accessToken: 'new-token' });

    urls.forEach((url, i) => {
      const replay = backend.expectOne(url);
      expect(replay.request.headers.get('Authorization')).toBe('Bearer new-token');
      replay.flush({ n: i });
    });
    expect(results).toHaveLength(3);
  });

  it('replays without refreshing again when the token was already refreshed meanwhile', () => {
    http.get('/api/users').subscribe();
    // Another request refreshed the token while this one was in flight.
    sessionStorage.setItem(ACCESS_TOKEN_KEY, 'already-new');
    backend.expectOne('/api/users').flush({}, unauthorized);

    backend.expectNone('/api/auth/refresh');
    const replay = backend.expectOne('/api/users');
    expect(replay.request.headers.get('Authorization')).toBe('Bearer already-new');
    replay.flush([]);
  });

  it('fails every queued request and logs out when the refresh fails', () => {
    const errors: number[] = [];
    ['/api/a', '/api/b'].forEach((url) =>
      http.get(url).subscribe({ error: (e) => errors.push(e.status ?? -1) }),
    );
    backend.expectOne('/api/a').flush({}, unauthorized);
    backend.expectOne('/api/b').flush({}, unauthorized);

    backend.expectOne('/api/auth/refresh').flush({}, unauthorized);
    backend.expectOne('/api/auth/logout').flush(null);

    expect(errors).toEqual([401, 401]);
    expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/login']);
  });

  it('does not loop when the replayed request is also rejected', () => {
    const onError = vi.fn();
    http.get('/api/applications').subscribe({ error: onError });
    backend.expectOne('/api/applications').flush({}, unauthorized);
    backend.expectOne('/api/auth/refresh').flush({ accessToken: 'new-token' });
    backend.expectOne('/api/applications').flush({}, unauthorized);

    backend.expectNone('/api/auth/refresh');
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('passes non-401 errors straight through', () => {
    const onError = vi.fn();
    http.get('/api/applications').subscribe({ error: onError });
    backend.expectOne('/api/applications').flush({}, { status: 500, statusText: 'Server Error' });
    backend.expectNone('/api/auth/refresh');
    expect(onError).toHaveBeenCalled();
  });
});
