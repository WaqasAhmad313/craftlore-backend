import {
  ThemeModel,
  PageContentModel,
  PageMetaModel,
  TeamMemberModel,
} from "./model.ts";
import { CMSImageUploader } from "./cloudinary.ts";
import type {
  GlobalTheme,
  CreateThemeInput,
  UpdateThemeInput,
  PageContent,
  CreatePageContentInput,
  UpdatePageContentInput,
  PageContentFilters,
  PageMeta,
  CreatePageMetaInput,
  UpdatePageMetaInput,
  TeamMember,
  CreateTeamMemberInput,
  UpdateTeamMemberInput,
  MulterFile,
} from "./types.ts";

// =====================================================
// THEME SERVICE
// =====================================================

export class ThemeService {
  /**
   * Get active theme (for frontend)
   */
  static async getActiveTheme(): Promise<GlobalTheme | null> {
    return await ThemeModel.getActive();
  }

  /**
   * Get all themes (for admin)
   */
  static async getAllThemes(): Promise<GlobalTheme[]> {
    return await ThemeModel.getAll();
  }

  /**
   * Get theme by ID
   */
  static async getThemeById(id: string): Promise<GlobalTheme> {
    const theme = await ThemeModel.getById(id);

    if (!theme) {
      throw new Error("Theme not found");
    }

    return theme;
  }

  /**
   * Create new theme
   */
  static async createTheme(input: CreateThemeInput): Promise<GlobalTheme> {
    // Validate theme name doesn't exist
    const exists = await ThemeModel.existsByName(input.theme_name);

    if (exists) {
      throw new Error("Theme name already exists");
    }

    // Validate theme structure
    this.validateThemeColors(input.colors);
    this.validateThemeTypography(input.typography);

    return await ThemeModel.create(input);
  }

  /**
   * Update theme
   */
  static async updateTheme(input: UpdateThemeInput): Promise<GlobalTheme> {
    // Check if theme exists
    const exists = await ThemeModel.getById(input.id);

    if (!exists) {
      throw new Error("Theme not found");
    }

    // Validate theme name uniqueness if being changed
    if (input.theme_name) {
      const nameExists = await ThemeModel.existsByName(
        input.theme_name,
        input.id,
      );

      if (nameExists) {
        throw new Error("Theme name already exists");
      }
    }

    // Validate theme structure if provided
    if (input.colors) {
      this.validateThemeColors(input.colors);
    }

    if (input.typography) {
      this.validateThemeTypography(input.typography);
    }

    return await ThemeModel.update(input);
  }

  /**
   * Delete theme
   */
  static async deleteTheme(id: string): Promise<void> {
    // Check if theme exists
    const theme = await ThemeModel.getById(id);

    if (!theme) {
      throw new Error("Theme not found");
    }

    // Don't allow deleting active theme
    if (theme.is_active) {
      throw new Error(
        "Cannot delete active theme. Please activate another theme first",
      );
    }

    const deleted = await ThemeModel.delete(id);

    if (!deleted) {
      throw new Error("Failed to delete theme");
    }
  }

  /**
   * Activate theme
   */
  static async activateTheme(id: string): Promise<GlobalTheme> {
    // Check if theme exists
    const theme = await ThemeModel.getById(id);

    if (!theme) {
      throw new Error("Theme not found");
    }

    return await ThemeModel.activate(id);
  }

  /**
   * Validate theme colors structure
   */
  private static validateThemeColors(colors: unknown): void {
    if (!colors || typeof colors !== "object") {
      throw new Error("Invalid theme colors structure");
    }

    const required = [
      "primary",
      "secondary",
      "accent",
      "neutral",
      "success",
      "warning",
      "error",
      "info",
    ];

    for (const key of required) {
      if (!(key in (colors as Record<string, unknown>))) {
        throw new Error(`Missing required color: ${key}`);
      }
    }
  }

