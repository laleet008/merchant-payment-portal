import { FormControl, FormGroup } from '@angular/forms';
import {
  bankAccountValidator,
  einValidator,
  fieldsMatchValidator,
  notBlankValidator,
  phoneValidator,
  routingNumberValidator,
  ssnValidator,
} from './custom-validators';

const check = (validator: (c: FormControl) => unknown, value: unknown) => validator(new FormControl(value));

describe('custom validators', () => {
  describe('phoneValidator', () => {
    it.each(['555-555-5555', '(555) 555-5555', '555.555.5555', '5555555555', '+1 555 555 5555', '555-0100'])(
      'accepts %s',
      (value) => expect(check(phoneValidator, value)).toBeNull(),
    );

    it.each(['12345', 'phone', '555-555-55555', '(555 555-5555x', '+44 20 7946 0000'])('rejects %s', (value) =>
      expect(check(phoneValidator, value)).toEqual({ invalidPhone: true }),
    );

    it('leaves empty values to Validators.required', () => {
      expect(check(phoneValidator, '')).toBeNull();
      expect(check(phoneValidator, null)).toBeNull();
    });
  });

  describe('ssnValidator', () => {
    it('accepts 9 digits with or without separators', () => {
      expect(check(ssnValidator, '900001234')).toBeNull();
      expect(check(ssnValidator, '900-00-1234')).toBeNull();
    });

    it('rejects 8 digits', () => expect(check(ssnValidator, '90000123')).toEqual({ invalidSsn: true }));
    it('rejects 10 digits', () => expect(check(ssnValidator, '9000012345')).toEqual({ invalidSsn: true }));
    it('rejects letters even when 9 digits are present', () =>
      expect(check(ssnValidator, '900-00-1234a')).toEqual({ invalidSsn: true }));
  });

  describe('bankAccountValidator', () => {
    it('rejects 7 digits (below minimum)', () =>
      expect(check(bankAccountValidator, '1234567')).toEqual({ invalidBankAccount: true }));
    it('accepts 8 digits (minimum)', () => expect(check(bankAccountValidator, '12345678')).toBeNull());
    it('accepts 17 digits (maximum)', () => expect(check(bankAccountValidator, '12345678901234567')).toBeNull());
    it('rejects 18 digits (above maximum)', () =>
      expect(check(bankAccountValidator, '123456789012345678')).toEqual({ invalidBankAccount: true }));
    it('rejects non-numeric characters', () =>
      expect(check(bankAccountValidator, '1234ABCD5678')).toEqual({ invalidBankAccount: true }));
  });

  describe('routingNumberValidator', () => {
    it('accepts exactly 9 digits', () => expect(check(routingNumberValidator, '990004321')).toBeNull());
    it.each(['99000432', '9900043210', '99000432a', '990-004-321'])('rejects %s', (value) =>
      expect(check(routingNumberValidator, value)).toEqual({ invalidRoutingNumber: true }),
    );
  });

  describe('einValidator', () => {
    it.each(['12-3456789', '123456789'])('accepts %s', (v) => expect(check(einValidator, v)).toBeNull());
    it.each(['1-23456789', '12-345678', 'AB-CDEFGHI'])('rejects %s', (v) =>
      expect(check(einValidator, v)).toEqual({ invalidEin: true }),
    );
  });

  describe('notBlankValidator', () => {
    it('rejects whitespace-only strings', () => expect(check(notBlankValidator, '   ')).toEqual({ blank: true }));
    it('accepts real text and empty values', () => {
      expect(check(notBlankValidator, 'Acme')).toBeNull();
      expect(check(notBlankValidator, '')).toBeNull();
    });
  });

  describe('fieldsMatchValidator', () => {
    const group = (a: string, b: string) =>
      new FormGroup(
        { bankAccount: new FormControl(a), confirmBankAccount: new FormControl(b) },
        { validators: fieldsMatchValidator('bankAccount', 'confirmBankAccount') },
      );

    it('passes when the values match (ignoring separators)', () =>
      expect(group('1234-5678-90', '1234567890').errors).toBeNull());
    it('fails when the values differ', () =>
      expect(group('1234567890', '1234567891').errors).toEqual({ fieldsMismatch: true }));
    it('waits until both values are entered', () => expect(group('1234567890', '').errors).toBeNull());
  });
});
