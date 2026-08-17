import { prisma } from "./prisma";
import type {
  Akta,
  Dokumen,
  PihakAkta,
  TandaTanganDigital,
} from "./types";

type StoredDocs = {
  dokumen: Dokumen[];
  fotoTtdKlien: Dokumen[];
  fotoTtdNotaris: Dokumen[];
  minuta: Dokumen[];
  tandaTanganDigital: TandaTanganDigital[];
};

const parse = <T>(
  value: string | null | undefined,
  fallback: T,
): T => {
  try {
    return value
      ? (JSON.parse(value) as T)
      : fallback;
  } catch {
    return fallback;
  }
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function readDocs(
  value: string | null | undefined,
): StoredDocs {
  const parsed: any = parse<any>(value, []);

  if (Array.isArray(parsed)) {
    return {
      dokumen: parsed,
      fotoTtdKlien: [],
      fotoTtdNotaris: [],
      minuta: [],
      tandaTanganDigital: [],
    };
  }

  return {
    dokumen: Array.isArray(parsed?.dokumen)
      ? parsed.dokumen
      : [],
    fotoTtdKlien: Array.isArray(
      parsed?.fotoTtdKlien,
    )
      ? parsed.fotoTtdKlien
      : [],
    fotoTtdNotaris: Array.isArray(
      parsed?.fotoTtdNotaris,
    )
      ? parsed.fotoTtdNotaris
      : [],
    minuta: Array.isArray(parsed?.minuta)
      ? parsed.minuta
      : [],
    tandaTanganDigital: Array.isArray(
      parsed?.tandaTanganDigital,
    )
      ? parsed.tandaTanganDigital
      : [],
  };
}

function fromDb(x: any): Akta {
  const pihak = parse<PihakAkta[]>(
    x.pihakJson,
    [],
  );

  const docs = readDocs(x.dokumenJson);

  return {
    id: x.id,
    nomorAkta: x.nomorAkta,
    // PostgreSQL production menyimpan tanggal sebagai text.
    // Pertahankan format YYYY-MM-DD apa adanya.
    tanggal: text(x.tanggal),
    kategori:
      x.kategori === "PPAT"
        ? "PPAT"
        : "NOTARIS",
    jenisAkta: x.jenisAkta,
    namaNotaris: x.namaNotaris,
    pihak,
    namaPihak:
      x.namaPihak ||
      pihak
        .map((p) => p.nama)
        .filter(Boolean)
        .join("; "),
    nik:
      x.nik ||
      pihak
        .map((p) => p.nik)
        .filter(Boolean)
        .join("; "),
    npwp:
      x.npwp ||
      pihak
        .map((p) => p.npwp)
        .filter(Boolean)
        .join("; "),
    alamat: x.alamat || "",
    nomorSertifikat:
      x.nomorSertifikat || "",
    jenisHak: x.jenisHak || "",
    luasTanah:
      x.luasTanah == null
        ? ""
        : String(x.luasTanah),
    nilaiTransaksi: Number(
      x.nilaiTransaksi || 0,
    ),
    nopPbb: x.nopPbb || "",
    njop: Number(x.njop || 0),
    tanggalSsp: text(x.tanggalSsp),
    sspPph: Number(x.sspPph || 0),
    tanggalBphtb: text(x.tanggalBphtb),
    bphtb: Number(x.bphtb || 0),
    honorarium: Number(
      x.honorarium || 0,
    ),
    status: x.status || "Draft",
    catatan: x.catatan || "",
    detail: parse<Record<string, any>>(
      x.detailJson,
      {},
    ),
    ...docs,
  };
}

export async function listAkta(): Promise<Akta[]> {
  const rows = await prisma.akta.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return rows.map(fromDb);
}

export async function getAkta(id: string) {
  const row = await prisma.akta.findUnique({
    where: { id },
  });

  return row
    ? fromDb(row)
    : undefined;
}

export async function upsertAkta(
  a: Akta,
) {
  const dokumenJson = JSON.stringify({
    dokumen: a.dokumen || [],
    fotoTtdKlien:
      a.fotoTtdKlien || [],
    fotoTtdNotaris:
      a.fotoTtdNotaris || [],
    minuta: a.minuta || [],
    tandaTanganDigital:
      a.tandaTanganDigital || [],
  });

  const data = {
    nomorAkta: text(a.nomorAkta),

    // Database menyimpan tanggal sebagai String.
    tanggal: text(a.tanggal),

    kategori:
      a.kategori === "PPAT"
        ? "PPAT"
        : "NOTARIS",

    jenisAkta: text(a.jenisAkta),
    namaNotaris: text(
      a.namaNotaris,
    ),
    namaPihak: text(a.namaPihak),

    nik: text(a.nik) || null,
    npwp: text(a.npwp) || null,
    alamat: text(a.alamat) || null,

    nomorSertifikat:
      text(a.nomorSertifikat) ||
      null,

    jenisHak:
      text(a.jenisHak) || null,

    luasTanah:
      text(a.luasTanah)
        ? Number(a.luasTanah)
        : null,

    nilaiTransaksi: Number(
      a.nilaiTransaksi || 0,
    ),

    nopPbb:
      text(a.nopPbb) || null,

    njop: Number(a.njop || 0),

    tanggalSsp:
      text(a.tanggalSsp) ||
      null,

    sspPph: Number(
      a.sspPph || 0,
    ),

    tanggalBphtb:
      text(a.tanggalBphtb) ||
      null,

    bphtb: Number(a.bphtb || 0),

    honorarium: Number(
      a.honorarium || 0,
    ),

    status:
      text(a.status) || "Draft",

    catatan:
      text(a.catatan) || null,

    detailJson: JSON.stringify(
      a.detail || {},
    ),

    pihakJson: JSON.stringify(
      a.pihak || [],
    ),

    dokumenJson,
  };

  return prisma.akta.upsert({
    where: {
      id: a.id,
    },
    create: {
      id: a.id,
      ...data,
    },
    update: data,
  });
}

export async function saveAkta(
  data: Akta[],
) {
  const existing =
    await prisma.akta.findMany({
      select: {
        id: true,
      },
    });

  const wanted = new Set(
    data.map((x) => x.id),
  );

  const remove = existing
    .filter(
      (x) => !wanted.has(x.id),
    )
    .map((x) => x.id);

  if (remove.length) {
    await prisma.akta.deleteMany({
      where: {
        id: {
          in: remove,
        },
      },
    });
  }

  for (const a of data) {
    await upsertAkta(a);
  }
}
