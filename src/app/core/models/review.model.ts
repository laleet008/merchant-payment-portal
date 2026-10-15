export type ReviewDecision = 'APPROVED' | 'REJECTED';

export interface RiskHistoryEntry {
  date: string;
  reviewer: string;
  note: string;
  decision: ReviewDecision | null;
}

export interface ReviewRequest {
  decision: ReviewDecision;
  note: string;
}
