import { put } from "@vercel/blob";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

function response(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function safeFileName(name: string) {
  const normalized = name.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized.slice(0, 80) || "brand-media";
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return response({ error: "أرسل ملف صورة أو فيديو صالحًا." }, 400);

    const isImage = ALLOWED_IMAGE_TYPES.has(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.has(file.type);
    if (!isImage && !isVideo) {
      return response({ error: "الأنواع المدعومة: JPG وPNG وWEBP وGIF وSVG وMP4 وWEBM وMOV." }, 400);
    }

    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size <= 0 || file.size > maxBytes) {
      const limit = isVideo ? "50MB" : "8MB";
      return response({ error: `حجم الملف يجب ألا يتجاوز ${limit}.` }, 400);
    }

    const mediaType = isVideo ? "video" : "image";
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      // The local filesystem is suitable for the local/persistent test server only.
      // Vercel's ephemeral filesystem must use Blob storage instead.
      if (process.env.VERCEL === "1") {
        return response({ error: "تخزين الوسائط غير مهيأ في الإنتاج. أضف BLOB_READ_WRITE_TOKEN إلى إعدادات الاستضافة ثم أعد المحاولة." }, 503);
      }

      const fileName = `${Date.now()}-${randomUUID()}-${safeFileName(file.name)}`;
      const directory = join(process.cwd(), "public", "uploads", "site-branding");
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, fileName), Buffer.from(await file.arrayBuffer()));
      return response({ success: true, url: `/uploads/site-branding/${fileName}`, mediaType });
    }

    const blob = await put(`site-branding/${Date.now()}-${safeFileName(file.name)}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });

    return response({ success: true, url: blob.url, mediaType });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "تعذر رفع الوسيط";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return response({ error: status === 401 ? "يرجى تسجيل الدخول" : status === 403 ? "غير مصرح" : "تعذر رفع الوسيط" }, status);
  }
}
