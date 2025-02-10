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

export const updateOrganizationSchema = z.object({
  id: requiredString,
  name: requiredString,
  email: z.string().email("Invalid email address").optional(),
  location: z.string().optional(),
  logoUrl: z

    .string()
    .optional(),
});

export type UpdateOrganizationValues = z.infer<typeof updateOrganizationSchema>;


export const employeeSchema = z.object({
  name: requiredString,
  email: z.preprocess(
    (value) => (value === "" ? null : value), // Convert empty string to null
    z.string().email("Invalid email address").nullable().optional() // Validate email
  ),
  space: z.coerce.number().min(0), 
  area: z.string().nullable().optional(), 
  areaLat: z.number(), 
  areaLong: z.number(), 
  orgId: requiredString
});

export type EmployeeValues = z.infer<typeof employeeSchema>;

export const updateEmployeeSchema = z.object({
  id: requiredString, 
  name: requiredString,
  email: z.preprocess(
    (value) => (value === "" ? null : value), // Convert empty string to null
    z.string().email("Invalid email address").nullable().optional() // Validate email
  ),
  space: z.coerce.number().min(0), 
  area: z.string().nullable().optional(), 
  areaLat: z.number(), 
  areaLong: z.number(), 
  orgId: requiredString
});

export type UpdateEmployeeValues = z.infer<typeof updateEmployeeSchema>;

const timeUnitEnum = z.enum(["minutes", "hours"]);

export const updateTaskSchema = z.object({
  id: requiredString, 
  task: requiredString,
  requiredTimeValue: z.coerce.number().min(0),  
  requiredTimeUnit: timeUnitEnum, 
  spaceNeeded: z.coerce.number().min(0)
});

export type UpdateTaskValues = z.infer<typeof updateTaskSchema>;

export const taskSchema = z.object({
  task: requiredString,
  requiredTimeValue: z.coerce.number().min(0),  
  requiredTimeUnit: timeUnitEnum, 
  spaceNeeded: z.coerce.number().min(0), 
  orgId: requiredString
});

export type TaskValues = z.infer<typeof taskSchema>;

export const jobOrderTaskSchema = z.object({
  taskId: z.string().min(1, "Task is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
});

export const jobOrderSchema = z.object({
  orderNumber: z.string().min(1, "Order number is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string(), 
  postCode: z.string(), 
  state: z.string(), 
  country: z.string(), 
  latitude: z.number(),
  longitude: z.number(),
  placeId: requiredString, 
  orgId: requiredString, 
  tasks: z.array(jobOrderTaskSchema).min(1, "At least one task is required"),
  spaceRequried: z.number()
});

export type JobOrderValues = z.infer<typeof jobOrderSchema>;

export const updateJobOrderSchema = z.object({
  id: requiredString, 
  orderNumber: z.string().min(1, "Order number is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string(), 
  postCode: z.string(), 
  state: z.string(), 
  country: z.string(), 
  latitude: z.number(),
  longitude: z.number(),
  placeId: requiredString, 
  orgId: requiredString, 
  tasks: z.array(jobOrderTaskSchema).min(1, "At least one task is required"),
  spaceRequried: z.number()
});

export type UpdateJobOrderValues = z.infer<typeof updateJobOrderSchema>;

export const scheduleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  departAddress: z.string().min(1, "Address is required"),
  departCity: z.string(), 
  departPostCode: z.string(), 
  departState: z.string(), 
  departCountry: z.string(), 
  departLatitude: z.number(),
  departLongitude: z.number(),
  departPlaceId: requiredString,
  orgId: requiredString, 
  departTime: z.date(),
});

export type ScheduleValues = z.infer<typeof scheduleSchema>;

export const updateScheduleSchema = z.object({
  id: requiredString, 
  name: z.string().min(1, "Name is required"),
  departAddress: z.string().min(1, "Address is required"),
  departCity: z.string(), 
  departPostCode: z.string(), 
  departState: z.string(), 
  departCountry: z.string(), 
  departLatitude: z.number(),
  departLongitude: z.number(),
  departPlaceId: requiredString,
  departTime: z.date(),
});

export type UpdateScheduleValues = z.infer<typeof updateScheduleSchema>;
