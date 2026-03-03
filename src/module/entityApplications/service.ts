import CraftEntityModel from "./model.ts";
import type {
  CreateCraftEntityInput,
  CreateCraftEntityResult,
  CraftEntity,
  CraftEntityWithEvaluation,
  EntityStatus,
  EntityType,
  GetAllEntitiesFilters,
  PaginatedEntitiesResponse,
  UpdateStatusResult,
} from "./model.ts";

const VALID_ENTITY_TYPES: Array<EntityType | "all"> = [
  "ARTISAN",
  "BUSINESS",
  "INSTITUTION_NGO",
  "GOVERNMENT_POLICY_INSTITUTION",
  "all",
];

const VALID_STATUSES: Array<EntityStatus | "all"> = [
  "pending", "verified", "blocked", "rejected", "registered", "all",
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class CraftEntityService {
  static async createEntity(
    payload: CreateCraftEntityInput
  ): Promise<CreateCraftEntityResult> {
    if (!payload.consent) {
      return { id: null, reference_id: null, status: "ERROR", message: "Consent is required to create entity" };
    }
    if (!payload.name?.trim()) {
      return { id: null, reference_id: null, status: "ERROR", message: "Entity name is required" };
    }
    if (!payload.contact || Object.keys(payload.contact).length === 0) {
      return { id: null, reference_id: null, status: "ERROR", message: "Contact information is required" };
    }
    return CraftEntityModel.create(payload);
  }

  static async getEntityById(id: string): Promise<CraftEntity | null> {
    if (!id) throw new Error("Entity ID is required");
    if (!UUID_REGEX.test(id)) throw new Error("Invalid entity ID format");
    return CraftEntityModel.getById(id);
  }

  static async getEntityByIdWithEvaluation(
    id: string
  ): Promise<CraftEntityWithEvaluation | null> {
    if (!id) throw new Error("Entity ID is required");
    if (!UUID_REGEX.test(id)) throw new Error("Invalid entity ID format");
    return CraftEntityModel.getByIdWithEvaluation(id);
  }

  static async getAllEntities(
    filters?: GetAllEntitiesFilters
  ): Promise<PaginatedEntitiesResponse> {
    if (filters?.entity_type && !VALID_ENTITY_TYPES.includes(filters.entity_type)) {
      throw new Error("Invalid entity_type. Must be: ARTISAN, BUSINESS, INSTITUTION_NGO, GOVERNMENT_POLICY_INSTITUTION, or all");
    }
    if (filters?.status && !VALID_STATUSES.includes(filters.status)) {
      throw new Error("Invalid status. Must be: pending, verified, blocked, rejected, registered, or all");
    }
    if (filters?.page && filters.page < 1) throw new Error("Page must be greater than 0");
    if (filters?.limit && (filters.limit < 1 || filters.limit > 100)) {
      throw new Error("Limit must be between 1 and 100");
    }
    return CraftEntityModel.getAll(filters);
  }

  static async updateEntityStatus(
    id: string,
    newStatus: EntityStatus
  ): Promise<UpdateStatusResult> {
    if (!id) throw new Error("Entity ID is required");
    if (!UUID_REGEX.test(id)) throw new Error("Invalid entity ID format");
    const validStatuses: EntityStatus[] = ["pending", "verified", "blocked", "rejected", "registered"];
    if (!validStatuses.includes(newStatus)) {
      throw new Error("Invalid status value. Must be: pending, verified, blocked, rejected, or registered");
    }
    const existing = await CraftEntityModel.getById(id);
    if (!existing) throw new Error("Entity not found");
    return CraftEntityModel.updateStatus(id, newStatus);
  }

  static async deleteEntity(id: string): Promise<boolean> {
    if (!id) throw new Error("Entity ID is required");
    if (!UUID_REGEX.test(id)) throw new Error("Invalid entity ID format");
    const existing = await CraftEntityModel.getById(id);
    if (!existing) throw new Error("Entity not found");
    return CraftEntityModel.delete(id);
  }
}

export default CraftEntityService;