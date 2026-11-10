import { beforeEach, describe, expect, it, vi } from 'vitest'

const { post } = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('@/lib/http-client', () => ({ apiClient: { post } }))

import { runYolo11Detection, validateImageFile } from './ai-detection'

beforeEach(() => post.mockReset())

describe('AI detection file validation', () => {
  it('rejects non-image files', () => {
    expect(validateImageFile(new File(['text'], 'notes.txt', { type: 'text/plain' }))).toContain('Please upload')
  })

  it('rejects images larger than 10 MB', () => {
    const oversized = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'road.jpg', { type: 'image/jpeg' })
    expect(validateImageFile(oversized)).toContain('smaller than 10 MB')
  })

  it('accepts supported image files', () => {
    expect(validateImageFile(new File(['image'], 'road.webp', { type: 'image/webp' }))).toBeNull()
  })

  it('sends an image through the backend inference and severity flow', async () => {
    post
      .mockResolvedValueOnce({ data: { id: 'complaint-1' } })
      .mockResolvedValueOnce({ data: { id: 'image-1' } })
      .mockResolvedValueOnce({ data: { model_name: 'pothole-yolo11', result_metadata: { image_width: 640, image_height: 480, detections: [{ x1: 64, y1: 48, x2: 320, y2: 240, confidence: 0.82, label: 'pothole' }] }, processing_time_ms: 120, detection_count: 1, status: 'COMPLETED' } })
      .mockResolvedValueOnce({ data: { severity: 'HIGH' } })

    const result = await runYolo11Detection(new File(['image'], 'road.jpg', { type: 'image/jpeg' }))

    expect(post).toHaveBeenCalledWith('/complaints', expect.objectContaining({ title: 'AI image analysis' }))
    expect(post).toHaveBeenCalledWith('/complaints/complaint-1/images', expect.any(FormData), expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }))
    expect(post).toHaveBeenCalledWith('/ai/images/image-1/detect')
    expect(post).toHaveBeenCalledWith('/ai/images/image-1/severity')
    expect(result.detections[0]).toMatchObject({ confidence: 0.82, severity: 'High', box: { top: 10, left: 10, width: 40, height: 40 } })
  })
})
