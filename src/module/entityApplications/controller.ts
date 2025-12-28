import type { Request, Response } from 'express';
import EntityApplicationService from './service.ts';
import type { CreateEntityApplicationInput } from './model.ts';

class EntityApplicationController {
  static async createApplication(req: Request, res: Response): Promise<Response> {
    try {
      const payload: CreateEntityApplicationInput = {
        entity_type: req.body.entity_type,
        display_name: req.body.display_name,
        legal_name: req.body.legal_name ?? null,
        email: req.body.email,
        website: req.body.website ?? null,
        authorized_user_number: req.body.authorized_user_number,
        category: req.body.category ?? null,
        address_info: req.body.address_info,
        banking_info: req.body.banking_info ?? null,
        public_description: req.body.public_description ?? null,
      };

      const serviceResponse =
        await EntityApplicationService.createApplication(payload);

      if (!serviceResponse.success || !serviceResponse.data) {
        return res.status(400).json({
          status: 'ERROR',
          message: serviceResponse.message ?? 'Application creation failed',
        });
      }

      const statusCode =
        serviceResponse.data.status === 'SUCCESS' ? 201 : 400;

      return res.status(statusCode).json(serviceResponse.data);
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(500).json({
          status: 'ERROR',
          message: error.message,
        });
      }

      return res.status(500).json({
        status: 'ERROR',
        message: 'Unknown server error',
      });
    }
  }
}

export default EntityApplicationController;
