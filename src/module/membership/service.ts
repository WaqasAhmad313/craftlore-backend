import MembershipModel from "./model.ts";
import { MembershipUploader } from "./cloudinary.ts";
import type {
  CreateMembershipInput,
  UpdateMembershipStatusInput,
  CreateNetworkMemberInput,
  UpdateNetworkMemberInput,
  Membership,
  NetworkMember,
  MembershipType,
  MembershipStatus,
  NetworkCategory,
} from "./model.ts";

export class MembershipService {
  /* -------- VALIDATION HELPERS -------- */

  private static validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private static validatePhone(phone: string): boolean {
    // Allow +, spaces, dashes, digits — at least 7 chars
    return /^[\+\d\s\-\(\)]{7,20}$/.test(phone.trim());
  }

  private static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private static validatePhotoFile(file: Express.Multer.File): void {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (file.size > MAX_SIZE) {
      throw new Error("Photo must be less than 5MB");
    }
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new Error("Photo must be JPEG, PNG, WEBP, or GIF");
    }
  }

  /* -------- MEMBERSHIPS -------- */

  static async submitMembership(
    payload: Omit<CreateMembershipInput, "photo_url">,
    photoFile?: Express.Multer.File
  ): Promise<Membership> {
    // Validate required fields
    if (!payload.full_name?.trim()) {
      throw new Error("Full name is required");
    }
    if (!payload.email?.trim()) {
      throw new Error("Email is required");
    }
    if (!this.validateEmail(payload.email)) {
      throw new Error("Invalid email format");
    }
    if (!payload.phone?.trim()) {
      throw new Error("Phone number is required");
    }
    if (!this.validatePhone(payload.phone)) {
      throw new Error("Invalid phone number format");
    }
    if (!payload.city?.trim()) {
      throw new Error("City is required");
    }
    if (!payload.country?.trim()) {
      throw new Error("Country is required");
    }
    if (!payload.type) {
      throw new Error("Membership type is required");
    }
    if (!["buyer", "corporate", "sponsor"].includes(payload.type)) {
      throw new Error("Invalid membership type");
    }
    if (payload.website_url && !this.validateUrl(payload.website_url)) {
      throw new Error("Invalid website URL");
    }

    // Check duplicate — same email + type
    const isDuplicate = await MembershipModel.checkDuplicateMembership(
      payload.email.trim().toLowerCase(),
      payload.type
    );
    if (isDuplicate) {
      throw new Error(
        "An application with this email already exists for this membership type"
      );
    }

    // Upload photo if provided
    let photo_url: string | null = null;
    if (photoFile) {
      this.validatePhotoFile(photoFile);
      photo_url = await MembershipUploader.uploadMemberPhoto(photoFile);
    }

    const data: CreateMembershipInput = {
      type:              payload.type,
      full_name:         payload.full_name.trim(),
      email:             payload.email.trim().toLowerCase(),
      phone:             payload.phone.trim(),
      organization_name: payload.organization_name?.trim() || null,
      city:              payload.city.trim(),
      country:           payload.country.trim(),
      bio:               payload.bio?.trim() || null,
      website_url:       payload.website_url?.trim() || null,
      photo_url,
    };

    return MembershipModel.createMembership(data);
  }

  static async getMembershipById(id: string): Promise<Membership | null> {
    return MembershipModel.getMembershipById(id);
  }

  static async getAllMemberships(
    status?: MembershipStatus,
    type?: MembershipType
  ): Promise<Membership[]> {
    return MembershipModel.getAllMemberships(status, type);
  }

  static async updateMembershipStatus(
    id: string,
    payload: UpdateMembershipStatusInput
  ): Promise<Membership> {
    const existing = await MembershipModel.getMembershipById(id);
    if (!existing) {
      throw new Error("Membership application not found");
    }

    if (!["pending", "approved", "rejected"].includes(payload.status)) {
      throw new Error("Invalid status value");
    }

    const updated = await MembershipModel.updateMembershipStatus(id, payload);
    if (!updated) {
      throw new Error("Failed to update membership status");
    }
    return updated;
  }

  /* -------- NETWORK MEMBERS -------- */

  static async addToNetwork(
    membershipId: string,
    network_category: NetworkCategory
  ): Promise<NetworkMember> {
    // Fetch the source membership
    const membership = await MembershipModel.getMembershipById(membershipId);
    if (!membership) {
      throw new Error("Membership application not found");
    }

    // Prevent adding rejected applications
    if (membership.status === "rejected") {
      throw new Error("Cannot add a rejected membership to the network");
    }

    if (!["local", "international"].includes(network_category)) {
      throw new Error("Invalid network category — must be local or international");
    }

    // Prevent duplicate in the same category
    const isDuplicate = await MembershipModel.checkDuplicateNetworkMember(
      membershipId,
      network_category
    );
    if (isDuplicate) {
      throw new Error(
        "This member is already in the selected network category"
      );
    }

    // Auto-approve the membership when added to network
    if (membership.status === "pending") {
      await MembershipModel.updateMembershipStatus(membershipId, {
        status: "approved",
      });
    }

    // Copy fields from membership → network member card
    const data: CreateNetworkMemberInput = {
      membership_id:     membershipId,
      network_category,
      type:              membership.type,
      full_name:         membership.full_name,
      organization_name: membership.organization_name,
      city:              membership.city,
      country:           membership.country,
      bio:               membership.bio,
      website_url:       membership.website_url,
      photo_url:         membership.photo_url,
      is_featured:       false,
      display_order:     0,
    };

    return MembershipModel.createNetworkMember(data);
  }

  static async getNetworkMembers(
    category?: NetworkCategory,
    type?: MembershipType
  ): Promise<NetworkMember[]> {
    return MembershipModel.getNetworkMembers(category, type);
  }

  static async getNetworkMemberById(id: string): Promise<NetworkMember | null> {
    return MembershipModel.getNetworkMemberById(id);
  }

  static async updateNetworkMember(
    id: string,
    payload: UpdateNetworkMemberInput
  ): Promise<NetworkMember> {
    const existing = await MembershipModel.getNetworkMemberById(id);
    if (!existing) {
      throw new Error("Network member not found");
    }

    if (payload.full_name !== undefined && !payload.full_name.trim()) {
      throw new Error("Full name cannot be empty");
    }
    if (payload.city !== undefined && !payload.city.trim()) {
      throw new Error("City cannot be empty");
    }
    if (payload.country !== undefined && !payload.country.trim()) {
      throw new Error("Country cannot be empty");
    }
    if (payload.website_url && !this.validateUrl(payload.website_url)) {
      throw new Error("Invalid website URL");
    }

    const updated = await MembershipModel.updateNetworkMember(id, payload);
    if (!updated) {
      throw new Error("Failed to update network member");
    }
    return updated;
  }

  static async deleteNetworkMember(id: string): Promise<void> {
    const existing = await MembershipModel.getNetworkMemberById(id);
    if (!existing) {
      throw new Error("Network member not found");
    }
    await MembershipModel.deleteNetworkMember(id);
  }
}