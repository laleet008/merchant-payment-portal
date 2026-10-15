import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { ApplicationService } from '../../core/services/application.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/auth/auth.service';
import { BUSINESS_TYPES, MerchantApplication } from '../../core/models/merchant-application.model';
import { ReviewDecision } from '../../core/models/review.model';
import { MaskedFieldComponent } from '../../shared/components/masked-field/masked-field.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { errorMessage } from '../../shared/validators/validation-messages';
import { notBlankValidator } from '../../shared/validators/custom-validators';

@Component({
  selector: 'app-application-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MaskedFieldComponent,
    StatusBadgeComponent,
    LoadingStateComponent,
  ],
  templateUrl: './detail.component.html',
})
export class ApplicationDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly appService = inject(ApplicationService);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  readonly users = inject(UserService);

  readonly app = signal<MerchantApplication | null>(null);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly reviewing = signal(false);
  readonly reviewSuccess = signal<ReviewDecision | null>(null);
  readonly reviewError = signal<string | null>(null);

  readonly noteMaxLength = 2000;
  readonly reviewForm = this.fb.nonNullable.group({
    decision: this.fb.nonNullable.control<ReviewDecision | ''>('', Validators.required),
    note: ['', [Validators.required, notBlankValidator, Validators.minLength(10), Validators.maxLength(this.noteMaxLength)]],
  });

  readonly canReview = computed(() => this.auth.hasRole('REVIEWER', 'ADMIN'));
  readonly awaitingReview = computed(() => this.app()?.status === 'PENDING_REVIEW');
  readonly history = computed(() =>
    [...(this.app()?.riskHistory ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
  );
  readonly businessTypeLabel = computed(() => {
    const value = this.app()?.businessType;
    return BUSINESS_TYPES.find((t) => t.value === value)?.label ?? value;
  });

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id') ?? ''),
        tap(() => {
          this.isLoading.set(true);
          this.error.set(null);
          this.reviewSuccess.set(null);
        }),
        switchMap((id) =>
          this.appService.getApplication(id).pipe(
            catchError((err: HttpErrorResponse) => {
              this.error.set(
                err.status === 404
                  ? 'This application does not exist or you do not have access to it.'
                  : 'Could not load application.',
              );
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((data) => {
        this.app.set(data);
        this.isLoading.set(false);
        if (data && this.route.snapshot.fragment === 'review') {
          setTimeout(() => document.getElementById('review')?.scrollIntoView({ behavior: 'smooth' }));
        }
      });
  }

  fieldError(name: 'decision' | 'note', label: string): string | null {
    return errorMessage(this.reviewForm.controls[name], label);
  }

  submitReview(): void {
    const current = this.app();
    if (!current || this.reviewForm.invalid) {
      this.reviewForm.markAllAsTouched();
      return;
    }
    const { decision, note } = this.reviewForm.getRawValue();
    this.reviewing.set(true);
    this.reviewError.set(null);
    this.appService.submitReviewDecision(current.id, decision as ReviewDecision, note.trim()).subscribe({
      next: (updated) => {
        this.app.set(updated);
        this.reviewing.set(false);
        this.reviewSuccess.set(decision as ReviewDecision);
        this.reviewForm.reset();
      },
      error: (err: HttpErrorResponse) => {
        this.reviewing.set(false);
        this.reviewError.set(
          err.status === 409
            ? 'This application is no longer awaiting review. Reload to see its latest status.'
            : 'Could not submit the review decision. Please try again.',
        );
      },
    });
  }
}
