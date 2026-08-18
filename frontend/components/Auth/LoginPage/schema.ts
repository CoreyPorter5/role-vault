import * as z from "zod"

export const loginSchema = z.object(
    {
        email: z.email("Incorrect format for email").max(254, "Email is too long"),
        password: z.string().min(10, "Password must be at least 10 characters").max(64, "Password must be at most 64 characters")

    }
)

export type loginSchemaType = z.infer<typeof loginSchema>;