  /**
   * Validate theme typography structure
   */
  private static validateThemeTypography(typography: unknown): void {
    if (!typography || typeof typography !== "object") {
      throw new Error("Invalid theme typography structure");
    }

    const required = [
      "fontFamily",
      "fontSize",
      "fontWeight",
      "letterSpacing",
      "lineHeight",
    ];

    for (const key of required) {
      if (!(key in (typography as Record<string, unknown>))) {
        throw new Error(`Missing required typography property: ${key}`);
      }
    }
  }
}

// =====================================================
// PAGE CONTENT SERVICE
// =====================================================

export class PageContentService {
  /**
   * Get all page content with filters
   */
  static async getAllContent(
    filters?: PageContentFilters,
  ): Promise<PageContent[]> {
    return await PageContentModel.getAll(filters);
  }

  /**
   * Get content by page slug (for frontend)
   */
  static async getContentByPage(pageSlug: string): Promise<PageContent[]> {
    this.validatePageSlug(pageSlug);
    return await PageContentModel.getByPageSlug(pageSlug);
  }

  /**
   * Get content by ID
   */
  static async getContentById(id: string): Promise<PageContent> {
    const content = await PageContentModel.getById(id);

    if (!content) {
      throw new Error("Page content not found");
    }

    return content;
  }

  /**
   * Create page content (with optional image upload)
   */
  static async createContent(
    input: CreatePageContentInput,
    images?: MulterFile[],
  ): Promise<PageContent> {
    // Validate required fields
    this.validatePageSlug(input.page_slug);
    this.validateSectionKey(input.section_key);

    // Check if page+section already exists
    const exists = await PageContentModel.existsByPageAndSection(
      input.page_slug,
      input.section_key,
    );

    if (exists) {
      throw new Error("Content section already exists for this page");
    }

    // Upload images if provided
    if (images && images.length > 0) {
      const uploadedUrls: string[] = [];

      for (const image of images) {
        const url = await CMSImageUploader.uploadContentImage(
          image,
          input.page_slug,
          input.section_key,
        );
        uploadedUrls.push(url);
      }

      // Add image URLs to content
      input.content = {
        ...input.content,
        uploaded_images: uploadedUrls,
      };
    }

    return await PageContentModel.create(input);
  }

  /**
   * Update page content (with optional image upload)
   */
  static async updateContent(
    input: UpdatePageContentInput,
    images?: MulterFile[],
  ): Promise<PageContent> {
    // Check if content exists
    const existing = await PageContentModel.getById(input.id);

    if (!existing) {
      throw new Error("Page content not found");
    }

    // Validate fields if provided
    if (input.page_slug) {
      this.validatePageSlug(input.page_slug);
    }

    if (input.section_key) {
      this.validateSectionKey(input.section_key);
    }

    // Check uniqueness if page_slug or section_key changed
    if (input.page_slug || input.section_key) {
      const exists = await PageContentModel.existsByPageAndSection(
        input.page_slug ?? existing.page_slug,
        input.section_key ?? existing.section_key,
        input.id,
      );

      if (exists) {
        throw new Error("Content section already exists for this page");
      }
    }

    // Upload new images if provided
    if (images && images.length > 0) {
      const uploadedUrls: string[] = [];

      for (const image of images) {
        const url = await CMSImageUploader.uploadContentImage(
          image,
          input.page_slug ?? existing.page_slug,
          input.section_key ?? existing.section_key,
        );
        uploadedUrls.push(url);
      }

      // Merge new images with existing content
      input.content = {
        ...existing.content,
        ...input.content,
        uploaded_images: [
          ...(Array.isArray(existing.content.uploaded_images)
            ? existing.content.uploaded_images
            : []),
          ...uploadedUrls,
        ],
      };
    }

    return await PageContentModel.update(input);
  }

  /**
   * Delete page content
   */
  static async deleteContent(id: string): Promise<void> {
    const content = await PageContentModel.getById(id);

    if (!content) {
      throw new Error("Page content not found");
    }

    // Delete associated images from Cloudinary
    if (
      content.content.uploaded_images &&
      Array.isArray(content.content.uploaded_images)
    ) {
      for (const imageUrl of content.content.uploaded_images as string[]) {
        await CMSImageUploader.deleteImage(imageUrl);
      }
    }

    const deleted = await PageContentModel.delete(id);

    if (!deleted) {
      throw new Error("Failed to delete page content");
    }
  }

