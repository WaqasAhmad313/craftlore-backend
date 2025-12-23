import { z } from "zod";

export const giProductSchema = z.object({
  product: z.object({
    gi_application_number: z.number().int().positive(),
    name: z.string().min(1),
    gi_certificate_number: z.number().int().optional(),
    gi_journal_number: z.number().int().optional(),
    year_of_registration: z.number().int().min(1900).optional(),
    gi_applicant: z.string().optional(),
  }),
  classes: z.array(z.string().min(1)),
  specs: z.record(
    z.string(),
    z.record(
      z.string(),
      z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.any()),
        z.object({}).passthrough(),
      ])
    )
  ),
});

export type GIProductInput = z.infer<typeof giProductSchema>;
