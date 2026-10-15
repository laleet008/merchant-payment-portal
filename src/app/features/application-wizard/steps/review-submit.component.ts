import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ApplicationInput, BUSINESS_TYPES } from '../../../core/models/merchant-application.model';
import { MaskedFieldComponent } from '../../../shared/components/masked-field/masked-field.component';

@Component({
  selector: 'app-review-submit-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, MaskedFieldComponent],
  template: `
    <h2 class="h5 mb-3">Review &amp; submit</h2>
    <div class="row g-3">
      <section class="col-lg-4" aria-labelledby="sum-business">
        <div class="border rounded p-3 h-100">
          <div class="d-flex justify-content-between align-items-baseline">
            <h3 id="sum-business" class="h6 text-uppercase text-muted">Business</h3>
            <button type="button" class="btn btn-link btn-sm p-0" (click)="editStep.emit(1)">Edit</button>
          </div>
          <dl class="mb-0">
            <dt>Name</dt><dd>{{ data().businessName }}</dd>
            <dt>Type</dt><dd>{{ typeLabel() }}</dd>
            <dt>Annual revenue</dt><dd>{{ data().annualRevenue | currency: 'USD' : 'symbol' : '1.0-0' }}</dd>
            <dt>Tax ID</dt><dd><app-masked-field [value]="data().taxId" label="tax ID" [revealRoles]="[]" /></dd>
          </dl>
        </div>
      </section>
      <section class="col-lg-4" aria-labelledby="sum-owner">
        <div class="border rounded p-3 h-100">
          <div class="d-flex justify-content-between align-items-baseline">
            <h3 id="sum-owner" class="h6 text-uppercase text-muted">Owner</h3>
            <button type="button" class="btn btn-link btn-sm p-0" (click)="editStep.emit(2)">Edit</button>
          </div>
          <dl class="mb-0">
            <dt>Name</dt><dd>{{ data().ownerName }}</dd>
            <dt>Email</dt><dd class="text-break">{{ data().ownerEmail }}</dd>
            <dt>Phone</dt><dd>{{ data().ownerPhone }}</dd>
            <dt>SSN</dt><dd><app-masked-field [value]="data().ownerSsn" label="SSN" [revealRoles]="[]" /></dd>
          </dl>
        </div>
      </section>
      <section class="col-lg-4" aria-labelledby="sum-banking">
        <div class="border rounded p-3 h-100">
          <div class="d-flex justify-content-between align-items-baseline">
            <h3 id="sum-banking" class="h6 text-uppercase text-muted">Banking</h3>
            <button type="button" class="btn btn-link btn-sm p-0" (click)="editStep.emit(3)">Edit</button>
          </div>
          <dl class="mb-0">
            <dt>Routing number</dt>
            <dd><app-masked-field [value]="data().routingNumber" label="routing number" [revealRoles]="[]" /></dd>
            <dt>Account number</dt>
            <dd><app-masked-field [value]="data().bankAccount" label="account number" [revealRoles]="[]" /></dd>
          </dl>
        </div>
      </section>
    </div>
  `,
  styles: `
    dt { font-weight: 500; font-size: 0.8rem; color: var(--bs-secondary-color); }
    dd { margin-bottom: 0.6rem; }
  `,
})
export class ReviewSubmitComponent {
  readonly data = input.required<ApplicationInput>();
  readonly editStep = output<number>();

  typeLabel(): string {
    const value = this.data().businessType;
    return BUSINESS_TYPES.find((t) => t.value === value)?.label ?? value;
  }
}
