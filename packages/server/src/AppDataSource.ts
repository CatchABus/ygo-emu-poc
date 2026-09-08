import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Account } from './model/database/Account';
import { Player } from './model/database/Player';
import { PlayerCard } from './model/database/PlayerCard';
import { PlayerDeck } from './model/database/PlayerDeck';
import { PlayerDeckSlot } from './model/database/PlayerDeckSlot';

export const AppDataSource = new DataSource({
  type: process.env.DB_DRIVER as any,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  synchronize: process.env.DB_SCHEMA_SYNC === 'true',
  logging: ['error'],
  charset: process.env.DB_CHARSET,
  entities: [Account, Player, PlayerCard, PlayerDeck, PlayerDeckSlot],
  migrations: [],
  subscribers: []
});