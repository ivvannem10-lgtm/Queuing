import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNowStrict, format, differenceInMinutes } from 'date-fns'

// ── Tailwind class merger ────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Duration formatters ──────────────────────────────────────────────────────
export function msToMinSec(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min      = Math.floor(totalSec / 60)
  const sec      = totalSec % 60
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`
}

export function msToMinutes(ms: number): string {
  const min = Math.round(ms / 60000)
  return min === 1 ? '1 min' : `${min} mins`
}

export function estimatedWait(position: number, avgServingMs: number): string {
  const ms = position * (avgServingMs || 3 * 60 * 1000)
  return msToMinutes(ms)
}

// ── Date/time helpers ────────────────────────────────────────────────────────
export function timeAgo(date: Date | string): string {
  return formatDistanceToNowStrict(new Date(date), { addSuffix: true })
}

export function formatTime(date: Date | string): string {
  return format(new Date(date), 'h:mm a')
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), 'MMM d, yyyy h:mm a')
}

export function todayLabel(): string {
  return format(new Date(), 'MMMM d, yyyy')
}

export function isoDate(date?: Date): string {
  return format(date ?? new Date(), 'yyyy-MM-dd')
}

// ── Number helpers ───────────────────────────────────────────────────────────
export function pad(n: number, length = 3): string {
  return String(n).padStart(length, '0')
}

// ── Role helpers ─────────────────────────────────────────────────────────────
import type { Role } from '@prisma/client'

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN:       'Admin',
  STAFF:       'Staff / Frontliner',
  CLIENT:      'Client',
}

export const ROLE_COLORS: Record<Role, string> = {
  SUPER_ADMIN: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  ADMIN:       'bg-blue-500/15 text-blue-400 border-blue-500/30',
  STAFF:       'bg-green-500/15 text-green-400 border-green-500/30',
  CLIENT:      'bg-slate-500/15 text-slate-400 border-slate-500/30',
}

export function isAdmin(role: Role): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN'
}

// ── API helpers ──────────────────────────────────────────────────────────────
export function ok<T>(data: T, status = 200) {
  return Response.json({ success: true, data }, { status })
}

export function err(message: string, status = 400) {
  return Response.json({ success: false, error: message }, { status })
}

export function unauthorized() {
  return err('Unauthorized', 401)
}

export function forbidden() {
  return err('Forbidden', 403)
}

export function notFound(entity = 'Resource') {
  return err(`${entity} not found`, 404)
}

// ── Audit log helper ─────────────────────────────────────────────────────────
import { prisma } from './db'

export async function audit(
  action:   string,
  entity:   string,
  entityId?: string,
  userId?:  string,
  details?: Record<string, unknown>,
) {
  await prisma.auditLog.create({
    data: { action, entity, entityId, userId, details: details ? JSON.stringify(details) : null },
  }).catch(() => {})
}

// ── QR Code data ─────────────────────────────────────────────────────────────
export function getQueueQRData(queueId: string, baseUrl: string): string {
  return `${baseUrl}/queue/status/${queueId}`
}
