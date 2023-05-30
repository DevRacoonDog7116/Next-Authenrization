import { NextMiddleware, NextResponse } from 'next/server';
import { SessionCache } from '../session';

/**
 * Protect your pages with Next.js Middleware. For example:
 *
 * To protect all your routes:
 *
 * ```js
 * // middleware.js
 * import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';
 *
 * export default withMiddlewareAuthRequired();
 * ```
 *
 * To protect specific routes:
 *
 * ```js
 * // middleware.js
 * import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';
 *
 * export default withMiddlewareAuthRequired();
 *
 * export const config = {
 *   matcher: '/about/:path*',
 * };
 * ```
 * For more info see: https://nextjs.org/docs/advanced-features/middleware#matching-paths
 *
 * To run custom middleware for authenticated users:
 *
 * ```js
 * // middleware.js
 * import { withMiddlewareAuthRequired, getSession } from '@auth0/nextjs-auth0/edge';
 *
 * export default withMiddlewareAuthRequired(async function middleware(req) {
 *   const res = NextResponse.next();
 *   const user = await getSession(req, res);
 *   res.cookies.set('hl', user.language);
 *   return res;
 * });
 * ```
 *
 * @category Server
 */
export type WithMiddlewareAuthRequired = (middleware?: NextMiddleware) => NextMiddleware;

/**
 * @ignore
 */
export default function withMiddlewareAuthRequiredFactory(
  { login, callback }: { login: string; callback: string },
  getSessionCache: () => SessionCache
): WithMiddlewareAuthRequired {
  return function withMiddlewareAuthRequired(middleware?): NextMiddleware {
    return async function wrappedMiddleware(...args) {
      const [req] = args;
      const { pathname, origin, search } = req.nextUrl;
      const ignorePaths = [login, callback, '/_next', '/favicon.ico'];
      if (ignorePaths.some((p) => pathname.startsWith(p))) {
        return;
      }

      const sessionCache = getSessionCache();

      const authRes = NextResponse.next();
      const session = await sessionCache.get(req, authRes);
      if (!session?.user) {
        if (pathname.startsWith('/api')) {
          return NextResponse.json(
            {
              error: 'not_authenticated',
              description: 'The user does not have an active session or is not authenticated'
            },
            { status: 401 }
          );
        }
        return NextResponse.redirect(
          new URL(`${login}?returnTo=${encodeURIComponent(`${pathname}${search}`)}`, origin)
        );
      }
      const res = await (middleware && middleware(...args));

      if (res) {
        const headers = new Headers(res.headers);
        const cookies = headers.get('set-cookie')?.split(', ') || [];
        const authCookies = authRes.headers.get('set-cookie')?.split(', ') || [];
        if (cookies.length || authCookies.length) {
          // TODO: Should Auth0NextResponse keep existing headers?
          headers.set('set-cookie', [...authCookies, ...cookies].join(', '));
        }
        return NextResponse.next({ ...res, status: res.status, headers });
      } else {
        return authRes;
      }
    };
  };
}
