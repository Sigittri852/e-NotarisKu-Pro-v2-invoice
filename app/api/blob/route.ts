import { get, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 25 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
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
]);

function safeName(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 150);
}

/**
 * GET
 *
 * Menampilkan file private dari Vercel Blob.
 *
 * Contoh:
 * /api/blob?pathname=akta/2026/xxxx-ktp.jpg
 */
export async function GET(req: Request) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;

    if (!token) {
      console.error(
        "[BLOB GET] BLOB_READ_WRITE_TOKEN tidak tersedia",
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "BLOB_READ_WRITE_TOKEN belum tersedia di Vercel.",
        },
        { status: 500 },
      );
    }

    const url = new URL(req.url);

    const pathname = url.searchParams.get("pathname");

    if (!pathname) {
      return NextResponse.json(
        {
          success: false,
          error: "Parameter pathname wajib diisi.",
        },
        { status: 400 },
      );
    }

    /*
     * Keamanan:
     * hanya izinkan file di folder akta/
     */
    if (!pathname.startsWith("akta/")) {
      return NextResponse.json(
        {
          success: false,
          error: "Path file tidak diperbolehkan.",
        },
        { status: 403 },
      );
    }

    console.log("[BLOB GET]", pathname);

    const result = await get(pathname, {
      access: "private",
      token,
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

    const contentType =
      result.blob?.contentType ||
      "application/octet-stream";

    const size = result.blob?.size;

    const headers = new Headers();

    headers.set("Content-Type", contentType);
    headers.set(
      "Cache-Control",
      "private, no-store, max-age=0, must-revalidate",
    );
    headers.set(
      "X-Content-Type-Options",
      "nosniff",
    );

    if (
      typeof size === "number" &&
      Number.isFinite(size)
    ) {
      headers.set(
        "Content-Length",
        String(size),
      );
    }

    /*
     * inline:
     * JPG/PNG/PDF bisa ditampilkan browser.
     */
    if (
      contentType.startsWith("image/") ||
      contentType === "application/pdf"
    ) {
      headers.set(
        "Content-Disposition",
        "inline",
      );
    } else {
      headers.set(
        "Content-Disposition",
        "attachment",
      );
    }

    return new Response(
      result.stream,
      {
        status: 200,
        headers,
      },
    );
  } catch (error) {
    console.error(
      "[BLOB GET ERROR]",
      error,
    );

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

/**
 * POST
 *
 * Upload file ke Vercel Blob private.
 *
 * FormData:
 * files = File[]
 */
export async function POST(req: Request) {
  try {
    const token =
      process.env.BLOB_READ_WRITE_TOKEN;

    if (!token) {
      console.error(
        "[BLOB POST] BLOB_READ_WRITE_TOKEN tidak tersedia",
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "BLOB_READ_WRITE_TOKEN belum tersedia di Vercel.",
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
          success: false,
          error:
            "Tidak ada file yang dikirim.",
        },
        { status: 400 },
      );
    }

    if (files.length > 10) {
      return NextResponse.json(
        {
          success: false,
          error:
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

      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error:
              `File "${file.name}" ` +
              `lebih besar dari 25 MB.`,
          },
          { status: 400 },
        );
      }

      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Format file "${file.name}" ` +
              "tidak diperbolehkan.",
          },
          { status: 400 },
        );
      }

      const filename =
        `${randomUUID()}-${safeName(file.name)}`;

      const pathname =
        `akta/${new Date().getFullYear()}/` +
        filename;

      const blob = await put(
        pathname,
        file,
        {
          access: "private",
          addRandomSuffix: false,
          contentType:
            file.type ||
            "application/octet-stream",
          token,
        },
      );

      /*
       * Jangan kirim blob.url private
       * langsung ke browser.
       *
       * Gunakan endpoint GET kita sendiri.
       */
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
          error:
            "Tidak ada file yang valid.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        files: result,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "[BLOB POST ERROR]",
      error,
    );

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