'use client'

import React, {createContext, Dispatch, SetStateAction, useContext, useState} from 'react'
import {User} from "@supabase/auth-js";

type AuthContextType = {
    token: string | null
    user: User | null
    sidebarOpen: boolean
    setSidebarOpen: Dispatch<SetStateAction<boolean>>
    }

const AuthContext = createContext<AuthContextType | null>(null)

export function DashboardContextProvider({
                                             children,
                                             jwkToken,
                                             authUser,
                                         }: {
    children: React.ReactNode
    jwkToken: string | null
    authUser: User | null
    }) {
    const [token] = useState<string | null>(jwkToken)
    const [user] = useState<User | null>(authUser)
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(true)


    return (
        <AuthContext.Provider value={{token, user, sidebarOpen, setSidebarOpen}}>
            {children}
        </AuthContext.Provider>
    )
}

export function useJWKTokenAndUserAndSidebar() {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used inside Providers')
    return context
}