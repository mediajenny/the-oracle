import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { uploadFile } from "@/lib/storage"
import { sql } from "@/lib/db"
import { parseFile } from "@/lib/file-parsers"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const fileType = formData.get("fileType") as string // 'transaction' or 'nxn_lookup'

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    if (!fileType || !["transaction", "nxn_lookup"].includes(fileType)) {
      return NextResponse.json(
        { error: "Invalid file type. Must be 'transaction' or 'nxn_lookup'" },
        { status: 400 }
      )
    }

    // Upload file (Vercel Blob in production, local filesystem in development)
    let url: string
    let size: number
    
    try {
      const result = await uploadFile(file, session.user.id)
      url = result.url
      size = result.size
    } catch (error: any) {
      // If Blob upload fails and we're in development, provide helpful error
      if (!process.env.BLOB_READ_WRITE_TOKEN && process.env.NODE_ENV === "development") {
        return NextResponse.json(
          {
            error: "File upload is not configured. For local development, files are stored in the public/uploads directory. Make sure the directory is writable.",
            details: error.message,
          },
          { status: 500 }
        )
      }
      throw error
    }

    // Parse file to validate it
    let parsedData
    try {
      if (fileType === "nxn_lookup") {
        parsedData = await parseFile(file, { headerRow: 1 })
      } else {
        parsedData = await parseFile(file)
      }
    } catch (error: any) {
      return NextResponse.json(
        { error: `File parsing error: ${error.message}` },
        { status: 400 }
      )
    }

    // Validate required columns
    if (fileType === "transaction") {
      const requiredColumns = ["Transaction ID", "Transaction Total", "Impressions"]
      const missingColumns = requiredColumns.filter(
        (col) => !parsedData.data[0] || !(col in parsedData.data[0])
      )
      if (missingColumns.length > 0) {
        return NextResponse.json(
          {
            error: `Missing required columns: ${missingColumns.join(", ")}`,
          },
          { status: 400 }
        )
      }
    } else if (fileType === "nxn_lookup") {
      const requiredColumns = [
        "line_item_id",
        "line_item_name",
        "impressions",
        "advertiser_invoice",
      ]
      const missingColumns = requiredColumns.filter(
        (col) => !parsedData.data[0] || !(col in parsedData.data[0])
      )
      if (missingColumns.length > 0) {
        return NextResponse.json(
          {
            error: `Missing required columns: ${missingColumns.join(", ")}`,
          },
          { status: 400 }
        )
      }
    }

    // Save file metadata to database
    const result = await sql`
      INSERT INTO uploaded_files (user_id, file_name, file_type, blob_url, file_size, mime_type, row_count)
      VALUES (${session.user.id}, ${file.name}, ${fileType}, ${url}, ${size}, ${file.type}, ${parsedData.data.length})
      RETURNING id, file_name, file_type, blob_url, file_size, row_count, created_at
    `

    return NextResponse.json({
      success: true,
      file: {
        id: result.rows[0].id,
        fileName: result.rows[0].file_name,
        fileType: result.rows[0].file_type,
        blobUrl: result.rows[0].blob_url,
        fileSize: result.rows[0].file_size,
        rowCount: result.rows[0].row_count,
        createdAt: result.rows[0].created_at,
      },
    })
  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get("id")
    const download = searchParams.get("download") === "true"

    // If download=true, serve the file
    if (download && fileId) {
      // Verify ownership or shared access
      const fileResult = await sql`
        SELECT 
          uf.id, 
          uf.file_name, 
          uf.blob_url, 
          uf.mime_type,
          uf.user_id,
          CASE 
            WHEN uf.user_id = ${session.user.id} THEN true
            WHEN EXISTS (
              SELECT 1 FROM file_shares fs
              WHERE fs.file_id = uf.id
              AND (
                fs.shared_with_user_id = ${session.user.id}
                OR (fs.shared_with_team_id = ${session.user.teamId} AND ${session.user.teamId} IS NOT NULL)
              )
            ) THEN true
            ELSE false
          END as has_access
        FROM uploaded_files uf
        WHERE uf.id = ${fileId}
      `

      if (fileResult.rows.length === 0 || !fileResult.rows[0].has_access) {
        return NextResponse.json(
          { error: "File not found or access denied" },
          { status: 404 }
        )
      }

      const file = fileResult.rows[0]
      const blobUrl = file.blob_url

      // Handle local filesystem files
      if (blobUrl.startsWith("/uploads/")) {
        const { readFile } = await import("fs/promises")
        const { join } = await import("path")
        const filePath = join(process.cwd(), "public", blobUrl)
        
        try {
          const buffer = await readFile(filePath)
          return new NextResponse(buffer, {
            headers: {
              "Content-Type": file.mime_type || "application/octet-stream",
              "Content-Disposition": `attachment; filename="${file.file_name}"`,
              "Content-Length": buffer.length.toString(),
            },
          })
        } catch (error: any) {
          if (error.code === "ENOENT") {
            return NextResponse.json(
              { error: "File not found on server" },
              { status: 404 }
            )
          }
          throw error
        }
      } else {
        // Handle Vercel Blob URLs - redirect to the blob URL
        // The blob URL is already public, so we can redirect directly
        return NextResponse.redirect(blobUrl)
      }
    }

    // Otherwise, return file list (existing GET behavior)
    const fileType = searchParams.get("fileType")

    let query = sql`
      SELECT id, file_name, file_type, blob_url, file_size, row_count, created_at
      FROM uploaded_files
      WHERE user_id = ${session.user.id}
    `

    if (fileType) {
      query = sql`
        SELECT id, file_name, file_type, blob_url, file_size, row_count, created_at
        FROM uploaded_files
        WHERE user_id = ${session.user.id} AND file_type = ${fileType}
      `
    }

    const result = await query

    return NextResponse.json({
      files: result.rows.map((row) => ({
        id: row.id,
        fileName: row.file_name,
        fileType: row.file_type,
        blobUrl: row.blob_url,
        fileSize: row.file_size,
        rowCount: row.row_count,
        createdAt: row.created_at,
      })),
    })
  } catch (error: any) {
    console.error("Get/download file error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch/download file" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get("id")

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const checkResult = await sql`
      SELECT id, blob_url FROM uploaded_files
      WHERE id = ${fileId} AND user_id = ${session.user.id}
    `

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: "File not found or access denied" },
        { status: 404 }
      )
    }

    // Delete from database
    await sql`
      DELETE FROM uploaded_files
      WHERE id = ${fileId} AND user_id = ${session.user.id}
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Delete file error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete file" },
      { status: 500 }
    )
  }
}


