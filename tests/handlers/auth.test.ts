import { IncomingMessage, ServerResponse } from 'http';
import { ArgumentsOf } from 'ts-jest';
import { withoutApi } from '../fixtures/default-settings';
import { login, setup, teardown } from '../fixtures/setup';
import { get } from '../auth0-session/fixtures/helpers';
import { initAuth0, OnError, Session } from '../../src';
import { LoginHandler, LoginOptions } from '../../src/handlers/login';
import { LogoutHandler, LogoutOptions } from '../../src/handlers/logout';
import { CallbackHandler, CallbackOptions } from '../../src/handlers/callback';
import { ProfileHandler, ProfileOptions } from '../../src/handlers/profile';
import * as baseLoginHandler from '../../src/auth0-session/handlers/login';
import * as baseLogoutHandler from '../../src/auth0-session/handlers/logout';
import * as baseCallbackHandler from '../../src/auth0-session/handlers/callback';

const handlerError = (status = 400, error = 'foo', error_description = 'bar') =>
  expect.objectContaining({
    status,
    cause: expect.objectContaining({ error, error_description })
  });

describe('auth handler', () => {
  afterEach(teardown);

  test('return 500 for unexpected error', async () => {
    const baseUrl = await setup(withoutApi);
    global.handleAuth = (await initAuth0(withoutApi)).handleAuth;
    delete global.onError;
    jest.spyOn(console, 'error').mockImplementation((error) => {
      delete error.status;
    });
    await expect(get(baseUrl, '/api/auth/callback?error=foo&error_description=bar')).rejects.toThrow(
      'Internal Server Error'
    );
  });

  test('return 404 for unknown routes', async () => {
    const baseUrl = await setup(withoutApi);
    global.handleAuth = (await initAuth0(withoutApi)).handleAuth;
    await expect(get(baseUrl, '/api/auth/foo')).rejects.toThrow('Not Found');
  });
});

describe('custom error handler', () => {
  afterEach(teardown);

  test('accept custom error handler', async () => {
    const onError = jest.fn<void, ArgumentsOf<OnError>>((_req, res) => res.end());
    const baseUrl = await setup(withoutApi, { onError });
    await get(baseUrl, '/api/auth/callback?error=foo&error_description=bar');
    expect(onError).toHaveBeenCalledWith(expect.any(IncomingMessage), expect.any(ServerResponse), handlerError());
  });

  test('use default error handler', async () => {
    const baseUrl = await setup(withoutApi);
    global.handleAuth = initAuth0(withoutApi).handleAuth;
    delete global.onError;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(get(baseUrl, '/api/auth/callback?error=foo&error_description=bar')).rejects.toThrow('Bad Request');
    expect(console.error).toHaveBeenCalledWith(new Error('Callback handler failed. CAUSE: foo (bar)'));
  });

  test('finish response if custom error does not', async () => {
    const onError = jest.fn();
    const baseUrl = await setup(withoutApi);
    global.handleAuth = initAuth0(withoutApi).handleAuth.bind(null, { onError });
    await expect(
      get(baseUrl, '/api/auth/callback?error=foo&error_description=bar', { fullResponse: true })
    ).rejects.toThrow('Internal Server Error');
    expect(onError).toHaveBeenCalledWith(expect.any(IncomingMessage), expect.any(ServerResponse), handlerError());
  });

  test('finish response with custom error status', async () => {
    const onError = jest.fn<void, ArgumentsOf<OnError>>((_req, res) => res.status(418));
    const baseUrl = await setup(withoutApi);
    global.handleAuth = initAuth0(withoutApi).handleAuth.bind(null, { onError });
    await expect(
      get(baseUrl, '/api/auth/callback?error=foo&error_description=bar', { fullResponse: true })
    ).rejects.toThrow("I'm a Teapot");
    expect(onError).toHaveBeenCalledWith(expect.any(IncomingMessage), expect.any(ServerResponse), handlerError());
  });
});

