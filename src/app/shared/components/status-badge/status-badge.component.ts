import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ApplicationStatus } from '../../../core/models/merchant-application.model';

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (status()) {
      @case ('DRAFT') {
        <span class="badge rounded-pill text-bg-light border">Draft</span>
      }
      @case ('SUBMITTED') {
        <span class="badge rounded-pill text-bg-info">Submitted</span>
      }
      @case ('PENDING_REVIEW') {
        <span class="badge rounded-pill text-bg-warning">Pending review</span>
      }
      @case ('APPROVED') {
        <span class="badge rounded-pill text-bg-success">Approved</span>
      }
      @case ('REJECTED') {
        <span class="badge rounded-pill text-bg-danger">Rejected</span>
      }
      @default {
        <span class="badge rounded-pill text-bg-secondary">{{ status() }}</span>
      }
    }
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<ApplicationStatus>();
}
