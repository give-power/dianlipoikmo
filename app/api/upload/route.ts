import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return Response.json({ error: "No file" }, { status: 400 });

  // RC2: MIME type whitelist
  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json(
      { error: "仅支持 JPG / PNG / WebP / GIF 图片" },
      { status: 415 }
    );
  }

  // RC2: File size limit
  if (file.size > MAX_SIZE_BYTES) {
    return Response.json(
      { error: "文件大小不能超过 5 MB" },
      { status: 413 }
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  // RC2: Random UUID-based filename — no original filename preserved
  const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, buffer);

  return Response.json({ path: `/uploads/${filename}` });
}
