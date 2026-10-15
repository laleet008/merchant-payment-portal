import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ApplicationWizardComponent, DRAFT_DEBOUNCE_MS } from './wizard.component';
import { ApplicationService } from '../../core/services/application.service';
import { AuthService } from '../../core/auth/auth.service';

describe('ApplicationWizardComponent', () => {
  let saveDraft: ReturnType<typeof vi.fn>;

  function create(draft: object | null = null) {
    saveDraft = vi.fn(() => of({}));
    TestBed.configureTestingModule({
      imports: [ApplicationWizardComponent],
      providers: [
        provideRouter([]),
        {
          provide: ApplicationService,
          useValue: { getDraft: () => of(draft), saveDraft, createApplication: vi.fn(), discardDraft: () => of(undefined) },
        },
        { provide: AuthService, useValue: { hasRole: () => false } },
      ],
    });
    return TestBed.createComponent(ApplicationWizardComponent).componentInstance;
  }

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('debounces edits into a single draft save that excludes sensitive fields', () => {
    const wizard = create();
    wizard.businessForm.patchValue({ businessName: 'A' });
    wizard.businessForm.patchValue({ businessName: 'Acme', taxId: '12-3456789' });
    wizard.ownerForm.patchValue({ ownerName: 'Jane', ownerSsn: '900-00-1234' });
    expect(saveDraft).not.toHaveBeenCalled();

    vi.advanceTimersByTime(DRAFT_DEBOUNCE_MS);
    expect(saveDraft).toHaveBeenCalledTimes(1);
    const payload = saveDraft.mock.calls[0][0];
    expect(payload).toMatchObject({ businessName: 'Acme', ownerName: 'Jane' });
    for (const key of ['taxId', 'ownerSsn', 'bankAccount', 'routingNumber']) {
      expect(payload).not.toHaveProperty(key);
    }
  });

  it('does not save again when only sensitive fields change', () => {
    const wizard = create();
    wizard.businessForm.patchValue({ businessName: 'Acme' });
    vi.advanceTimersByTime(DRAFT_DEBOUNCE_MS);
    wizard.bankingForm.patchValue({ bankAccount: '12345678' });
    vi.advanceTimersByTime(DRAFT_DEBOUNCE_MS);
    expect(saveDraft).toHaveBeenCalledTimes(1);
  });

  it('restores a saved draft into the forms', () => {
    const wizard = create({ businessName: 'Restored Co', ownerEmail: 'x@restored.example' });
    expect(wizard.businessForm.controls.businessName.value).toBe('Restored Co');
    expect(wizard.ownerForm.controls.ownerEmail.value).toBe('x@restored.example');
    expect(wizard.draftRestored()).toBe(true);
  });

  it('will not advance past an invalid step, and keeps values when going back', () => {
    const wizard = create();
    wizard.next();
    expect(wizard.currentStep()).toBe(1);
    expect(wizard.businessForm.controls.businessName.touched).toBe(true);

    wizard.businessForm.setValue({
      businessName: 'Acme',
      businessType: 'RETAIL',
      annualRevenue: 1000,
      taxId: '12-3456789',
    });
    wizard.next();
    expect(wizard.currentStep()).toBe(2);
    wizard.back();
    expect(wizard.currentStep()).toBe(1);
    expect(wizard.businessForm.controls.businessName.value).toBe('Acme');
  });
});
