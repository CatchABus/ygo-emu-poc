import { IncomingMessage, ServerResponse } from 'http';
import { attemptLogin, generateAuthenticationToken, getClientByLogin, getClients, getCredentials, parseAuthenticationCookie, removeClient } from '../loginController';
import { GameClient } from './GameClient';

const COOKIE_MAX_AGE = parseInt(process.env.COOKIE_MAX_AGE);

function getRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      resolve(body);
    });

    req.on('error', err => {
      reject(err);
    });
  });
}

async function httpHandler(req: IncomingMessage, res: ServerResponse) {
  const urlInstance = new URL(req.url, 'https://localhost');
  
  // Set the response header content type
  res.setHeader('Content-Type', 'text/plain');

  if (process.env.CORS_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  switch (urlInstance.pathname) {
    case '/login':
      await handleLogin(req, res, urlInstance.searchParams.has('force'));
      break;
    case '/logout':
      await handleLogout(req, res);
      break;
    case '/init':
      await handleInit(req, res);
      break;
  }
}

async function handleInit(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method === 'POST') {
    const { cookie } = req.headers;
    const payload = cookie ? parseAuthenticationCookie(cookie) : null;
    let requestSessionId = null;

    if (payload != null) {
      const { accountName, sessionId } = payload;
      const client = getClientByLogin(accountName);

      if (client != null) {
        if (client.sessionId === sessionId) {
          requestSessionId = sessionId;
        } else {
          // Player might have already logged in from another device or browser
          res.setHeader('Set-Cookie', 'auth-token=; HttpOnly; Secure; Path=/; Max-Age=0');
        }
      }
    }

    if (requestSessionId != null) {
      res.statusCode = 409;
      res.end(requestSessionId);
    } else {
      res.statusCode = 204;
      res.end();
    }
  } else {
    res.statusCode = 405;
    res.end();
  }
}

async function handleLogin(req: IncomingMessage, res: ServerResponse, force: boolean): Promise<void> {
  let content: string = null;

  if (req.method === 'POST') {
    const payload = await getRequestBody(req);
    const credentials = getCredentials(payload);
    const { accountName } = credentials;
    const hasValidCredentials = attemptLogin(credentials);

    if (hasValidCredentials) {
      const existingClient = getClientByLogin(accountName);

      if (existingClient != null) {
        // Override session
        if (force) {
          existingClient.close();
          removeClient(accountName);
        } else {
          res.statusCode = 409;
          res.end();
          return;
        }
      }

      const client = new GameClient(accountName);
      const token = generateAuthenticationToken(client);

      if (token == null) {
        return;
      }

      content = client.sessionId;
      getClients().set(accountName, client);

      res.setHeader('Set-Cookie', `auth-token=${token}; HttpOnly; Secure; Path=/; Max-Age=${COOKIE_MAX_AGE}`);
      res.statusCode = 200;
    } else {
      res.statusCode = 401;
    }
  } else {
    res.statusCode = 405;
  }

  if (content != null) {
    res.end(content);
  } else {
    res.end();
  }
}

async function handleLogout(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method === 'POST') {
    const { cookie } = req.headers;
    const sessionId = await getRequestBody(req);

    if (sessionId) {
      const payload = cookie ? parseAuthenticationCookie(cookie) : null;
      let isAuthenticated = false;

      if (payload != null) {
        const client = getClientByLogin(payload.accountName);
        if (client != null && client.sessionId === sessionId) {
          client.close();
          removeClient(client.accountName);
          isAuthenticated = true;
        }
      }

      if (isAuthenticated) {
        res.setHeader('Set-Cookie', 'auth-token=; HttpOnly; Secure; Path=/; Max-Age=0');
        res.statusCode = 204;
      } else {
        res.statusCode = 401;
      }
    } else {
      res.statusCode = 400;
    }
  } else {
    res.statusCode = 405;
  }

  res.end();
}

export {
  httpHandler
};