import type { Request, Response } from "express";
import { ContactService } from "./service.ts";

export class ContactController {
  static async submit(req: Request, res: Response): Promise<void> {
  try {
    await ContactService.submit(req.body);

    res.status(200).json({
      success: true,
      message: "Message sent successfully"
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    res.status(400).json({
      success: false,
      error: "Failed to send message",
      message
    });
  }
}

}
