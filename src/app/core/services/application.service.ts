import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ApplicationDraft,
  ApplicationFilters,
  ApplicationInput,
  ApplicationPage,
  MerchantApplication,
} from '../models/merchant-application.model';
import { ReviewDecision, ReviewRequest } from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/applications';
  private readonly draftUrl = '/api/drafts/mine';

  getApplications(filters: ApplicationFilters): Observable<ApplicationPage> {
    let params = new HttpParams().set('page', filters.page).set('pageSize', filters.pageSize);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.search) params = params.set('search', filters.search);
    return this.http.get<ApplicationPage>(this.base, { params });
  }

  getApplication(id: string): Observable<MerchantApplication> {
    return this.http.get<MerchantApplication>(`${this.base}/${encodeURIComponent(id)}`);
  }

  createApplication(data: ApplicationInput): Observable<MerchantApplication> {
    return this.http.post<MerchantApplication>(this.base, data);
  }

  assignReviewer(id: string, reviewerId: string): Observable<MerchantApplication> {
    return this.http.patch<MerchantApplication>(`${this.base}/${encodeURIComponent(id)}/assign`, { reviewerId });
  }

  submitReviewDecision(id: string, decision: ReviewDecision, note: string): Observable<MerchantApplication> {
    const body: ReviewRequest = { decision, note };
    return this.http.post<MerchantApplication>(`${this.base}/${encodeURIComponent(id)}/review`, body);
  }

  getDraft(): Observable<ApplicationDraft | null> {
    return this.http.get<ApplicationDraft | null>(this.draftUrl);
  }

  saveDraft(data: ApplicationDraft): Observable<ApplicationDraft> {
    return this.http.put<ApplicationDraft>(this.draftUrl, data);
  }

  discardDraft(): Observable<void> {
    return this.http.delete<void>(this.draftUrl);
  }
}
