import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { listInvoices, saveInvoices } from "@/lib/invoice-store";
import type { Invoice, InvoiceItem } from "@/lib/invoice";

const str = (v: unknown) => String(v ?? "");
const num = (v: unknown) => Number(v || 0);
const cleanItems = (v: unknown): InvoiceItem[] => Array.isArray(v)
  ? v.map((x: any) => ({ description: str(x?.description).trim(), qty: Math.max(0, num(x?.qty)), price: Math.max(0, num(x?.price)) })).filter(x => x.description)
  : [];

async function nextNumber() {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const all = await listInvoices();
  const prefix = `INV-${year}${month}-`;
  const seq = all.map(x => x.nomor).filter(x => x.startsWith(prefix)).map(x => Number(x.slice(prefix.length))).filter(Number.isFinite);
  return `${prefix}${String((seq.length ? Math.max(...seq) : 0) + 1).padStart(4, "0")}`;
}

function normalize(body: any, id?: string): Invoice {
  return {
    id: id || randomUUID(), nomor: str(body.nomor), tanggal: str(body.tanggal), jatuhTempo: str(body.jatuhTempo),
    aktaId: str(body.aktaId) || undefined, nomorAkta: str(body.nomorAkta), jenisAkta: str(body.jenisAkta), kategori: str(body.kategori),
    namaNotaris: str(body.namaNotaris) || "APRIANI, S.H., M.Kn.",
    pelanggan: str(body.pelanggan), alamat: str(body.alamat), nik: str(body.nik), items: cleanItems(body.items),
    nilaiTransaksi: Math.max(0, num(body.nilaiTransaksi)), njop: Math.max(0, num(body.njop)),
    sspPph: Math.max(0, num(body.sspPph)), sspdBphtb: Math.max(0, num(body.sspdBphtb)),
    diskon: Math.max(0, num(body.diskon)), ppnPersen: Math.max(0, num(body.ppnPersen)), ppn: Math.max(0, num(body.ppn)),
    status: body.status === "Lunas" || body.status === "Sebagian" ? body.status : "Belum Lunas",
    catatan: str(body.catatan), metodePembayaran: str(body.metodePembayaran), createdAt: body.createdAt || new Date().toISOString()
  };
}

export async function GET() { return NextResponse.json(await listInvoices()); }

export async function POST(req: Request) {
  const body = await req.json();
  const data = await listInvoices();
  const a = normalize(body);
  if (!a.nomor) a.nomor = await nextNumber();
  if (!a.tanggal || !a.pelanggan || !a.items.length) return NextResponse.json({ error: "Tanggal, pelanggan, dan minimal satu item tagihan wajib diisi." }, { status: 400 });
  data.unshift(a);
  await saveInvoices(data);
  return NextResponse.json({ id: a.id, nomor: a.nomor }, { status: 201 });
}

export async function PUT(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID wajib" }, { status: 400 });
  const data = await listInvoices();
  const i = data.findIndex(x => x.id === id);
  if (i < 0) return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 });
  const a = normalize(await req.json(), id);
  if (!a.nomor) a.nomor = data[i].nomor;
  data[i] = a;
  await saveInvoices(data);
  return NextResponse.json({ id: a.id, nomor: a.nomor });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const data = await listInvoices();
  await saveInvoices(data.filter(x => x.id !== id));
  return NextResponse.json({ ok: true });
}
