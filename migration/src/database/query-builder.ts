/**
 * SQL Query Builder utility
 * Provides a fluent interface for building parameterized SQL queries
 */

import { Logger } from '../utils/logger';

export interface QueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
  command: string;
}

export interface WhereCondition {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'ILIKE' | 'IN' | 'NOT IN' | 'IS NULL' | 'IS NOT NULL';
  value?: unknown;
}

export interface JoinCondition {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL OUTER';
  table: string;
  alias?: string | undefined;
  on: string;
}

export interface OrderByCondition {
  field: string;
  direction: 'ASC' | 'DESC';
}

export class QueryBuilder {
  private selectFields: string[] = [];
  private fromTable: string = '';
  private tableAlias: string = '';
  private joins: JoinCondition[] = [];
  private whereConditions: WhereCondition[] = [];
  private orderByConditions: OrderByCondition[] = [];
  private limitValue?: number | undefined;
  private offsetValue?: number | undefined;
  private parameters: unknown[] = [];
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Set SELECT fields
   */
  select(fields: string | string[]): QueryBuilder {
    if (typeof fields === 'string') {
      this.selectFields = [fields];
    } else {
      this.selectFields = [...fields];
    }
    return this;
  }

  /**
   * Set FROM table
   */
  from(table: string, alias?: string): QueryBuilder {
    this.fromTable = table;
    if (alias) {
      this.tableAlias = alias;
    }
    return this;
  }

  /**
   * Add JOIN clause
   */
  join(type: JoinCondition['type'], table: string, on: string, alias?: string): QueryBuilder {
    this.joins.push({ type, table, on, alias: alias || undefined });
    return this;
  }

  /**
   * Add INNER JOIN
   */
  innerJoin(table: string, on: string, alias?: string): QueryBuilder {
    return this.join('INNER', table, on, alias);
  }

  /**
   * Add LEFT JOIN
   */
  leftJoin(table: string, on: string, alias?: string): QueryBuilder {
    return this.join('LEFT', table, on, alias);
  }

  /**
   * Add WHERE condition
   */
  where(field: string, operator: WhereCondition['operator'], value?: unknown): QueryBuilder {
    this.whereConditions.push({ field, operator, value });
    return this;
  }

  /**
   * Add WHERE field = value
   */
  whereEquals(field: string, value: unknown): QueryBuilder {
    return this.where(field, '=', value);
  }

  /**
   * Add WHERE field IN (values)
   */
  whereIn(field: string, values: unknown[]): QueryBuilder {
    return this.where(field, 'IN', values);
  }

  /**
   * Add WHERE field IS NULL
   */
  whereNull(field: string): QueryBuilder {
    return this.where(field, 'IS NULL');
  }

  /**
   * Add WHERE field IS NOT NULL
   */
  whereNotNull(field: string): QueryBuilder {
    return this.where(field, 'IS NOT NULL');
  }

  /**
   * Add ORDER BY clause
   */
  orderBy(field: string, direction: OrderByCondition['direction'] = 'ASC'): QueryBuilder {
    this.orderByConditions.push({ field, direction });
    return this;
  }

  /**
   * Set LIMIT
   */
  limit(count: number): QueryBuilder {
    this.limitValue = count;
    return this;
  }

  /**
   * Set OFFSET
   */
  offset(count: number): QueryBuilder {
    this.offsetValue = count;
    return this;
  }

