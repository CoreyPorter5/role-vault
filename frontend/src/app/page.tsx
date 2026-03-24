


import Link from "next/link";
import LogoutButton from "../../components/LogoutComponent/LogoutButton";


export default function Home() {




    return (
        <div className={"flex items-center gap-x-5 justify-center"}>
            <Link href={"/login"}>Login</Link>
            <Link href={"/register"}>SignUp</Link>
            <LogoutButton/>
        </div>

    );
}
