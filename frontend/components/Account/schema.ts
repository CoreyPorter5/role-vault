import {z} from "zod";


export const changePasswordSchema = z.object(
    {
        oldPassword: z.string().min(1, "Current password is required").max(64, "Password must be at most 64 characters"),
        newPassword: z.string().min(10, "Password must be at least 10 characters").max(64, "Password must be at most 64 characters"),
        newConfirmPassword: z.string().min(1, "Please confirm your new password").max(64, "Password must be at most 64 characters")
    }
).refine((data) => data.newPassword === data.newConfirmPassword, {
    error: "Passwords must match",
    path: ["newConfirmPassword"],
})

export type changePasswordSchemaType = z.infer<typeof changePasswordSchema>;
