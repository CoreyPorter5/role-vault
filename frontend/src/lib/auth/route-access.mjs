const PROTECTED_ROUTE_PREFIXES = ['/dashboard']

/**
 * Returns true when a pathname belongs to a route tree that requires a user.
 * Match complete path segments so similarly named public routes remain public.
 *
 * @param {string} pathname
 * @returns {boolean}
 */
export function requiresAuthentication(pathname) {
    return PROTECTED_ROUTE_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
}

/**
 * @param {string} pathname
 * @param {string | null | undefined} userId
 * @returns {boolean}
 */
export function shouldRedirectToLogin(pathname, userId) {
    return !userId && requiresAuthentication(pathname)
}
