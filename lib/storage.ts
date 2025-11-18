import { put, head } from "@vercel/blob"

export async function uploadFile(
  file: File,
  userId: string
): Promise<{ url: string; size: number }> {
  const fileName = `${userId}/${Date.now()}-${file.name}`
  
  const blob = await put(fileName, file, {
    access: "public",
    addRandomSuffix: false,
  })

  return {
    url: blob.url,
    size: blob.size,
  }
}

export async function deleteFile(url: string): Promise<void> {
  // Vercel Blob doesn't have a direct delete method in the SDK
  // We'll need to use the API or handle this differently
  // For now, we'll just return - files can be cleaned up via Vercel dashboard
  // or we can implement a cleanup job later
  return Promise.resolve()
}

