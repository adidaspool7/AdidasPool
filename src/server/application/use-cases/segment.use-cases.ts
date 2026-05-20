/**
 * Candidate Segment Use Cases
 *
 * ONION LAYER: Application
 * DEPENDENCIES: Domain ports (inward only)
 *
 * Manages manual candidate groups. HR can create named segments,
 * add/remove candidates, and use a segment as a campaign target.
 */

import type {
  ISegmentRepository,
  SegmentRow,
  SegmentMemberRow,
} from "@server/domain/ports/repositories";

export class SegmentUseCases {
  constructor(private readonly segmentRepo: ISegmentRepository) {}

  async listSegments(): Promise<SegmentRow[]> {
    return this.segmentRepo.findAll();
  }

  async getSegment(id: string): Promise<SegmentRow | null> {
    return this.segmentRepo.findById(id);
  }

  async createSegment(data: {
    name: string;
    description: string | null;
    createdBy: string;
  }): Promise<SegmentRow> {
    const trimmed = data.name.trim();
    if (!trimmed) throw new Error("Segment name is required");
    return this.segmentRepo.create({ ...data, name: trimmed });
  }

  async renameSegment(
    id: string,
    data: { name?: string; description?: string | null }
  ): Promise<SegmentRow> {
    if (data.name !== undefined && !data.name.trim()) {
      throw new Error("Segment name cannot be empty");
    }
    if (data.name !== undefined) data = { ...data, name: data.name.trim() };
    const updated = await this.segmentRepo.update(id, data);
    if (!updated) throw new Error(`Segment not found: ${id}`);
    return updated;
  }

  async deleteSegment(id: string): Promise<void> {
    await this.segmentRepo.delete(id);
  }

  async listMembers(segmentId: string): Promise<SegmentMemberRow[]> {
    return this.segmentRepo.findMembers(segmentId);
  }

  async getMemberIds(segmentId: string): Promise<string[]> {
    return this.segmentRepo.findMemberIds(segmentId);
  }

  async addMembers(segmentId: string, candidateIds: string[]): Promise<number> {
    if (!candidateIds.length) return 0;
    return this.segmentRepo.addMembers(segmentId, candidateIds);
  }

  async removeMember(segmentId: string, candidateId: string): Promise<void> {
    await this.segmentRepo.removeMember(segmentId, candidateId);
  }
}
