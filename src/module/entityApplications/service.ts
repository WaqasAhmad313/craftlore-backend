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

class CraftEntityService {
  /**
   * Create a new craft entity
   */
  static async createEntity(
    payload: CreateCraftEntityInput
  ): Promise<CreateCraftEntityResult> {
    // Basic business validations (DB already enforces more)
    if (!payload.consent) {
      return {
        id: null,
        reference_id: null,
        status: "ERROR",
        message: "Consent is required to create entity",
      };
    }

    if (!payload.name?.trim()) {
      return {
        id: null,
        reference_id: null,
        status: "ERROR",
        message: "Entity name is required",
      };
    }

    if (!payload.contact || Object.keys(payload.contact).length === 0) {
      return {
        id: null,
        reference_id: null,
        status: "ERROR",
        message: "Contact information is required",
      };
    }

    return CraftEntityModel.create(payload);
  }

  /**
   * Get entity by ID (basic info without evaluations)
   */
  static async getEntityById(id: string): Promise<CraftEntity | null> {
    if (!id) {
      throw new Error("Entity ID is required");
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error("Invalid entity ID format");
    }

    const entity = await CraftEntityModel.getById(id);

    if (!entity) {
      return null;
    }

    return entity;
  }

  /**
   * Get entity by ID with evaluation scores (for admin detail view)
   */
  static async getEntityByIdWithEvaluation(
    id: string
  ): Promise<CraftEntityWithEvaluation | null> {
    if (!id) {
      throw new Error("Entity ID is required");
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error("Invalid entity ID format");
    }

    const entity = await CraftEntityModel.getByIdWithEvaluation(id);

    if (!entity) {
      return null;
    }

    return entity;
  }

  /**
   * Get all entities with filters and pagination (for admin table view)
   */
  static async getAllEntities(
    filters?: GetAllEntitiesFilters
  ): Promise<PaginatedEntitiesResponse> {
    // Validate filters
    if (filters?.entity_type) {
      const validTypes: Array<EntityType | 'all'> = ['ARTISAN', 'BUSINESS', 'INSTITUTION_NGO', 'all'];
      if (!validTypes.includes(filters.entity_type)) {
        throw new Error(
          "Invalid entity_type. Must be: ARTISAN, BUSINESS, INSTITUTION_NGO, or all"
        );
      }
    }

    if (filters?.status) {
      const validStatuses: Array<EntityStatus | 'all'> = [
        'pending',
        'verified',
        'blocked',
        'rejected',
        'registered',
        'all'
      ];
      if (!validStatuses.includes(filters.status)) {
        throw new Error(
          "Invalid status. Must be: pending, verified, blocked, rejected, registered, or all"
        );
      }
    }

    // Validate pagination
    if (filters?.page && filters.page < 1) {
      throw new Error("Page must be greater than 0");
    }

    if (filters?.limit && (filters.limit < 1 || filters.limit > 100)) {
      throw new Error("Limit must be between 1 and 100");
    }

    return CraftEntityModel.getAll(filters);
  }

  /**
   * Update entity status
   */
  static async updateEntityStatus(
    id: string,
    newStatus: EntityStatus
  ): Promise<UpdateStatusResult> {
    if (!id) {
      throw new Error("Entity ID is required");
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error("Invalid entity ID format");
    }

    // Validate status
    const validStatuses: EntityStatus[] = [
      'pending',
      'verified',
      'blocked',
      'rejected',
      'registered'
    ];
    
    if (!validStatuses.includes(newStatus)) {
      throw new Error(
        "Invalid status value. Must be: pending, verified, blocked, rejected, or registered"
      );
    }

    // Check if entity exists
    const existingEntity = await CraftEntityModel.getById(id);
    if (!existingEntity) {
      throw new Error("Entity not found");
    }

    return CraftEntityModel.updateStatus(id, newStatus);
  }

  /**
   * Delete entity
   */
  static async deleteEntity(id: string): Promise<boolean> {
    if (!id) {
      throw new Error("Entity ID is required");
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error("Invalid entity ID format");
    }

    // Check if entity exists
    const existingEntity = await CraftEntityModel.getById(id);
    if (!existingEntity) {
      throw new Error("Entity not found");
    }

    return CraftEntityModel.delete(id);
  }
}

export default CraftEntityService;