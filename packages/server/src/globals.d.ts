declare namespace NodeJS {
  interface ProcessEnv {
    GAMESERVER_PORT: string;
    CORS_ORIGIN: string;
    HTTPS_KEY_PATH: string;
    HTTPS_CERT_PATH: string;
    COOKIE_NAME: string;
    COOKIE_MAX_AGE: string;
    DB_DRIVER: 'postgres' | 'mysql' | 'mariadb' | 'better-sqlite3' | 'mssql' | 'oracle' | 'mongodb' | 'spanner';
    DB_HOST: string;
    DB_PORT: string;
    DB_NAME: string;
    DB_USER: string;
    DB_PASSWORD: string;
    DB_CHARSET: string;
    DB_COLLATION: string;
    DB_SCHEMA_SYNC: string;
    WRITE_PACKET_MAX_SIZE: string;
    DEFAULT_LOGGING_LEVEL: 'silent' | 'trace' | 'debug' | 'info' | 'warn' | 'error';
    AUTO_CREATE_ACCOUNTS: string;
  }
}