import { Injectable, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { UserSummary } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  readonly users = toSignal(
    this.http.get<UserSummary[]>('/api/users').pipe(catchError(() => of([] as UserSummary[]))),
    { initialValue: [] as UserSummary[] },
  );

  readonly reviewers = computed(() => this.users().filter((u) => u.role === 'REVIEWER'));

  private readonly namesById = computed(() => new Map(this.users().map((u) => [u.id, u.name])));

  displayName(id: string | null | undefined): string {
    if (!id) return '—';
    return this.namesById().get(id) ?? id;
  }
}
