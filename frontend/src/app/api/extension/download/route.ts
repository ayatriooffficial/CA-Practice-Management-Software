import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // Check possible locations for the extension zip
    const candidates = [
      path.join(process.cwd(), "public", "downloads", "ca-practice-extension.zip"),
      path.join(process.cwd(), "frontend", "public", "downloads", "ca-practice-extension.zip"),
      path.resolve("..", "frontend", "public", "downloads", "ca-practice-extension.zip"),
    ];

    let zipPath = candidates.find((p) => fs.existsSync(p));

    if (!zipPath || !fs.existsSync(zipPath)) {
      return NextResponse.json(
        { error: "Extension package not found." },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(zipPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="ca-practice-mca-extension.zip"',
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to download extension package." },
      { status: 500 }
    );
  }
}

