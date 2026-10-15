import { FormBuilder, Validators } from '@angular/forms';
import {
  bankAccountValidator,
  einValidator,
  fieldsMatchValidator,
  notBlankValidator,
  phoneValidator,
  routingNumberValidator,
  ssnValidator,
} from '../../shared/validators/custom-validators';

export function createWizardForms(fb: FormBuilder) {
  const nnfb = fb.nonNullable;
  return {
    business: nnfb.group({
      businessName: ['', [Validators.required, notBlankValidator, Validators.minLength(2), Validators.maxLength(120)]],
      businessType: ['', Validators.required],
      annualRevenue: fb.control<number | null>(null, [
        Validators.required,
        Validators.min(1),
        Validators.max(1_000_000_000),
      ]),
      taxId: ['', [Validators.required, einValidator]],
    }),
    owner: nnfb.group({
      ownerName: ['', [Validators.required, notBlankValidator, Validators.minLength(2), Validators.maxLength(120)]],
      ownerEmail: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      ownerPhone: ['', [Validators.required, phoneValidator]],
      ownerSsn: ['', [Validators.required, ssnValidator]],
    }),
    banking: nnfb.group(
      {
        bankAccount: ['', [Validators.required, bankAccountValidator]],
        confirmBankAccount: ['', Validators.required],
        routingNumber: ['', [Validators.required, routingNumberValidator]],
      },
      { validators: fieldsMatchValidator('bankAccount', 'confirmBankAccount') },
    ),
  };
}

export type WizardForms = ReturnType<typeof createWizardForms>;
export type BusinessForm = WizardForms['business'];
export type OwnerForm = WizardForms['owner'];
export type BankingForm = WizardForms['banking'];
