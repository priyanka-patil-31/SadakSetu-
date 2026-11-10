import { apiClient } from '@/lib/http-client'

export type DetectionSeverity = 'Critical' | 'High' | 'Medium' | 'Low'

export type DetectionBox = { top: number; left: number; width: number; height: number }
export type Detection = {
  id: string
  label: 'Pothole' | 'Crack' | 'Debris'
  confidence: number
  severity: DetectionSeverity
  box: DetectionBox
  recommendation: string
}
export type DetectionResult = {
  model: 'YOLO11'
  processedAt: string
  detections: Detection[]
  processingTimeMs?: number
}
export type DetectionHistoryItem = {
  id: string
  fileName: string
  processedAt: string
  detectionCount: number
  averageConfidence: number
  severity: DetectionSeverity
  status: 'Completed' | 'Failed'
}

export const detectionHistory: DetectionHistoryItem[] = []

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Please upload a JPG, PNG, WEBP, or other image file.'
  if (file.size > 10 * 1024 * 1024) return 'Image must be smaller than 10 MB.'
  return null
}

interface DirectDetectionBox {
  x1: number
  y1: number
  x2: number
  y2: number
  confidence: number
  label: string
}

interface DirectDetectionResponse {
  model_name: string
  model_version: string
  status: string
  processing_time_ms: number
  detection_count: number
  image_width: number
  image_height: number
  boxes: DirectDetectionBox[]
  error_message?: string | null
}

/**
 * Executes fast YOLO11 pothole inference directly via POST /api/v1/ai/detect.
 * Does NOT create dummy complaints or pollute the production database.
 */
export async function runYolo11Detection(file: File): Promise<DetectionResult> {
  const formData = new FormData()
  formData.append('image', file, file.name)

  const response = await apiClient.post<DirectDetectionResponse>('/ai/detect', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  const data = response.data
  const imageWidth = data.image_width || 1
  const imageHeight = data.image_height || 1

  const detections: Detection[] = (data.boxes || []).map((box, index) => {
    const boxWidth = Math.max(0, box.x2 - box.x1)
    const boxHeight = Math.max(0, box.y2 - box.y1)
    const relativeArea = (boxWidth * boxHeight) / (imageWidth * imageHeight)

    let severity: DetectionSeverity = 'Medium'
    if (relativeArea > 0.05 || box.confidence > 0.82) {
      severity = 'Critical'
    } else if (relativeArea > 0.02 || box.confidence > 0.68) {
      severity = 'High'
    } else if (box.confidence < 0.45) {
      severity = 'Low'
    }

    return {
      id: `pothole-${index + 1}`,
      label: 'Pothole' as const,
      confidence: Math.round(box.confidence * 100) / 100,
      severity,
      box: {
        top: Math.max(0, Math.min(100, (box.y1 / imageHeight) * 100)),
        left: Math.max(0, Math.min(100, (box.x1 / imageWidth) * 100)),
        width: Math.max(0, Math.min(100, (boxWidth / imageWidth) * 100)),
        height: Math.max(0, Math.min(100, (boxHeight / imageHeight) * 100)),
      },
      recommendation:
        severity === 'Critical'
          ? 'Severe road hazard detected. Requires urgent dispatch of repair crew.'
          : severity === 'High'
          ? 'Deep road surface defect identified. Schedule repair within 48 hours.'
          : 'Pothole defect logged. Include in regular municipal resurfacing cycle.',
    }
  })

  const result: DetectionResult = {
    model: 'YOLO11',
    processedAt: new Date().toISOString(),
    detections,
    processingTimeMs: data.processing_time_ms,
  }

  // Update detection history
  const highestSeverity: DetectionSeverity = detections.some((d) => d.severity === 'Critical')
    ? 'Critical'
    : detections.some((d) => d.severity === 'High')
    ? 'High'
    : detections.some((d) => d.severity === 'Medium')
    ? 'Medium'
    : 'Low'

  const avgConfidence =
    detections.length > 0
      ? detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length
      : 0

  detectionHistory.unshift({
    id: `DET-${Date.now().toString().slice(-6)}`,
    fileName: file.name,
    processedAt: new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date()),
    detectionCount: detections.length,
    averageConfidence: avgConfidence,
    severity: highestSeverity,
    status: 'Completed',
  })

  return result
}
