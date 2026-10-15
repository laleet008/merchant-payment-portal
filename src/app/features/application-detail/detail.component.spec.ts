import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ApplicationDetailComponent } from './detail.component';
import { ApplicationService } from '../../core/services/application.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/auth/auth.service';
import { UserRole } from '../../core/models/user.model';
import { MerchantApplication } from '../../core/models/merchant-application.model';

const application: MerchantApplication = {
  id: 'app-001',
  businessName: 'Acme Retail Ltd',
  businessType: 'RETAIL',
  annualRevenue: 500000,
  taxId: '12-3456789',
  bankAccount: '000123456789',
  routingNumber: '990004321',
  ownerName: 'Jane Smith',
  ownerEmail: 'jane@acmeretail.example',
  ownerPhone: '555-0100',
  ownerSsn: '900-00-1234',
  status: 'PENDING_REVIEW',
  submittedBy: 'user-sales-1',
  assignedReviewer: 'user-reviewer-1',
  createdAt: '2026-10-01T09:00:00Z',
  updatedAt: '2026-10-10T14:30:00Z',
  riskHistory: [],
};

describe('ApplicationDetailComponent', () => {
  async function render(role: UserRole, app: MerchantApplication = application) {
    const submitReviewDecision = vi.fn(() => of({ ...app, status: 'APPROVED' as const }));
    TestBed.configureTestingModule({
      imports: [ApplicationDetailComponent],
      providers: [
        provideRouter([{ path: 'applications/:id', component: ApplicationDetailComponent }]),
        { provide: ApplicationService, useValue: { getApplication: () => of(app), submitReviewDecision } },
        { provide: AuthService, useValue: { hasRole: (...roles: UserRole[]) => roles.includes(role) } },
        { provide: UserService, useValue: { displayName: (id: string | null) => id ?? '—', users: signal([]) } },
      ],
    });
    const fixture = TestBed.createComponent(ApplicationDetailComponent);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement, submitReviewDecision };
  }

  it('does not render the review panel in the DOM for SALES', async () => {
    const { el } = await render('SALES', { ...application, ownerSsn: null, taxId: '****6789' });
    expect(el.textContent).toContain('Acme Retail Ltd');
    expect(el.querySelector('[data-testid="review-panel"]')).toBeNull();
    expect(el.querySelector('#review')).toBeNull();
    expect(el.querySelector('[data-testid="ssn-restricted"]')).not.toBeNull();
  });

  it('renders the review panel for REVIEWER', async () => {
    const { el } = await render('REVIEWER');
    expect(el.querySelector('[data-testid="review-panel"]')).not.toBeNull();
  });

  it('masks sensitive fields by default', async () => {
    const { el } = await render('ADMIN');
    expect(el.textContent).not.toContain('900-00-1234');
    expect(el.textContent).not.toContain('000123456789');
  });

  it('blocks submission until the review form is valid', async () => {
    const { fixture, submitReviewDecision } = await render('REVIEWER');
    fixture.componentInstance.submitReview();
    expect(submitReviewDecision).not.toHaveBeenCalled();

    fixture.componentInstance.reviewForm.setValue({ decision: 'APPROVED', note: 'All documents verified.' });
    fixture.componentInstance.submitReview();
    expect(submitReviewDecision).toHaveBeenCalledWith('app-001', 'APPROVED', 'All documents verified.');
    expect(fixture.componentInstance.app()?.status).toBe('APPROVED');
  });
});
