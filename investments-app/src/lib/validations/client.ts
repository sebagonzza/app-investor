import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio."),
  type: z.enum(["PROPIO", "TERCERO"]),
  email: z.string().email("Email inválido.").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type ClientInput = z.infer<typeof clientSchema>;
