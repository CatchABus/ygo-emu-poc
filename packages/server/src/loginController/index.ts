import bcrypt from 'bcrypt';
import { parse as parseCookie } from 'cookie';
import { GameClient } from '../network/GameClient';
import log from 'loglevel';

const SALT_ROUNDS = 10;

const clients = new Map<string, GameClient>();
const login = 'admin';
const pwd = hashPassword('admin');

interface AuthTokenPayload {
  accountName: string,
  sessionId: string
}

interface Credentials {
  accountName: string;
  password: string;
}

function getClients(): Map<string, GameClient> {
  return clients;
}

function getClientByLogin(login: string): GameClient {
  return clients.get(login);
}

function removeClient(login: string): boolean {
  return clients.delete(login);
}

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

function getCredentials(payload: string): Credentials {
  if (!payload) {
    return null;
  }

  const credentials = JSON.parse(payload) as Credentials;
  if (credentials == null || typeof credentials !== 'object') {
    return null;
  }

  const { accountName, password } = credentials;

  if (accountName == null || password == null) {
    return null;
  }

  return credentials;
}

function attemptLogin(credentials: Credentials): boolean {
  const { accountName, password } = credentials;

  if (accountName == null || password == null) {
    return false;
  }

  return accountName === login && comparePassword(password, pwd);
}

function generateAuthenticationToken(client: GameClient): string {
  if (client == null) {
    log.warn('Method generateAuthenticationToken requires a client to generate a token for');
    return null;
  }

  const content = client.accountName + ':' + client.sessionId;
  const buffer = Buffer.from(content, 'utf-8');
  const token = buffer.toString('base64');

  return token;
}

function parseAuthenticationCookie(cookie: string): AuthTokenPayload {
  if (!cookie) {
    return null;
  }

  const parsedCookieValues = parseCookie(cookie);
  const token = parsedCookieValues['auth-token'];

  if (!token) {
    log.warn('Attempted to parse a null token');
    return null;
  }

  const buffer = Buffer.from(token, 'base64');
  const content = buffer.toString('utf-8');
  const [accountName, sessionId] = content.split(':');

  if (!accountName || !sessionId) {
    log.warn(`Malformed authentication token '${content}' extracted from cookie '${cookie}'`);
    return null;
  }

  return {
    accountName,
    sessionId
  };
}

export {
  attemptLogin,
  generateAuthenticationToken,
  getCredentials,
  getClients,
  getClientByLogin,
  parseAuthenticationCookie,
  removeClient
};