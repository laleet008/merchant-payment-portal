import { Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BUSINESS_TYPES } from '../../../core/models/merchant-application.model';
import { errorMessage } from '../../../shared/validators/validation-messages';
import { BusinessForm } from '../wizard.forms';

@Component({
  selector: 'app-business-info-step',
  imports: [ReactiveFormsModule],
  template: `
    <fieldset [formGroup]="form()">
      <legend class="h5 mb-3">Business information</legend>
      <div class="row g-3">
        <div class="col-12">
          <label for="businessName" class="form-label">Legal business name</label>
          <input
            id="businessName"
            class="form-control"
            formControlName="businessName"
            autocomplete="organization"
            [class.is-invalid]="error('businessName', 'Business name')"
            aria-describedby="businessName-error"
          />
          @if (error('businessName', 'Business name'); as msg) {
            <div id="businessName-error" class="invalid-feedback">{{ msg }}</div>
          }
        </div>
        <div class="col-md-6">
          <label for="businessType" class="form-label">Business type</label>
          <select
            id="businessType"
            class="form-select"
            formControlName="businessType"
            [class.is-invalid]="error('businessType', 'Business type')"
            aria-describedby="businessType-error"
          >
            <option value="" disabled>Select…</option>
            @for (type of businessTypes; track type.value) {
              <option [value]="type.value">{{ type.label }}</option>
            }
          </select>
          @if (error('businessType', 'Business type'); as msg) {
            <div id="businessType-error" class="invalid-feedback">{{ msg }}</div>
          }
        </div>
        <div class="col-md-6">
          <label for="annualRevenue" class="form-label">Annual revenue (USD)</label>
          <div class="input-group has-validation">
            <span class="input-group-text">$</span>
            <input
              id="annualRevenue"
              type="number"
              min="1"
              step="1"
              inputmode="numeric"
              class="form-control"
              formControlName="annualRevenue"
              [class.is-invalid]="error('annualRevenue', 'Annual revenue')"
              aria-describedby="annualRevenue-error"
            />
            @if (error('annualRevenue', 'Annual revenue'); as msg) {
              <div id="annualRevenue-error" class="invalid-feedback">{{ msg }}</div>
            }
          </div>
        </div>
        <div class="col-md-6">
          <label for="taxId" class="form-label">Federal tax ID (EIN)</label>
          <input
            id="taxId"
            class="form-control"
            formControlName="taxId"
            placeholder="12-3456789"
            autocomplete="off"
            inputmode="numeric"
            [class.is-invalid]="error('taxId', 'Tax ID')"
            aria-describedby="taxId-help taxId-error"
          />
          <div id="taxId-help" class="form-text">Sensitive — not included in auto-saved drafts.</div>
          @if (error('taxId', 'Tax ID'); as msg) {
            <div id="taxId-error" class="invalid-feedback">{{ msg }}</div>
          }
        </div>
      </div>
    </fieldset>
  `,
})
export class BusinessInfoComponent {
  readonly form = input.required<BusinessForm>();
  readonly businessTypes = BUSINESS_TYPES;

  error(name: keyof BusinessForm['controls'], label: string): string | null {
    return errorMessage(this.form().controls[name], label);
  }
}
