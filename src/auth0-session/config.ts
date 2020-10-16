import { IncomingMessage } from 'http';
import { AuthorizationParameters as OidcAuthorizationParameters } from 'openid-client';
import Joi from '@hapi/joi';
import clone from 'clone';
import { defaultState as getLoginState } from './hooks/get-login-state';

/**
 * Configuration properties.
 *
 * ```js
 * ISSUER_BASE_URL=https://YOUR_DOMAIN
 * CLIENT_ID=YOUR_CLIENT_ID
 * BASE_URL=https://YOUR_APPLICATION_ROOT_URL
 * SECRET=LONG_RANDOM_VALUE
 * ```
 */
export interface Config {
  /**
   * The secret(s) used to derive an encryption key for the user identity in a session cookie and
   * to sign the transient cookies used by the login callback.
   * Use a single string key or array of keys for an encrypted session cookie.
   * Can use env key SECRET instead.
   */
  secret: string | Array<string>;

  /**
   * Object defining application session cookie attributes.
   */
  session: SessionConfig;

  /**
   * Boolean value to enable Auth0's logout feature.
   */
  auth0Logout: boolean;

  /**
   *  URL parameters used when redirecting users to the authorization server to log in.
   *
   *  If this property is not provided by your application, its default values will be:
   *
   * ```js
   * {
   *   response_type: 'id_token',
   *   response_mode: 'form_post,
   *   scope: openid profile email'
   * }
   * ```
   *
   * New values can be passed in to change what is returned from the authorization server depending on your specific scenario.
   *
   * For example, to receive an access token for an API, you could initialize like the sample below. Note that `response_mode` can be omitted because the OAuth2 default mode of `query` is fine:
   *
   * ```js
   * app.use(
   *   auth({
   *     authorizationParams: {
   *       response_type: 'code',
   *       scope: 'openid profile email read:reports',
   *       audience: 'https://your-api-identifier',
   *     },
   *   })
   * );
   * ```
   *
   * Additional custom parameters can be added as well:
   *
   * ```js
   * app.use(auth({
   *   authorizationParams: {
   *     // Note: you need to provide required parameters if this object is set.
   *     response_type: "id_token",
   *     response_mode: "form_post",
   *     scope: "openid profile email"
   *    // Additional parameters
   *    acr_value: "tenant:test-tenant",
   *    custom_param: "custom-value"
   *   }
   * }));
   * ```
   */
  authorizationParams: AuthorizationParameters;

  /**
   * The root URL for the application router, eg https://localhost
   * Can use env key BASE_URL instead.
   */
  baseURL: string;

  /**
   * The Client ID for your application.
   * Can be read from CLIENT_ID instead.
   */
  clientID: string;

  /**
   * The Client Secret for your application.
   * Required when requesting access tokens.
   * Can be read from CLIENT_SECRET instead.
   */
  clientSecret?: string;

  /**
   * Integer value for the system clock's tolerance (leeway) in seconds for ID token verification.`
   * Default is 60
   */
  clockTolerance: number;

  /**
   * To opt-out of sending the library and node version to your authorization server
   * via the `Auth0-Client` header. Default is `true
   */
  enableTelemetry: boolean;

  /**
   * Throw a 401 error instead of triggering the login process for routes that require authentication.
   * Default is `false`
   */
  errorOnRequiredAuth: boolean;

  /**
   * Attempt silent login (`prompt: 'none'`) on the first unauthenticated route the user visits.
   * For protected routes this can be useful if your Identity Provider does not default to
   * `prompt: 'none'` and you'd like to attempt this before requiring the user to interact with a login prompt.
   * For unprotected routes this can be useful if you want to check the user's logged in state on their IDP, to
   * show them a login/logout button for example.
   * Default is `false`
   */
  attemptSilentLogin: boolean;

  /**
   * Function that returns an object with URL-safe state values for `res.oidc.login()`.
   * Used for passing custom state parameters to your authorization server.
   *
   * ```js
   * app.use(auth({
   *   ...
   *   getLoginState(req, options) {
   *     return {
   *       returnTo: options.returnTo || req.originalUrl,
   *       customState: 'foo'
   *     };
   *   }
   * }))
   * ``
   */
  getLoginState: (req: IncomingMessage, options: LoginOptions) => Record<string, any>;

  /**
   * Array value of claims to remove from the ID token before storing the cookie session.
   * Default is `['aud', 'iss', 'iat', 'exp', 'nbf', 'nonce', 'azp', 'auth_time', 's_hash', 'at_hash', 'c_hash' ]`
   */
  identityClaimFilter: string[];

  /**
   * Boolean value to log the user out from the identity provider on application logout. Default is `false`
   */
  idpLogout: boolean;

