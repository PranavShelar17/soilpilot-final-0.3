import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { execFile } from "child_process";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { gat: string } }
) {
  const cleanGat = (params.gat || "35").replace(/[^\d]/g, "") || "35";
  const publicDir = path.resolve(process.cwd(), "public", "data", "cadastre_thumbnails");
  const thumbPath = path.join(publicDir, `gat_${cleanGat}.png`);
  const fallbackPath = path.join(publicDir, "gat_35.png");

  // 1. If pre-generated satellite card exists, serve it directly
  if (fs.existsSync(thumbPath)) {
    try {
      const stats = fs.statSync(thumbPath);
      if (stats.size > 40000 || cleanGat === "37") {
        const fileBuffer = fs.readFileSync(thumbPath);
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });
      }
    } catch (_) {}
  }

  // 2. Dynamically generate on demand via Python satellite_map_generator
  try {
    const rootDir = path.resolve(process.cwd(), "..");
    const pythonCode = `
import sys
from pathlib import Path
backend_dir = Path('${rootDir.replace(/\\/g, "/")}/backend').resolve()
sys.path.insert(0, str(backend_dir))
from app.services.satellite_map_generator import generate_satellite_card
out = generate_satellite_card('${cleanGat}', '${thumbPath.replace(/\\/g, "/")}')
print(out)
`;
    await new Promise<void>((resolve, reject) => {
      execFile("python", ["-c", pythonCode], { cwd: rootDir, timeout: 15000 }, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    if (fs.existsSync(thumbPath)) {
      const fileBuffer = fs.readFileSync(thumbPath);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    }
  } catch (genErr) {
    console.warn(`Dynamic satellite card generation for Gat ${cleanGat} failed:`, genErr);
  }

  // 3. Fallback to existing Gat 35 image
  if (fs.existsSync(fallbackPath)) {
    const fileBuffer = fs.readFileSync(fallbackPath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  return new NextResponse("Image not found", { status: 404 });
}
