import type { Request, Response } from 'express';
import { PageContentService, PageMetaService, TeamMemberService } from './service.ts';
import type {
  CreatePageContentInput,
  UpdatePageContentInput,
  PageContentFilters,
  CreatePageMetaInput,
  UpdatePageMetaInput,
  CreateTeamMemberInput,
  UpdateTeamMemberInput,
  MulterFile,
} from './types.ts';

// =====================================================
// PAGE CONTENT CONTROLLER
// =====================================================

export class PageContentController {
  /**
   * GET /api/cms/content?page_slug=home&is_active=true - Get all content with filters
   */
  static async getAllContent(req: Request, res: Response): Promise<void> {
    try {
      const filters: PageContentFilters = {};

      if (typeof req.query.page_slug === 'string') {
        filters.page_slug = req.query.page_slug;
      }

      if (typeof req.query.is_active === 'string') {
        filters.is_active = req.query.is_active === 'true';
      }

      const content = await PageContentService.getAllContent(filters);

      res.status(200).json({
        success: true,
        data: {
          content,
          count: content.length,
          filters,
        },
      });
    } catch (error) {
      console.error('Error getting content:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get content',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/cms/content/page/:pageSlug - Get content by page (Frontend)
   */
  static async getContentByPage(req: Request, res: Response): Promise<void> {
    try {
      const { pageSlug } = req.params;

      if (!pageSlug) {
        res.status(400).json({
          success: false,
          error: 'Page slug is required',
        });
        return;
      }

      const content = await PageContentService.getContentByPage(pageSlug);

      res.status(200).json({
        success: true,
        data: {
          page_slug: pageSlug,
          sections: content,
          count: content.length,
        },
      });
    } catch (error) {
      console.error('Error getting page content:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get page content',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/cms/content/:id - Get content by ID
   */
  static async getContentById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Content ID is required',
        });
        return;
      }

      const content = await PageContentService.getContentById(id);

      res.status(200).json({
        success: true,
        data: {
          content,
        },
      });
    } catch (error) {
      console.error('Error getting content:', error);

      if (error instanceof Error && error.message === 'Page content not found') {
        res.status(404).json({
          success: false,
          error: 'Page content not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get content',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/cms/content - Create page content (with optional images)
   */
  static async createContent(req: Request, res: Response): Promise<void> {
    try {
      const { page_slug, section_key, content, display_order, is_active } = req.body;

      if (!page_slug || !section_key || !content) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: page_slug, section_key, content',
        });
        return;
      }

      const input: CreatePageContentInput = {
        page_slug,
        section_key,
        content: typeof content === 'string' ? JSON.parse(content) : content,
        display_order: display_order ?? 0,
        is_active: is_active ?? true,
      };

      const images = req.files as MulterFile[] | undefined;
      const result = await PageContentService.createContent(input, images);

      res.status(201).json({
        success: true,
        data: {
          content: result,
        },
        message: 'Page content created successfully',
      });
    } catch (error) {
      console.error('Error creating content:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create page content',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * PUT /api/cms/content/:id - Update page content
   */
  static async updateContent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { page_slug, section_key, content, display_order, is_active } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Content ID is required',
        });
        return;
      }

      const input: UpdatePageContentInput = {
        id,
        page_slug,
        section_key,
        content: content ? (typeof content === 'string' ? JSON.parse(content) : content) : undefined,
        display_order,
        is_active,
      };

      const images = req.files as MulterFile[] | undefined;
      const result = await PageContentService.updateContent(input, images);

      res.status(200).json({
        success: true,
        data: {
          content: result,
        },
        message: 'Page content updated successfully',
      });
    } catch (error) {
      console.error('Error updating content:', error);

      if (error instanceof Error && error.message === 'Page content not found') {
        res.status(404).json({
          success: false,
          error: 'Page content not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update page content',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * DELETE /api/cms/content/:id - Delete page content
   */
  static async deleteContent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Content ID is required',
        });
        return;
      }

      await PageContentService.deleteContent(id);

      res.status(200).json({
        success: true,
        message: 'Page content deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting content:', error);

      if (error instanceof Error && error.message === 'Page content not found') {
        res.status(404).json({
          success: false,
          error: 'Page content not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to delete page content',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/cms/content/:id/toggle - Toggle content active status
   */
  static async toggleContent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Content ID is required',
        });
        return;
      }

      const content = await PageContentService.toggleContent(id);

      res.status(200).json({
        success: true,
        data: {
          content,
        },
        message: `Page content ${content.is_active ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling content:', error);

      if (error instanceof Error && error.message === 'Page content not found') {
        res.status(404).json({
          success: false,
          error: 'Page content not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to toggle page content',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// =====================================================
// PAGE META CONTROLLER
// =====================================================

export class PageMetaController {
  /**
   * GET /api/cms/meta - Get all page meta
   */
  static async getAllMeta(req: Request, res: Response): Promise<void> {
    try {
      const meta = await PageMetaService.getAllMeta();

      res.status(200).json({
        success: true,
        data: {
          meta,
          count: meta.length,
        },
      });
    } catch (error) {
      console.error('Error getting meta:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get page meta',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/cms/meta/page/:pageSlug - Get meta by page slug (Frontend)
   */
  static async getMetaByPage(req: Request, res: Response): Promise<void> {
    try {
      const { pageSlug } = req.params;

      if (!pageSlug) {
        res.status(400).json({
          success: false,
          error: 'Page slug is required',
        });
        return;
      }

      const meta = await PageMetaService.getMetaByPage(pageSlug);

      if (!meta) {
        res.status(404).json({
          success: false,
          error: 'Page meta not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          meta,
        },
      });
    } catch (error) {
      console.error('Error getting page meta:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get page meta',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/cms/meta/:id - Get meta by ID
   */
  static async getMetaById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Meta ID is required',
        });
        return;
      }

      const meta = await PageMetaService.getMetaById(id);

      res.status(200).json({
        success: true,
        data: {
          meta,
        },
      });
    } catch (error) {
      console.error('Error getting meta:', error);

      if (error instanceof Error && error.message === 'Page meta not found') {
        res.status(404).json({
          success: false,
          error: 'Page meta not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get page meta',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/cms/meta - Create page meta (with optional OG/Twitter images)
   */
  static async createMeta(req: Request, res: Response): Promise<void> {
    try {
      const input: CreatePageMetaInput = { ...req.body };

      if (!input.page_slug) {
        res.status(400).json({
          success: false,
          error: 'Page slug is required',
        });
        return;
      }

      const files = req.files as Record<string, MulterFile[]> | undefined;
      const ogImage = files?.og_image?.[0];
      const twitterImage = files?.twitter_image?.[0];

      const meta = await PageMetaService.createMeta(input, ogImage, twitterImage);

      res.status(201).json({
        success: true,
        data: {
          meta,
        },
        message: 'Page meta created successfully',
      });
    } catch (error) {
      console.error('Error creating meta:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create page meta',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * PUT /api/cms/meta/:id - Update page meta
   */
  static async updateMeta(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Meta ID is required',
        });
        return;
      }

      const input: UpdatePageMetaInput = { id, ...req.body };

      const files = req.files as Record<string, MulterFile[]> | undefined;
      const ogImage = files?.og_image?.[0];
      const twitterImage = files?.twitter_image?.[0];

      const meta = await PageMetaService.updateMeta(input, ogImage, twitterImage);

      res.status(200).json({
        success: true,
        data: {
          meta,
        },
        message: 'Page meta updated successfully',
      });
    } catch (error) {
      console.error('Error updating meta:', error);

      if (error instanceof Error && error.message === 'Page meta not found') {
        res.status(404).json({
          success: false,
          error: 'Page meta not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update page meta',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * DELETE /api/cms/meta/:id - Delete page meta
   */
  static async deleteMeta(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Meta ID is required',
        });
        return;
      }

      await PageMetaService.deleteMeta(id);

      res.status(200).json({
        success: true,
        message: 'Page meta deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting meta:', error);

      if (error instanceof Error && error.message === 'Page meta not found') {
        res.status(404).json({
          success: false,
          error: 'Page meta not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to delete page meta',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// =====================================================
// TEAM MEMBER CONTROLLER
// =====================================================

export class TeamMemberController {
  /**
   * GET /api/cms/team - Get all team members (Admin)
   */
  static async getAllMembers(req: Request, res: Response): Promise<void> {
    try {
      const members = await TeamMemberService.getAllMembers();

      res.status(200).json({
        success: true,
        data: {
          members,
          count: members.length,
        },
      });
    } catch (error) {
      console.error('Error getting team members:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get team members',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/cms/team/active - Get active team members (Frontend)
   */
  static async getActiveMembers(req: Request, res: Response): Promise<void> {
    try {
      const members = await TeamMemberService.getActiveMembers();

      res.status(200).json({
        success: true,
        data: {
          members,
          count: members.length,
        },
      });
    } catch (error) {
      console.error('Error getting active team members:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get active team members',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/cms/team/:id - Get team member by ID
   */
  static async getMemberById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Team member ID is required',
        });
        return;
      }

      const member = await TeamMemberService.getMemberById(id);

      res.status(200).json({
        success: true,
        data: {
          member,
        },
      });
    } catch (error) {
      console.error('Error getting team member:', error);

      if (error instanceof Error && error.message === 'Team member not found') {
        res.status(404).json({
          success: false,
          error: 'Team member not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get team member',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/cms/team - Create team member (with optional profile image)
   */
  static async createMember(req: Request, res: Response): Promise<void> {
    try {
      const { full_name, role, contribution, joined, email, display_order, is_active } = req.body;

      if (!full_name || !role) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: full_name, role',
        });
        return;
      }

      const input: CreateTeamMemberInput = {
        full_name,
        role,
        contribution: contribution || null,
        joined: joined || null,
        email: email || null,
        display_order: display_order ?? 0,
        is_active: is_active ?? true,
      };

      const profileImage = (req.file as MulterFile | undefined);
      const member = await TeamMemberService.createMember(input, profileImage);

      res.status(201).json({
        success: true,
        data: {
          member,
        },
        message: 'Team member created successfully',
      });
    } catch (error) {
      console.error('Error creating team member:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create team member',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * PUT /api/cms/team/:id - Update team member
   */
  static async updateMember(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { full_name, role, contribution, joined, email, display_order, is_active } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Team member ID is required',
        });
        return;
      }

      const input: UpdateTeamMemberInput = {
        id,
        full_name,
        role,
        contribution: contribution !== undefined ? contribution : undefined,
        joined: joined !== undefined ? joined : undefined,
        email: email !== undefined ? email : undefined,
        display_order,
        is_active,
      };

      const profileImage = (req.file as MulterFile | undefined);
      const member = await TeamMemberService.updateMember(input, profileImage);

      res.status(200).json({
        success: true,
        data: {
          member,
        },
        message: 'Team member updated successfully',
      });
    } catch (error) {
      console.error('Error updating team member:', error);

      if (error instanceof Error && error.message === 'Team member not found') {
        res.status(404).json({
          success: false,
          error: 'Team member not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update team member',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * DELETE /api/cms/team/:id - Delete team member
   */
  static async deleteMember(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Team member ID is required',
        });
        return;
      }

      await TeamMemberService.deleteMember(id);

      res.status(200).json({
        success: true,
        message: 'Team member deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting team member:', error);

      if (error instanceof Error && error.message === 'Team member not found') {
        res.status(404).json({
          success: false,
          error: 'Team member not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to delete team member',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/cms/team/:id/toggle - Toggle team member active status
   */
  static async toggleMember(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Team member ID is required',
        });
        return;
      }

      const member = await TeamMemberService.toggleMember(id);

      res.status(200).json({
        success: true,
        data: {
          member,
        },
        message: `Team member ${member.is_active ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling team member:', error);

      if (error instanceof Error && error.message === 'Team member not found') {
        res.status(404).json({
          success: false,
          error: 'Team member not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to toggle team member',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}