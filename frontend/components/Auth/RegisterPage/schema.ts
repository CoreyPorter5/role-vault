import * as z from "zod"


export const registerSchema = z.object(
    {
        firstName: z.string().min(1).max(15),
        lastName: z.string().min(1).max(20),
        email: z.email("Incorrect format for email").max(254, "Email is too long"),
        password: z.string().min(10, "Password must be at least 10 characters").max(64, "Password must be at most 64 characters"),
        confirmPassword: z.string().max(64, "Password must be at most 64 characters")
    }
).refine((data) => data.password === data.confirmPassword, {
    error: "Passwords must match",
    path: ["confirmPassword"],
})

export type registerSchemaType = z.infer<typeof registerSchema>;


export type RegisterResult =
    | { ok: true; requiresEmailConfirmation: true; email: string }
    | {
    ok: false;
    fieldErrors?: Partial<Record<keyof registerSchemaType, string>>;
    formError?: string;
};
