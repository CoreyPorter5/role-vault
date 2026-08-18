import {createClient} from "@/lib/supabase/server";

export async function hasAuthenticatedApiUser(): Promise<boolean> {
    try {
        const supabase = await createClient();
        const {
            data: {user},
            error,
        } = await supabase.auth.getUser();
        return !error && Boolean(user);
    } catch {
        return false;
    }
}
