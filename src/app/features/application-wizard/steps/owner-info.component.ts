import { Component, input, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { errorMessage } from '../../../shared/validators/validation-messages';
import { OwnerForm } from '../wizard.forms';

@Component({
  selector: 'app-owner-info-step',
  imports: [ReactiveFormsModule],
  template: `
    <fieldset [formGroup]="form()">
      <legend class="h5 mb-3">Owner information</legend>
      <div class="row g-3">
        <div class="col-md-6">
          <label for="ownerName" class="form-label">Full name</label>
          <input
            id="ownerName"
            class="form-control"
            formControlName="ownerName"
            autocomplete="name"
            [class.is-invalid]="error('ownerName', 'Owner name')"
            aria-describedby="ownerName-error"
          />
          @if (error('ownerName', 'Owner name'); as msg) {
            <div id="ownerName-error" class="invalid-feedback">{{ msg }}</div>
          }
        </div>
        <div class="col-md-6">
          <label for="ownerEmail" class="form-label">Email</label>
          <input
            id="ownerEmail"
            type="email"
            class="form-control"
            formControlName="ownerEmail"
            autocomplete="email"
            [class.is-invalid]="error('ownerEmail', 'Email')"
            aria-describedby="ownerEmail-error"
          />
          @if (error('ownerEmail', 'Email'); as msg) {
            <div id="ownerEmail-error" class="invalid-feedback">{{ msg }}</div>
          }
        </div>
        <div class="col-md-6">
          <label for="ownerPhone" class="form-label">Phone</label>
          <input
            id="ownerPhone"
            type="tel"
            class="form-control"
            formControlName="ownerPhone"
            placeholder="555-555-0100"
            autocomplete="tel"
            [class.is-invalid]="error('ownerPhone', 'Phone')"
            aria-describedby="ownerPhone-error"
          />
          @if (error('ownerPhone', 'Phone'); as msg) {
            <div id="ownerPhone-error" class="invalid-feedback">{{ msg }}</div>
          }
        </div>
        <div class="col-md-6">
          <label for="ownerSsn" class="form-label">Social Security Number</label>
          <div class="input-group has-validation">
            <input
              id="ownerSsn"
              [type]="showSsn() ? 'text' : 'password'"
              class="form-control font-monospace"
              formControlName="ownerSsn"
              placeholder="123-45-6789"
              autocomplete="off"
              inputmode="numeric"
              [class.is-invalid]="error('ownerSsn', 'SSN')"
              aria-describedby="ownerSsn-help ownerSsn-error"
            />
            <button
              type="button"
              class="btn btn-outline-secondary"
              [attr.aria-pressed]="showSsn()"
              aria-controls="ownerSsn"
              (click)="showSsn.set(!showSsn())"
            >
              {{ showSsn() ? 'Hide' : 'Show' }}
            </button>
            @if (error('ownerSsn', 'SSN'); as msg) {
              <div id="ownerSsn-error" class="invalid-feedback">{{ msg }}</div>
            }
          </div>
          <div id="ownerSsn-help" class="form-text">Sensitive — not included in auto-saved drafts.</div>
        </div>
      </div>
    </fieldset>
  `,
})
export class OwnerInfoComponent {
  readonly form = input.required<OwnerForm>();
  readonly showSsn = signal(false);

  error(name: keyof OwnerForm['controls'], label: string): string | null {
    return errorMessage(this.form().controls[name], label);
  }
}
