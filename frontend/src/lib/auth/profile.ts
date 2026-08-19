import type {PostgrestError, SupabaseClient, User} from "@supabase/supabase-js";
import type {Database} from "@/lib/types/database.types";
import {
    isDuplicateProfileError,
    profileNamesFromMetadata,
} from "@/lib/auth/callback";

export async function ensureUserProfile(
    supabase: SupabaseClient<Database>,
    user: User,
): Promise<PostgrestError | null> {
    const {data: existingProfile, error: profileLookupError} = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (profileLookupError || existingProfile) {
        return profileLookupError;
    }

    const {firstName, lastName} = profileNamesFromMetadata(user.user_metadata, user.email);
    const {error: insertError} = await supabase.from("profiles").insert({
        user_id: user.id,
        email: user.email ?? "",
        first_name: firstName,
        last_name: lastName,
    });

    // Concurrent confirmation/callback requests may both observe no row. The
    // primary key makes one insert win and the other request can continue.
    return isDuplicateProfileError(insertError) ? null : insertError;
}
