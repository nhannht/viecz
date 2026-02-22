export interface User {
  id: number;
  email: string;
  name: string;
  avatar_url?: string;
  phone?: string;
  bio?: string;
  university: string;
  student_id?: string;
  is_verified: boolean;
  rating: number;
  total_tasks_completed: number;
  total_tasks_posted: number;
  total_earnings: number;
  is_tasker: boolean;
  tasker_bio?: string;
  tasker_skills?: string[];
  auth_provider: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface Category {
  id: number;
  name: string;
  name_vi: string;
  is_active: boolean;
}

export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
  id: number;
  requester_id: number;
  tasker_id?: number;
  category_id: number;
  title: string;
  description: string;
  price: number;
  location: string;
  latitude?: number;
  longitude?: number;
  status: TaskStatus;
  deadline?: string;
  completed_at?: string;
  image_urls?: string[];
  created_at: string;
  updated_at: string;
  user_has_applied?: boolean;
  is_overdue?: boolean;
}

export interface TaskListResponse {
  data: Task[];
  total: number;
  page: number;
  limit: number;
}

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected';

export interface TaskApplication {
  id: number;
  task_id: number;
  tasker_id: number;
  proposed_price?: number;
  message?: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: number;
  user_id: number;
  balance: number;
  escrow_balance: number;
  available_balance: number;
  total_deposited: number;
  total_withdrawn: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: number;
  wallet_id: number;
  transaction_id?: number;
  task_id?: number;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  escrow_before: number;
  escrow_after: number;
  description: string;
  reference_user_id?: number;
  created_at: string;
}

export interface DepositResponse {
  checkout_url: string;
  order_code: number;
}

export interface ConversationUser {
  id: number;
  name: string;
}

export interface ConversationTask {
  id: number;
  title: string;
}

export interface Conversation {
  id: number;
  task_id: number;
  poster_id: number;
  tasker_id: number;
  last_message_at?: string;
  last_message: string;
  created_at: string;
  updated_at: string;
  poster?: ConversationUser;
  tasker?: ConversationUser;
  task?: ConversationTask;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
  sender?: ConversationUser;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  task_id?: number;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
}
