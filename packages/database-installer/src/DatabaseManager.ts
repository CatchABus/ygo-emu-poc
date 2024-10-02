import fs from 'fs';
import mysql from 'mysql2/promise';

const PORT = parseInt(process.env.DB_PORT);

async function _establishSQLConnection(databaseName?: string): Promise<mysql.Connection> {
  console.info('Establishing connection with MySQL...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: databaseName
  });

  console.info('Connection with MySQL was established successfully!');

  return connection;
}

async function _getTableMigrations(): Promise<Map<string, string>> {
  const tableQueries = new Map<string, string>();

  const fileNames = fs.readdirSync('migrations', {
    encoding: 'utf8'
  });

  for (const fileName of fileNames) {
    if (fileName.endsWith('.sql')) {
      const query = fs.readFileSync(`migrations/${fileName}`, {
        encoding: 'utf8'
      });

      tableQueries.set(fileName, query);
    }
  }

  return tableQueries;
}

async function installDatabase(): Promise<void> {
  const connection = await _establishSQLConnection();

  console.info(`Attempting to create database '${process.env.DB_NAME}' with character set '${process.env.DB_CHARSET}' and collation '${process.env.DB_COLLATION}'...`);

  try {
    await connection.beginTransaction();
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    await connection.query(`ALTER DATABASE ${process.env.DB_NAME} CHARACTER SET ${process.env.DB_CHARSET} COLLATE ${process.env.DB_COLLATION}`);
    await connection.query(`USE ${process.env.DB_NAME}`);
  
    console.info(`Database '${process.env.DB_NAME}' was created successfully!`);
  
    console.info('Loading table migrations...');
    const migrations = await _getTableMigrations();
  
    console.info('Attempting to create tables...');
  
    for (const [ fileName, query ] of migrations) {
      console.info('- ' + fileName);
      await connection.query(query);
    }

    await connection.commit();
  
    console.info('All tables have been created successfully!');
  } catch (err) {
    console.error(err);
    await connection.rollback();
  } finally {
    await connection.end();
  }
}

async function truncateTables(): Promise<void> {
  const connection = await _establishSQLConnection(process.env.DB_NAME);

  console.info(`Attempting to truncate all tables in database '${process.env.DB_NAME}'...`);

  try {
    await connection.beginTransaction();
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  
    const result = await connection.query('SHOW TABLES');
    const rows = result[0] as [];
    const key = result[1][0].name;
  
    for (const row of rows) {
      const tableName = row[key];
  
      await connection.query(`TRUNCATE TABLE ${tableName}`);
      console.info(`- Truncated table '${tableName}'`);
    }
  
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    await connection.commit();

    console.info(`Database '${process.env.DB_NAME}' tables were truncated successfully!`);
  } catch (err) {
    console.error(err);
    await connection.rollback();
  } finally {
    await connection.end();
  }
}

async function deleteDatabase(): Promise<void> {
  const connection = await _establishSQLConnection();

  console.info(`Attempting to delete database '${process.env.DB_NAME}'...`);

  try {
    await connection.query(`DROP DATABASE ${process.env.DB_NAME}`);
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }

  console.info(`Database '${process.env.DB_NAME}' was deleted successfully!`);

  
}

export {
  installDatabase,
  truncateTables,
  deleteDatabase
};