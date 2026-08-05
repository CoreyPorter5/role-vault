import assert from 'node:assert/strict'
import test from 'node:test'

import {subscribeToDashboardSession} from '../src/lib/auth/dashboard-session.ts'

function createAuthHarness() {
    let callback
    let unsubscribeCalls = 0
    const auth = {
        onAuthStateChange(nextCallback) {
            callback = nextCallback
            return {
                data: {
                    subscription: {
                        unsubscribe() {
                            unsubscribeCalls++
                        },
                    },
                },
            }
        },
    }
    return {
        auth,
        emit(event, session) {
            assert.ok(callback, 'auth subscription was not installed')
            callback(event, session)
        },
        get unsubscribeCalls() {
            return unsubscribeCalls
        },
    }
}

function session(token, userId) {
    return {
        access_token: token,
        user: {id: userId},
    }
}

test('TOKEN_REFRESHED replaces the dashboard bearer token and user', () => {
    const harness = createAuthHarness()
    const snapshots = []
    let signedOut = 0

    const unsubscribe = subscribeToDashboardSession(harness.auth, {
        onSession: (snapshot) => snapshots.push(snapshot),
        onSignedOut: () => signedOut++,
    })

    harness.emit('INITIAL_SESSION', session('initial-token', 'user-1'))
    harness.emit('TOKEN_REFRESHED', session('refreshed-token', 'user-1'))

    assert.deepEqual(snapshots.map(({token}) => token), ['initial-token', 'refreshed-token'])
    assert.equal(snapshots.at(-1).user.id, 'user-1')
    assert.equal(signedOut, 0)

    unsubscribe()
    assert.equal(harness.unsubscribeCalls, 1)
})

test('a missing session clears dashboard auth for refresh failures and sign-out', () => {
    const harness = createAuthHarness()
    let signedOut = 0

    subscribeToDashboardSession(harness.auth, {
        onSession: () => assert.fail('a null session must not be published'),
        onSignedOut: () => signedOut++,
    })

    harness.emit('SIGNED_OUT', null)
    assert.equal(signedOut, 1)
})

test('cleanup ignores late auth events and unsubscribes exactly once', () => {
    const harness = createAuthHarness()
    const tokens = []
    const unsubscribe = subscribeToDashboardSession(harness.auth, {
        onSession: ({token}) => tokens.push(token),
        onSignedOut: () => assert.fail('late sign-out callback should be ignored'),
    })

    unsubscribe()
    harness.emit('TOKEN_REFRESHED', session('late-token', 'user-1'))

    assert.deepEqual(tokens, [])
    assert.equal(harness.unsubscribeCalls, 1)
})
