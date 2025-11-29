export type UploadStatus = 'PENDING' | 'UPLOADING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'

export interface UploadItem {
  id: string
  fileName: string
  fileSize: number
  status: UploadStatus
  progress: number
  error?: string
  controller?: AbortController
}


