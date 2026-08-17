import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import path from "path";
import { listAkta } from "@/lib/store";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
const START_ROW = 15;
const TEMPLATE_NAME = "TEMPLATE-LAPORAN-NOTARIS-PPAT.xlsx";

type Kategori = "NOTARIS" | "PPAT";

function text(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  if (typeof value === "object") {
    const obj = value as any;

    if (Array.isArray(obj.richText)) {
      return obj.richText
        .map((part: any) => String(part?.text ?? ""))
        .join("")
        .trim();
    }

    if (typeof obj.text === "string") {
      return obj.text.trim();
    }

    if (typeof obj.result === "string") {
      return obj.result.trim();
    }
  }

  return String(value).trim();
}

function setMergedHeaderText(
  worksheet: ExcelJS.Worksheet,
  rowStart: number,
  rowEnd: number,
  matcher: (value: string) => boolean,
  value: string,
) {
  const merges = worksheet.model.merges || [];

  for (const merge of merges) {
    const match = String(merge).match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (!match) continue;

    const startRow = Number(match[2]);
    const endRow = Number(match[4]);

    if (startRow < rowStart || startRow > rowEnd) continue;

    const anchor = worksheet.getCell(
      `${match[1]}${startRow}`,
    );

    const current = text(anchor.value);

    if (matcher(current)) {
      anchor.value = value;
      anchor.alignment = {
        ...anchor.alignment,
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      return true;
    }
  }

  return false;
}

function numberValue(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== "string") return 0;

  let s = value
    .trim()
    .replace(/Rp/gi, "")
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "");

  if (!s) return 0;

  if (s.includes(".") && s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(".")) {
    s = s.replace(/\./g, "");
  } else if (s.includes(",")) {
    const parts = s.split(",");
    s =
      parts.length === 2 && parts[1].length <= 2
        ? `${parts[0]}.${parts[1]}`
        : s.replace(/,/g, "");
  }

  const result = Number(s);
  return Number.isFinite(result) ? result : 0;
}

