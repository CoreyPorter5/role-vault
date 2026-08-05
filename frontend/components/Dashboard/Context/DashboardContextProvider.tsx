'use client'

import React, {createContext, Dispatch, SetStateAction, useContext, useEffect, useState} from 'react'
import type {User} from '@supabase/auth-js'
import {useRouter} from 'next/navigation'
import type {Database} from '@/lib/types/database.types'
import {createClient} from '@/lib/supabase/client'
import {subscribeToDashboardSession} from '@/lib/auth/dashboard-session'

type AuthContextType = {
    token: string | null
    user: User | null
    sidebarOpen: boolean
    setSidebarOpen: Dispatch<SetStateAction<boolean>>
    profile: Database["public"]["Tables"]["profiles"]["Row"] | null
}

const AuthContext = createContext<AuthContextType | null>(null)

export function DashboardContextProvider({
                                             children,
                                             jwkToken,
                                             authUser,
                                             userProfile
                                         }: {
    children: React.ReactNode
    jwkToken: string | null
    authUser: User | null
    userProfile: Database["public"]["Tables"]["profiles"]["Row"] | null
}) {
    const router = useRouter()
    const [supabase] = useState(() => createClient())
    const [token, setToken] = useState<string | null>(jwkToken)
    const [user, setUser] = useState<User | null>(authUser)
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(true)
    const [profile] = useState<Database["public"]["Tables"]["profiles"]["Row"] | null>(userProfile)


    useEffect(() => {
        return subscribeToDashboardSession(supabase.auth, {
            onSession: (session) => {
                setToken(session.token)
                setUser(session.user)
            },
            onSignedOut: () => {
                setToken(null)
                setUser(null)
                router.replace('/login')
                router.refresh()
            },
        })
    }, [router, supabase])


    return (
        <AuthContext.Provider value={{token, user, sidebarOpen, setSidebarOpen, profile}}>
            {children}
        </AuthContext.Provider>
    )
}

export function useJWKTokenAndUserAndSidebar() {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used inside Providers')
    return context
}
