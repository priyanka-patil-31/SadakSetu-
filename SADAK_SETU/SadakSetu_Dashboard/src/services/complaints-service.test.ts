import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/http-client";
import { realComplaintService } from "@/services/complaints-service";

describe("complaint evidence AI detection", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("starts detection when an uploaded image has no detection history", async () => {
    vi.spyOn(apiClient, "get")
      .mockResolvedValueOnce({
        data: [{ id: "image-1", capture_metadata: { latitude: 12.9, longitude: 77.6 } }],
      } as never)
      .mockResolvedValueOnce({ data: new Blob(["image"]) } as never)
      .mockResolvedValueOnce({ data: [] } as never);
    const post = vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      data: { detection_count: 1, status: "COMPLETED" },
    } as never);

    const evidenceRequest = realComplaintService.getEvidence("complaint-1");
    await expect(evidenceRequest).resolves.toMatchObject([
      { id: "image-1", detectionCount: 1, status: "COMPLETED" },
    ]);
    expect(post).toHaveBeenCalledWith("/ai/images/image-1/detect");
  });
});