  /**
   * Build the SQL query and parameters
   */
  build(): { sql: string; parameters: unknown[] } {
    this.parameters = [];
    let parameterIndex = 1;

    // Build SELECT clause
    const selectClause = this.selectFields.length > 0 
      ? `SELECT ${this.selectFields.join(', ')}` 
      : 'SELECT *';

    // Build FROM clause
    let fromClause = `FROM ${this.fromTable}`;
    if (this.tableAlias) {
      fromClause += ` ${this.tableAlias}`;
    }

    // Build JOIN clauses
    const joinClauses = this.joins.map(join => {
      let clause = `${join.type} JOIN ${join.table}`;
      if (join.alias) {
        clause += ` ${join.alias}`;
      }
      clause += ` ON ${join.on}`;
      return clause;
    });

    // Build WHERE clause
    let whereClause = '';
    if (this.whereConditions.length > 0) {
      const conditions = this.whereConditions.map(condition => {
        const { field, operator, value } = condition;
        
        if (operator === 'IS NULL' || operator === 'IS NOT NULL') {
          return `${field} ${operator}`;
        }
        
        if (operator === 'IN' || operator === 'NOT IN') {
          if (Array.isArray(value) && value.length > 0) {
            const placeholders = value.map(() => `$${parameterIndex++}`).join(', ');
            this.parameters.push(...value);
            return `${field} ${operator} (${placeholders})`;
          } else {
            // Handle empty array case
            return operator === 'IN' ? '1=0' : '1=1';
          }
        }
        
        this.parameters.push(value);
        return `${field} ${operator} $${parameterIndex++}`;
      });
      
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    // Build ORDER BY clause
    let orderByClause = '';
    if (this.orderByConditions.length > 0) {
      const orderConditions = this.orderByConditions.map(
        condition => `${condition.field} ${condition.direction}`
      );
      orderByClause = `ORDER BY ${orderConditions.join(', ')}`;
    }

    // Build LIMIT clause
    let limitClause = '';
    if (this.limitValue !== undefined) {
      limitClause = `LIMIT $${parameterIndex++}`;
      this.parameters.push(this.limitValue);
    }

    // Build OFFSET clause
    let offsetClause = '';
    if (this.offsetValue !== undefined) {
      offsetClause = `OFFSET $${parameterIndex++}`;
      this.parameters.push(this.offsetValue);
    }

    // Combine all clauses
    const clauses = [
      selectClause,
      fromClause,
      ...joinClauses,
      whereClause,
      orderByClause,
      limitClause,
      offsetClause
    ].filter(clause => clause.length > 0);

    const sql = clauses.join(' ');

    return { sql, parameters: this.parameters };
  }

  /**
   * Reset the query builder
   */
  reset(): QueryBuilder {
    this.selectFields = [];
    this.fromTable = '';
    this.tableAlias = '';
    this.joins = [];
    this.whereConditions = [];
    this.orderByConditions = [];
    this.limitValue = undefined;
    this.offsetValue = undefined;
    this.parameters = [];
    return this;
  }

  /**
   * Create a new query builder instance
   */
  static create(logger: Logger): QueryBuilder {
    return new QueryBuilder(logger);
  }
}

/**
 * Insert Query Builder
 */
export class InsertQueryBuilder {
  private tableName: string = '';
  private insertData: Record<string, unknown>[] = [];
  private conflictAction: 'IGNORE' | 'UPDATE' | null = null;
  private conflictColumns: string[] = [];
  private updateColumns: string[] = [];
  private returningFields: string[] = [];
  private parameters: unknown[] = [];
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Set table name
   */
  into(table: string): InsertQueryBuilder {
    this.tableName = table;
    return this;
  }

  /**
   * Set data to insert
   */
  values(data: Record<string, unknown> | Record<string, unknown>[]): InsertQueryBuilder {
    this.insertData = Array.isArray(data) ? data : [data];
    return this;
  }

  /**
   * Add ON CONFLICT DO NOTHING
   */
  onConflictIgnore(columns: string[]): InsertQueryBuilder {
    this.conflictAction = 'IGNORE';
    this.conflictColumns = columns;
    return this;
  }

  /**
   * Add ON CONFLICT DO UPDATE
   */
  onConflictUpdate(conflictColumns: string[], updateColumns: string[]): InsertQueryBuilder {
    this.conflictAction = 'UPDATE';
    this.conflictColumns = conflictColumns;
    this.updateColumns = updateColumns;
    return this;
  }

  /**
   * Add RETURNING clause
   */
  returning(fields: string | string[]): InsertQueryBuilder {
    this.returningFields = typeof fields === 'string' ? [fields] : fields;
    return this;
  }

