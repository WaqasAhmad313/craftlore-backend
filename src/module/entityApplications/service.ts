import EntityApplicationModel from "./model.ts";
import type {
  CreateEntityApplicationInput,
  CreateEntityApplicationResult,
} from "./model.ts";

interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

class EntityApplicationService {
  static async createApplication(
    payload: CreateEntityApplicationInput
  ): Promise<ServiceResponse<CreateEntityApplicationResult>> {
    try {
      if (!payload.entity_type) {
        return {
          success: false,
          message: "Entity type is required",
        };
      }

      if (
        !payload.display_name ||
        !payload.email ||
        !payload.authorized_user_number
      ) {
        return {
          success: false,
          message: "Missing required fields",
        };
      }

      if (payload.consent !== true) {
        return {
          success: false,
          message: "Consent is required to submit application",
        };
      }

      const result = await EntityApplicationModel.createApplication(payload);

      if (result.status === "ERROR") {
        return {
          success: false,
          message: result.message,
        };
      }

      return {
        success: true,
        data: result,
        message: result.message,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return {
          success: false,
          message: error.message,
        };
      }

      return {
        success: false,
        message: "Unknown service error while creating entity application",
      };
    }
  }
}

export default EntityApplicationService;
