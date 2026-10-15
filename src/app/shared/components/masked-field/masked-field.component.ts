import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { UserRole } from '../../../core/models/user.model';

// UI masking only - the real restriction is server side
@Component({
  selector: 'app-masked-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="masked-field d-inline-flex align-items-center gap-2">
      <span class="font-monospace" data-testid="masked-value">
        @if (revealed()) {
          {{ value() }}
        } @else {
          {{ maskedValue() }}
        }
      </span>
      @if (canReveal() && value()) {
        <button
          type="button"
          class="btn btn-sm btn-link p-0 text-decoration-none"
          [attr.aria-label]="(revealed() ? 'Hide ' : 'Reveal ') + label()"
          [attr.aria-pressed]="revealed()"
          (click)="toggle()"
        >
          {{ revealed() ? 'Hide' : 'Reveal' }}
        </button>
      }
    </span>
  `,
})
export class MaskedFieldComponent {
  private readonly auth = inject(AuthService);

  readonly value = input<string | null | undefined>('');
  readonly label = input('value');
  /** Roles allowed to reveal this field. Defaults to REVIEWER and ADMIN. */
  readonly revealRoles = input<UserRole[]>(['REVIEWER', 'ADMIN']);
  readonly visibleChars = input(4);

  readonly revealed = signal(false);

  readonly canReveal = computed(() => this.auth.hasRole(...this.revealRoles()));

  readonly maskedValue = computed(() => {
    const value = this.value();
    if (!value) return '—';
    const chars = value.replace(/[^0-9A-Za-z]/g, '');
    const tail = chars.slice(-this.visibleChars());
    return '•'.repeat(Math.max(chars.length - tail.length, 4)) + tail;
  });

  toggle(): void {
    if (!this.canReveal()) return;
    this.revealed.update((r) => !r);
  }
}
