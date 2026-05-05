'use client'

import React, {createContext, Dispatch, SetStateAction, useContext, useState} from 'react'
import {User} from "@supabase/auth-js";

type AuthContextType = {
    user: User | null
    setUser: Dispatch<SetStateAction<User | null>>


}

const AuthContext = createContext<AuthContextType | null>(null)

export function HomepageContextProvider({
                                            children,
                                            authUser,
                                        }: {
    children: React.ReactNode
    authUser: User | null
    setAuthUserAction: Dispatch<SetStateAction<User | null>>
}) {
    const [user, setUser] = useState<User | null>(authUser)


    return (
        <AuthContext.Provider value={{user, setUser}}>
            {children}
        </AuthContext.Provider>
    )
}

export function useUser() {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used inside Providers')
    return context
}