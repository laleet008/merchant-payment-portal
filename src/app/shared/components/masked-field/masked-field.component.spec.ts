import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MaskedFieldComponent } from './masked-field.component';
import { AuthService } from '../../../core/auth/auth.service';
import { UserRole } from '../../../core/models/user.model';

describe('MaskedFieldComponent', () => {
  const role = signal<UserRole | null>(null);
  const authStub = { hasRole: (...roles: UserRole[]) => role() !== null && roles.includes(role()!) };

  async function render(asRole: UserRole, value = '900-00-1234') {
    role.set(asRole);
    TestBed.configureTestingModule({
      imports: [MaskedFieldComponent],
      providers: [{ provide: AuthService, useValue: authStub }],
    });
    const fixture = TestBed.createComponent(MaskedFieldComponent);
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('label', 'SSN');
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    return {
      fixture,
      text: () => el.querySelector('[data-testid="masked-value"]')!.textContent!.trim(),
      button: () => el.querySelector<HTMLButtonElement>('button'),
    };
  }

  it('renders the masked value by default, keeping only the last 4 characters', async () => {
    const { text } = await render('REVIEWER');
    expect(text()).toBe('•••••1234');
    expect(text()).not.toContain('900');
  });

  it('has no Reveal button in the DOM for SALES users', async () => {
    const { button } = await render('SALES');
    expect(button()).toBeNull();
  });

  it('shows a Reveal button for REVIEWER users', async () => {
    const { button } = await render('REVIEWER');
    expect(button()).not.toBeNull();
    expect(button()!.textContent).toContain('Reveal');
    expect(button()!.getAttribute('aria-label')).toBe('Reveal SSN');
  });

  it('shows the full value after clicking Reveal, and masks it again on Hide', async () => {
    const { fixture, text, button } = await render('ADMIN');
    button()!.click();
    await fixture.whenStable();
    expect(text()).toBe('900-00-1234');
    expect(button()!.getAttribute('aria-pressed')).toBe('true');

    button()!.click();
    await fixture.whenStable();
    expect(text()).toBe('•••••1234');
  });

  it('renders a dash when there is no value', async () => {
    const { text, button } = await render('ADMIN', '');
    expect(text()).toBe('—');
    expect(button()).toBeNull();
  });

  it('normalises values the server has already masked', async () => {
    const { text } = await render('SALES', '****6789');
    expect(text()).toBe('••••6789');
  });
});
