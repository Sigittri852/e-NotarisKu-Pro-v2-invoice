import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 25 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

function safeName(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 150);
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const files = form
      .getAll("files")
      .filter((item): item is File => item instanceof File);

    if (!files.length) {
      return NextResponse.json(
        { error: "Tidak ada file yang dikirim." },
        { status: 400 }
      );
    }

    if (files.length > 10) {
      return NextResponse.json(
        { error: "Maksimal 10 file dalam satu upload." },
        { status: 400 }
      );
    }

    const uploaded = [];

    for (const file of files) {
      if (file.size <= 0) {
        continue;
      }

      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          {
            error: `File "${file.name}" lebih besar dari 25 MB.`,
          },
          { status: 400 }
        );
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            error: `Format file "${file.name}" tidak diperbolehkan.`,
          },
          { status: 400 }
        );
      }

      const filename = safeName(file.name);

      const pathname =
        `akta/${new Date().getFullYear()}/` +
        `${randomUUID()}-${filename}`;

      const blob = await put(pathname, file, {
        access: "private",
        addRandomSuffix: false,
      });

      uploaded.push({
        name: file.name,
        url: blob.url,
        pathname: blob.pathname,
        type: file.type,
        size: file.size,
      });
    }

    return NextResponse.json({
      ok: true,
      files: uploaded,
    });
  } catch (error) {
    console.error("BLOB UPLOAD ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengupload file ke Vercel Blob.",
      },
      { status: 500 }
    );
  }
}