import * as z from 'zod';
export const subsidyFormSchema = z.object({
  income: z.coerce.number().min(0, "Income must be at least 0"),
  household: z.coerce.number().min(1, "Household size must be at least 1").max(12, "Review required for large households"),
});
export const eobFormSchema = z.object({
  billed: z.coerce.number().min(0, "Amount cannot be negative"),
  allowed: z.coerce.number().min(0, "Amount cannot be negative"),
  paid: z.coerce.number().min(0, "Amount cannot be negative"),
  coinsurance: z.coerce.number().min(0).max(100, "Percentage must be 0-100"),
  procedureCode: z.string().min(1, "CPT Code required"),
  facilityName: z.string().default(""),
  ratingArea: z.string().min(1, "Rating Area selection required"),
  historicalAllowed: z.coerce.number().min(0, "Amount cannot be negative").optional(),
  carrierName: z.string().default(""),
});
export const appealFormSchema = z.object({
  userName: z.string().min(2, "Forensic identification required"),
  denialCode: z.string().min(1, "Denial context required"),
  facilityName: z.string().default("")
});
export type SubsidyFormValues = z.infer<typeof subsidyFormSchema>;
export type EobFormValues = z.infer<typeof eobFormSchema>;
export type AppealFormValues = z.infer<typeof appealFormSchema>;