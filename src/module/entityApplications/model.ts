import { db } from '../../config/db.ts';
export type EntityType = 'ARTISAN' | 'BUSINESS' | 'INSTITUTION_NGO';

interface CreateEntityApplicationInput {
  entity_type: EntityType;
  display_name: string;
  legal_name?: string | null;
  email: string;
  website?: string | null;
  authorized_user_number: string;
  category?: string | null;
  address_info: Record<string, unknown>;
  banking_info: Record<string, unknown>;
  public_description?: string | null;
  consent: boolean; // ✅ added
}

interface CreateEntityApplicationResult {
  id: number | null;
  reference_id: string | null;
  status: 'SUCCESS' | 'ERROR';
  message: string;
}

class EntityApplicationModel {
  static async createApplication(
    payload: CreateEntityApplicationInput
  ): Promise<CreateEntityApplicationResult> {
    const query = `
      SELECT * FROM create_entity_application(
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11
      )
    `;

    const values = [
      payload.entity_type,
      payload.display_name,
      payload.legal_name ?? null,
      payload.email,
      payload.website ?? null,
      payload.authorized_user_number,
      payload.category ?? null,
      payload.address_info,
      payload.banking_info,
      payload.public_description ?? null,
      payload.consent, // ✅ added
    ];

    try {
      const result = await db.query<CreateEntityApplicationResult>(query, values);

      if (result.rows.length === 0) {
        throw new Error('No response returned from create_entity_application');
      }

      return result.rows[0]!;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Database error: ${error.message}`);
      }

      throw new Error('Unknown database error while creating entity application');
    }
  }
}

export default EntityApplicationModel;
export type {
  CreateEntityApplicationInput,
  CreateEntityApplicationResult,
};