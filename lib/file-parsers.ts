import * as XLSX from "xlsx"
import Papa from "papaparse"

export interface ParsedFile {
  data: any[]
  fileName: string
}

/**
 * Parse an Excel file and return the data from the specified sheet
 */
export async function parseExcelFile(
  file: File,
  sheetName?: string
): Promise<ParsedFile> {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: "array" })

  // Try to find the DATA sheet (case-insensitive)
  let targetSheet = sheetName
  if (!targetSheet) {
    const sheetNames = workbook.SheetNames
    for (const sheet of sheetNames) {
      if (sheet.toUpperCase() === "DATA") {
        targetSheet = sheet
        break
      }
    }
    // If no DATA sheet found, use first sheet
    if (!targetSheet && sheetNames.length > 0) {
      targetSheet = sheetNames[0]
    }
  }

  if (!targetSheet) {
    throw new Error("No sheets found in Excel file")
  }

  const worksheet = workbook.Sheets[targetSheet]
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    defval: null,
    raw: false,
  })

  return {
    data: jsonData,
    fileName: file.name,
  }
}

/**
 * Parse a CSV file
 */
export async function parseCSVFile(file: File): Promise<ParsedFile> {
  // Convert File to string for Node.js environment
  const arrayBuffer = await file.arrayBuffer()
  const text = Buffer.from(arrayBuffer).toString("utf-8")

  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve({
          data: results.data as any[],
          fileName: file.name,
        })
      },
      error: (error: Error) => {
        reject(new Error(`CSV parsing error: ${error.message}`))
      },
    })
  })
}

/**
 * Parse Excel file with header on row 2 (index 1)
 */
export async function parseExcelWithHeaderRow(
  file: File,
  sheetName?: string,
  headerRow: number = 1
): Promise<ParsedFile> {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: "array" })

  let targetSheet = sheetName
  if (!targetSheet) {
    const sheetNames = workbook.SheetNames
    // Try NXN format sheets
    if (sheetNames.includes("NXN LINE ITEM ID DELIVERY LOOKUP")) {
      targetSheet = "NXN LINE ITEM ID DELIVERY LOOKUP"
    } else if (sheetNames.includes("NXN LINE ITEM ID DELIVERY LOOKU")) {
      // Excel truncates to 31 chars
      targetSheet = "NXN LINE ITEM ID DELIVERY LOOKU"
    } else if (sheetNames.includes("Programmatic")) {
      targetSheet = "Programmatic"
    } else if (sheetNames.length > 0) {
      targetSheet = sheetNames[0]
    }
  }

  if (!targetSheet) {
    throw new Error("No valid sheets found in file")
  }

  const worksheet = workbook.Sheets[targetSheet]

  // Read with header row offset
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1")
  range.s.r = headerRow // Set start row to header row

  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    defval: null,
    raw: false,
    range,
  })

  return {
    data: jsonData,
    fileName: file.name,
  }
}

/**
 * Parse a file (CSV or Excel) automatically detecting format
 */
export async function parseFile(
  file: File,
  options?: {
    sheetName?: string
    headerRow?: number
  }
): Promise<ParsedFile> {
  const fileName = file.name.toLowerCase()

  if (fileName.endsWith(".csv")) {
    return parseCSVFile(file)
  } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    if (options?.headerRow !== undefined) {
      return parseExcelWithHeaderRow(file, options.sheetName, options.headerRow)
    }
    return parseExcelFile(file, options?.sheetName)
  } else {
    throw new Error(
      `Unsupported file format. Please upload CSV or Excel files (.csv, .xlsx, .xls)`
    )
  }
}
