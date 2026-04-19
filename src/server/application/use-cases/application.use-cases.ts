/**
 * Job Application Use Cases
 *
 * ONION LAYER: Application
 * DEPENDENCIES: Domain ports (inward only)
 *
 * Orchestrates candidate job application operations.
 */

import type { IJobApplicationRepository, INotificationRepository } from "@server/domain/ports/repositories";

export class ApplicationUseCases {
  constructor(
    private readonly applicationRepo: IJobApplicationRepository,
    private readonly notificationRepo: INotificationRepository
  ) {}

  /**
   * List all applications for a candidate.
   */
  async listByCandidateId(candidateId: string) {
    return this.applicationRepo.findByCandidateId(candidateId);
  }

  /**
   * List all applications (HR view).
   */
  async listAll() {
    return this.applicationRepo.findAll();
  }

  /**
   * Apply to a job (candidate → job).
   * Prevents duplicate applications via unique constraint.
   * Creates an HR notification on new/re-activated application.
   */
  async applyToJob(jobId: string, candidateId: string) {
    // Check for existing application
    const existing = await this.applicationRepo.findByJobAndCandidate(
      jobId,
      candidateId
    );
    if (existing) {
      // If previously withdrawn, re-activate by resetting to SUBMITTED
      if (existing.status === "WITHDRAWN") {
        const updated = await this.applicationRepo.updateStatus(
          existing.id,
          "SUBMITTED"
        );
        // Notify HR about re-application
        await this.createApplicationNotification(jobId, candidateId, existing.id);
        return { application: updated, alreadyApplied: false };
      }
      return { application: existing, alreadyApplied: true };
    }

    const application = await this.applicationRepo.create({
      jobId,
      candidateId,
    });

    // Notify HR about new application
    await this.createApplicationNotification(jobId, candidateId, application.id);

    return { application, alreadyApplied: false };
  }

  /**
   * Withdraw an application.
   */
  async withdrawApplication(applicationId: string) {
    const updated = await this.applicationRepo.updateStatus(applicationId, "WITHDRAWN");
    try {
      // Confirm withdrawal to candidate
      await this.notificationRepo.create({
        type: "APPLICATION_WITHDRAWN",
        message: "Your application has been withdrawn.",
        targetRole: "CANDIDATE",
        applicationId: updated.id,
        candidateId: (updated as any).candidateId,
        jobId: (updated as any).jobId,
      });
      // Notify HR about withdrawal
      await this.notificationRepo.create({
        type: "HR_APPLICATION_WITHDRAWN",
        message: "A candidate has withdrawn their application.",
        targetRole: "HR",
        applicationId: updated.id,
        candidateId: (updated as any).candidateId,
        jobId: (updated as any).jobId,
      });
    } catch (err) {
      console.error("Failed to create withdrawal notification:", err);
    }
    return updated;
  }

  /**
   * Update an application record (e.g. learning agreement URL).
   */
  async updateApplication(id: string, data: Record<string, unknown>) {
    const updated = await this.applicationRepo.update(id, data);

    // If status was changed, notify candidate about the new status
    if (data.status) {
      try {
        const status = String((data.status as unknown) || "");
        await this.notificationRepo.create({
          type: "APPLICATION_STATUS_CHANGED",
          message: `Your application status changed to ${status}.`,
          targetRole: "CANDIDATE",
          applicationId: updated.id,
          candidateId: (updated as any).candidateId,
          jobId: (updated as any).jobId,
        });
      } catch (err) {
        console.error("Failed to create status-change notification:", err);
      }
    }

    return updated;
  }

  /**
   * Create notifications when a candidate applies:
   * - HR_APPLICATION_RECEIVED for HR
   * - APPLICATION_RECEIVED confirmation for candidate
   */
  private async createApplicationNotification(
    jobId: string,
    candidateId: string,
    applicationId: string
  ) {
    try {
      // HR notification
      await this.notificationRepo.create({
        type: "HR_APPLICATION_RECEIVED",
        message: "A candidate has applied to a job position.",
        targetRole: "HR",
        jobId,
        candidateId,
        applicationId,
      });
      // Candidate confirmation
      await this.notificationRepo.create({
        type: "APPLICATION_RECEIVED",
        message: "Your application has been submitted successfully.",
        targetRole: "CANDIDATE",
        jobId,
        candidateId,
        applicationId,
      });
    } catch (error) {
      console.error("Failed to create notification:", error);
    }
  }
}
