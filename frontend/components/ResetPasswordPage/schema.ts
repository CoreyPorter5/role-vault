import * as z from "zod"

export const resetPasswordSchema = z.object(
    {
        password: z.string().min(10, "Password must be at least 10 characters").max(64, "Password must be at most 64 characters")

    }
)

export type resetPasswordSchemaType = z.infer<typeof resetPasswordSchema>;
