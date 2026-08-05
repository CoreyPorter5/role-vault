import * as z from "zod"

export const loginSchema = z.object(
    {
        email: z.email("Incorrect format for email"),
        password: z.string().min(10, "Password must be at least 10 characters").max(20, "Password must be at most 20 characters")

    }
)

export type loginSchemaType = z.infer<typeof loginSchema>;