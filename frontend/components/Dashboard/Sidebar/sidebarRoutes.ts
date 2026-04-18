import {RectangleGroupIcon} from "@heroicons/react/24/solid";
import {ListBulletIcon} from "@heroicons/react/24/solid";
import {DocumentCheckIcon} from "@heroicons/react/24/solid";
import {UserCircleIcon} from "@heroicons/react/24/solid";



export const routes = [
    {
        name: "Dashboard",
        path: "/dashboard",
        icon: RectangleGroupIcon
    },
    {
        name: "My Jobs",
        path: "/dashboard/jobs",
        icon: ListBulletIcon
    },
    {
        name: "Resume Settings",
        path: "/dashboard/resume",
        icon: DocumentCheckIcon
    },
    {
        name: "Account",
        path: "/dashboard/account",
        icon: UserCircleIcon
    }
]