  /**
   * String value for the expected ID token algorithm. Default is 'RS256'
   */
  idTokenSigningAlg: string;

  /**
   * REQUIRED. The root URL for the token issuer with no trailing slash.
   * Can use env key ISSUER_BASE_URL instead.
   */
  issuerBaseURL: string;

  /**
   * Set a fallback cookie with no SameSite attribute when response_mode is form_post.
   * Default is true
   */
  legacySameSiteCookie: boolean;

  /**
   * Require authentication for all routes.
   */
  authRequired: boolean;

  /**
   * Boolean value to automatically install the login and logout routes.
   */
  routes: {
    /**
     * Relative path to application login.
     */
    login: string | false;

    /**
     * Relative path to application logout.
     */
    logout: string | false;

    /**
     * Either a relative path to the application or a valid URI to an external domain.
     * This value must be registered on the authorization server.
     * The user will be redirected to this after a logout has been performed.
     */
    postLogoutRedirect: string;

    /**
     * Relative path to the application callback to process the response from the authorization server.
     */
    callback: string;
  };
}

/**
 * Configuration parameters used for the application session.
 */
export interface SessionConfig {
  /**
   * String value for the cookie name used for the internal session.
   * This value must only include letters, numbers, and underscores.
   * Default is `appSession`.
   */
  name: string;

  /**
   * If you want your session duration to be rolling, eg reset everytime the
   * user is active on your site, set this to a `true`. If you want the session
   * duration to be absolute, where the user is logged out a fixed time after login,
   * regardless of activity, set this to `false`
   * Default is `true`.
   */
  rolling: boolean;

  /**
   * Integer value, in seconds, for application session rolling duration.
   * The amount of time for which the user must be idle for then to be logged out.
   * Default is 86400 seconds (1 day).
   */
  rollingDuration: number;

  /**
   * Integer value, in seconds, for application absolute rolling duration.
   * The amount of time after the user has logged in that they will be logged out.
   * Set this to `false` if you don't want an absolute duration on your session.
   * Default is 604800 seconds (7 days).
   */
  absoluteDuration: boolean | number;

  cookie: CookieConfig;
}

export interface CookieConfig {
  /**
   * Domain name for the cookie.
   * Passed to the [Response cookie](https://expressjs.com/en/api.html#res.cookie) as `domain`
   */
  domain?: string;

  /**
   * Path for the cookie.
   * Passed to the [Response cookie](https://expressjs.com/en/api.html#res.cookie) as `path`
   */
  path?: string;

  /**
   * Set to true to use a transient cookie (cookie without an explicit expiration).
   * Default is `false`
   */
  transient: boolean;

  /**
   * Flags the cookie to be accessible only by the web server.
   * Passed to the [Response cookie](https://expressjs.com/en/api.html#res.cookie) as `httponly`.
   * Defaults to `true`.
   */
  httpOnly: boolean;

  /**
   * Marks the cookie to be used over secure channels only.
   * Passed to the [Response cookie](https://expressjs.com/en/api.html#res.cookie) as `secure`.
   * Defaults to {@link Request.secure}.
   */
  secure?: boolean;

  /**
   * Value of the SameSite Set-Cookie attribute.
   * Passed to the [Response cookie](https://expressjs.com/en/api.html#res.cookie) as `samesite`.
   * Defaults to "Lax" but will be adjusted based on {@link AuthorizationParameters.response_type}.
   */
  sameSite: boolean | 'lax' | 'strict' | 'none';
}

export interface AuthorizationParameters extends OidcAuthorizationParameters {
  scope: string;
  response_mode: 'query' | 'form_post';
  response_type: 'id_token' | 'code id_token' | 'code';
}

/**
 * Custom options to pass to login.
 */
export interface LoginOptions {
  /**
   * Override the default {@link ConfigParams.authorizationParams authorizationParams}
   */
  authorizationParams?: AuthorizationParameters;

  /**
   *  URL to return to after login, overrides the Default is {@link Request.originalUrl}
   */
  returnTo?: string;
}

/**
 * Custom options to pass to logout.
 */
export interface LogoutOptions {
  /**
   *  URL to returnTo after logout, overrides the Default in {@link ConfigParams.routes.postLogoutRedirect routes.postLogoutRedirect}
   */
  returnTo?: string;
}