describe('custom handlers', () => {
  afterEach(teardown);

  test('accept custom login handler', async () => {
    const login = jest.fn<Promise<void>, ArgumentsOf<LoginHandler>>(async (_req, res) => {
      res.end();
    });
    const baseUrl = await setup(withoutApi);
    global.handleAuth = initAuth0(withoutApi).handleAuth.bind(null, { login });
    await get(baseUrl, '/api/auth/login');
    expect(login).toHaveBeenCalledWith(expect.any(IncomingMessage), expect.any(ServerResponse));
  });

  test('accept custom logout handler', async () => {
    const logout = jest.fn<Promise<void>, ArgumentsOf<LogoutHandler>>(async (_req, res) => {
      res.end();
    });
    const baseUrl = await setup(withoutApi);
    global.handleAuth = initAuth0(withoutApi).handleAuth.bind(null, { logout });
    await get(baseUrl, '/api/auth/logout');
    expect(logout).toHaveBeenCalledWith(expect.any(IncomingMessage), expect.any(ServerResponse));
  });

  test('accept custom callback handler', async () => {
    const callback = jest.fn<Promise<void>, ArgumentsOf<CallbackHandler>>(async (_req, res) => {
      res.end();
    });
    const baseUrl = await setup(withoutApi);
    global.handleAuth = initAuth0(withoutApi).handleAuth.bind(null, { callback });
    await get(baseUrl, '/api/auth/callback');
    expect(callback).toHaveBeenCalledWith(expect.any(IncomingMessage), expect.any(ServerResponse));
  });

  test('accept custom profile handler', async () => {
    const profile = jest.fn<Promise<void>, ArgumentsOf<ProfileHandler>>(async (_req, res) => {
      res.end();
    });
    const baseUrl = await setup(withoutApi);
    global.handleAuth = initAuth0(withoutApi).handleAuth.bind(null, { profile });
    await get(baseUrl, '/api/auth/me');
    expect(profile).toHaveBeenCalledWith(expect.any(IncomingMessage), expect.any(ServerResponse));
  });

  test('accept custom arbitrary handler', async () => {
    const signup = jest.fn<Promise<void>, ArgumentsOf<LoginHandler>>(async (_req, res) => {
      res.end();
    });
    const baseUrl = await setup(withoutApi);
    global.handleAuth = initAuth0(withoutApi).handleAuth.bind(null, { signup });
    await get(baseUrl, '/api/auth/signup');
    expect(signup).toHaveBeenCalledWith(expect.any(IncomingMessage), expect.any(ServerResponse));
  });
});

describe('custom options', () => {
  afterEach(teardown);

  test('accept custom login options', async () => {
    const loginHandler = jest.fn(async (_req: IncomingMessage, res: ServerResponse) => {
      res.end();
    });
    jest.spyOn(baseLoginHandler, 'default').mockImplementation(() => loginHandler);
    const loginOptions: LoginOptions = { authorizationParams: { scope: 'openid' } };
    const baseUrl = await setup(withoutApi);
    const { handleLogin, handleAuth } = initAuth0(withoutApi);
    global.handleAuth = handleAuth.bind(null, {
      login: handleLogin(loginOptions)
    });
    await get(baseUrl, '/api/auth/login');
    expect(loginHandler).toHaveBeenCalledWith(expect.any(IncomingMessage), expect.any(ServerResponse), loginOptions);
  });

  test('accept custom logout options', async () => {
    const logoutHandler = jest.fn(async (_req: IncomingMessage, res: ServerResponse) => {
      res.end();
    });
    jest.spyOn(baseLogoutHandler, 'default').mockImplementation(() => logoutHandler);
    const logoutOptions: LogoutOptions = { returnTo: '/foo' };
    const baseUrl = await setup(withoutApi);
    const { handleLogout, handleAuth } = initAuth0(withoutApi);
    global.handleAuth = handleAuth.bind(null, {
      logout: handleLogout(logoutOptions)
    });
    await get(baseUrl, '/api/auth/logout');
    expect(logoutHandler).toHaveBeenCalledWith(expect.any(IncomingMessage), expect.any(ServerResponse), logoutOptions);
  });

  test('accept custom callback options', async () => {
    const callbackHandler = jest.fn(async (_req: IncomingMessage, res: ServerResponse) => {
      res.end();
    });
    jest.spyOn(baseCallbackHandler, 'default').mockImplementation(() => callbackHandler);
    const callbackOptions: CallbackOptions = { redirectUri: '/foo' };
    const baseUrl = await setup(withoutApi);
    const { handleCallback, handleAuth } = initAuth0(withoutApi);
    global.handleAuth = handleAuth.bind(null, {
      callback: handleCallback(callbackOptions)
    });
    await get(baseUrl, '/api/auth/callback');
    expect(callbackHandler).toHaveBeenCalledWith(
      expect.any(IncomingMessage),
      expect.any(ServerResponse),
      expect.objectContaining(callbackOptions)
    );
  });

  test('accept custom profile options', async () => {
    const afterRefetch = jest.fn(async (_req: IncomingMessage, _res: ServerResponse, session: Session) => session);
    const profileOptions: ProfileOptions = { refetch: true, afterRefetch };
    const baseUrl = await setup(withoutApi);
    const { handleProfile, handleAuth } = initAuth0(withoutApi);
    global.handleAuth = handleAuth.bind(null, {
      profile: handleProfile(profileOptions)
    });
    const cookieJar = await login(baseUrl);
    await get(baseUrl, '/api/auth/me', { cookieJar });
    expect(afterRefetch).toHaveBeenCalled();
  });
});

