function decodeTestDecoding(walData) {
  const lines = walData.split('\n').filter(line => line.trim())
  const changes = []

  for (const line of lines) {
    if (!line.includes(':')) continue

    const tableMatch = line.match(/table\s+([\w.]+):\s+(\w+):/)
    if (!tableMatch) continue

    const [, tableName, operation] = tableMatch
    const [schema, table] = tableName.includes('.') ? tableName.split('.') : ['public', tableName]

    const columnString = line.substring(line.indexOf(operation) + operation.length + 1)
    const columns = parseColumns(columnString)

    changes.push({
      operation: operation.toUpperCase(),
      schema,
      table,
      columns,
    })
  }

  return changes.length > 0 ? changes[0] : null
}

function decodeWal2Json(walData) {
  try {
    const data = JSON.parse(walData)
    if (!data.change || !Array.isArray(data.change)) {
      return null
    }

    const change = data.change[0]
    return {
      operation: change.kind.toUpperCase(),
      schema: change.schema || 'public',
      table: change.table,
      columns: change.columnvalues || [],
      columnNames: change.columnnames || [],
      oldColumns: change.columnvalues_old,
      oldColumnNames: change.columnnames_old,
    }
  } catch (err) {
    console.error('[Decoder] Failed to parse wal2json:', err.message)
    return null
  }
}

function parseColumns(columnString) {
  const columns = {}
  const columnRegex = /(\w+)\[([^\]]+)\]:([^\s]+(?:\s+\w+[^\s]*)*)/g

  let match
  while ((match = columnRegex.exec(columnString)) !== null) {
    const [, name, type, rawValue] = match
    const value = parseValue(rawValue, type)
    columns[name] = { type, value }
  }

  return columns
}

function parseValue(rawValue, type) {
  if (rawValue === 'NULL') return null
  if (type === 'text' || type === 'character varying') {
    return rawValue.replace(/^'|'$/g, '')
  }
  if (type === 'integer' || type === 'bigint' || type === 'smallint') {
    return parseInt(rawValue, 10)
  }
  if (type === 'numeric' || type === 'double precision') {
    return parseFloat(rawValue)
  }
  if (type === 'boolean') {
    return rawValue === 't' ? true : false
  }
  if (type === 'timestamp' || type === 'timestamp with time zone') {
    return new Date(rawValue)
  }
  if (type === 'uuid') {
    return rawValue
  }
  return rawValue
}

export function decodeLogicalChange(walData) {
  if (!walData || typeof walData !== 'string') {
    return null
  }

  if (walData.trim().startsWith('{')) {
    return decodeWal2Json(walData)
  }

  if (walData.includes('table') && walData.includes(':')) {
    return decodeTestDecoding(walData)
  }

  return null
}

export function normalizeChange(change, lsn, timestamp) {
  if (!change) return null

  return {
    lsn,
    timestamp,
    operation: change.operation,
    schema: change.schema,
    table: change.table,
    before: change.oldColumns ? buildRecord(change.oldColumns, change.oldColumnNames) : null,
    after: change.operation !== 'DELETE' ? buildRecord(change.columns, change.columnNames) : null,
    columnNames: change.columnNames || Object.keys(change.columns || {}),
  }
}

function buildRecord(values, names) {
  if (!names || !values) return null
  const record = {}
  names.forEach((name, idx) => {
    record[name] = values[idx]
  })
  return record
}

export { decodeTestDecoding, decodeWal2Json, parseColumns }
