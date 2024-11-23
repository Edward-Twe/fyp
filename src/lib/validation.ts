import { z } from "zod";

const requiredString = z.string().trim().min(1, "Required");

export const signUpSchema = z.object({
  email: requiredString.email("Invalid email address"),
  username: requiredString.regex(
    /^[a-zA-Z0-9_-]+$/,
    "Only letters, numbers, - and _ allowed",
  ),
  password: requiredString
    .min(8, "Must be at least 8 characters.")
    .regex(/(?=.*[A-Z])/, "Must contain at least one uppercase letter")
    .regex(/(?=.*[a-z])/, "Must contain at least one lowercase letter")
    .regex(/(?=.*\d)/, "Must contain at least one number")
    .regex(/(?=.*[!@#$%^&*_-])/, "Must contain at least one special character"),
});

export type SignUpValues = z.infer<typeof signUpSchema>;

export const loginSchema = z.object({
  username: requiredString,
  password: requiredString,
});

export type LoginValues = z.infer<typeof loginSchema>;

export const organizationSchema = z.object({
  name: requiredString,
  email: z.string().email("Invalid email address").optional(),
  location: z.string().optional(),
  logoUrl: z
    .string()
    .optional(),
});

export type OrganizationValues = z.infer<typeof organizationSchema>;