describe('custom options providers', () => {
  afterEach(teardown);

  test('accept custom login options provider', async () => {
    const loginHandler = jest.fn(async (_req: IncomingMessage, res: ServerResponse) => {
      res.end();
    });
    jest.spyOn(baseLoginHandler, 'default').mockImplementation(() => loginHandler);
    const loginOptions = { authorizationParams: { scope: 'openid' } };
    const loginOptionsProvider = jest.fn(() => loginOptions);
    const baseUrl = await setup(withoutApi);
    const { handleLogin, handleAuth } = initAuth0(withoutApi);

    global.handleAuth = handleAuth.bind(null, {
      login: handleLogin(loginOptionsProvider)
    });
    await get(baseUrl, '/api/auth/login');
    expect(loginOptionsProvider).toHaveBeenCalled();
    expect(loginHandler).toHaveBeenCalledWith(expect.any(IncomingMessage), expect.any(ServerResponse), loginOptions);
  });

  test('accept custom logout options provider', async () => {
    const logoutHandler = jest.fn(async (_req: IncomingMessage, res: ServerResponse) => {
      res.end();
    });
    jest.spyOn(baseLogoutHandler, 'default').mockImplementation(() => logoutHandler);
    const logoutOptions: LogoutOptions = { returnTo: '/foo' };
    const logoutOptionsProvider = jest.fn(() => logoutOptions);
    const baseUrl = await setup(withoutApi);
    const { handleLogout, handleAuth } = initAuth0(withoutApi);
    global.handleAuth = handleAuth.bind(null, {
      logout: handleLogout(logoutOptionsProvider)
    });
    await get(baseUrl, '/api/auth/logout');
    expect(logoutOptionsProvider).toHaveBeenCalled();
    expect(logoutHandler).toHaveBeenCalledWith(expect.any(IncomingMessage), expect.any(ServerResponse), logoutOptions);
  });

  test('accept custom callback options provider', async () => {
    const callbackHandler = jest.fn(async (_req: IncomingMessage, res: ServerResponse) => {
      res.end();
    });
    jest.spyOn(baseCallbackHandler, 'default').mockImplementation(() => callbackHandler);
    const callbackOptions: CallbackOptions = { redirectUri: '/foo' };
    const callbackOptionsProvider = jest.fn(() => callbackOptions);
    const baseUrl = await setup(withoutApi);
    const { handleCallback, handleAuth } = initAuth0(withoutApi);
    global.handleAuth = handleAuth.bind(null, {
      callback: handleCallback(callbackOptionsProvider)
    });
    await get(baseUrl, '/api/auth/callback');
    expect(callbackOptionsProvider).toHaveBeenCalled();
    expect(callbackHandler).toHaveBeenCalledWith(
      expect.any(IncomingMessage),
      expect.any(ServerResponse),
      expect.objectContaining(callbackOptions)
    );
  });

  test('accept custom profile options provider', async () => {
    const afterRefetch = jest.fn(async (_req: IncomingMessage, _res: ServerResponse, session: Session) => session);
    const profileOptions: ProfileOptions = { refetch: true, afterRefetch };
    const profileOptionsProvider = jest.fn(() => profileOptions);
    const baseUrl = await setup(withoutApi);
    const { handleProfile, handleAuth } = initAuth0(withoutApi);
    global.handleAuth = handleAuth.bind(null, {
      profile: handleProfile(profileOptionsProvider)
    });
    const cookieJar = await login(baseUrl);
    await get(baseUrl, '/api/auth/me', { cookieJar });
    expect(profileOptionsProvider).toHaveBeenCalled();
    expect(afterRefetch).toHaveBeenCalled();
  });
});
