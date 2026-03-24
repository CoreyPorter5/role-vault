"use client"

import handleLogout from "./actions";

export default function LogoutButton(){
    return(
        <button onClick={() => handleLogout()}>Logout</button>
    )
}