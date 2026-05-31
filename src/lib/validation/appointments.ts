import { z } from "zod";

const optionalText = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().optional(),
);

const optionalEmail = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().email("Enter a valid email address.").optional(),
);

const requiredDateTime = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}, z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid appointment date."));

const optionalDateTime = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}, z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid appointment date.").optional());

const optionalUuid = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.uuid().optional(),
);

export const appointmentStatusSchema = z.enum([
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);

export const createAppointmentSchema = z
  .object({
    client_email: optionalEmail,
    client_id: optionalUuid,
    client_name: optionalText,
    client_phone: optionalText,
    ends_at: optionalDateTime,
    job_id: optionalUuid,
    location: optionalText,
    notes: optionalText,
    starts_at: requiredDateTime,
    status: appointmentStatusSchema.default("pending"),
    title: z.string().trim().min(1, "Appointment title is required."),
  })
  .refine(
    (appointment) =>
      !appointment.ends_at ||
      Date.parse(appointment.ends_at) >= Date.parse(appointment.starts_at),
    {
      message: "End time must be after the start time.",
      path: ["ends_at"],
    },
  );

export const updateAppointmentSchema = z
  .object({
    ends_at: optionalDateTime,
    location: optionalText,
    notes: optionalText,
    starts_at: requiredDateTime,
    status: appointmentStatusSchema,
    title: z.string().trim().min(1, "Appointment title is required."),
  })
  .refine(
    (appointment) =>
      !appointment.ends_at ||
      Date.parse(appointment.ends_at) >= Date.parse(appointment.starts_at),
    {
      message: "End time must be after the start time.",
      path: ["ends_at"],
    },
  );

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
