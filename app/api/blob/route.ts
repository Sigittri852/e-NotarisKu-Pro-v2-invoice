import { del, get, put } from "@vercel/blob";
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

function getToken() {
  return process.env.BLOB_READ_WRITE_TOKEN || "";
}

function pathnameFromUrl(value: string) {
  if (!value) return "";

  try {
    const parsed = new URL(value);

    if (
      !parsed.hostname.endsWith(
        ".private.blob.vercel-storage.com",
      )
    ) {
      return "";
    }

    return decodeURIComponent(
      parsed.pathname.replace(/^\/+/, ""),
    );
  } catch {
    return "";
  }
}

/* =========================================================
 * GET
 * Membaca file private Blob melalui server.
 *
 * Contoh:
 * /api/blob?pathname=akta/2026/xxxx-ktp.jpg
 * =======================================================*/
export async function GET(req: Request) {
  try {
    const token = getToken();

    if (!token) {
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
    const pathname =
      url.searchParams.get("pathname") || "";

    if (!pathname) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Parameter pathname wajib diisi.",
        },
        { status: 400 },
      );
    }

    if (!pathname.startsWith("akta/")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Path file tidak diperbolehkan.",
        },
        { status: 403 },
      );
    }

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

    const headers = new Headers();

    headers.set(
      "Content-Type",
      contentType,
    );

    headers.set(
      "Cache-Control",
      "private, no-store, max-age=0, must-revalidate",
    );

    headers.set(
      "X-Content-Type-Options",
      "nosniff",
    );

    if (
      typeof result.blob?.size === "number" &&
      Number.isFinite(result.blob.size)
    ) {
      headers.set(
        "Content-Length",
        String(result.blob.size),
      );
    }

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

/* =========================================================
 * POST
 * Upload file ke Vercel Blob private.
 * =======================================================*/
export async function POST(req: Request) {
  try {
    const token = getToken();

    if (!token) {
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
      name: string;
      tipe: string;
      type: string;
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
              "melebihi batas 25 MB.",
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
        `${randomUUID()}-${safeName(
          file.name,
        )}`;

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
       */
      const previewUrl =
        `/api/blob?pathname=${encodeURIComponent(
          blob.pathname,
        )}`;

      result.push({
        namaFile: file.name,
        name: file.name,
        tipe: file.type,
        type: file.type,
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

/* =========================================================
 * DELETE
 * Menghapus file fisik dari Vercel Blob.
 *
 * Bisa:
 * /api/blob?pathname=akta/2026/...
 *
 * atau:
 * /api/blob?url=https://...private.blob...
 * =======================================================*/
export async function DELETE(req: Request) {
  try {
    const token = getToken();

    if (!token) {
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

    const pathnameParam =
      url.searchParams.get("pathname") || "";

    const blobUrl =
      url.searchParams.get("url") || "";

    const pathname =
      pathnameParam ||
      pathnameFromUrl(blobUrl);

    if (!pathname) {
      return NextResponse.json(
        {
          success: false,
          error:
            "pathname atau url dokumen wajib diisi.",
        },
        { status: 400 },
      );
    }

    if (!pathname.startsWith("akta/")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Path file tidak diperbolehkan.",
        },
        { status: 403 },
      );
    }

    await del(pathname, {
      token,
    });

    return NextResponse.json({
      success: true,
      pathname,
    });
  } catch (error) {
    console.error(
      "[BLOB DELETE ERROR]",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal menghapus file Blob.",
      },
      { status: 500 },
    );
  }
}