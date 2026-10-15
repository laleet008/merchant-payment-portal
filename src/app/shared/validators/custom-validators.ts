import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const digitsOf = (value: unknown): string => String(value ?? '').replace(/\D/g, '');

// empty values pass - Validators.required handles those

/** US phone: 555-555-5555, (555) 555-5555, 555.555.5555, +1 555 555 5555, or 555-0100. */
export function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  const valid = /^(\+1[\s.-]?)?((\(\d{3}\)|\d{3})[\s.-]?)?\d{3}[\s.-]?\d{4}$/.test(value);
  return valid ? null : { invalidPhone: true };
}

/** SSN: exactly 9 digits, separators allowed. */
export function ssnValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const value = String(control.value);
  return /^[\d\s-]+$/.test(value) && digitsOf(value).length === 9 ? null : { invalidSsn: true };
}

/** US bank account number: 8–17 digits, spaces/dashes allowed. */
export function bankAccountValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const value = String(control.value);
  const length = digitsOf(value).length;
  return /^[\d\s-]+$/.test(value) && length >= 8 && length <= 17 ? null : { invalidBankAccount: true };
}

/** ABA routing number: exactly 9 digits. */
export function routingNumberValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  return /^\d{9}$/.test(String(control.value).trim()) ? null : { invalidRoutingNumber: true };
}

/** US EIN (federal tax id): 12-3456789 or 123456789. */
export function einValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  return /^\d{2}-?\d{7}$/.test(String(control.value).trim()) ? null : { invalidEin: true };
}

export function notBlankValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  return typeof value === 'string' && value.length > 0 && value.trim().length === 0 ? { blank: true } : null;
}

/** Group validator for "confirm" fields. */
export function fieldsMatchValidator(key: string, confirmKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const value = group.get(key)?.value;
    const confirm = group.get(confirmKey)?.value;
    if (!value || !confirm) return null;
    return digitsOf(value) === digitsOf(confirm) ? null : { fieldsMismatch: true };
  };
}
