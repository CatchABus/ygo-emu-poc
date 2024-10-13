import bcrypt from 'bcrypt';
import { parse as parseCookie } from 'cookie';
import log from 'loglevel';
import { Account } from '../model/database/Account';
import { GameClient } from '../network/GameClient';


interface AuthTokenPayload {
  accountName: string,
  sessionId: string
}

interface Credentials {
  accountName: string;
  password: string;
}

const SALT_ROUNDS = 10;

let instance: LoginControllerImpl = null;

class LoginControllerImpl {
  private readonly _clients;

  constructor() {
    this._clients = new Map<string, GameClient>();
  }

  getClients(): Map<string, GameClient> {
    return this._clients;
  }
  
  getClientByLogin(login: string): GameClient {
    return this._clients.get(login);
  }
  
  removeClient(login: string): boolean {
    return this._clients.delete(login);
  }
  
  hashPassword(password: string): string {
    return bcrypt.hashSync(password, SALT_ROUNDS);
  }
  
  async disconnectAllClients(): Promise<void> {
    log.info('Disconnecting all players from server...');
  
    try {
      for (const [, client] of this._clients) {
        await client.close();
      }
    
      log.info('All players have been disconnected!');
    } catch (err) {
      log.error('Failed to disconnect players from server. Reason: ' + err);
    }
  }
  
  comparePassword(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash);
  }
  
  getCredentials(payload: string): Credentials {
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
  
  async getAccountFromDatabase(accountName: string): Promise<Account> {
    const account = await Account.find<Account>(accountName, 'accountName');
    return account;
  }
  
  attemptLogin(account: Account, password: string): boolean {
    return this.comparePassword(password, account.password);
  }
  
  async createAccount(accountName: string, password: string): Promise<number> {
    const passwordHash = this.hashPassword(password);
  
    const account = new Account();
    account.accountName = accountName;
    account.password = passwordHash;
    await account.save();
  
    return account.id;
  }
  
  generateAuthenticationToken(client: GameClient): string {
    if (client == null) {
      log.warn('Method generateAuthenticationToken requires a client to generate a token for');
      return null;
    }
  
    const content = client.accountName + ':' + client.sessionId;
    const buffer = Buffer.from(content, 'utf-8');
    const token = buffer.toString('base64');
  
    return token;
  }
  
  parseAuthenticationCookie(cookie: string): AuthTokenPayload {
    if (!cookie) {
      return null;
    }
  
    const parsedCookieValues = parseCookie(cookie);
    const token = parsedCookieValues[process.env.COOKIE_NAME];
  
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
}

export const LoginController = {
  getInstance(): LoginControllerImpl {
    if (instance == null) {
      instance = new LoginControllerImpl();
    }

    return instance;
  }
};