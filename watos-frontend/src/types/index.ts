export interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'review' | 'approved' | 'done' | 'blocked' | 'rejected'
  priority_score: number
  delay_prob: number
  predicted_hours: number
  pert_estimate: number
  pert_std_dev: number
  optimistic_hrs?: number
  pessimistic_hrs?: number
  deadline: string
  assignee_id: string
  complexity: number
  effort_hours: number
  actual_hours?: number
  cluster_id?: number
  required_skills: string[]
  shap_explanation?: {
    base_value: number
    contributions: Record<string, number>
    human_readable: string
  }
  project_id: string
  sla_hours?: number
  escalation_level: number
  rejection_note?: string
  reviewed_by?: string
  reviewed_at?: string
  created_at: string
}

export interface User {
  id: string
  email: string
  full_name: string
  role: 'operator' | 'admin' | 'member'
  capacity_hours: number
  skills: string[]
  is_active: boolean
  organization_id?: string
  operator_id?: string
  assigned_at?: string
}

export interface WorkloadSummary {
  user_id: string
  full_name: string
  utilization: number
  assigned_tasks: number
  skills: string[]
}

export interface AssignmentRecommendation {
  user_id: string
  full_name: string
  skill_match: number
  availability: number
  combined_score: number
  reason: string
}

export interface ModelVersion {
  id: string
  model_type: 'duration' | 'delay' | 'clustering'
  version: number
  accuracy_score: number
  is_active: boolean
  trained_at: string
}

export interface Notification {
  id: string
  type: 'delay_risk' | 'overload' | 'deadline' | 'comment' | 'mention' | 'sla_breach' | 'task_assigned' | 'new_member' | 'member_assigned' | 'task_rejected' | 'task_approved' | 'task_review'
  message: string
  is_read: boolean
  action_url?: string
  action_type?: string
  related_entity_id?: string
  created_at: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  plan: 'free' | 'pro' | 'enterprise'
  created_at: string
}

export interface MonthlyReport {
  id: string
  operator_id: string
  organization_id: string
  month_year: string
  status: 'draft' | 'submitted' | 'reviewed'
  achievements?: string
  challenges?: string
  support_needed?: string
  submitted_at: string
  reviewed_at?: string
  reviewed_by?: string
  created_at: string
}


export interface PertNodeData {
  id: string
  title: string
  es: number
  ef: number
  ls: number
  lf: number
  is_critical: boolean
  [key: string]: unknown
}


export interface PertEdgeData {
  from: string
  to: string
}

