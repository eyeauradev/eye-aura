import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { getFirebaseAdmin } from "@/lib/firebase-admin";

export async function GET(request: NextRequest, context: { params: Promise<{}> }) {
  try {
    const params = await context.params as { id: string };
    const prescriptionId = params.id;

    // Verify prescription exists using Admin SDK
    const admin = getFirebaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
    }

    const db = admin.firestore();
    const prescriptionDoc = await db.collection("prescriptions").doc(prescriptionId).get();
    if (!prescriptionDoc.exists) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    // Build the print URL
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const printUrl = `${protocol}://${host}/prescription/print/${prescriptionId}`;

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // Set viewport to A4
    await page.setViewport({ width: 794, height: 1123 });

    // Navigate to print page
    await page.goto(printUrl, { waitUntil: "domcontentloaded" });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      landscape: false,
    });

    await browser.close();

    // Return PDF with download headers
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="eye-aura-prescription-${prescriptionId}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
