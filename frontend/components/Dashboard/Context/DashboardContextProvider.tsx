'use client'

import React, {createContext, useContext, useState} from 'react'
import {User} from "@supabase/auth-js";

type AuthContextType = {
    token: string | null
    user: User | null
    }

const AuthContext = createContext<AuthContextType | null>(null)

export function DashboardContextProvider({
                                             children,
                                             jwkToken,
                                             authUser
                                         }: {
    children: React.ReactNode
    jwkToken: string | null
    authUser: User | null
    }) {
    const [token] = useState<string | null>(jwkToken)
    const [user] = useState<User | null>(authUser)


    return (
        <AuthContext.Provider value={{token, user}}>
            {children}
        </AuthContext.Provider>
    )
}

export function useJWKTokenAndUser() {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used inside Providers')
    return context
}