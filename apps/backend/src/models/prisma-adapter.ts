import { prisma } from '../db/prisma.ts'

type Dict = Record<string, any>

interface ModelConfig {
  delegate: string
  fields: string[]
  fieldMap?: Record<string, string>
  relations?: Record<string, { model: PrismaModel; isArray?: boolean }>
}

interface PopulateSpec {
  field: string
  select?: string
}

function getDelegate(name: string): any {
  return (prisma as any)[name]
}

function normalizeId(value: any): string {
  if (value && typeof value === 'object' && 'toString' in value) return value.toString()
  return String(value)
}

function isPlainObject(value: unknown): value is Dict {
  return !!value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof RegExp)
}

function getPath(value: Dict, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], value)
}

function setPath(value: Dict, path: string, next: any): void {
  const parts = path.split('.')
  let current = value
  for (const part of parts.slice(0, -1)) {
    current[part] = isPlainObject(current[part]) ? current[part] : {}
    current = current[part]
  }
  current[parts[parts.length - 1] || path] = next
}

function unsetUndefined(value: Dict): Dict {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined))
}

function comparable(value: any): any {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).getTime()
  return value
}

function matchesOperator(actual: any, expected: Dict): boolean {
  if ('$in' in expected) return expected.$in.map(normalizeId).includes(normalizeId(actual))
  if ('$nin' in expected) return !expected.$nin.map(normalizeId).includes(normalizeId(actual))
  if ('$exists' in expected) return expected.$exists ? actual !== undefined && actual !== null : actual === undefined || actual === null
  const actualComparable = comparable(actual)
  if ('$gte' in expected && actualComparable < comparable(expected.$gte)) return false
  if ('$gt' in expected && actualComparable <= comparable(expected.$gt)) return false
  if ('$lte' in expected && actualComparable > comparable(expected.$lte)) return false
  if ('$lt' in expected && actualComparable >= comparable(expected.$lt)) return false
  return true
}

function matchesQuery(row: Dict, query: Dict = {}): boolean {
  return Object.entries(query).every(([rawKey, expected]) => {
    if (rawKey === '$or' && Array.isArray(expected)) return expected.some((item) => matchesQuery(row, item))
    const key = rawKey === '_id' ? 'id' : rawKey
    const actual = getPath(row, key)
    if (expected instanceof RegExp) return expected.test(String(actual || ''))
    if (isPlainObject(expected)) return matchesOperator(actual, expected)
    return normalizeId(actual) === normalizeId(expected)
  })
}

function sortRows(rows: Dict[], sort: Dict | undefined): Dict[] {
  if (!sort) return rows
  const entries = Object.entries(sort)
  return [...rows].sort((a, b) => {
    for (const [key, direction] of entries) {
      const av = comparable(getPath(a, key))
      const bv = comparable(getPath(b, key))
      if (av === bv) continue
      return av > bv ? Number(direction) : -Number(direction)
    }
    return 0
  })
}

function project(row: Dict, select?: string): Dict {
  if (!select) return row
  const fields = select.split(/\s+/).filter(Boolean)
  return Object.fromEntries(fields.map((field) => [field, row[field]]))
}

class PrismaDocument<T extends Dict> {
  [key: string]: any

  constructor(private model: PrismaModel, data: T) {
    Object.assign(this, data)
  }

  get _id(): string {
    return this.id
  }

  set _id(value: string) {
    this.id = value
  }

  set(update: Dict): void {
    Object.assign(this, update)
  }

  toObject(): T {
    const { model: _model, ...rest } = this as any
    return { ...rest, _id: this.id } as T
  }

  async save(): Promise<this> {
    const saved = await this.model.replace(this.id, this.toObject())
    Object.assign(this, saved)
    return this
  }
}

class PrismaQuery<T> implements PromiseLike<T> {
  private sortSpec?: Dict
  private limitCount?: number
  private leanMode = false
  private selectSpec?: string
  private populates: PopulateSpec[] = []

  constructor(private runQuery: () => Promise<any>, private model: PrismaModel) {}

  sort(spec: Dict): this {
    this.sortSpec = spec
    return this
  }

  limit(count: number): this {
    this.limitCount = count
    return this
  }

  lean(): this {
    this.leanMode = true
    return this
  }

  select(spec: string): this {
    this.selectSpec = spec
    return this
  }

  populate(field: string, select?: string): this {
    this.populates.push({ field, select })
    return this
  }

  async distinct(field: string): Promise<any[]> {
    const rows = await this.exec()
    const list = Array.isArray(rows) ? rows : []
    return [...new Set(list.map((row) => getPath(row, field)).filter((value) => value !== undefined && value !== null))]
  }

  async exec(): Promise<T> {
    let result = await this.runQuery()
    if (Array.isArray(result)) {
      result = sortRows(result, this.sortSpec)
      if (this.limitCount !== undefined) result = result.slice(0, this.limitCount)
    }
    result = await this.model.populateResult(result, this.populates)
    result = Array.isArray(result)
      ? result.map((row) => project(row, this.selectSpec))
      : result ? project(result, this.selectSpec) : result
    if (this.leanMode) return result as T
    return Array.isArray(result)
      ? result.map((row) => this.model.document(row))
      : result ? this.model.document(result) : result
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected)
  }
}

export class PrismaModel {
  constructor(public config: ModelConfig) {}

  document<T extends Dict>(row: T): any {
    return new PrismaDocument(this, this.fromRow(row))
  }

  fromRow(row: Dict): Dict {
    const mapped: Dict = { ...row, _id: row.id }
    for (const [external, internal] of Object.entries(this.config.fieldMap || {})) {
      if (internal in mapped) mapped[external] = mapped[internal]
    }
    return mapped
  }

