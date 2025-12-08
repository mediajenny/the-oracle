import { NextRequest, NextResponse } from "next/server"
import { uploadFile, deleteFile } from "@/lib/storage"
import { sql } from "@/lib/db"
import { parseFile } from "@/lib/file-parsers"

// Default user ID for anonymous users (no authentication)
const ANONYMOUS_USER_ID = '00000000-0000-0000-0000-000000000000'

export async function POST(request: NextRequest) {
  try {
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
      const result = await uploadFile(file, ANONYMOUS_USER_ID)
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

    // Check if file has data
    if (!parsedData.data || parsedData.data.length === 0) {
      return NextResponse.json(
        { error: "File appears to be empty or has no data rows" },
        { status: 400 }
      )
    }

    // Helper function to normalize column names (case-insensitive, trim whitespace)
    const normalizeColumnName = (name: string): string => {
      return name?.toString().trim().toLowerCase() || ""
    }

    // Get actual column names from the first row
    const firstRow = parsedData.data[0]
    const actualColumns = Object.keys(firstRow || {})
    const normalizedActualColumns = new Map(
      actualColumns.map((col) => [normalizeColumnName(col), col])
    )

    // Validate required columns
    if (fileType === "transaction") {
      const requiredColumns = ["Transaction ID", "Transaction Total", "Impressions"]
      const missingColumns: string[] = []
      const foundColumns: string[] = []

      for (const requiredCol of requiredColumns) {
        const normalized = normalizeColumnName(requiredCol)
        const found = normalizedActualColumns.has(normalized)

        if (found) {
          foundColumns.push(requiredCol)
        } else {
          missingColumns.push(requiredCol)
        }
      }

      if (missingColumns.length > 0) {
        return NextResponse.json(
          {
            error: `Missing required columns: ${missingColumns.join(", ")}`,
            foundColumns: foundColumns,
            actualColumns: actualColumns.slice(0, 10), // Show first 10 columns
            hint: "Column names are case-insensitive but must match exactly (including spaces). Found columns: " + actualColumns.join(", "),
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
      const missingColumns: string[] = []
      const foundColumns: string[] = []

      for (const requiredCol of requiredColumns) {
        const normalized = normalizeColumnName(requiredCol)
        const found = normalizedActualColumns.has(normalized)

        if (found) {
          foundColumns.push(requiredCol)
        } else {
          missingColumns.push(requiredCol)
        }
      }

      if (missingColumns.length > 0) {
        return NextResponse.json(
          {
            error: `Missing required columns: ${missingColumns.join(", ")}`,
            foundColumns: foundColumns,
            actualColumns: actualColumns.slice(0, 10), // Show first 10 columns
            hint: "Column names are case-insensitive but must match exactly. Found columns: " + actualColumns.join(", "),
          },
          { status: 400 }
        )
      }
    }

    // Save file metadata to database
    const result = await sql`
      INSERT INTO uploaded_files (user_id, file_name, file_type, blob_url, file_size, mime_type, row_count)
      VALUES (${ANONYMOUS_USER_ID}, ${file.name}, ${fileType}, ${url}, ${size}, ${file.type}, ${parsedData.data.length})
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
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get("id")
    const download = searchParams.get("download") === "true"

    // If download=true, serve the file
    if (download && fileId) {
      const fileResult = await sql`
        SELECT
          uf.id,
          uf.file_name,
          uf.blob_url,
          uf.mime_type
        FROM uploaded_files uf
        WHERE uf.id = ${fileId}
      `

      if (fileResult.rows.length === 0) {
        return NextResponse.json(
          { error: "File not found" },
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
        return NextResponse.redirect(blobUrl)
      }
    }

    // Otherwise, return file list
    const fileType = searchParams.get("fileType")

    let query = sql`
      SELECT id, file_name, file_type, blob_url, file_size, row_count, created_at
      FROM uploaded_files
    `

    if (fileType) {
      query = sql`
        SELECT id, file_name, file_type, blob_url, file_size, row_count, created_at
        FROM uploaded_files
        WHERE file_type = ${fileType}
      `
    }

    const result = await query

    return NextResponse.json({
      files: result.rows.map((row: Record<string, unknown>) => ({
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
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get("id")

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID required" },
        { status: 400 }
      )
    }

    // Check if file exists
    const checkResult = await sql`
      SELECT id, blob_url FROM uploaded_files
      WHERE id = ${fileId}
    `

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      )
    }

    const blobUrl = checkResult.rows[0].blob_url

    // Delete physical file (handles both local filesystem and Vercel Blob)
    try {
      await deleteFile(blobUrl)
    } catch (error) {
      // Log error but continue with database deletion
      console.warn("Failed to delete physical file:", error)
    }

    // Delete from database
    await sql`
      DELETE FROM uploaded_files
      WHERE id = ${fileId}
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
