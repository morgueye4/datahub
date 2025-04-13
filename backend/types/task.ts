export interface Task {
  id: number;
  title: string;
  description: string;
  dataCid: string;
  creatorAddress: string;
  rewardPerSubmission: number;
  rewardPerReview: number;
  requiredSubmissions: number;
  requiredReviewers: number;
  deadline: number;
  status: 'open' | 'closed';
  categories: string[];
  nominatedReviewers: string[];
  contractTaskId: string | null;
  txHash: string | null;
  createdAt: Date;
  updatedAt: Date;
} 