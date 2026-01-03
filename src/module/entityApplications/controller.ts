import type { Request, Response } from 'express';
import EntityApplicationService from './service.ts';
import type { CreateEntityApplicationInput } from './model.ts';

class EntityApplicationController {
  static async createApplication(req: Request, res: Response): Promise<Response> {
    console.log(`frontend data: ${JSON.stringify(req.body)}`);

    try {
      const payload: CreateEntityApplicationInput = {
        entity_type: req.body.p_entity_type,
        display_name: req.body.p_display_name,
        legal_name: req.body.p_legal_name ?? null,
        email: req.body.p_email,
        website: req.body.p_website ?? null,
        authorized_user_number: req.body.p_authorized_user_number,
        category: req.body.p_category ?? null,
        address_info: req.body.p_address_info,
        banking_info: req.body.p_banking_info ?? null,
        public_description: req.body.p_public_description ?? null,
        consent: req.body.p_consent === true,
      };

      console.log(`backend payload: ${JSON.stringify(payload)}`);

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