  /**
   * Toggle content active status
   */
  static async toggleContent(id: string): Promise<PageContent> {
    const content = await PageContentModel.getById(id);

    if (!content) {
      throw new Error("Page content not found");
    }

    return await PageContentModel.toggleActive(id);
  }

  /**
   * Validate page slug
   */
  private static validatePageSlug(slug: string): void {
    if (!slug || slug.trim().length === 0) {
      throw new Error("Page slug is required");
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new Error(
        "Page slug can only contain lowercase letters, numbers, and hyphens",
      );
    }
  }

  /**
   * Validate section key
   */
  private static validateSectionKey(key: string): void {
    if (!key || key.trim().length === 0) {
      throw new Error("Section key is required");
    }

    if (!/^[a-z0-9_-]+$/.test(key)) {
      throw new Error(
        "Section key can only contain lowercase letters, numbers, underscores, and hyphens",
      );
    }
  }
}

// =====================================================
// PAGE META SERVICE
// =====================================================

export class PageMetaService {
  /**
   * Get all page meta
   */
  static async getAllMeta(): Promise<PageMeta[]> {
    return await PageMetaModel.getAll();
  }

  /**
   * Get page meta by page slug (for frontend)
   */
  static async getMetaByPage(pageSlug: string): Promise<PageMeta | null> {
    return await PageMetaModel.getByPageSlug(pageSlug);
  }

  /**
   * Get page meta by ID
   */
  static async getMetaById(id: string): Promise<PageMeta> {
    const meta = await PageMetaModel.getById(id);

    if (!meta) {
      throw new Error("Page meta not found");
    }

    return meta;
  }

  /**
   * Create page meta (with optional OG/Twitter image upload)
   */
  static async createMeta(
    input: CreatePageMetaInput,
    ogImage?: MulterFile,
    twitterImage?: MulterFile,
  ): Promise<PageMeta> {
    // Validate page slug
    if (!input.page_slug || input.page_slug.trim().length === 0) {
      throw new Error("Page slug is required");
    }

    // Check if page slug already exists
    const exists = await PageMetaModel.existsByPageSlug(input.page_slug);

    if (exists) {
      throw new Error("Page meta already exists for this page");
    }

    // Upload OG image if provided
    if (ogImage) {
      input.og_image = await CMSImageUploader.uploadMetaImage(
        ogImage,
        input.page_slug,
      );
    }

    // Upload Twitter image if provided
    if (twitterImage) {
      input.twitter_image = await CMSImageUploader.uploadMetaImage(
        twitterImage,
        input.page_slug,
      );
    }

    return await PageMetaModel.create(input);
  }

  /**
   * Update page meta (with optional image upload)
   */
  static async updateMeta(
    input: UpdatePageMetaInput,
    ogImage?: MulterFile,
    twitterImage?: MulterFile,
  ): Promise<PageMeta> {
    // Check if meta exists
    const existing = await PageMetaModel.getById(input.id);

    if (!existing) {
      throw new Error("Page meta not found");
    }

    // Check page slug uniqueness if being changed
    if (input.page_slug) {
      const exists = await PageMetaModel.existsByPageSlug(
        input.page_slug,
        input.id,
      );

      if (exists) {
        throw new Error("Page meta already exists for this page");
      }
    }

    // Upload OG image if provided
    if (ogImage) {
      // Delete old image
      if (existing.og_image) {
        await CMSImageUploader.deleteImage(existing.og_image);
      }

      input.og_image = await CMSImageUploader.uploadMetaImage(
        ogImage,
        input.page_slug ?? existing.page_slug,
      );
    }

    // Upload Twitter image if provided
    if (twitterImage) {
      // Delete old image
      if (existing.twitter_image) {
        await CMSImageUploader.deleteImage(existing.twitter_image);
      }

      input.twitter_image = await CMSImageUploader.uploadMetaImage(
        twitterImage,
        input.page_slug ?? existing.page_slug,
      );
    }

    return await PageMetaModel.update(input);
  }