  toRow(input: Dict): Dict {
    const row: Dict = {}
    for (const [key, value] of Object.entries(input)) {
      if (key === '_id') {
        row.id = normalizeId(value)
        continue
      }
      const mappedKey = this.config.fieldMap?.[key] || key
      if (this.config.fields.includes(mappedKey)) row[mappedKey] = value
    }
    return unsetUndefined(row)
  }

  find(query: Dict = {}): PrismaQuery<any[]> {
    return new PrismaQuery(async () => {
      const rows = await getDelegate(this.config.delegate).findMany()
      return rows.map((row: Dict) => this.fromRow(row)).filter((row: Dict) => matchesQuery(row, query))
    }, this)
  }

  findById(id: any): PrismaQuery<any | null> {
    return new PrismaQuery(async () => {
      const row = await getDelegate(this.config.delegate).findUnique({ where: { id: normalizeId(id) } })
      return row ? this.fromRow(row) : null
    }, this)
  }

  findOne(query: Dict = {}): PrismaQuery<any | null> {
    return new PrismaQuery(async () => {
      const rows = await getDelegate(this.config.delegate).findMany()
      const row = rows.map((item: Dict) => this.fromRow(item)).find((item: Dict) => matchesQuery(item, query))
      return row || null
    }, this)
  }

  async create(input: Dict | Dict[], _options?: Dict): Promise<any> {
    const isArray = Array.isArray(input)
    const rows = isArray ? input : [input]
    const created = []
    for (const row of rows) {
      const data = this.toRow(row)
      const saved = await getDelegate(this.config.delegate).create({ data })
      created.push(this.document(saved))
    }
    return isArray ? created : created[0]
  }

  async replace(id: string, input: Dict): Promise<any> {
    const data = this.toRow(input)
    delete data.id
    const row = await getDelegate(this.config.delegate).update({ where: { id: normalizeId(id) }, data })
    return this.fromRow(row)
  }

  async updateOne(query: Dict, update: Dict, options: Dict = {}): Promise<any> {
    let row = await this.findOne(query).lean().exec()
    if (!row && options.upsert) {
      row = { ...query }
      const created = await this.create(applyUpdate(row, update))
      return { matchedCount: 0, modifiedCount: 0, upsertedId: created.id }
    }
    if (!row) return { matchedCount: 0, modifiedCount: 0 }
    const next = applyUpdate(row, update)
    await this.replace(row.id, next)
    return { matchedCount: 1, modifiedCount: 1 }
  }

  async updateMany(query: Dict, update: Dict): Promise<any> {
    const rows = await this.find(query).lean().exec()
    for (const row of rows) await this.replace(row.id, applyUpdate(row, update))
    return { matchedCount: rows.length, modifiedCount: rows.length }
  }

  async findByIdAndUpdate(id: any, update: Dict, _options: Dict = {}): Promise<any | null> {
    const row = await this.findById(id).lean().exec()
    if (!row) return null
    const next = await this.replace(row.id, applyUpdate(row, update))
    return this.document(next)
  }

  async findOneAndUpdate(query: Dict, update: Dict, _options: Dict = {}): Promise<any | null> {
    const row = await this.findOne(query).lean().exec()
    if (!row) return null
    const next = await this.replace(row.id, applyUpdate(row, update))
    return this.document(next)
  }

  async countDocuments(query: Dict = {}): Promise<number> {
    return (await this.find(query).lean().exec()).length
  }

  async populateResult(result: any, populates: PopulateSpec[]): Promise<any> {
    if (!populates.length || !result) return result
    const rows = Array.isArray(result) ? result : [result]
    for (const populate of populates) {
      const relation = this.config.relations?.[populate.field]
      if (!relation) continue
      for (const row of rows) {
        const value = row[populate.field]
        if (!value) continue
        if (relation.isArray) {
          const ids = Array.isArray(value) ? value.map(normalizeId) : []
          const related = await relation.model.find({ _id: { $in: ids } }).lean().exec()
          row[populate.field] = related.map((item: Dict) => project(item, populate.select))
        } else {
          const related = await relation.model.findById(value).lean().exec()
          row[populate.field] = related ? project(related, populate.select) : null
        }
      }
    }
    return Array.isArray(result) ? rows : rows[0]
  }
}

function applyUpdate(input: Dict, update: Dict): Dict {
  const next = { ...input }
  if ('$set' in update) {
    for (const [key, value] of Object.entries(update.$set)) setPath(next, key, value)
  }
  if ('$inc' in update) {
    for (const [key, value] of Object.entries(update.$inc)) setPath(next, key, Number(getPath(next, key) || 0) + Number(value))
  }
  if ('$push' in update) {
    for (const [key, value] of Object.entries(update.$push)) {
      const current = getPath(next, key)
      setPath(next, key, [...(Array.isArray(current) ? current : []), value])
    }
  }
  if ('$addToSet' in update) {
    for (const [key, value] of Object.entries(update.$addToSet)) {
      const current = getPath(next, key)
      const list = Array.isArray(current) ? [...current] : []
      const values = isPlainObject(value) && '$each' in value ? value.$each : [value]
      for (const item of values) if (!list.map(normalizeId).includes(normalizeId(item))) list.push(item)
      setPath(next, key, list)
    }
  }
  if ('$pull' in update) {
    for (const [key, value] of Object.entries(update.$pull)) {
      const current = getPath(next, key)
      if (!Array.isArray(current)) continue
      setPath(next, key, current.filter((item) => !matchesQuery(item, value as Dict)))
    }
  }
  if (!Object.keys(update).some((key) => key.startsWith('$'))) {
    Object.assign(next, update)
  }
  delete next._id
  return next
}

export function makeModel(config: ModelConfig): PrismaModel {
  return new PrismaModel(config)
}
