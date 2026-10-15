import { AbstractControl } from '@angular/forms';

export function errorMessage(control: AbstractControl | null | undefined, label: string): string | null {
  if (!control || control.valid || !control.touched) return null;
  const errors = control.errors ?? {};
  if (errors['required']) return `${label} is required.`;
  if (errors['blank']) return `${label} cannot be blank.`;
  if (errors['minlength']) return `${label} must be at least ${errors['minlength'].requiredLength} characters.`;
  if (errors['maxlength']) return `${label} must be at most ${errors['maxlength'].requiredLength} characters.`;
  if (errors['min']) return `${label} must be at least ${errors['min'].min.toLocaleString()}.`;
  if (errors['max']) return `${label} must be at most ${errors['max'].max.toLocaleString()}.`;
  if (errors['email']) return 'Enter a valid email address.';
  if (errors['invalidPhone']) return 'Enter a valid US phone number, e.g. 555-555-0100.';
  if (errors['invalidSsn']) return 'SSN must be 9 digits, e.g. 123-45-6789.';
  if (errors['invalidEin']) return 'Tax ID (EIN) must be 9 digits, e.g. 12-3456789.';
  if (errors['invalidBankAccount']) return 'Account number must be 8–17 digits.';
  if (errors['invalidRoutingNumber']) return 'Routing number must be exactly 9 digits.';
  return `${label} is invalid.`;
}