const paramsSchema = Joi.object({
  secret: Joi.alternatives([
    Joi.string().min(8),
    Joi.binary().min(8),
    Joi.array().items(Joi.string().min(8), Joi.binary().min(8))
  ]).required(),
  session: Joi.object({
    rolling: Joi.boolean().optional().default(true),
    rollingDuration: Joi.when(Joi.ref('rolling'), {
      is: true,
      then: Joi.number().integer().messages({
        'number.base': '"session.rollingDuration" must be provided an integer value when "session.rolling" is true'
      }),
      otherwise: Joi.boolean().valid(false).messages({
        'any.only': '"session.rollingDuration" must be false when "session.rolling" is disabled'
      })
    })
      .optional()
      .default((parent) => (parent.rolling ? 24 * 60 * 60 : false)), // 1 day when rolling is enabled, else false
    absoluteDuration: Joi.when(Joi.ref('rolling'), {
      is: false,
      then: Joi.number().integer().messages({
        'number.base': '"session.absoluteDuration" must be provided an integer value when "session.rolling" is false'
      }),
      otherwise: Joi.alternatives([Joi.number().integer(), Joi.boolean().valid(false)])
    })
      .optional()
      .default(7 * 24 * 60 * 60), // 7 days,
    name: Joi.string().token().optional().default('appSession'),
    cookie: Joi.object({
      domain: Joi.string().optional(),
      transient: Joi.boolean().optional().default(false),
      httpOnly: Joi.boolean().optional().default(true),
      sameSite: Joi.string().valid('Lax', 'Strict', 'None').optional().default('Lax'),
      secure: Joi.boolean().optional(),
      path: Joi.string().uri({ relativeOnly: true }).optional()
    })
      .default()
      .unknown(false)
  })
    .default()
    .unknown(false),
  auth0Logout: Joi.boolean().optional().default(false),
  authorizationParams: Joi.object({
    response_type: Joi.string().optional().valid('id_token', 'code id_token', 'code').default('id_token'),
    scope: Joi.string()
      .optional()
      .pattern(/\bopenid\b/, 'contains openid')
      .default('openid profile email'),
    response_mode: Joi.string()
      .optional()
      .when('response_type', {
        is: 'code',
        then: Joi.valid('query', 'query'),
        otherwise: Joi.valid('form_post').default('form_post')
      })
  })
    .optional()
    .unknown(true)
    .default(),
  baseURL: Joi.string().uri().required(),
  clientID: Joi.string().required(),
  clientSecret: Joi.string()
    .when(
      Joi.ref('authorizationParams.response_type', {
        adjust: (value) => value && value.includes('code')
      }),
      {
        is: true,
        then: Joi.string().required().messages({
          'any.required': '"clientSecret" is required for a response_type that includes code'
        })
      }
    )
    .when(
      Joi.ref('idTokenSigningAlg', {
        adjust: (value) => value && value.startsWith('HS')
      }),
      {
        is: true,
        then: Joi.string().required().messages({
          'any.required': '"clientSecret" is required for ID tokens with HMAC based algorithms'
        })
      }
    ),
  clockTolerance: Joi.number().optional().default(60),
  enableTelemetry: Joi.boolean().optional().default(true),
  errorOnRequiredAuth: Joi.boolean().optional().default(false),
  attemptSilentLogin: Joi.boolean().optional().default(false),
  getLoginState: Joi.function()
    .optional()
    .default(() => getLoginState),
  identityClaimFilter: Joi.array()
    .optional()
    .default(['aud', 'iss', 'iat', 'exp', 'nbf', 'nonce', 'azp', 'auth_time', 's_hash', 'at_hash', 'c_hash']),
  idpLogout: Joi.boolean()
    .optional()
    .default((parent) => parent.auth0Logout || false),
  idTokenSigningAlg: Joi.string().insensitive().not('none').optional().default('RS256'),
  issuerBaseURL: Joi.string().uri().required(),
  legacySameSiteCookie: Joi.boolean().optional().default(true),
  authRequired: Joi.boolean().optional().default(true),
  routes: Joi.object({
    login: Joi.alternatives([Joi.string().uri({ relativeOnly: true }), Joi.boolean().valid(false)]).default('/login'),
    logout: Joi.alternatives([Joi.string().uri({ relativeOnly: true }), Joi.boolean().valid(false)]).default('/logout'),
    callback: Joi.string().uri({ relativeOnly: true }).default('/callback'),
    postLogoutRedirect: Joi.string().uri({ allowRelative: true }).default('')
  })
    .default()
    .unknown(false)
});

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer I> ? Array<DeepPartial<I>> : DeepPartial<T[P]>;
};

export type ConfigParameters = DeepPartial<Config>;

export const get = (params?: ConfigParameters): Config => {
  let config = typeof params === 'object' ? clone(params) : {}; // @TODO need clone?
  config = {
    secret: process.env.SECRET,
    issuerBaseURL: process.env.ISSUER_BASE_URL,
    baseURL: process.env.BASE_URL,
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    ...config
  };

  const paramsValidation = paramsSchema.validate(config);
  if (paramsValidation.error) {
    throw new TypeError(paramsValidation.error.details[0].message);
  }

  return paramsValidation.value;
};
