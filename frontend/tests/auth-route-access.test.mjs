import assert from 'node:assert/strict'
import {existsSync} from 'node:fs'
import test from 'node:test'

import {
    requiresAuthentication,
    shouldRedirectToLogin,
} from '../src/lib/auth/route-access.mjs'

const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/pricing',
    '/forgot-password',
    '/reset-password',
    '/auth/callback',
    '/api/generate-resume',
    '/api/classify-job',
    '/api/export-resume-docx',
    '/api/extension/session',
    '/api/extension/logout',
    '/dashboard-preview',
]

const protectedRoutes = [
    '/dashboard',
    '/dashboard/',
    '/dashboard/account',
    '/dashboard/billing',
    '/dashboard/library',
    '/dashboard/resume',
    '/dashboard/upgrade',
]

test('the proxy is colocated with src/app so Next.js registers it', () => {
    assert.equal(existsSync(new URL('../src/proxy.ts', import.meta.url)), true)
})

test('current public pages and API handlers do not require a browser session', () => {
    for (const pathname of publicRoutes) {
        assert.equal(
            requiresAuthentication(pathname),
            false,
            `${pathname} should remain public`
        )
    }
})

test('the complete dashboard route tree requires authentication', () => {
    for (const pathname of protectedRoutes) {
        assert.equal(
            requiresAuthentication(pathname),
            true,
            `${pathname} should require authentication`
        )
    }
})

test('only anonymous users are redirected away from protected routes', () => {
    assert.equal(shouldRedirectToLogin('/dashboard', undefined), true)
    assert.equal(shouldRedirectToLogin('/dashboard/library', null), true)
    assert.equal(shouldRedirectToLogin('/dashboard', 'verified-user-id'), false)
    assert.equal(shouldRedirectToLogin('/login', undefined), false)
})