function dateValue(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const s = String(value).trim();
  if (!s) return null;

  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);

    const d = new Date(year, month - 1, day);

    if (
      d.getFullYear() === year &&
      d.getMonth() === month - 1 &&
      d.getDate() === day
    ) {
      return d;
    }

    return null;
  }

  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);

    const d = new Date(year, month - 1, day);

    if (
      d.getFullYear() === year &&
      d.getMonth() === month - 1 &&
      d.getDate() === day
    ) {
      return d;
    }

    return null;
  }

  const d = new Date(s);

  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(value: unknown): string {
  const d = dateValue(value);

  if (!d) return "";

  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

function formatRupiah(value: unknown): string {
  const n = numberValue(value);

  return `Rp ${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(n)}`;
}

function formatNumber(value: unknown): string {
  const n = numberValue(value);

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(n);
}

function pihakData(x: any): any[] {
  if (Array.isArray(x?.pihak) && x.pihak.length > 0) {
    return x.pihak;
  }

  return [
    {
      nama: text(x?.namaPihak),
      nik: text(x?.nik),
      npwp: text(x?.npwp),
    },
  ];
}

function getNamaPihak(x: any): string {
  return pihakData(x)
    .map((p: any) => text(p?.nama))
    .filter(Boolean)
    .join("; ");
}

function getNikNpwp(x: any): string {
  return pihakData(x)
    .map((p: any) =>
      [text(p?.nik), text(p?.npwp)]
        .filter(Boolean)
        .join(" / "),
    )
    .filter(Boolean)
    .join("; ");
}

function getJenisHak(x: any): string {
  return [text(x?.jenisHak), text(x?.nomorSertifikat)]
    .filter(Boolean)
    .join(" / ");
}

function getDokumenLengkap(x: any): string {
  const parts: string[] = [];

  const status = text(x?.dokumenLengkap);
  if (status) parts.push(status);

  if (Array.isArray(x?.dokumen) && x.dokumen.length) {
    const names = x.dokumen
      .map((d: any) =>
        text(
          d?.namaFile ??
            d?.name ??
            d?.filename ??
            d?.fileName,
        ),
      )
      .filter(Boolean);

    if (names.length) {
      parts.push(`Dokumen: ${names.join(", ")}`);
    }
  }

  if (Array.isArray(x?.fotoTtdKlien) && x.fotoTtdKlien.length) {
    parts.push(`Foto TTD Klien: ${x.fotoTtdKlien.length}`);
  }

  if (Array.isArray(x?.fotoTtdNotaris) && x.fotoTtdNotaris.length) {
    parts.push(`Foto TTD Notaris: ${x.fotoTtdNotaris.length}`);
  }

  if (Array.isArray(x?.minuta) && x.minuta.length) {
    parts.push(`Minuta: ${x.minuta.length}`);
  }

  if (x?.honorarium !== undefined && x?.honorarium !== null) {
    const honor = numberValue(x.honorarium);
    if (honor > 0) {
      parts.push(`Honorarium: ${formatRupiah(honor)}`);
    }
  }

  if (x?.detail && typeof x.detail === "object") {
    const detailPairs = Object.entries(x.detail)
      .map(([key, value]) => {
        const v = text(value);
        return v ? `${key}: ${v}` : "";
      })
      .filter(Boolean);

    if (detailPairs.length) {
      parts.push(detailPairs.join(" | "));
    }
  }

  const catatan = text(x?.catatan);
  if (catatan) parts.push(`Catatan: ${catatan}`);

  return parts.join(" ; ");
}

function bulanIndonesia(month: number): string {
  const months = [
    "JANUARI",
    "FEBRUARI",
    "MARET",
    "APRIL",
    "MEI",
    "JUNI",
    "JULI",
    "AGUSTUS",
    "SEPTEMBER",
    "OKTOBER",
    "NOVEMBER",
    "DESEMBER",
  ];

  return months[month - 1] ?? "";
}

function setText(
  cell: ExcelJS.Cell,
  value: string,
  align: "left" | "center" | "right" = "center",
) {
  cell.value = value;
  cell.numFmt = "@";
  cell.alignment = {
    horizontal: align,
    vertical: "middle",
    wrapText: true,
  };
}

function resetCell(cell: ExcelJS.Cell) {
  cell.value = null;
  cell.numFmt = "General";
}

function jsonText(value: unknown): string {
  if (value === null || value === undefined) return "";

  try {
    if (typeof value === "string") {
      return value;
    }

    return JSON.stringify(value, null, 0);
  } catch {
    return text(value);
  }
}

function documentNames(value: unknown): string {
  if (!Array.isArray(value)) return "";

  return value
    .map((d: any) =>
      text(
        d?.namaFile ??
          d?.name ??
          d?.filename ??
          d?.fileName ??
          d?.path ??
          d?.pathname,
      ),
    )
    .filter(Boolean)
    .join("; ");
}

function parseInvoiceItems(value: unknown): any[] {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ kategori: string }>;
  },
) {
  try {
    const { kategori } = await params;

    const cat: Kategori =
      String(kategori).toUpperCase() === "PPAT"
        ? "PPAT"
        : "NOTARIS";

    const url = new URL(request.url);

    const now = new Date();

    const bulanParam = Number(
      url.searchParams.get("bulan"),
    );

    const tahunParam = Number(
      url.searchParams.get("tahun"),
    );

    const bulan =
      Number.isInteger(bulanParam) &&
      bulanParam >= 1 &&
      bulanParam <= 12
        ? bulanParam
        : now.getMonth() + 1;

    const tahun =
      Number.isInteger(tahunParam) &&
      tahunParam >= 2000 &&
      tahunParam <= 2100
        ? tahunParam
        : now.getFullYear();

    const templatePath = path.join(
      process.cwd(),
      "public",
      "templates",
      TEMPLATE_NAME,
    );

    console.log(
      `[EXPORT ${cat}] template=${templatePath}`,
    );

    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile(templatePath);

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw new Error("Worksheet tidak ditemukan.");
    }

    const allData = await listAkta();

    const totalNotaris = (
      Array.isArray(allData) ? allData : []
    ).filter(
      (x: any) =>
        text(x?.kategori).toUpperCase() === "NOTARIS",
    ).length;

    const totalPpat = (
      Array.isArray(allData) ? allData : []
    ).filter(
      (x: any) =>
        text(x?.kategori).toUpperCase() === "PPAT",
    ).length;

    console.log(
      `[EXPORT] TOTAL NOTARIS = ${totalNotaris}`,
    );

    console.log(
      `[EXPORT] TOTAL PPAT = ${totalPpat}`,
    );

    const data = (
      Array.isArray(allData) ? allData : []
    )
      .filter((x: any) => {
        if (text(x?.kategori).toUpperCase() !== cat) {
          return false;
        }

        const d = dateValue(x?.tanggal);

        if (!d) return false;

        return (
          d.getMonth() + 1 === bulan &&
          d.getFullYear() === tahun
        );
      })
      .sort((a: any, b: any) => {
        const da = dateValue(a?.tanggal)?.getTime() ?? 0;
        const db = dateValue(b?.tanggal)?.getTime() ?? 0;
        return da - db;
      });

    console.log(
      `[EXPORT ${cat}] periode=${bulan}/${tahun} data=${data.length}`,
    );

    /*
     * Ambil SEMUA invoice yang tersimpan.
     * Pencocokan dilakukan dengan:
     *   1) aktaId
     *   2) nomorAkta
     */
    const invoices = await prisma.invoice.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    const invoiceByAktaId = new Map<string, any[]>();
    const invoiceByNomorAkta = new Map<string, any[]>();

    for (const invoice of invoices as any[]) {
      const aktaId = text(invoice?.aktaId);
      const nomorAkta = text(invoice?.nomorAkta);

      if (aktaId) {
        const bucket = invoiceByAktaId.get(aktaId) ?? [];
        bucket.push(invoice);
        invoiceByAktaId.set(aktaId, bucket);
      }

      if (nomorAkta) {
        const key = nomorAkta.toUpperCase();
        const bucket = invoiceByNomorAkta.get(key) ?? [];
        bucket.push(invoice);
        invoiceByNomorAkta.set(key, bucket);
      }
    }

    function invoicesForAkta(x: any): any[] {
      const byId = invoiceByAktaId.get(text(x?.id)) ?? [];
      if (byId.length) return byId;

      const key = text(x?.nomorAkta).toUpperCase();
      return invoiceByNomorAkta.get(key) ?? [];
    }

    console.log(
      `[EXPORT ${cat}] invoice total=${invoices.length}`,
    );

    const namaPejabat =
      data.find((x: any) => text(x?.namaNotaris))?.namaNotaris ||
      "APRIANI, S.H., M.Kn";

    /*
     * HEADER OTOMATIS
     */
    const jabatan = cat === "PPAT" ? "PPAT" : "Notaris";

    const halPembuatan =
      cat === "PPAT"
        ? "Hal : Laporan Bulanan Pembuatan Akta PPAT"
        : "Hal : Laporan Bulanan Pembuatan Akta Notaris";

    const judulLaporan =
      cat === "PPAT"
        ? "LAPORAN BULANAN PEMBUATAN AKTA OLEH PPAT"
        : "LAPORAN BULANAN PEMBUATAN AKTA OLEH NOTARIS";

    const headerTanggal =
      `Tanggal : ${String(now.getDate()).padStart(2, "0")}/${String(
        now.getMonth() + 1,
      ).padStart(2, "0")}/${now.getFullYear()}`;

    const headerNama =
      `Nama ${jabatan} : ${namaPejabat}`;

    const headerBulan =
      `BULAN ${bulanIndonesia(bulan)} TAHUN ${tahun}`;

    /*
     * Tulis ke anchor utama.
     */
    worksheet.getCell("B1").value =
      "LAMPIRAN SURAT NOMOR : -";

    worksheet.getCell("B2").value =
      halPembuatan;

    worksheet.getCell("B3").value =
      headerTanggal;

    worksheet.getCell("B4").value =
      headerNama;

    worksheet.getCell("B5").value =
      "Alamat : Perum Puri Kosambi 1 Blok N, No. 8";

    worksheet.getCell("B6").value =
      "Desa Duren, Klari-Karawang";

    worksheet.getCell("B7").value =
      "NPWP : -";

    worksheet.getCell("B8").value =
      "Daerah Kerja : Kabupaten Karawang";

    worksheet.getCell("B10").value =
      judulLaporan;

    worksheet.getCell("B11").value =
      headerBulan;

    /*
     * Template memakai merged cells. Nilai lama di template
     * bisa berupa richText dan anchor merge bisa bukan B10/B11.
     * Cari anchor merged-cell berdasarkan isi sebenarnya.
     */
    setMergedHeaderText(
      worksheet,
      1,
      12,
      (v) =>
        v.toUpperCase().includes("LAMPIRAN SURAT NOMOR"),
      "LAMPIRAN SURAT NOMOR : -",
    );

    setMergedHeaderText(
      worksheet,
      1,
      12,
      (v) =>
        v.toUpperCase().includes("HAL") &&
        v.toUpperCase().includes("LAPORAN BULANAN"),
      halPembuatan,
    );

    setMergedHeaderText(
      worksheet,
      1,
      12,
      (v) =>
        v.toUpperCase().includes("NAMA PPAT") ||
        v.toUpperCase().includes("NAMA NOTARIS") ||
        v.toUpperCase().includes("NAMA NOTARIS / PPAT"),
      headerNama,
    );

    setMergedHeaderText(
      worksheet,
      1,
      12,
      (v) =>
        v.toUpperCase().includes(
          "LAPORAN BULANAN PEMBUATAN AKTA",
        ),
      judulLaporan,
    );

    setMergedHeaderText(
      worksheet,
      1,
      12,
      (v) =>
        v.toUpperCase().includes("BULAN") &&
        v.toUpperCase().includes("TAHUN"),
      headerBulan,
    );

    /*
     * Pastikan cell judul yang dihasilkan tetap terpusat.
     */
    for (const ref of ["B10", "B11"]) {
      worksheet.getCell(ref).alignment = {
        ...worksheet.getCell(ref).alignment,
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
    }

    /*
     * =====================================================
     * HEADER TABEL
     *
     * Baris 13 = nama kolom
     * Baris 14 = nomor 1 sampai 19
     * Baris 15+ = data laporan
     * =====================================================
     */
    const headers = [
      "NO",
      "NAMA NOTARIS / PPAT",
      "NOMOR AKTA",
      "TANGGAL",
      "NIK / NPWP",
      "NAMA PIHAK",
      "ALAMAT",
      "JENIS DAN NOMOR HAK",
      "NILAI TRANSAKSI",
      "LUAS (M2)",
      "STATUS",
      "NJOP / SPT PBB",
      "NOP PBB",
      "SPT PBB",
      "TANGGAL SSP PPH",
      "SSP PPH",
      "TANGGAL BPHTB",
      "SSPD BPHTB",
      "DOKUMEN LENGKAP",
    ];

    for (let i = 0; i < headers.length; i++) {
      const col = String.fromCharCode(
        "B".charCodeAt(0) + i,
      );

      const headerCell =
        worksheet.getCell(`${col}13`);

      headerCell.value = headers[i];
      headerCell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };

      const numberCell =
        worksheet.getCell(`${col}14`);

      numberCell.value = String(i + 1);
      numberCell.numFmt = "@";
      numberCell.alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      numberCell.font = {
        ...numberCell.font,
        bold: true,
      };
    }

    worksheet.getRow(13).height = 34;
    worksheet.getRow(14).height = 22;

    /*
     * Bersihkan area data dari template.
     * Data laporan ditulis sebagai TEXT agar Excel
     * tidak pernah mengubah angka menjadi tanggal serial.
     */
    for (let row = START_ROW; row <= 500; row++) {
      for (let col = 2; col <= 20; col++) {
        resetCell(worksheet.getCell(row, col));
      }
    }

    /*
     * DATA B:T
     */
    data.forEach((x: any, index: number) => {
      const row = START_ROW + index;

      /*
       * B NO
       */
      setText(
        worksheet.getCell(`B${row}`),
        String(index + 1),
        "center",
      );

      /*
       * C NAMA NOTARIS / PPAT
       */
      setText(
        worksheet.getCell(`C${row}`),
        text(x?.namaNotaris) || namaPejabat,
        "left",
      );

      /*
       * D NOMOR AKTA
       */
      setText(
        worksheet.getCell(`D${row}`),
        text(x?.nomorAkta),
        "center",
      );

      /*
       * E TANGGAL
       */
      setText(
        worksheet.getCell(`E${row}`),
        formatDate(x?.tanggal),
        "center",
      );

      /*
       * F NIK / NPWP
       */
      setText(
        worksheet.getCell(`F${row}`),
        getNikNpwp(x),
        "center",
      );

      /*
       * G NAMA PIHAK
       */
      setText(
        worksheet.getCell(`G${row}`),
        getNamaPihak(x),
        "left",
      );

      /*
       * H ALAMAT
       */
      setText(
        worksheet.getCell(`H${row}`),
        text(x?.alamat),
        "left",
      );

      /*
       * I JENIS DAN NOMOR HAK
       */
      setText(
        worksheet.getCell(`I${row}`),
        getJenisHak(x),
        "left",
      );

      /*
       * J NILAI TRANSAKSI
       */
      setText(
        worksheet.getCell(`J${row}`),
        formatRupiah(x?.nilaiTransaksi),
        "center",
      );

      /*
       * K LUAS
       */
      setText(
        worksheet.getCell(`K${row}`),
        formatNumber(x?.luasTanah),
        "center",
      );

      /*
       * L STATUS
       */
      setText(
        worksheet.getCell(`L${row}`),
        text(x?.status),
        "center",
      );

      /*
       * M NJOP / SPT PBB
       */
      setText(
        worksheet.getCell(`M${row}`),
        formatRupiah(x?.njop),
        "center",
      );

      /*
       * N NOP PBB
       */
      setText(
        worksheet.getCell(`N${row}`),
        text(x?.nopPbb),
        "center",
      );

      /*
       * O SPT PBB
       *
       * Jika sptPbb belum tersedia di database,
       * fallback ke NJOP.
       */
      const sptPbb =
        x?.sptPbb !== null &&
        x?.sptPbb !== undefined &&
        text(x?.sptPbb) !== ""
          ? x.sptPbb
          : x?.njop;

      setText(
        worksheet.getCell(`O${row}`),
        formatRupiah(sptPbb),
        "center",
      );

      /*
       * P TANGGAL SSP PPH
       */
      setText(
        worksheet.getCell(`P${row}`),
        formatDate(x?.tanggalSsp),
        "center",
      );

      /*
       * Q SSP PPH
       */
      setText(
        worksheet.getCell(`Q${row}`),
        formatRupiah(x?.sspPph),
        "center",
      );

      /*
       * R TANGGAL BPHTB
       */
      setText(
        worksheet.getCell(`R${row}`),
        formatDate(x?.tanggalBphtb),
        "center",
      );

      /*
       * S SSPD BPHTB
       */
      setText(
        worksheet.getCell(`S${row}`),
        formatRupiah(x?.bphtb),
        "center",
      );

      /*
       * T DOKUMEN LENGKAP
       */
      setText(
        worksheet.getCell(`T${row}`),
        getDokumenLengkap(x),
        "center",
      );

      worksheet.getRow(row).height = 48;

      console.log(
        `[EXPORT ${cat}] row=${row} nomor=${text(
          x?.nomorAkta,
        )} nilai=${formatRupiah(
          x?.nilaiTransaksi,
        )} luas=${formatNumber(
          x?.luasTanah,
        )} njop=${formatRupiah(
          x?.njop,
        )} ssp=${formatRupiah(
          x?.sspPph,
        )} bphtb=${formatRupiah(
          x?.bphtb,
        )}`,
      );
    });

    /*
     * Lebar kolom agar isi terbaca.
     */
    const widths: Record<string, number> = {
      B: 7,
      C: 28,
      D: 20,
      E: 14,
      F: 30,
      G: 25,
      H: 34,
      I: 30,
      J: 22,
      K: 14,
      L: 18,
      M: 22,
      N: 28,
      O: 22,
      P: 16,
      Q: 22,
      R: 16,
      S: 22,
      T: 24,
    };

    for (const [column, width] of Object.entries(widths)) {
      worksheet.getColumn(column).width = width;
    }

    /*
     * Footer dibuat setelah data.
     */
    const footerRow = Math.max(
      START_ROW + data.length + 3,
      25,
    );

    worksheet.getCell(`M${footerRow}`).value =
      cat === "PPAT"
        ? "PPAT DI KABUPATEN KARAWANG"
        : "NOTARIS DI KABUPATEN KARAWANG";

    worksheet.getCell(`M${footerRow}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };

    worksheet.getCell(`M${footerRow}`).font = {
      ...worksheet.getCell(`M${footerRow}`).font,
      bold: true,
    };

    worksheet.getCell(`M${footerRow + 3}`).value =
      namaPejabat;

    worksheet.getCell(`M${footerRow + 3}`).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };

    worksheet.getCell(`M${footerRow + 3}`).font = {
      ...worksheet.getCell(`M${footerRow + 3}`).font,
      bold: true,
    };

    /*
     * =====================================================
     * SHEET 2: SEMUA DATA INPUT
     *
     * Sheet pertama tetap mengikuti template resmi 19 kolom.
     * Sheet kedua menyimpan seluruh properti data akta yang ada
     * di database, termasuk field tambahan dari form.
     * =====================================================
     */
    const allInputSheet =
      workbook.addWorksheet("SEMUA DATA INPUT");

    /*
     * SHEET 2 harus benar-benar menampung seluruh input.
     * Field nested tidak dibuang lagi: pihak, dokumen, foto TTD,
     * minuta, detail dinamis, items, dan invoice terkait ikut
     * ditulis dalam bentuk teks/JSON.
     */
    const standardKeys = [
      "id",
      "kategori",
      "nomorAkta",
      "tanggal",
      "namaNotaris",
      "namaPihak",
      "nik",
      "npwp",
      "alamat",
      "jenisHak",
      "nomorSertifikat",
      "nilaiTransaksi",
      "luasTanah",
      "status",
      "njop",
      "nopPbb",
      "sptPbb",
      "tanggalSsp",
      "sspPph",
      "tanggalBphtb",
      "bphtb",
      "catatan",
      "honorarium",
      "createdAt",
      "pihak",
      "dokumen",
      "fotoTtdKlien",
      "fotoTtdNotaris",
      "minuta",
      "detail",
    ];

    const translatedHeaders: Record<string, string> = {
      id: "ID",
      kategori: "Kategori",
      nomorAkta: "Nomor Akta",
      tanggal: "Tanggal",
      namaNotaris: "Nama Notaris / PPAT",
      namaPihak: "Nama Pihak",
      nik: "NIK",
      npwp: "NPWP",
      alamat: "Alamat",
      jenisHak: "Jenis Hak",
      nomorSertifikat: "Nomor Sertifikat",
      nilaiTransaksi: "Nilai Transaksi",
      luasTanah: "Luas Tanah",
      status: "Status",
      njop: "NJOP",
      nopPbb: "NOP PBB",
      sptPbb: "SPT PBB",
      tanggalSsp: "Tanggal SSP",
      sspPph: "SSP PPh",
      tanggalBphtb: "Tanggal BPHTB",
      bphtb: "SSPD BPHTB",
      catatan: "Catatan",
      honorarium: "Honorarium",
      createdAt: "Dibuat",
      pihak: "Pihak Lengkap",
      dokumen: "Dokumen",
      fotoTtdKlien: "Foto TTD Klien",
      fotoTtdNotaris: "Foto TTD Notaris",
      minuta: "Minuta",
      detail: "Detail Tambahan",
    };

    /*
     * Tambahkan semua key primitive yang mungkin ada pada record.
     */
    const extraKeys = new Set<string>();

    for (const x of data as any[]) {
      Object.keys(x || {}).forEach((key) => {
        if (!standardKeys.includes(key)) {
          extraKeys.add(key);
        }
      });
    }

    const extraSorted = Array.from(extraKeys).sort();

    const inputHeaders = [
      "NO",
      ...standardKeys,
      ...extraSorted,
      "NOMOR INVOICE",
      "STATUS INVOICE",
      "ITEM TAGIHAN",
    ];

    inputHeaders.forEach((key, index) => {
      const cell =
        allInputSheet.getCell(1, index + 1);

      const label =
        translatedHeaders[key] ??
        (key === "NOMOR INVOICE"
          ? key
          : key === "STATUS INVOICE"
            ? key
            : key === "ITEM TAGIHAN"
              ? key
              : key
                  .replace(/([a-z])([A-Z])/g, "$1 $2")
                  .replace(/^./, (c) => c.toUpperCase()));

      cell.value = label;
      cell.font = { bold: true };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
    });

    allInputSheet.getRow(1).height = 36;

    data.forEach((x: any, index: number) => {
      const row = allInputSheet.getRow(index + 2);
      const rowInvoices = invoicesForAkta(x);

      row.getCell(1).value = index + 1;

      for (let i = 0; i < standardKeys.length; i++) {
        const key = standardKeys[i];
        const value = x?.[key];
        let display = "";

        if (value !== null && value !== undefined) {
          if (
            [
              "tanggal",
              "tanggalSsp",
              "tanggalBphtb",
              "createdAt",
            ].includes(key)
          ) {
            display = formatDate(value);
          } else if (
            [
              "nilaiTransaksi",
              "njop",
              "sptPbb",
              "sspPph",
              "bphtb",
              "honorarium",
            ].includes(key)
          ) {
            display = formatRupiah(value);
          } else if (key === "luasTanah") {
            display = formatNumber(value);
          } else if (key === "pihak") {
            display = jsonText(value);
          } else if (key === "dokumen") {
            display = documentNames(value);
          } else if (
            key === "fotoTtdKlien" ||
            key === "fotoTtdNotaris" ||
            key === "minuta"
          ) {
            display = documentNames(value);
          } else if (key === "detail") {
            display = jsonText(value);
          } else {
            display = text(value);
          }
        }

        row.getCell(i + 2).value = display;
      }

      let col = standardKeys.length + 2;

      for (const key of extraSorted) {
        const value = x?.[key];
        row.getCell(col).value =
          value === null || value === undefined
            ? ""
            : typeof value === "object"
              ? jsonText(value)
              : text(value);
        col++;
      }

      const invoiceNumbers = rowInvoices
        .map((inv: any) => text(inv?.nomor))
        .filter(Boolean)
        .join("; ");

      const invoiceStatuses = rowInvoices
        .map((inv: any) => text(inv?.status))
        .filter(Boolean)
        .join("; ");

      const itemSummary = rowInvoices
        .flatMap((inv: any) =>
          parseInvoiceItems(inv?.items).map(
            (item: any) =>
              `${text(item?.description ?? item?.uraian ?? item?.nama)} | QTY ${numberValue(
                item?.qty ?? item?.quantity ?? 1,
              )} | ${formatRupiah(
                item?.price ?? item?.harga ?? item?.unitPrice ?? 0,
              )}`,
          ),
        )
        .filter(Boolean)
        .join(" ; ");

      row.getCell(col).value = invoiceNumbers;
      row.getCell(col + 1).value = invoiceStatuses;
      row.getCell(col + 2).value = itemSummary;

      row.eachCell((cell) => {
        cell.alignment = {
          horizontal: "left",
          vertical: "top",
          wrapText: true,
        };
      });

      row.height = 54;
    });

    allInputSheet.views = [
      {
        state: "frozen",
        ySplit: 1,
      },
    ];

    for (
      let i = 1;
      i <= inputHeaders.length;
      i++
    ) {
      allInputSheet.getColumn(i).width = 24;
    }

    /*
     * =====================================================
     * SHEET 3: DETAIL TAGIHAN / INVOICE
     * =====================================================
     */
    const tagihanSheet =
      workbook.addWorksheet("DETAIL TAGIHAN");

    const tagihanHeaders = [
      "NO",
      "KATEGORI",
      "NOMOR AKTA",
      "NOMOR INVOICE",
      "TANGGAL INVOICE",
      "STATUS INVOICE",
      "URAIAN",
      "QTY",
      "HARGA",
      "JUMLAH",
      "PELANGGAN",
      "NAMA NOTARIS / PPAT",
    ];

    tagihanHeaders.forEach((header, index) => {
      const cell =
        tagihanSheet.getCell(1, index + 1);

      cell.value = header;
      cell.font = { bold: true };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
    });

    let tagihanRow = 2;

    /*
     * Utamakan invoice yang terkait dengan Akta.
     * Jika satu Akta punya lebih dari satu invoice,
     * semua invoice dan semua item ikut ditulis.
     */
    for (const [index, x] of (
      data as any[]
    ).entries()) {
      const rowInvoices = invoicesForAkta(x);

      if (rowInvoices.length === 0) {
        continue;
      }

      for (const invoice of rowInvoices) {
        const items = parseInvoiceItems(
          invoice?.items,
        );

        const common = [
          index + 1,
          text(x?.kategori),
          text(x?.nomorAkta),
          text(invoice?.nomor),
          formatDate(invoice?.tanggal),
          text(invoice?.status),
        ];

        if (items.length === 0) {
          for (let i = 0; i < common.length; i++) {
            tagihanSheet.getCell(
              tagihanRow,
              i + 1,
            ).value = common[i];
          }

          tagihanSheet.getCell(
            tagihanRow,
            7,
          ).value = "Invoice tanpa item";

          tagihanSheet.getCell(
            tagihanRow,
            8,
          ).value = 1;

          tagihanSheet.getCell(
            tagihanRow,
            9,
          ).value = formatRupiah(
            invoice?.nilaiTransaksi ??
              0,
          );

          tagihanSheet.getCell(
            tagihanRow,
            10,
          ).value = formatRupiah(
            invoice?.nilaiTransaksi ??
              0,
          );

          tagihanSheet.getCell(
            tagihanRow,
            11,
          ).value = text(
            invoice?.pelanggan,
          );

          tagihanSheet.getCell(
            tagihanRow,
            12,
          ).value = text(
            x?.namaNotaris,
          );

          tagihanRow++;
          continue;
        }

        for (const item of items) {
          const qty = numberValue(
            item?.qty ??
              item?.quantity ??
              1,
          );

          const harga = numberValue(
            item?.price ??
              item?.harga ??
              item?.unitPrice ??
              0,
          );

          const jumlah = numberValue(
            item?.amount ??
              item?.jumlah ??
              qty * harga,
          );

          for (let i = 0; i < common.length; i++) {
            tagihanSheet.getCell(
              tagihanRow,
              i + 1,
            ).value = common[i];
          }

          tagihanSheet.getCell(
            tagihanRow,
            7,
          ).value = text(
            item?.description ??
              item?.uraian ??
              item?.nama,
          );

          tagihanSheet.getCell(
            tagihanRow,
            8,
          ).value = qty;

          tagihanSheet.getCell(
            tagihanRow,
            9,
          ).value = formatRupiah(harga);

          tagihanSheet.getCell(
            tagihanRow,
            10,
          ).value = formatRupiah(jumlah);

          tagihanSheet.getCell(
            tagihanRow,
            11,
          ).value = text(
            invoice?.pelanggan,
          );

          tagihanSheet.getCell(
            tagihanRow,
            12,
          ).value = text(
            x?.namaNotaris,
          );

          tagihanRow++;
        }
      }
    }

    tagihanSheet.getColumn(1).width = 8;
    tagihanSheet.getColumn(2).width = 14;
    tagihanSheet.getColumn(3).width = 24;
    tagihanSheet.getColumn(4).width = 24;
    tagihanSheet.getColumn(5).width = 15;
    tagihanSheet.getColumn(6).width = 18;
    tagihanSheet.getColumn(7).width = 48;
    tagihanSheet.getColumn(8).width = 10;
    tagihanSheet.getColumn(9).width = 20;
    tagihanSheet.getColumn(10).width = 20;
    tagihanSheet.getColumn(11).width = 28;
    tagihanSheet.getColumn(12).width = 30;

    for (let row = 1; row < tagihanRow; row++) {
      tagihanSheet.getRow(row).eachCell((cell) => {
        cell.alignment = {
          horizontal: "left",
          vertical: "top",
          wrapText: true,
        };
      });
    }

    tagihanSheet.views = [
      {
        state: "frozen",
        ySplit: 1,
      },
    ];
    /*
     * PAGE SETUP
     */
    worksheet.pageSetup.orientation = "landscape";
    worksheet.pageSetup.fitToPage = true;
    worksheet.pageSetup.fitToWidth = 1;
    worksheet.pageSetup.fitToHeight = 0;
    worksheet.pageSetup.paperSize = 9;

    worksheet.pageSetup.margins = {
      left: 0.2,
      right: 0.2,
      top: 0.3,
      bottom: 0.3,
      header: 0.1,
      footer: 0.1,
    };

    worksheet.pageSetup.printArea =
      `A1:T${footerRow + 5}`;

    worksheet.views = [
      {
        state: "frozen",
        ySplit: 17,
      },
    ];

    /*
     * Tulis Excel
     */
    const buffer =
      await workbook.xlsx.writeBuffer();

    const filename =
      `LAPORAN-${cat}-${tahun}-${String(bulan).padStart(
        2,
        "0",
      )}-${Date.now()}.xlsx`;

    return new NextResponse(
      new Uint8Array(buffer),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition":
            `attachment; filename="${filename}"`,
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error) {
    console.error("[EXPORT ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal membuat Excel",
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    );
  }
}


