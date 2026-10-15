import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-loading-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="loading-state" role="status" aria-live="polite">
      <div class="d-flex align-items-center gap-2 text-muted mb-3">
        <div class="spinner-border spinner-border-sm text-primary" aria-hidden="true"></div>
        <span>{{ label() }}</span>
      </div>
      @if (rows() > 0) {
        <div class="placeholder-glow" aria-hidden="true">
          @for (row of rowIndexes(); track row) {
            <div class="d-flex gap-3 mb-3">
              <span class="placeholder col-4 rounded"></span>
              <span class="placeholder col-2 rounded"></span>
              <span class="placeholder col-2 rounded"></span>
              <span class="placeholder col-3 rounded"></span>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class LoadingStateComponent {
  readonly label = input('Loading…');
  readonly rows = input(0);
  protected readonly rowIndexes = computed(() => Array.from({ length: this.rows() }, (_, i) => i));
}