  /**
   * Build the INSERT query
   */
  build(): { sql: string; parameters: unknown[] } {
    if (!this.tableName || this.insertData.length === 0) {
      throw new Error('Table name and data are required for INSERT query');
    }

    this.parameters = [];
    let parameterIndex = 1;

    // Get all unique columns from the data
    const allColumns = new Set<string>();
    this.insertData.forEach(row => {
      Object.keys(row).forEach(key => allColumns.add(key));
    });
    const columns = Array.from(allColumns);

    // Build VALUES clause
    const valueRows = this.insertData.map(row => {
      const values = columns.map(column => {
        const value = row[column];
        this.parameters.push(value !== undefined ? value : null);
        return `$${parameterIndex++}`;
      });
      return `(${values.join(', ')})`;
    });

    // Build base INSERT query
    let sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES ${valueRows.join(', ')}`;

    // Add conflict resolution
    if (this.conflictAction === 'IGNORE') {
      sql += ` ON CONFLICT (${this.conflictColumns.join(', ')}) DO NOTHING`;
    } else if (this.conflictAction === 'UPDATE') {
      const updateSet = this.updateColumns.map(col => `${col} = EXCLUDED.${col}`).join(', ');
      sql += ` ON CONFLICT (${this.conflictColumns.join(', ')}) DO UPDATE SET ${updateSet}`;
    }

    // Add RETURNING clause
    if (this.returningFields.length > 0) {
      sql += ` RETURNING ${this.returningFields.join(', ')}`;
    }

    return { sql, parameters: this.parameters };
  }

  /**
   * Reset the insert query builder
   */
  reset(): InsertQueryBuilder {
    this.tableName = '';
    this.insertData = [];
    this.conflictAction = null;
    this.conflictColumns = [];
    this.updateColumns = [];
    this.returningFields = [];
    this.parameters = [];
    return this;
  }

  /**
   * Create a new insert query builder instance
   */
  static create(logger: Logger): InsertQueryBuilder {
    return new InsertQueryBuilder(logger);
  }
}

/**
 * Update Query Builder
 */
export class UpdateQueryBuilder {
  private tableName: string = '';
  private updateData: Record<string, unknown> = {};
  private whereConditions: WhereCondition[] = [];
  private returningFields: string[] = [];
  private parameters: unknown[] = [];
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Set table name
   */
  table(name: string): UpdateQueryBuilder {
    this.tableName = name;
    return this;
  }

  /**
   * Set data to update
   */
  set(data: Record<string, unknown>): UpdateQueryBuilder {
    this.updateData = { ...data };
    return this;
  }

  /**
   * Set individual field
   */
  setField(field: string, value: unknown): UpdateQueryBuilder {
    this.updateData[field] = value;
    return this;
  }

  /**
   * Add WHERE condition
   */
  where(field: string, operator: WhereCondition['operator'], value?: unknown): UpdateQueryBuilder {
    this.whereConditions.push({ field, operator, value });
    return this;
  }

  /**
   * Add RETURNING clause
   */
  returning(fields: string | string[]): UpdateQueryBuilder {
    this.returningFields = typeof fields === 'string' ? [fields] : fields;
    return this;
  }

  /**
   * Build the UPDATE query
   */
  build(): { sql: string; parameters: unknown[] } {
    if (!this.tableName || Object.keys(this.updateData).length === 0) {
      throw new Error('Table name and update data are required for UPDATE query');
    }

    this.parameters = [];
    let parameterIndex = 1;

    // Build SET clause
    const setClause = Object.entries(this.updateData).map(([field, value]) => {
      this.parameters.push(value);
      return `${field} = $${parameterIndex++}`;
    }).join(', ');

    // Build WHERE clause
    let whereClause = '';
    if (this.whereConditions.length > 0) {
      const conditions = this.whereConditions.map(condition => {
        const { field, operator, value } = condition;
        
        if (operator === 'IS NULL' || operator === 'IS NOT NULL') {
          return `${field} ${operator}`;
        }
        
        this.parameters.push(value);
        return `${field} ${operator} $${parameterIndex++}`;
      });
      
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    // Build base UPDATE query
    let sql = `UPDATE ${this.tableName} SET ${setClause}`;
    if (whereClause) {
      sql += ` ${whereClause}`;
    }

    // Add RETURNING clause
    if (this.returningFields.length > 0) {
      sql += ` RETURNING ${this.returningFields.join(', ')}`;
    }

    return { sql, parameters: this.parameters };
  }

  /**
   * Reset the update query builder
   */
  reset(): UpdateQueryBuilder {
    this.tableName = '';
    this.updateData = {};
    this.whereConditions = [];
    this.returningFields = [];
    this.parameters = [];
    return this;
  }

  /**
   * Create a new update query builder instance
   */
  static create(logger: Logger): UpdateQueryBuilder {
    return new UpdateQueryBuilder(logger);
  }
}