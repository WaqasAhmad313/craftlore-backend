import { z } from "zod";

const productSchema = z.object({
  gi_application_number: z.number().int().positive(),
  name: z.string().min(1),
  gi_certificate_number: z.number().int().positive(),
  gi_journal_number: z.number().int().positive(),
  year_of_registration: z.number().int().min(1900).max(new Date().getFullYear()),
  gi_applicant: z.string().min(1),
});

export const giProductSchema = z.object({
  product: productSchema,
  classes: z.array(z.string().min(1)).min(1),
  specs: z.record(z.string(), z.any()), 
});

export type GIProductInput = z.infer<typeof giProductSchema>;