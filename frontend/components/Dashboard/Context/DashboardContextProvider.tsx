'use client'

import React, {createContext, Dispatch, SetStateAction, useContext, useState} from 'react'
import {User} from "@supabase/auth-js";
import {Database} from "@/lib/types/database.types";

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
    const [token] = useState<string | null>(jwkToken)
    const [user] = useState<User | null>(authUser)
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(true)
    const [profile] = useState<Database["public"]["Tables"]["profiles"]["Row"] | null>(userProfile)


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