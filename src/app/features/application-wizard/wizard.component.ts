import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, concatMap, debounceTime, distinctUntilChanged, filter, map, merge, of, tap } from 'rxjs';
import { ApplicationService } from '../../core/services/application.service';
import { ApplicationDraft, ApplicationInput } from '../../core/models/merchant-application.model';
import { createWizardForms } from './wizard.forms';
import { BusinessInfoComponent } from './steps/business-info.component';
import { OwnerInfoComponent } from './steps/owner-info.component';
import { BankingInfoComponent } from './steps/banking-info.component';
import { ReviewSubmitComponent } from './steps/review-submit.component';

type DraftStatus = 'idle' | 'saving' | 'saved' | 'error';

export const DRAFT_DEBOUNCE_MS = 1500;

// not OnPush - steps need to re-render after markAllAsTouched()
@Component({
  selector: 'app-application-wizard',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    BusinessInfoComponent,
    OwnerInfoComponent,
    BankingInfoComponent,
    ReviewSubmitComponent,
  ],
  templateUrl: './wizard.component.html',
  styleUrl: './wizard.component.scss',
})
export class ApplicationWizardComponent {
  private readonly fb = inject(FormBuilder);
  private readonly appService = inject(ApplicationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly steps = ['Business', 'Owner', 'Banking', 'Review'] as const;
  readonly totalSteps = this.steps.length;
  readonly currentStep = signal(1);
  readonly furthestStep = signal(1);

  readonly draftStatus = signal<DraftStatus>('idle');
  readonly draftSavedAt = signal<Date | null>(null);
  readonly draftRestored = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly confirmed = this.fb.nonNullable.control(false);

  // forms live here so switching steps doesn't lose anything
  private readonly forms = createWizardForms(this.fb);
  readonly businessForm = this.forms.business;
  readonly ownerForm = this.forms.owner;
  readonly bankingForm = this.forms.banking;
  readonly allForms: FormGroup[] = [this.businessForm, this.ownerForm, this.bankingForm];

  readonly progress = computed(() => Math.round(((this.currentStep() - 1) / (this.totalSteps - 1)) * 100));

  constructor() {
    this.restoreDraft();

    // auto-save draft. concatMap keeps saves in order.
    merge(...this.allForms.map((form) => form.valueChanges))
      .pipe(
        debounceTime(DRAFT_DEBOUNCE_MS),
        filter(() => !this.submitting()),
        map(() => this.buildDraft()),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        tap(() => this.draftStatus.set('saving')),
        concatMap((draft) =>
          this.appService.saveDraft(draft).pipe(
            map(() => 'saved' as const),
            catchError(() => of('error' as const)),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((status) => {
        this.draftStatus.set(status);
        if (status === 'saved') this.draftSavedAt.set(new Date());
      });
  }

  get currentForm(): FormGroup | undefined {
    return this.allForms[this.currentStep() - 1];
  }

  buildPayload(): ApplicationInput {
    const business = this.businessForm.getRawValue();
    const owner = this.ownerForm.getRawValue();
    const { bankAccount, routingNumber } = this.bankingForm.getRawValue();
    return {
      businessName: business.businessName.trim(),
      businessType: business.businessType,
      annualRevenue: business.annualRevenue ?? 0,
      taxId: business.taxId.trim(),
      ownerName: owner.ownerName.trim(),
      ownerEmail: owner.ownerEmail.trim(),
      ownerPhone: owner.ownerPhone.trim(),
      ownerSsn: owner.ownerSsn.trim(),
      bankAccount: bankAccount.replace(/\D/g, ''),
      routingNumber: routingNumber.trim(),
    };
  }

  // only non-sensitive fields
  buildDraft(): ApplicationDraft {
    const { businessName, businessType, annualRevenue } = this.businessForm.getRawValue();
    const { ownerName, ownerEmail, ownerPhone } = this.ownerForm.getRawValue();
    return { businessName, businessType, annualRevenue: annualRevenue ?? undefined, ownerName, ownerEmail, ownerPhone };
  }

  onFormSubmit(): void {
    if (this.currentStep() === this.totalSteps) this.submit();
    else this.next();
  }

  next(): void {
    const form = this.currentForm;
    if (form?.invalid) {
      form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.update((s) => s + 1);
      this.furthestStep.update((f) => Math.max(f, this.currentStep()));
    }
  }

  back(): void {
    if (this.currentStep() > 1) this.currentStep.update((s) => s - 1);
  }

  goTo(step: number): void {
    if (step < 1 || step > this.furthestStep()) return;
    const blocked = this.allForms.slice(0, step - 1).findIndex((f) => f.invalid);
    this.currentStep.set(blocked === -1 ? step : blocked + 1);
  }

  submit(): void {
    const firstInvalid = this.allForms.findIndex((f) => f.invalid);
    if (firstInvalid !== -1) {
      this.allForms[firstInvalid].markAllAsTouched();
      this.currentStep.set(firstInvalid + 1);
      return;
    }
    if (!this.confirmed.value) {
      this.confirmed.markAsTouched();
      return;
    }
    this.submitting.set(true);
    this.submitError.set(null);
    this.appService
      .createApplication(this.buildPayload())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (app) => this.router.navigate(['/applications', app.id]),
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.submitError.set(
            err.status === 400
              ? 'The server rejected some of the details. Please review each step and try again.'
              : 'Submission failed. Please try again.',
          );
        },
      });
  }

  discardDraft(): void {
    this.allForms.forEach((f) => f.reset(undefined, { emitEvent: false }));
    this.confirmed.reset();
    this.currentStep.set(1);
    this.furthestStep.set(1);
    this.draftRestored.set(false);
    this.draftStatus.set('idle');
    this.draftSavedAt.set(null);
    this.appService.discardDraft().subscribe({ error: () => this.draftStatus.set('error') });
  }

  private restoreDraft(): void {
    this.appService
      .getDraft()
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(),
      )
      .subscribe((draft) => {
        if (!draft || this.allForms.some((f) => f.dirty)) return;
        const { businessName, businessType, annualRevenue, ownerName, ownerEmail, ownerPhone } = draft;
        this.businessForm.patchValue({ businessName, businessType, annualRevenue }, { emitEvent: false });
        this.ownerForm.patchValue({ ownerName, ownerEmail, ownerPhone }, { emitEvent: false });
        this.draftRestored.set(true);
        this.draftSavedAt.set(draft.updatedAt ? new Date(draft.updatedAt) : null);
      });
  }

  private focusFirstInvalid(): void {
    setTimeout(() => document.querySelector<HTMLElement>('.wizard-step .ng-invalid[formcontrolname]')?.focus());
  }
}
