import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, map, merge, of, switchMap, tap } from 'rxjs';
import { ApplicationService } from '../../core/services/application.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/auth/auth.service';
import {
  APPLICATION_STATUSES,
  ApplicationFilters,
  ApplicationPage,
  ApplicationStatus,
  BUSINESS_TYPES,
  MerchantApplication,
} from '../../core/models/merchant-application.model';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  PENDING_REVIEW: 'Pending review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ReactiveFormsModule, RouterLink, StatusBadgeComponent, LoadingStateComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly appService = inject(ApplicationService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly users = inject(UserService);

  readonly statuses = APPLICATION_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }));
  readonly pageSizes = [5, 10, 25];

  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly statusFilter = signal<ApplicationStatus | undefined>(undefined);
  readonly search = signal('');
  readonly searchControl = new FormControl('', { nonNullable: true });

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly appPage = signal<ApplicationPage | null>(null);
  readonly assigningId = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);

  readonly filters = computed<ApplicationFilters>(() => ({
    page: this.page(),
    pageSize: this.pageSize(),
    status: this.statusFilter(),
    search: this.search() || undefined,
  }));
  readonly totalPages = computed(() => Math.max(1, Math.ceil((this.appPage()?.total ?? 0) / this.pageSize())));
  readonly rangeStart = computed(() => ((this.appPage()?.total ?? 0) === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1));
  readonly rangeEnd = computed(() => Math.min(this.page() * this.pageSize(), this.appPage()?.total ?? 0));

  private readonly reload$ = new Subject<void>();

  constructor() {
    this.searchControl.valueChanges
      .pipe(
        map((term) => term.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((term) => {
        this.search.set(term);
        this.page.set(1);
      });

    // switchMap drops stale responses when filters change quickly
    merge(toObservable(this.filters), this.reload$.pipe(map(() => this.filters())))
      .pipe(
        tap(() => {
          this.isLoading.set(true);
          this.error.set(null);
        }),
        switchMap((filters) =>
          this.appService.getApplications(filters).pipe(
            map((result) => ({ result, failed: false })),
            catchError(() => of({ result: null, failed: true })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ result, failed }) => {
        if (result) this.appPage.set(result);
        this.error.set(failed ? 'Failed to load applications. Please try again.' : null);
        this.isLoading.set(false);
      });
  }

  loadApplications(): void {
    this.reload$.next();
  }

  onStatusChange(status: string): void {
    const valid = APPLICATION_STATUSES.includes(status as ApplicationStatus);
    this.statusFilter.set(valid ? (status as ApplicationStatus) : undefined);
    this.page.set(1);
  }

  onPageSizeChange(size: string): void {
    this.pageSize.set(Number(size) || 10);
    this.page.set(1);
  }

  onPageChange(newPage: number): void {
    if (newPage < 1 || newPage > this.totalPages()) return;
    this.page.set(newPage);
  }

  clearFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.search.set('');
    this.statusFilter.set(undefined);
    this.page.set(1);
  }

  canReview(app: MerchantApplication): boolean {
    return this.auth.hasRole('REVIEWER', 'ADMIN') && app.status === 'PENDING_REVIEW';
  }

  canAssign(app: MerchantApplication): boolean {
    return this.auth.hasRole('ADMIN') && (app.status === 'SUBMITTED' || app.status === 'PENDING_REVIEW');
  }

  assignReviewer(app: MerchantApplication, reviewerId: string): void {
    if (!reviewerId || reviewerId === app.assignedReviewer) return;
    this.assigningId.set(app.id);
    this.actionError.set(null);
    this.appService.assignReviewer(app.id, reviewerId).subscribe({
      next: (updated) => {
        this.assigningId.set(null);
        this.appPage.update((p) => p && { ...p, data: p.data.map((a) => (a.id === updated.id ? updated : a)) });
      },
      error: () => {
        this.assigningId.set(null);
        this.actionError.set(`Could not assign a reviewer to ${app.businessName}.`);
      },
    });
  }

  businessTypeLabel(value: string): string {
    return BUSINESS_TYPES.find((t) => t.value === value)?.label ?? value;
  }

  navigateToApp(id: string, fragment?: string): void {
    this.router.navigate(['/applications', id], { fragment });
  }

  createNew(): void {
    this.router.navigate(['/applications/new']);
  }
}
