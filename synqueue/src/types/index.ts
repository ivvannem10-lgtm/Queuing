import type {
  User, Department, Counter, Queue, QueueLog,
  QueueTransfer, PrioritySetting, FrontlinerStatistic,
  Role, QueueStatus, PriorityType, CounterStatus, DepartmentStatus,
} from '@prisma/client'

// ── Re-exports ───────────────────────────────────────────────────────────────
export type {
  User, Department, Counter, Queue, QueueLog,
  QueueTransfer, PrioritySetting, FrontlinerStatistic,
  Role, QueueStatus, PriorityType, CounterStatus, DepartmentStatus,
}

// ── Augmented session user ───────────────────────────────────────────────────
export interface SessionUser {
  id:    string
  name:  string
  email: string
  role:  Role
}

// ── API response shapes ──────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean
  data?:   T
  error?:  string
  message?: string
}

// ── Queue with relations ─────────────────────────────────────────────────────
export interface QueueWithRelations extends Queue {
  department: Department
  counter:    Counter | null
  logs:       QueueLog[]
}

// ── Counter with relations ───────────────────────────────────────────────────
export interface CounterWithRelations extends Counter {
  department: Department
  staff:      User | null
  queues:     Queue[]
}

// ── Department with relations ────────────────────────────────────────────────
export interface DepartmentWithRelations extends Department {
  counters: CounterWithRelations[]
  _count: {
    queues: number
  }
}

// ── Staff stats ──────────────────────────────────────────────────────────────
export interface StaffStats {
  totalServed:      number
  totalSkipped:     number
  totalTransferred: number
  avgServingMs:     number
  currentServing:   QueueWithRelations | null
}

// ── Dashboard analytics ──────────────────────────────────────────────────────
export interface DashboardStats {
  totalToday:       number
  waiting:          number
  serving:          number
  completed:        number
  skipped:          number
  avgWaitMs:        number
  avgServingMs:     number
  priorityWaiting:  number
  activeCounters:   number
  onlineStaff:      number
}

// ── Socket event payloads ────────────────────────────────────────────────────
export interface QueueCreatedPayload  { queue: QueueWithRelations }
export interface QueueCalledPayload   { queue: QueueWithRelations; counterName: string }
export interface QueueUpdatedPayload  { queue: QueueWithRelations }
export interface QueueTransferredPayload {
  originalQueue: QueueWithRelations
  newQueue:      QueueWithRelations
  transfer:      QueueTransfer
}

// ── Report types ─────────────────────────────────────────────────────────────
export interface ReportFilters {
  from:         string   // ISO date
  to:           string   // ISO date
  departmentId?: string
  staffId?:     string
}

export interface HourlyData {
  hour:  number
  count: number
}

export interface DailyReport {
  date:          string
  totalQueues:   number
  completed:     number
  avgWaitMin:    number
  priorityCount: number
  peakHour:      number
}

// ── Priority display helpers ─────────────────────────────────────────────────
export const PRIORITY_LABELS: Record<PriorityType, string> = {
  NONE:           '',
  SENIOR_CITIZEN: 'Senior Citizen',
  PWD:            'Person with Disability',
  PREGNANT:       'Pregnant',
  VIP:            'VIP',
}

export const PRIORITY_COLORS: Record<PriorityType, string> = {
  NONE:           '',
  SENIOR_CITIZEN: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  PWD:            'bg-pink-500/15 text-pink-400 border-pink-500/30',
  PREGNANT:       'bg-orange-500/15 text-orange-400 border-orange-500/30',
  VIP:            'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
}

export const STATUS_COLORS: Record<QueueStatus, string> = {
  WAITING:     'bg-amber-500/15 text-amber-400 border-amber-500/30',
  SERVING:     'bg-green-500/15 text-green-400 border-green-500/30',
  COMPLETED:   'bg-slate-500/15 text-slate-400 border-slate-500/30',
  SKIPPED:     'bg-red-500/15 text-red-400 border-red-500/30',
  CANCELLED:   'bg-red-500/15 text-red-400 border-red-500/30',
  TRANSFERRED: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
}

export const SOCKET_EVENTS = {
  QUEUE_CREATED:     'queue:created',
  QUEUE_CALLED:      'queue:called',
  QUEUE_UPDATED:     'queue:updated',
  QUEUE_TRANSFERRED: 'queue:transferred',
  COUNTER_UPDATED:   'counter:updated',
  DISPLAY_REFRESH:   'display:refresh',
  STATS_UPDATE:      'stats:update',
} as const
