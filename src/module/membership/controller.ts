import type { Request, Response } from "express";
import { MembershipService } from "./service.ts";
import type {
  MembershipType,
  MembershipStatus,
  NetworkCategory,
  UpdateNetworkMemberInput,
} from "./model.ts";

/* ===== RESPONSE HELPER ===== */

class ResponseHandler {
  static success<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode = 200
  ): Response {
    return res.status(statusCode).json({
      success: true,
      data,
      ...(message && { message }),
    });
  }

  static error(res: Response, message: string, statusCode = 400): Response {
    return res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
}

export class MembershipController {
  /* -------- MEMBERSHIPS (PUBLIC) -------- */

  static async submitMembership(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const photoFile = req.file;

      const payload = {
        type:              req.body.type as MembershipType,
        full_name:         req.body.full_name as string,
        email:             req.body.email as string,
        phone:             req.body.phone as string,
        organization_name: req.body.organization_name as string | undefined,
        city:              req.body.city as string,
        country:           req.body.country as string,
        bio:               req.body.bio as string | undefined,
        website_url:       req.body.website_url as string | undefined,
      };

      const membership = await MembershipService.submitMembership(
        payload,
        photoFile
      );

      return ResponseHandler.success(
        res,
        membership,
        "Your membership application has been submitted successfully. We will review it and get back to you.",
        201
      );
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  /* -------- MEMBERSHIPS (ADMIN) -------- */

  static async getAllMemberships(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { status, type } = req.query;
      const memberships = await MembershipService.getAllMemberships(
        status as MembershipStatus | undefined,
        type as MembershipType | undefined
      );
      return ResponseHandler.success(res, memberships);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async getMembership(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return ResponseHandler.error(res, "Membership ID is required", 400);
      }
      const membership = await MembershipService.getMembershipById(id);
      if (!membership) {
        return ResponseHandler.error(res, "Membership application not found", 404);
      }
      return ResponseHandler.success(res, membership);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async updateMembershipStatus(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return ResponseHandler.error(res, "Membership ID is required", 400);
      }

      const { status, admin_notes } = req.body as {
        status: MembershipStatus;
        admin_notes?: string;
      };

      if (!status) {
        return ResponseHandler.error(res, "Status is required", 400);
      }

      const membership = await MembershipService.updateMembershipStatus(id, {
        status,
        admin_notes: admin_notes ?? null,
      });

      return ResponseHandler.success(
        res,
        membership,
        `Membership ${status} successfully`
      );
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async addToNetwork(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return ResponseHandler.error(res, "Membership ID is required", 400);
      }

      const { network_category } = req.body as {
        network_category: NetworkCategory;
      };

      if (!network_category) {
        return ResponseHandler.error(res, "network_category is required", 400);
      }

      const member = await MembershipService.addToNetwork(id, network_category);

      return ResponseHandler.success(
        res,
        member,
        "Member successfully added to the network",
        201
      );
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  /* -------- NETWORK MEMBERS (PUBLIC) -------- */

  static async getNetworkMembers(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { category, type } = req.query;
      const members = await MembershipService.getNetworkMembers(
        category as NetworkCategory | undefined,
        type as MembershipType | undefined
      );
      return ResponseHandler.success(res, members);
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  /* -------- NETWORK MEMBERS (ADMIN) -------- */

  static async updateNetworkMember(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return ResponseHandler.error(res, "Network member ID is required", 400);
      }

      const payload = req.body as UpdateNetworkMemberInput;
      const member = await MembershipService.updateNetworkMember(id, payload);

      return ResponseHandler.success(res, member, "Network member updated successfully");
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }

  static async deleteNetworkMember(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return ResponseHandler.error(res, "Network member ID is required", 400);
      }

      await MembershipService.deleteNetworkMember(id);

      return ResponseHandler.success(res, null, "Network member removed successfully");
    } catch (error: unknown) {
      return ResponseHandler.error(res, (error as Error).message, 400);
    }
  }
}