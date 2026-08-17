import { get, put } from "@vercel/blob";
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
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
];

function safeName(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pathname = url.searchParams.get("pathname");

    if (!pathname) {
      return NextResponse.json(
        {
          success: false,
          error: "pathname wajib diisi.",
        },
        { status: 400 },
      );
    }

    console.log("[BLOB GET]", pathname);

    const result = await get(pathname, {
      access: "private",
    });

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: "File tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    return new Response(result.stream, {
      status: 200,
      headers: {
        "Content-Type":
          result.blob.contentType ||
          "application/octet-stream",
        "Content-Length":
          String(result.blob.size),
        "Cache-Control":
          "private, no-store, max-age=0",
        "X-Content-Type-Options":
          "nosniff",
      },
    });
  } catch (error) {
    console.error("[BLOB GET ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil file Blob.",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const token =
      process.env.BLOB_READ_WRITE_TOKEN;

    if (!token) {
      return NextResponse.json(
        {
          error:
            "BLOB_READ_WRITE_TOKEN belum tersedia.",
        },
        { status: 500 },
      );
    }

    const form =
      await req.formData();

    const files = form
      .getAll("files")
      .filter(
        (item): item is File =>
          item instanceof File,
      );

    if (!files.length) {
      return NextResponse.json(
        {
          error:
            "Tidak ada file yang dikirim.",
        },
        { status: 400 },
      );
    }

    const result: Array<{
      namaFile: string;
      tipe: string;
      pathname: string;
      size: number;
    }> = [];

    for (const file of files) {
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          {
            error: `File ${file.name} melebihi batas 25 MB.`,
          },
          { status: 400 },
        );
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            error: `Jenis file ${file.name} tidak diperbolehkan.`,
          },
          { status: 400 },
        );
      }

      const filename =
        `${randomUUID()}-${safeName(file.name)}`;

      const pathname =
        `akta/${new Date().getFullYear()}/${filename}`;

      const blob = await put(
        pathname,
        file,
        {
          access: "private",
          addRandomSuffix: false,
          contentType: file.type,
        },
      );

      result.push({
        namaFile: file.name,
        tipe: file.type,
        pathname: blob.pathname,
        size: file.size,
      });
    }

    return NextResponse.json({
      success: true,
      files: result,
    });
  } catch (error) {
    console.error("[BLOB POST ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Upload gagal.",
      },
      { status: 500 },
    );
  }
}