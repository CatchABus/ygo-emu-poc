declare namespace NodeJS {
  interface ProcessEnv {
    CORS_ORIGIN: string;
    SERVER_PORT: string;
    WRITE_PACKET_MAX_SIZE: string;
    DEFAULT_LOGGING_LEVEL: 'silent' | 'trace' | 'debug' | 'info' | 'warn' | 'error';
  }
}