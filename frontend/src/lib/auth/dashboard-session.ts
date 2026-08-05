import type {AuthChangeEvent, Session, User} from '@supabase/supabase-js'

type DashboardAuthClient = {
    onAuthStateChange: (
        callback: (event: AuthChangeEvent, session: Session | null) => void
    ) => {
        data: {
            subscription: {
                unsubscribe: () => void
            }
        }
    }
}

export type DashboardSessionSnapshot = {
    token: string
    user: User
}

type DashboardSessionCallbacks = {
    onSession: (snapshot: DashboardSessionSnapshot) => void
    onSignedOut: () => void
}

/**
 * Keeps dashboard auth state aligned with Supabase's browser session. The
 * callback is intentionally synchronous: Supabase warns against awaiting
 * other auth operations from inside onAuthStateChange.
 */
export function subscribeToDashboardSession(
    auth: DashboardAuthClient,
    callbacks: DashboardSessionCallbacks
) {
    let active = true
    const {data: {subscription}} = auth.onAuthStateChange((_event, session) => {
        if (!active) {
            return
        }
        if (!session) {
            callbacks.onSignedOut()
            return
        }
        callbacks.onSession({
            token: session.access_token,
            user: session.user,
        })
    })

    return () => {
        active = false
        subscription.unsubscribe()
    }
}
