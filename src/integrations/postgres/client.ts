import { Pool, PoolClient } from 'pg';

// Configuração do PostgreSQL
const pool = new Pool({
  host: import.meta.env.VITE_DB_HOST || '72.62.106.76',
  database: import.meta.env.VITE_DB_NAME || 'banco_gestao',
  user: import.meta.env.VITE_DB_USER || 'postgres',
  password: import.meta.env.VITE_DB_PASSWORD || 'AndinhoSurf2015@',
  port: parseInt(import.meta.env.VITE_DB_PORT || '5432'),
  ssl: import.meta.env.VITE_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20, // máximo de conexões no pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Testar conexão
pool.on('error', (err) => {
  console.error('Erro inesperado no pool de conexões PostgreSQL', err);
});

// Função para executar queries
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executada', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Erro na query', { text, error });
    throw error;
  }
};

// Função para obter um cliente do pool (para transações)
export const getClient = async (): Promise<PoolClient> => {
  return await pool.connect();
};

// Função para fechar o pool (útil para testes ou shutdown)
export const closePool = async () => {
  await pool.end();
};

// Exportar o pool para uso direto se necessário
export { pool };

// Classe de compatibilidade com Supabase para facilitar migração
export class PostgresClient {
  private tableName: string;
  private selectFields: string[] = ['*'];
  private whereConditions: Array<{ field: string; operator: string; value: any }> = [];
  private orderByField?: string;
  private orderByDirection: 'ASC' | 'DESC' = 'ASC';
  private limitCount?: number;
  private offsetCount?: number;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields: string | string[]) {
    this.selectFields = Array.isArray(fields) ? fields : fields.split(',').map(f => f.trim());
    return this;
  }

  eq(field: string, value: any) {
    this.whereConditions.push({ field, operator: '=', value });
    return this;
  }

  neq(field: string, value: any) {
    this.whereConditions.push({ field, operator: '!=', value });
    return this;
  }

  gt(field: string, value: any) {
    this.whereConditions.push({ field, operator: '>', value });
    return this;
  }

  gte(field: string, value: any) {
    this.whereConditions.push({ field, operator: '>=', value });
    return this;
  }

  lt(field: string, value: any) {
    this.whereConditions.push({ field, operator: '<', value });
    return this;
  }

  lte(field: string, value: any) {
    this.whereConditions.push({ field, operator: '<=', value });
    return this;
  }

  like(field: string, value: string) {
    this.whereConditions.push({ field, operator: 'LIKE', value });
    return this;
  }

  ilike(field: string, value: string) {
    this.whereConditions.push({ field, operator: 'ILIKE', value });
    return this;
  }

  in(field: string, values: any[]) {
    this.whereConditions.push({ field, operator: 'IN', value: values });
    return this;
  }

  is(field: string, value: any) {
    this.whereConditions.push({ field, operator: 'IS', value });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderByField = field;
    this.orderByDirection = options?.ascending === false ? 'DESC' : 'ASC';
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
    return this;
  }

  private buildWhereClause(): { clause: string; params: any[] } {
    if (this.whereConditions.length === 0) {
      return { clause: '', params: [] };
    }

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const condition of this.whereConditions) {
      if (condition.operator === 'IN') {
        const placeholders = condition.value.map(() => `$${paramIndex++}`).join(', ');
        conditions.push(`${condition.field} IN (${placeholders})`);
        params.push(...condition.value);
      } else {
        conditions.push(`${condition.field} ${condition.operator} $${paramIndex}`);
        params.push(condition.value);
        paramIndex++;
      }
    }

    return {
      clause: `WHERE ${conditions.join(' AND ')}`,
      params,
    };
  }

  async execute(): Promise<{ data: any[] | null; error: any | null }> {
    try {
      const fields = this.selectFields.join(', ');
      const { clause: whereClause, params } = this.buildWhereClause();
      
      let sql = `SELECT ${fields} FROM ${this.tableName}`;
      if (whereClause) sql += ` ${whereClause}`;
      
      if (this.orderByField) {
        sql += ` ORDER BY ${this.orderByField} ${this.orderByDirection}`;
      }
      
      if (this.limitCount) {
        sql += ` LIMIT ${this.limitCount}`;
      }
      
      if (this.offsetCount) {
        sql += ` OFFSET ${this.offsetCount}`;
      }

      const result = await query(sql, params);
      return { data: result.rows, error: null };
    } catch (error) {
      console.error('Erro ao executar query:', error);
      return { data: null, error };
    }
  }

  async single(): Promise<{ data: any | null; error: any | null }> {
    this.limit(1);
    const result = await this.execute();
    if (result.error) {
      return result;
    }
    return {
      data: result.data && result.data.length > 0 ? result.data[0] : null,
      error: result.data && result.data.length === 0 ? { code: 'PGRST116', message: 'No rows returned' } : null,
    };
  }

  async insert(data: any): Promise<{ data: any | null; error: any | null }> {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      
      const sql = `
        INSERT INTO ${this.tableName} (${keys.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
      
      const result = await query(sql, values);
      return { data: result.rows[0], error: null };
    } catch (error) {
      console.error('Erro ao inserir:', error);
      return { data: null, error };
    }
  }

  async update(data: any): Promise<{ data: any | null; error: any | null }> {
    try {
      const { clause: whereClause, params: whereParams } = this.buildWhereClause();
      if (!whereClause) {
        return { data: null, error: { message: 'Update requires WHERE clause' } };
      }

      const keys = Object.keys(data);
      const values = Object.values(data);
      const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
      const params = [...values, ...whereParams];
      
      const sql = `
        UPDATE ${this.tableName}
        SET ${setClause}
        ${whereClause}
        RETURNING *
      `;
      
      const result = await query(sql, params);
      return { data: result.rows, error: null };
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      return { data: null, error };
    }
  }

  async delete(): Promise<{ data: any | null; error: any | null }> {
    try {
      const { clause: whereClause, params } = this.buildWhereClause();
      if (!whereClause) {
        return { data: null, error: { message: 'Delete requires WHERE clause' } };
      }

      const sql = `
        DELETE FROM ${this.tableName}
        ${whereClause}
        RETURNING *
      `;
      
      const result = await query(sql, params);
      return { data: result.rows, error: null };
    } catch (error) {
      console.error('Erro ao deletar:', error);
      return { data: null, error };
    }
  }
}

// Função helper para criar um cliente compatível com Supabase
export const from = (tableName: string) => {
  return new PostgresClient(tableName);
};

// Exportar como padrão para compatibilidade
export default {
  from,
  query,
  getClient,
  closePool,
};

