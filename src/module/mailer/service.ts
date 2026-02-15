import { ContactMailer, type ContactPayload } from "./mailer.ts";

type ContactRequest = {
  name?: unknown;
  email?: unknown;
  organization?: unknown;
  topic?: unknown;
  message?: unknown;
  submissionEmail?: unknown;
};

export class ContactService {
  private static isString(v: unknown): v is string {
    return typeof v === "string" && v.trim().length > 0;
  }

  private static isValidEmail(v: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  private static validate(body: ContactRequest): ContactPayload {
    if (!this.isString(body.name)) throw new Error("Name is required");
    if (!this.isString(body.email)) throw new Error("Email is required");
    if (!this.isString(body.topic)) throw new Error("Topic is required");
    if (!this.isString(body.message)) throw new Error("Message is required");
    if (!this.isString(body.submissionEmail))
      throw new Error("submissionEmail is required");

    const email = body.email.trim();
    const submissionEmail = body.submissionEmail.trim();

    if (!this.isValidEmail(email)) throw new Error("Invalid email");
    if (!this.isValidEmail(submissionEmail))
      throw new Error("Invalid submissionEmail");

    return {
      name: body.name.trim(),
      email,
      organization:
        typeof body.organization === "string" &&
        body.organization.trim().length > 0
          ? body.organization.trim()
          : undefined,
      topic: body.topic.trim(),
      message: body.message.trim(),
      submissionEmail,
    };
  }

  static async submit(body: ContactRequest): Promise<void> {
    const payload = this.validate(body);
    await ContactMailer.send(payload);
  }
}
