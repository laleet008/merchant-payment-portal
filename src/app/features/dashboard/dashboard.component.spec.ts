import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { ApplicationService } from '../../core/services/application.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/auth/auth.service';
import { UserRole } from '../../core/models/user.model';
import { ApplicationPage, MerchantApplication } from '../../core/models/merchant-application.model';

const sampleApp = (overrides: Partial<MerchantApplication> = {}): MerchantApplication => ({
  id: 'app-001',
  businessName: 'Acme Retail Ltd',
  businessType: 'RETAIL',
  annualRevenue: 500000,
  taxId: '****6789',
  bankAccount: '****6789',
  routingNumber: '****4321',
  ownerName: 'Jane Smith',
  ownerEmail: 'jane@acmeretail.example',
  ownerPhone: '555-0100',
  ownerSsn: null,
  status: 'PENDING_REVIEW',
  submittedBy: 'user-sales-1',
  assignedReviewer: 'user-reviewer-1',
  createdAt: '2026-10-01T09:00:00Z',
  updatedAt: '2026-10-10T14:30:00Z',
  riskHistory: [],
  ...overrides,
});

const pageOf = (data: MerchantApplication[]): ApplicationPage => ({ data, total: data.length, page: 1, pageSize: 10 });

describe('DashboardComponent', () => {
  let responses: Subject<ApplicationPage>[];
  let getApplications: ReturnType<typeof vi.fn>;
  const role = signal<UserRole | null>('SALES');

  async function render(asRole: UserRole) {
    role.set(asRole);
    responses = [];
    getApplications = vi.fn(() => {
      const response = new Subject<ApplicationPage>();
      responses.push(response);
      return response;
    });

    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: ApplicationService, useValue: { getApplications, assignReviewer: vi.fn() } },
        {
          provide: AuthService,
          useValue: {
            userRole: role,
            hasRole: (...roles: UserRole[]) => role() !== null && roles.includes(role()!),
          },
        },
        { provide: UserService, useValue: { reviewers: signal([]), displayName: (id: string | null) => id ?? '—' } },
      ],
    });
    const fixture = TestBed.createComponent(DashboardComponent);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    return { fixture, component: fixture.componentInstance, el, latest: () => responses[responses.length - 1] };
  }

  it('renders the loading indicator while fetching', async () => {
    const { el } = await render('SALES');
    expect(getApplications).toHaveBeenCalledTimes(1);
    expect(el.querySelector('app-loading-state [role="status"]')).not.toBeNull();
    expect(el.querySelector('table')).toBeNull();
  });

  it('renders the table once data arrives', async () => {
    const { fixture, el, latest } = await render('SALES');
    latest().next(pageOf([sampleApp()]));
    await fixture.whenStable();
    expect(el.querySelector('app-loading-state')).toBeNull();
    expect(el.querySelector('tbody')!.textContent).toContain('Acme Retail Ltd');
  });

  it('renders an error banner with a retry button when loading fails', async () => {
    const { fixture, el, latest } = await render('SALES');
    latest().error(new Error('boom'));
    await fixture.whenStable();

    const banner = el.querySelector('[data-testid="error-banner"]');
    expect(banner?.textContent).toContain('Failed to load applications');
    expect(el.querySelector('[data-testid="retry"]')).not.toBeNull();
    expect(el.querySelector('app-loading-state')).toBeNull();
  });

  it('calls loadApplications() and refetches when Retry is clicked', async () => {
    const { fixture, component, el, latest } = await render('SALES');
    latest().error(new Error('boom'));
    await fixture.whenStable();

    const spy = vi.spyOn(component, 'loadApplications');
    el.querySelector<HTMLButtonElement>('[data-testid="retry"]')!.click();
    await fixture.whenStable();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(getApplications).toHaveBeenCalledTimes(2);
    expect(el.querySelector('app-loading-state')).not.toBeNull();
  });

  it('does not render the "New Application" button for REVIEWER', async () => {
    const { el } = await render('REVIEWER');
    expect(el.querySelector('[data-testid="new-application"]')).toBeNull();
  });

  it('renders the "New Application" button for SALES', async () => {
    const { el } = await render('SALES');
    expect(el.querySelector('[data-testid="new-application"]')).not.toBeNull();
  });

  it('shows the Review action only to reviewers, and only for PENDING_REVIEW rows', async () => {
    const rows = [sampleApp(), sampleApp({ id: 'app-002', businessName: 'Blue Ocean', status: 'APPROVED' })];

    const sales = await render('SALES');
    sales.latest().next(pageOf(rows));
    await sales.fixture.whenStable();
    expect(sales.el.querySelectorAll('[aria-label^="Review "]').length).toBe(0);

    TestBed.resetTestingModule();
    const reviewer = await render('REVIEWER');
    reviewer.latest().next(pageOf(rows));
    await reviewer.fixture.whenStable();
    const reviewButtons = reviewer.el.querySelectorAll('[aria-label^="Review "]');
    expect(reviewButtons.length).toBe(1);
    expect(reviewButtons[0].getAttribute('aria-label')).toBe('Review Acme Retail Ltd');
  });

  it('refetches from page 1 when the status filter changes', async () => {
    const { fixture, component } = await render('ADMIN');
    component.page.set(3);
    component.onStatusChange('APPROVED');
    await fixture.whenStable();
    expect(getApplications).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 10,
      status: 'APPROVED',
      search: undefined,
    });
  });
});
