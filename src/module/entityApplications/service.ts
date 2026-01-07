import CraftEntityModel from "./model.ts";
import type {
  CreateCraftEntityInput,
  CreateCraftEntityResult,
  CraftEntity,
  EntityStatus,
} from "./model.ts";

class CraftEntityService {
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

  static async getEntityById(id: string): Promise<CraftEntity | null> {
    if (!id) {
      throw new Error("Entity ID is required");
    }

    const entity = await CraftEntityModel.getById(id);

    if (!entity) {
      return null;
    }

    return entity;
  }

  static async getAllEntities(status?: EntityStatus): Promise<CraftEntity[]> {
    return CraftEntityModel.getAll(status);
  }

  static async updateEntityStatus(
    id: string,
    newStatus: EntityStatus
  ) {
    if (!id) {
      throw new Error("Entity ID is required");
    }

    if (!["pending", "verified", "blocked"].includes(newStatus)) {
      throw new Error("Invalid status value");
    }

    return CraftEntityModel.updateStatus(id, newStatus);
  }
}

export default CraftEntityService;