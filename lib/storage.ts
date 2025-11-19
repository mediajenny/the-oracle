import { put } from "@vercel/blob"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

/**
 * Upload file - uses Vercel Blob in production, local filesystem in development
 */
export async function uploadFile(
  file: File,
  userId: string
): Promise<{ url: string; size: number }> {
  // Check if we have Vercel Blob token (production)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const fileName = `${userId}/${Date.now()}-${file.name}`
    const blob = await put(fileName, file, {
      access: "public",
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    return {
      url: blob.url,
      size: blob.size,
    }
  }

  // Local development: store in public/uploads directory
  const uploadsDir = join(process.cwd(), "public", "uploads", userId)
  
  // Create directory if it doesn't exist
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true })
  }

  const fileName = `${Date.now()}-${file.name}`
  const filePath = join(uploadsDir, fileName)
  const buffer = Buffer.from(await file.arrayBuffer())
  
  await writeFile(filePath, buffer)

  // Return a URL that can be accessed via Next.js public folder
  const url = `/uploads/${userId}/${fileName}`
  
  return {
    url,
    size: buffer.length,
  }
}

export async function deleteFile(url: string): Promise<void> {
  // For local filesystem, delete the file
  if (url.startsWith("/uploads/")) {
    const filePath = join(process.cwd(), "public", url)
    try {
      const { unlink } = await import("fs/promises")
      await unlink(filePath)
    } catch (error) {
      // File might not exist, ignore
      console.warn(`Failed to delete file ${filePath}:`, error)
    }
    return
  }

  // For Vercel Blob, we'd need to implement deletion
  // For now, files can be cleaned up via Vercel dashboard or a cleanup job
  return Promise.resolve()
}
