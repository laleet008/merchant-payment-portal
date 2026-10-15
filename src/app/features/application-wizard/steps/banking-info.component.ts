import { Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { errorMessage } from '../../../shared/validators/validation-messages';
import { BankingForm } from '../wizard.forms';

@Component({
  selector: 'app-banking-info-step',
  imports: [ReactiveFormsModule],
  template: `
    <fieldset [formGroup]="form()">
      <legend class="h5 mb-1">Settlement bank account</legend>
      <p class="text-muted small mb-3">Banking details are never auto-saved; they are only sent on submit.</p>
      <div class="row g-3">
        <div class="col-md-6">
          <label for="routingNumber" class="form-label">Routing number</label>
          <input
            id="routingNumber"
            class="form-control font-monospace"
            formControlName="routingNumber"
            maxlength="9"
            inputmode="numeric"
            autocomplete="off"
            [class.is-invalid]="error('routingNumber', 'Routing number')"
            aria-describedby="routingNumber-error"
          />
          @if (error('routingNumber', 'Routing number'); as msg) {
            <div id="routingNumber-error" class="invalid-feedback">{{ msg }}</div>
          }
        </div>
        <div class="col-md-6 d-none d-md-block"></div>
        <div class="col-md-6">
          <label for="bankAccount" class="form-label">Account number</label>
          <input
            id="bankAccount"
            type="password"
            class="form-control font-monospace"
            formControlName="bankAccount"
            maxlength="20"
            inputmode="numeric"
            autocomplete="off"
            [class.is-invalid]="error('bankAccount', 'Account number')"
            aria-describedby="bankAccount-error"
          />
          @if (error('bankAccount', 'Account number'); as msg) {
            <div id="bankAccount-error" class="invalid-feedback">{{ msg }}</div>
          }
        </div>
        <div class="col-md-6">
          <label for="confirmBankAccount" class="form-label">Confirm account number</label>
          <input
            id="confirmBankAccount"
            type="password"
            class="form-control font-monospace"
            formControlName="confirmBankAccount"
            maxlength="20"
            inputmode="numeric"
            autocomplete="off"
            [class.is-invalid]="confirmError()"
            aria-describedby="confirmBankAccount-error"
          />
          @if (confirmError(); as msg) {
            <div id="confirmBankAccount-error" class="invalid-feedback">{{ msg }}</div>
          }
        </div>
      </div>
    </fieldset>
  `,
})
export class BankingInfoComponent {
  readonly form = input.required<BankingForm>();

  error(name: keyof BankingForm['controls'], label: string): string | null {
    return errorMessage(this.form().controls[name], label);
  }

  confirmError(): string | null {
    const own = this.error('confirmBankAccount', 'Confirmation');
    if (own) return own;
    const confirm = this.form().controls.confirmBankAccount;
    return confirm.touched && this.form().hasError('fieldsMismatch') ? 'Account numbers do not match.' : null;
  }
}
