import { beforeEach, describe, expect, it, vi } from 'vitest'

type Row = Record<string, any>

const users: Row[] = []
const patients: Row[] = []
const doctors: Row[] = []
const labs: Row[] = []

const redisSetex = vi.fn().mockResolvedValue('OK')

class MockDocument {
  [key: string]: any

  constructor(private rows: Row[], data: Row) {
    Object.assign(this, data)
  }

  get _id(): string {
    return this.id
  }

  set _id(value: string) {
    this.id = value
  }

  async save(): Promise<this> {
    const index = this.rows.findIndex((row) => row.id === this.id)
    if (index >= 0) this.rows[index] = { ...this.rows[index], ...this }
    return this
  }
}

function normalizeId(value: unknown): string {
  return String(value)
}

function matches(row: Row, query: Row): boolean {
  return Object.entries(query).every(([key, expected]) => {
    if (key === '$or' && Array.isArray(expected)) return expected.some((item) => matches(row, item))
    const rowKey = key === '_id' ? 'id' : key
    if (expected && typeof expected === 'object' && '$exists' in expected) {
      return expected.$exists ? row[rowKey] !== undefined && row[rowKey] !== null : row[rowKey] === undefined || row[rowKey] === null
    }
    return normalizeId(row[rowKey]) === normalizeId(expected)
  })
}

function makeModel(rows: Row[], prefix: string) {
  return {
    findOne: vi.fn(async (query: Row) => {
      const row = rows.find((item) => matches(item, query))
      return row ? new MockDocument(rows, row) : null
    }),
    create: vi.fn(async (input: Row) => {
      const row = { id: `${prefix}-${rows.length + 1}`, failedLoginAttempts: 0, isLocked: false, ...input }
      rows.push(row)
      return new MockDocument(rows, row)
    }),
    updateOne: vi.fn(async (query: Row, update: Row) => {
      const row = rows.find((item) => matches(item, query))
      if (!row) return { matchedCount: 0, modifiedCount: 0 }
      Object.assign(row, update.$set || update)
      return { matchedCount: 1, modifiedCount: 1 }
    }),
  }
}

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn((data: string) => Promise.resolve(`hashed_${data}`)),
    compare: vi.fn((data: string, hash: string) => Promise.resolve(hash === `hashed_${data}`)),
  },
}))

vi.mock('../src/config/redis.ts', () => ({
  redis: {
    setex: redisSetex,
  },
}))

vi.mock('../src/models/User.ts', () => ({
  User: makeModel(users, 'user'),
}))

vi.mock('../src/models/Patient.ts', () => ({
  Patient: makeModel(patients, 'patient'),
}))

vi.mock('../src/models/Doctor.ts', () => ({
  Doctor: makeModel(doctors, 'doctor'),
}))

vi.mock('../src/models/Lab.ts', () => ({
  Lab: makeModel(labs, 'lab'),
}))

describe('email/password self registration', () => {
  beforeEach(() => {
    users.length = 0
    patients.length = 0
    doctors.length = 0
    labs.length = 0
    redisSetex.mockClear()
  })

  it('creates a patient account that can log in with the same credentials', async () => {
    const { registerWithPassword, login } = await import('../src/services/auth.service.ts')

    await registerWithPassword({
      role: 'patient',
      firstName: 'Asha',
      lastName: 'Rao',
      email: 'Asha@example.com',
      phoneNumber: '+91 98765 43210',
      password: 'Password1',
    })

    expect(users[0]?.email).toBe('asha@example.com')
    expect(users[0]?.phoneNumber).toBe('+919876543210')
    expect(users[0]?.passwordHash).toBe('hashed_Password1')
    expect(patients[0]?.fullName).toBe('Asha Rao')

    const session = await login('asha@example.com', 'Password1')

    expect(session.user.role).toBe('PATIENT')
    expect(session.user.email).toBe('asha@example.com')
    expect(session.accessToken).toBeTruthy()
  })
})
