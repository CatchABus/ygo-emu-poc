import log from 'loglevel';
import { createPool, Pool, PoolConnection } from 'mysql2/promise';

const PORT = parseInt(process.env.DB_PORT);

let instance: DatabaseSourceImpl = null;

class DatabaseSourceImpl {
  private readonly _pool: Pool;

  constructor() {
    this._pool = createPool({
      host: process.env.DB_HOST,
      port: PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
      idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
  }

  public async initialize(): Promise<void> {
    // Check whether connection with MySQL server is possible
    const con = await this._pool.getConnection();
    this.releasePoolConnection(con);
    log.info('MySQL Database connection pool has been initialized');
  }

  getPool(): Pool {
    return this._pool;
  }

  releasePoolConnection(conn: PoolConnection): void {
    this._pool.releaseConnection(conn);
    conn.release();
  }
}

export const DatabaseSource = {
  getInstance(): DatabaseSourceImpl {
    if (instance == null) {
      instance = new DatabaseSourceImpl();
    }

    return instance;
  }
};