import EntityApplicationModel from './model.ts';
import type { CreateEntityApplicationInput, CreateEntityApplicationResult } from './model.ts';

interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

class EntityApplicationService {
  /**
   * Create a new entity application
   */
  static async createApplication(
    payload: CreateEntityApplicationInput
  ): Promise<ServiceResponse<CreateEntityApplicationResult>> {
    try {
      // Minimal sanity checks (DB already enforces most rules)
      if (!payload.entity_type) {
        return {
          success: false,
          message: 'Entity type is required',
        };
      }

      if (!payload.display_name || !payload.email || !payload.authorized_user_number) {
        return {
          success: false,
          message: 'Missing required fields',
        };
      }

      const result = await EntityApplicationModel.createApplication(payload);

      if (result.status === 'ERROR') {
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
        message: 'Unknown service error while creating entity application',
      };
    }
  }
}

export default EntityApplicationService;
