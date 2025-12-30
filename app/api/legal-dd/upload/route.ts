import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export interface UploadedDocument {
  id: string
  fileName: string
  fileType: string
  text: string
  uploadedAt: string
  characterCount: number
  wordCount: number
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const startupId = formData.get("startupId") as string
    const category = formData.get("category") as string
    const file = formData.get("file") as File | null

    if (!startupId || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Get existing startup
    const startup = await prisma.startup.findUnique({
      where: { id: startupId },
      select: { legalDiligence: true },
    })

    if (!startup) {
      return NextResponse.json({ error: "Startup not found" }, { status: 404 })
    }

    let extractedText = ""
    const fileName = file.name
    const fileType = file.type

    console.log("[Legal DD Upload] Processing file:", fileName, "Type:", fileType)

    // Extract text from PDF
    if (fileType === "application/pdf") {
      try {
        const pdfParse = require("pdf-parse-fork")
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const data = await pdfParse(buffer)
        extractedText = data.text
        console.log("[Legal DD Upload] Extracted", extractedText.length, "characters from PDF")
      } catch (pdfError) {
        console.error("[Legal DD Upload] PDF parsing error:", pdfError)
        return NextResponse.json(
          { error: `Failed to parse PDF: ${pdfError instanceof Error ? pdfError.message : "Unknown error"}` },
          { status: 500 }
        )
      }
    }
    // Handle Word documents (.docx)
    else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      try {
        // For .docx, we'd need mammoth or similar - for now, inform user to use PDF
        return NextResponse.json(
          { error: "Please convert Word documents to PDF for text extraction" },
          { status: 400 }
        )
      } catch (docError) {
        console.error("[Legal DD Upload] Word doc parsing error:", docError)
      }
    }
    // Handle plain text
    else if (fileType === "text/plain") {
      const arrayBuffer = await file.arrayBuffer()
      extractedText = new TextDecoder().decode(arrayBuffer)
    }
    else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload PDF or TXT files." },
        { status: 400 }
      )
    }

    if (!extractedText) {
      return NextResponse.json(
        { error: "Could not extract text from the document" },
        { status: 400 }
      )
    }

    // Create new document entry with unique ID
    const newDocument: UploadedDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fileName,
      fileType,
      text: extractedText,
      uploadedAt: new Date().toISOString(),
      characterCount: extractedText.length,
      wordCount: extractedText.split(/\s+/).length,
    }

    // Update legalDiligence with the uploaded document (append to array)
    const currentData = (startup.legalDiligence as any) || {}
    const currentDocs = currentData.uploadedDocuments || {}

    // Get existing documents for this category (as array) or initialize empty array
    const categoryDocs: UploadedDocument[] = Array.isArray(currentDocs[category])
      ? currentDocs[category]
      : currentDocs[category]
        ? [currentDocs[category]] // Migrate single doc to array
        : []

    // Add new document to the array
    categoryDocs.push(newDocument)

    const updatedDocs = {
      ...currentDocs,
      [category]: categoryDocs,
    }

    const updatedLegalDiligence = {
      ...currentData,
      uploadedDocuments: updatedDocs,
    }

    await prisma.startup.update({
      where: { id: startupId },
      data: { legalDiligence: updatedLegalDiligence },
    })

    console.log("[Legal DD Upload] Document uploaded successfully:", fileName, "to category:", category, "Total docs:", categoryDocs.length)

    return NextResponse.json({
      message: "Document uploaded successfully",
      document: {
        id: newDocument.id,
        fileName: newDocument.fileName,
        characterCount: newDocument.characterCount,
        wordCount: newDocument.wordCount,
      },
      category,
      totalDocuments: categoryDocs.length,
    }, { status: 200 })
  } catch (error) {
    console.error("[Legal DD Upload] Error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: `Failed to upload document: ${errorMessage}` },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve uploaded documents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startupId = searchParams.get("startupId")
    const category = searchParams.get("category")

    if (!startupId) {
      return NextResponse.json({ error: "Missing startupId" }, { status: 400 })
    }

    const startup = await prisma.startup.findUnique({
      where: { id: startupId },
      select: { legalDiligence: true },
    })

    if (!startup) {
      return NextResponse.json({ error: "Startup not found" }, { status: 404 })
    }

    const legalDiligence = (startup.legalDiligence as any) || {}
    const uploadedDocuments = legalDiligence.uploadedDocuments || {}

    if (category) {
      // Return documents for specific category (ensure it's an array)
      const docs = uploadedDocuments[category]
      const docsArray = Array.isArray(docs) ? docs : docs ? [docs] : []
      return NextResponse.json({ documents: docsArray })
    }

    // Return all documents, ensuring each category is an array
    const normalizedDocs: Record<string, UploadedDocument[]> = {}
    for (const [cat, docs] of Object.entries(uploadedDocuments)) {
      normalizedDocs[cat] = Array.isArray(docs) ? docs : docs ? [docs as UploadedDocument] : []
    }

    return NextResponse.json({ documents: normalizedDocs })
  } catch (error) {
    console.error("[Legal DD Upload] GET Error:", error)
    return NextResponse.json({ error: "Failed to retrieve documents" }, { status: 500 })
  }
}

// DELETE endpoint to remove uploaded document
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startupId = searchParams.get("startupId")
    const category = searchParams.get("category")
    const documentId = searchParams.get("documentId")

    if (!startupId || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const startup = await prisma.startup.findUnique({
      where: { id: startupId },
      select: { legalDiligence: true },
    })

    if (!startup) {
      return NextResponse.json({ error: "Startup not found" }, { status: 404 })
    }

    const currentData = (startup.legalDiligence as any) || {}
    const currentDocs = { ...(currentData.uploadedDocuments || {}) }

    if (documentId) {
      // Delete specific document by ID
      const categoryDocs = Array.isArray(currentDocs[category])
        ? currentDocs[category]
        : currentDocs[category] ? [currentDocs[category]] : []

      const filteredDocs = categoryDocs.filter((doc: UploadedDocument) => doc.id !== documentId)

      if (filteredDocs.length === 0) {
        delete currentDocs[category]
      } else {
        currentDocs[category] = filteredDocs
      }
    } else {
      // Delete all documents in category
      delete currentDocs[category]
    }

    // Also clear analysis results for this category since documents changed
    const currentAnalysis = { ...(currentData.analysisResults || {}) }
    delete currentAnalysis[category]

    const updatedLegalDiligence = {
      ...currentData,
      uploadedDocuments: currentDocs,
      analysisResults: currentAnalysis,
    }

    await prisma.startup.update({
      where: { id: startupId },
      data: { legalDiligence: updatedLegalDiligence },
    })

    return NextResponse.json({ message: "Document deleted successfully" })
  } catch (error) {
    console.error("[Legal DD Upload] DELETE Error:", error)
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
  }
}
