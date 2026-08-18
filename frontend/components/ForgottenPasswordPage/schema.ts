import * as z from "zod"
import {loginSchemaType} from "../Auth/LoginPage/schema";

export const forgotPasswordSchema = z.object(
    {
        email: z.email("Incorrect format for email").max(254, "Email is too long"),

    }
)

export type forgotPasswordSchemaType = z.infer<typeof forgotPasswordSchema>;

export type ForgotPasswordResult =
    | { ok: true }
    | {
    ok: false;
    fieldErrors?: Partial<Record<keyof loginSchemaType, string>>;
    formError?: string;
};
