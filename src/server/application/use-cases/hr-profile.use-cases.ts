/**
 * HR Profile Use Cases
 *
 * ONION LAYER: Application
 * DEPENDENCIES: domain ports only (no infrastructure imports)
 */
import type {
  IHrProfileRepository,
  HrProfileRow,
  INotificationRepository,
  NotificationRow,
} from "@server/domain/ports/repositories";
import type { UpdateHrProfileInput } from "@server/application/dtos";

export class HrProfileUseCases {
  constructor(
    private readonly hrProfileRepo: IHrProfileRepository,
    private readonly notificationRepo: INotificationRepository
  ) {}

  /**
   * Returns the HR user's profile, auto-creating a default row on first access.
   */
  async getCurrentProfile(userId: string): Promise<HrProfileRow> {
    const existing = await this.hrProfileRepo.findByUserId(userId);
    if (existing) return existing;
    return this.hrProfileRepo.upsert(userId, {
      firstName: "HR",
      lastName: "Manager",
    });
  }

  /**
   * Applies a partial update to the HR user's profile.
   */
  async updateProfile(
    userId: string,
    input: UpdateHrProfileInput
  ): Promise<HrProfileRow> {
    return this.hrProfileRepo.upsert(userId, input);
  }

  /**
   * Returns all notifications triggered by this HR user (activity log),
   * newest first.
   */
  async getActivity(createdBy: string): Promise<NotificationRow[]> {
    return this.notificationRepo.findHrActivity(createdBy);
  }
}
