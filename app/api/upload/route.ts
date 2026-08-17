import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 20 * 1024 * 1024;

const allowed = new Set([
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
]);

function safeName(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 150);
}

export async function POST(req: Request) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;

    if (!token) {
      console.error(
        "[UPLOAD] BLOB_READ_WRITE_TOKEN tidak tersedia",
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "BLOB_READ_WRITE_TOKEN belum tersedia di Vercel.",
        },
        { status: 500 },
      );
    }

    const form = await req.formData();

    const files = form
      .getAll("files")
      .filter(
        (item): item is File =>
          item instanceof File,
      );

    if (!files.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak ada file",
        },
        { status: 400 },
      );
    }

    if (files.length > 10) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Maksimal 10 file dalam satu upload.",
        },
        { status: 400 },
      );
    }

    const result: Array<{
      namaFile: string;
      tipe: string;
      pathname: string;
      url: string;
      size: number;
    }> = [];

    for (const file of files) {
      if (file.size <= 0) {
        continue;
      }

      if (!allowed.has(file.type)) {
        continue;
      }

      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          {
            success: false,
            message: `File "${file.name}" lebih besar dari 20 MB.`,
          },
          { status: 400 },
        );
      }

      const pathname =
        `akta/${new Date().getFullYear()}/` +
        `${randomUUID()}-${safeName(file.name)}`;

      const blob = await put(
        pathname,
        file,
        {
          access: "private",
          addRandomSuffix: false,
          contentType: file.type,
          token,
        },
      );

      const previewUrl =
        `/api/blob?pathname=${encodeURIComponent(
          blob.pathname,
        )}`;

      result.push({
        namaFile: file.name,
        tipe: file.type,
        pathname: blob.pathname,
        url: previewUrl,
        size: file.size,
      });
    }

    if (!result.length) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tidak ada file yang valid.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      files: result,
    });
  } catch (error) {
    console.error(
      "[BLOB UPLOAD ERROR]",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Upload gagal",
      },
      { status: 500 },
    );
  }
}