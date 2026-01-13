import BlacklistModel from "./model.ts";
import CraftEntityModel from "../entityApplications/model.ts";
import type {
  CreateBlacklistInput,
  BlacklistEntry,
  BlacklistEntryWithEntity,
  BlacklistStatus,
  GetAllBlacklistFilters,
  PaginatedBlacklistResponse,
} from "./model.ts";

interface BlockEntityResult {
  success: boolean;
  entity_status: string;
  blacklist_entry: BlacklistEntry;
}

interface UnblockEntityResult {
  success: boolean;
  entity_status: string;
  blacklist_status: string;
}

class BlacklistService {
  /**
   * Block an entity and create blacklist entry (COMBINED OPERATION)
   */
  static async blockEntity(
    craft_id: string,
    blacklistData: Omit<CreateBlacklistInput, 'craft_id'>
  ): Promise<BlockEntityResult> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(craft_id)) {
      throw new Error("Invalid entity ID format");
    }

    // Check if entity exists
    const entity = await CraftEntityModel.getById(craft_id);
    if (!entity) {
      throw new Error("Entity not found");
    }

    // Check if already blocked
    const existingBlacklist = await BlacklistModel.getByCraftId(craft_id);
    if (existingBlacklist) {
      throw new Error("Entity is already blacklisted");
    }

    // 1. Update entity status to 'blocked'
    await CraftEntityModel.updateStatus(craft_id, 'blocked');

    // 2. Create blacklist entry
    const blacklistEntry = await BlacklistModel.create({
      craft_id,
      blacklist_reason: blacklistData.blacklist_reason,
      reason_code: blacklistData.reason_code,
      blacklisted_by: blacklistData.blacklisted_by,
      blacklist_until: blacklistData.blacklist_until || null,
      status: 'ACTIVE'
    });

    return {
      success: true,
      entity_status: 'blocked',
      blacklist_entry: blacklistEntry
    };
  }

  /**
   * Unblock an entity (revoke blacklist and change status to PENDING)
   */
  static async unblockEntity(craft_id: string): Promise<UnblockEntityResult> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(craft_id)) {
      throw new Error("Invalid entity ID format");
    }

    // Check if entity exists
    const entity = await CraftEntityModel.getById(craft_id);
    if (!entity) {
      throw new Error("Entity not found");
    }

    // Check if entity is actually blocked
    if (entity.status !== 'blocked') {
      throw new Error("Entity is not currently blocked");
    }

    // Check if blacklist entry exists
    const blacklistEntry = await BlacklistModel.getByCraftId(craft_id);
    if (!blacklistEntry) {
      throw new Error("No active blacklist entry found for this entity");
    }

    // 1. Revoke blacklist entry
    await BlacklistModel.revoke(craft_id);

    // 2. Update entity status to 'pending' (admin will decide next action)
    await CraftEntityModel.updateStatus(craft_id, 'pending');

    return {
      success: true,
      entity_status: 'pending',
      blacklist_status: 'REVOKED'
    };
  }

  /**
   * Get all blacklist entries
   */
  static async getAllBlacklist(
    filters?: GetAllBlacklistFilters
  ): Promise<PaginatedBlacklistResponse> {
    // Validate status filter
    if (filters?.status && filters.status !== 'all') {
      const validStatuses: BlacklistStatus[] = ['ACTIVE', 'REVOKED', 'UNDER_REVIEW'];
      if (!validStatuses.includes(filters.status)) {
        throw new Error(
          "Invalid status. Must be: ACTIVE, REVOKED, UNDER_REVIEW, or all"
        );
      }
    }

    // Validate craft_id if provided
    if (filters?.craft_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(filters.craft_id)) {
        throw new Error("Invalid craft_id format");
      }
    }

    // Validate pagination
    if (filters?.page && filters.page < 1) {
      throw new Error("Page must be greater than 0");
    }

    if (filters?.limit && (filters.limit < 1 || filters.limit > 100)) {
      throw new Error("Limit must be between 1 and 100");
    }

    return BlacklistModel.getAll(filters);
  }

  /**
   * Get blacklist entry by ID
   */
  static async getBlacklistById(id: string): Promise<BlacklistEntryWithEntity> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error("Invalid blacklist entry ID format");
    }

    const entry = await BlacklistModel.getById(id);
    if (!entry) {
      throw new Error("Blacklist entry not found");
    }

    return entry;
  }

  /**
   * Get blacklist entry by craft_id
   */
  static async getBlacklistByCraftId(craft_id: string): Promise<BlacklistEntryWithEntity | null> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(craft_id)) {
      throw new Error("Invalid entity ID format");
    }

    return BlacklistModel.getByCraftId(craft_id);
  }

  /**
   * Update blacklist status
   */
  static async updateBlacklistStatus(
    id: string,
    status: BlacklistStatus
  ): Promise<BlacklistEntry> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error("Invalid blacklist entry ID format");
    }

    // Validate status
    const validStatuses: BlacklistStatus[] = ['ACTIVE', 'REVOKED', 'UNDER_REVIEW'];
    if (!validStatuses.includes(status)) {
      throw new Error("Invalid status. Must be: ACTIVE, REVOKED, or UNDER_REVIEW");
    }

    // Check if entry exists
    const entry = await BlacklistModel.getById(id);
    if (!entry) {
      throw new Error("Blacklist entry not found");
    }

    return BlacklistModel.updateStatus(id, status);
  }

  /**
   * Delete blacklist entry and set entity status to pending
   */
  static async deleteBlacklist(id: string): Promise<{ success: boolean; entity_status: string }> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error("Invalid blacklist entry ID format");
    }

    // Get blacklist entry to find craft_id
    const entry = await BlacklistModel.getById(id);
    if (!entry) {
      throw new Error("Blacklist entry not found");
    }

    // Delete blacklist entry
    const deleted = await BlacklistModel.delete(id);
    if (!deleted) {
      throw new Error("Failed to delete blacklist entry");
    }

    // Update entity status to pending (admin will decide)
    await CraftEntityModel.updateStatus(entry.craft_id, 'pending');

    return {
      success: true,
      entity_status: 'pending'
    };
  }
}

export default BlacklistService;