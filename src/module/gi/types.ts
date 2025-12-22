export interface GIProductPayload {
  product: {
    gi_application_number: number;
    name: string;
    gi_certificate_number?: number;
    gi_journal_number?: number;
    year_of_registration?: number;
    gi_applicant?: string;
  };
  classes: string[];
  specs: Record<
    string,
    Record<string, string | number | boolean | any[] | object>
  >;
}
