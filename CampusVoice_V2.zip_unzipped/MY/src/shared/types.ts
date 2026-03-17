export interface Complaint {
  id: number;
  complaint_id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  status: "pending" | "in-progress" | "resolved";
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
}
