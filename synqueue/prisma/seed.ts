import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱  Seeding SynQueue database...')

  // ── Priority Settings ──────────────────────────────────────
  const priorityTypes = [
    { category: 'SENIOR_CITIZEN', enabled: true, priorityLevel: 1, servingRatio: 2 },
    { category: 'PWD',            enabled: true, priorityLevel: 1, servingRatio: 2 },
    { category: 'PREGNANT',       enabled: true, priorityLevel: 2, servingRatio: 3 },
    { category: 'VIP',            enabled: true, priorityLevel: 0, servingRatio: 1 },
  ]
  for (const p of priorityTypes) {
    await prisma.prioritySetting.upsert({
      where: { category: p.category },
      update: {},
      create: p,
    })
  }

  // ── System Settings ────────────────────────────────────────
  const settings = [
    { key: 'institution_name',   value: process.env.SEED_INSTITUTION_NAME ?? 'SynEdu University', description: 'Institution display name' },
    { key: 'queue_reset_time',   value: '00:00', description: 'Daily queue reset time (HH:mm)' },
    { key: 'max_queue_per_dept', value: '500',   description: 'Maximum queue tickets per department per day' },
    { key: 'sound_alerts',       value: 'true',  description: 'Enable sound alerts on display' },
    { key: 'display_theme',      value: 'dark',  description: 'Display screen theme' },
  ]
  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    })
  }

  // ── Departments ────────────────────────────────────────────
  const deptData = [
    { name: 'Registrar',  prefix: 'REG',  description: 'Academic records and documents',  sortOrder: 1 },
    { name: 'Cashier',    prefix: 'CASH', description: 'Payments, fees, and billing',     sortOrder: 2 },
    { name: 'Admissions', prefix: 'ADM',  description: 'Enrollment and applications',     sortOrder: 3 },
    { name: 'Guidance',   prefix: 'GDN',  description: 'Counseling and student advising', sortOrder: 4 },
    { name: 'HR',         prefix: 'HR',   description: 'Human resources and employment',  sortOrder: 5 },
    { name: 'Clinic',     prefix: 'MED',  description: 'Medical services and health',     sortOrder: 6 },
  ]

  const departments: Record<string, string> = {}
  for (const d of deptData) {
    const dept = await prisma.department.upsert({
      where: { prefix: d.prefix },
      update: {},
      create: { ...d, status: 'ACTIVE' },
    })
    departments[d.prefix] = dept.id
  }
  console.log(`✅  ${deptData.length} departments seeded`)

  // ── Users ──────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@synqueue.com'
  const adminPwd   = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123', 12)

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@synqueue.com' },
    update: {},
    create: {
      name:     'Super Administrator',
      email:    'superadmin@synqueue.com',
      password: await bcrypt.hash('SuperAdmin@123', 12),
      role:     'SUPER_ADMIN',
      isActive: true,
    },
  })

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name:     'System Administrator',
      email:    adminEmail,
      password: adminPwd,
      role:     'ADMIN',
      isActive: true,
    },
  })

  const staffUsers = [
    { name: 'Maria Santos',    email: 'maria@synqueue.com',  prefix: 'REG'  },
    { name: 'Juan Dela Cruz',  email: 'juan@synqueue.com',   prefix: 'REG'  },
    { name: 'Ana Reyes',       email: 'ana@synqueue.com',    prefix: 'CASH' },
    { name: 'Carlos Bautista', email: 'carlos@synqueue.com', prefix: 'ADM'  },
    { name: 'Elena Garcia',    email: 'elena@synqueue.com',  prefix: 'GDN'  },
  ]

  const staffPwd = await bcrypt.hash('Staff@123', 12)
  const createdStaff: Array<{ id: string; prefix: string }> = []

  for (const s of staffUsers) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        name:     s.name,
        email:    s.email,
        password: staffPwd,
        role:     'STAFF',
        isActive: true,
      },
    })
    // Assign to department
    const deptId = departments[s.prefix]
    if (deptId) {
      await prisma.userDepartment.upsert({
        where: { userId_departmentId: { userId: user.id, departmentId: deptId } },
        update: {},
        create: { userId: user.id, departmentId: deptId, isPrimary: true },
      })
    }
    createdStaff.push({ id: user.id, prefix: s.prefix })
  }
  console.log(`✅  ${staffUsers.length + 2} users seeded`)

  // ── Counters ───────────────────────────────────────────────
  const counterConfig: Record<string, number> = {
    REG: 3, CASH: 2, ADM: 2, GDN: 2, HR: 1, MED: 1,
  }

  let counterIndex = 0
  for (const [prefix, count] of Object.entries(counterConfig)) {
    const deptId = departments[prefix]
    if (!deptId) continue
    for (let n = 1; n <= count; n++) {
      const staffId = counterIndex < createdStaff.length && createdStaff[counterIndex].prefix === prefix
        ? createdStaff[counterIndex++].id
        : undefined

      await prisma.counter.upsert({
        where: { departmentId_number: { departmentId: deptId, number: n } },
        update: {},
        create: {
          name:        `Counter ${n}`,
          number:      n,
          departmentId: deptId,
          staffId:     staffId ?? null,
          status:      'INACTIVE',
          isActive:    true,
        },
      })
    }
  }
  console.log('✅  Counters seeded')

  console.log('\n  🎟  Seed complete!')
  console.log('  ──────────────────────────────────────────')
  console.log(`  Super Admin  superadmin@synqueue.com  /  SuperAdmin@123`)
  console.log(`  Admin        ${adminEmail}  /  ${process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123'}`)
  console.log(`  Staff        maria@synqueue.com  /  Staff@123`)
  console.log('  ──────────────────────────────────────────\n')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
