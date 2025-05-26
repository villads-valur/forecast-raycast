export interface PaginatedResponse<T> {
  pageContents: T[];
  totalPages: number;
  totalItems: number;
}

export interface ProjectV1 {
  id: number;
  company_project_id: number;
  name: string;
  connected_project: number; // ID of connected project
  stage: "PLANNING" | "RUNNING" | "HALTED" | "DONE";
  status: "GREEN" | "YELLOW" | "RED";
  status_description: string;
  description: string;
  priority_level_id: number;
  color: string;
  estimation_units: "HOURS" | "POINTS";
  minutes_per_estimation_point: number;
  budget: number; // Double
  billable: boolean; // Deprecated
  budget_type: "FIXED_PRICE" | "NON_BILLABLE" | "TIME_AND_MATERIALS" | "RETAINER";
  use_sprints: boolean;
  sprint_length: number;
  start_date: Date;
  end_date: Date;
  card_levels: number; // deprecated. Use 'task_levels' instead
  task_levels: 1 | 2;
  client: number; // ID of client
  rate_card: number; // ID of rate card
  remaining_auto_calculated: boolean;
  use_project_allocations: boolean;
  use_baseline: boolean;
  baseline_win_chance: number; // Between 0.0 and 1.0
  baseline_target: number; // Same as budget if budget_type = FIXED_PRICE
  labels: number[]; // List ID of labels
  external_refs: number[]; // List of references to other systems, the specific type can be defined as needed
  progress: number; // Requires the 'includeProgress' query parameter. Cached for 10 min
  default_period_periodicity: "DAILY" | "WEEKLY" | "MONTHLY";
  default_period_length: number;
  default_period_budget_type: "FIXED_HOURS" | "FIXED_PRICE" | "TIME_AND_MATERIALS";
  default_period_hours_amount: number;
  default_period_price_amount: number;
  created_by: number; // ID of person
  updated_by: number; // ID of person
  created_at: Date;
  updated_at: Date;
}

export type TaskV3Dto = Partial<TaskV3>;

export interface TaskV3 {
  id: number;
  company_card_id?: number; // only v2
  company_task_id: number;
  title: string;
  description: string;
  project_id: number; // ID of project
  parent_task_id: number; // ID of parent task
  role: number; // ID of role
  low_estimate?: number; // only v2, Decimal
  high_estimate?: number; // only v2, Decimal
  forecast?: number; // only v2, Decimal
  estimate?: number; // only v3, Decimal
  remaining: number; // Decimal
  approved: boolean;
  start_date: Date;
  end_date: Date;
  bug: boolean;
  high_priority: boolean;
  un_billable: boolean;
  blocked: boolean;
  sprint: number; // ID of sprint
  workflow_column: number; // ID of workflow column
  milestone: number; // ID of milestone
  assigned_persons: number[]; // List ID of assigned persons
  labels: number[]; // List ID of labels
  owner_id: number; // ID of person
  created_by: number; // ID of person
  updated_by: number; // ID of person
  created_at: Date;
  updated_at: Date;
}

export interface PersonV2 {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
  user_type: "SYSTEM" | "VIRTUAL" | "CLIENT" | "COLLABORATOR" | "MANAGER" | "CONTROLLER" | "ADMIN" | "COORDINATOR";
  client_id?: number; // Optional as it may not apply to all user types
  holiday_calendar_id?: number;
  // Assuming standard workweek fields for simplicity; these could be boolean or number based on work hours
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
  active: boolean;
  // Assuming `default_role` is an object with a known structure; you may need to define this further
  default_role: object;
  department_id: number;
  cost: number; // Assuming decimal is represented as a number in TypeScript
  language: "SPANISH" | "DANISH" | "ENGLISH_EU" | "ENGLISH_UK" | "ENGLISH_US";
  start_date: string; // Assuming ISO 8601 string format
  end_date: string; // Assuming ISO 8601 string format
  permissions: string[];
  is_system_user: boolean;
  created_by: number;
  updated_by: number;
  created_at: Date;
  updated_at: Date;
}

export type ProjectWorkflowColumnCategory = "TODO" | "INPROGRESS" | "DONE";

export type ProjectWorkflowColumn = {
  id: number;
  connected_project_workflow_column: number; // ID of connected project workflow column
  name: string;
  category: ProjectWorkflowColumnCategory;
  sort_order: number;
  created_by: number; // ID of person
  updated_by: number; // ID of person
  created_at: Date;
  updated_at: Date;
};
