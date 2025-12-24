import { z } from "zod";

const productSchema = z.object({
  gi_application_number: z.number().int().positive(),
  name: z.string().min(1),
  gi_certificate_number: z.number(),
  gi_journal_number: z.number(),
  year_of_registration: z.number(),
  gi_applicant: z.string().min(1),
});

export const giProductSchema = z.object({
  product: productSchema,
  classes: z.array(z.number().int().positive()), // ✅ Changed to number array
  specs: z.record(z.string(), z.unknown()),
});

export type GIProductInput = z.infer<typeof giProductSchema>;