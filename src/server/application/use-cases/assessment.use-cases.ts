/**
 * Assessment Use Cases
 *
 * ONION LAYER: Application
 * DEPENDENCIES: Domain ports + domain value objects (inward only)
 *
 * Orchestrates assessment creation and management.
 */

import type {
  IAssessmentRepository,
  ICandidateRepository,
  INotificationRepository,
} from "@server/domain/ports/repositories";
import type { IEmailService } from "@server/domain/ports/services";
import { MAGIC_LINK_EXPIRY_HOURS } from "@server/domain/value-objects";
import type { CreateAssessmentInput } from "@server/application/dtos";

export class AssessmentUseCases {
  constructor(
    private readonly assessmentRepo: IAssessmentRepository,
    private readonly candidateRepo: ICandidateRepository,
    private readonly emailService: IEmailService,
    private readonly notificationRepo?: INotificationRepository
  ) {}

  /**
   * List assessments with optional filters.
   */
  async listAssessments(filters: { status?: string; candidateId?: string }) {
    return this.assessmentRepo.findMany(filters);
  }

  /**
   * Create a new assessment and generate a magic link.
   * Orchestrates: assessment creation + candidate status update + link generation.
   */
  async createAssessment(data: CreateAssessmentInput) {
    const expiresAt = new Date();
    expiresAt.setHours(
      expiresAt.getHours() + (data.expiresInHours || MAGIC_LINK_EXPIRY_HOURS)
    );

    const assessment = await this.assessmentRepo.create({
      candidateId: data.candidateId,
      jobId: data.jobId,
      templateId: data.templateId,
      type: data.type,
      language: data.language,
      expiresAt,
    });

    // Generate magic link URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const magicLink = `${appUrl}/assess/${assessment.magicToken}`;

    // Update candidate status to INVITED
    await this.candidateRepo.updateStatus(data.candidateId, "INVITED");

    // Notify candidate in-app about the assessment invite
    try {
      if (this.notificationRepo) {
        await this.notificationRepo.create({
          type: "ASSESSMENT_INVITE",
          message: `You have been invited to an assessment (${data.type}).`,
          targetRole: "CANDIDATE",
          candidateId: data.candidateId,
          jobId: data.jobId,
        });
      }
    } catch (err) {
      console.error("Failed to create assessment notification:", err);
    }

    return {
      assessment,
      magicLink,
      expiresAt: assessment.expiresAt,
    };
  }
}