  /**
   * Delete page meta
   */
  static async deleteMeta(id: string): Promise<void> {
    const meta = await PageMetaModel.getById(id);

    if (!meta) {
      throw new Error("Page meta not found");
    }

    // Delete associated images
    if (meta.og_image) {
      await CMSImageUploader.deleteImage(meta.og_image);
    }

    if (meta.twitter_image) {
      await CMSImageUploader.deleteImage(meta.twitter_image);
    }

    const deleted = await PageMetaModel.delete(id);

    if (!deleted) {
      throw new Error("Failed to delete page meta");
    }
  }
}

// =====================================================
// TEAM MEMBER SERVICE
// =====================================================

export class TeamMemberService {
  /**
   * Get all team members
   */
  static async getAllMembers(): Promise<TeamMember[]> {
    return await TeamMemberModel.getAll();
  }

  /**
   * Get active team members (for frontend)
   */
  static async getActiveMembers(): Promise<TeamMember[]> {
    return await TeamMemberModel.getActive();
  }

  /**
   * Get team member by ID
   */
  static async getMemberById(id: string): Promise<TeamMember> {
    const member = await TeamMemberModel.getById(id);

    if (!member) {
      throw new Error("Team member not found");
    }

    return member;
  }

  /**
   * Create team member (with optional profile image)
   */
  static async createMember(
    input: CreateTeamMemberInput,
    profileImage?: MulterFile,
  ): Promise<TeamMember> {
    // Validate required fields
    this.validateMemberInput(input);

    // Upload profile image if provided
    if (profileImage) {
      input.profile_image_url =
        await CMSImageUploader.uploadProfileImage(profileImage);
    }

    return await TeamMemberModel.create(input);
  }

  /**
   * Update team member (with optional profile image)
   */
  static async updateMember(
    input: UpdateTeamMemberInput,
    profileImage?: MulterFile,
  ): Promise<TeamMember> {
    // Check if member exists
    const existing = await TeamMemberModel.getById(input.id);

    if (!existing) {
      throw new Error("Team member not found");
    }

    // Validate fields if provided
    if (input.full_name || input.role) {
      this.validateMemberInput({
        full_name: input.full_name ?? existing.full_name,
        role: input.role ?? existing.role,
      });
    }

    // Upload new profile image if provided
    if (profileImage) {
      // Delete old image
      if (existing.profile_image_url) {
        await CMSImageUploader.deleteImage(existing.profile_image_url);
      }

      input.profile_image_url =
        await CMSImageUploader.uploadProfileImage(profileImage);
    }

    return await TeamMemberModel.update(input);
  }

  /**
   * Delete team member
   */
  static async deleteMember(id: string): Promise<void> {
    const member = await TeamMemberModel.getById(id);

    if (!member) {
      throw new Error("Team member not found");
    }

    // Delete profile image if exists
    if (member.profile_image_url) {
      await CMSImageUploader.deleteImage(member.profile_image_url);
    }

    const deleted = await TeamMemberModel.delete(id);

    if (!deleted) {
      throw new Error("Failed to delete team member");
    }
  }

  /**
   * Toggle member active status
   */
  static async toggleMember(id: string): Promise<TeamMember> {
    const member = await TeamMemberModel.getById(id);

    if (!member) {
      throw new Error("Team member not found");
    }

    return await TeamMemberModel.toggleActive(id);
  }

  /**
   * Validate team member input
   */
  private static validateMemberInput(input: {
    full_name: string;
    role: string;
  }): void {
    if (!input.full_name || input.full_name.trim().length === 0) {
      throw new Error("Full name is required");
    }

    if (input.full_name.trim().length < 2) {
      throw new Error("Full name must be at least 2 characters long");
    }

    if (!input.role || input.role.trim().length === 0) {
      throw new Error("Role is required");
    }

    if (input.role.trim().length < 2) {
      throw new Error("Role must be at least 2 characters long");
    }
  }
}
