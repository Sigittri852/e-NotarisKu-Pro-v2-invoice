import { rupiah } from "@/lib/constants";
import type { Invoice } from "@/lib/invoice";

export const OFFICE = {
  address: "Perumahan Puri Kosambi 1 Blok N Nomor 8, Klari - Karawang, Jawa Barat 41371",
  phone: "(0267) 8642922, (0813) 388958126",
  email: "sitorusapriani@gmail.com",
};

export function displayDate(value?: string) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function displayNotaris(value?: string) {
  const name = (value || "APRIANI, S.H., M.Kn.").trim();
  return name.toUpperCase().startsWith("PPAT ") ? name.slice(5) : name;
}

export function getInvoiceAssetUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  return new URL(path, base).toString();
}

export function getInvoiceSummary(invoice: Invoice) {
  const subtotal =
    invoice.items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0) +
    (Number(invoice.sspPph) || 0) +
    (Number(invoice.sspdBphtb) || 0);

  const ppn = Number(invoice.ppnPersen) > 0
    ? Math.round((subtotal * Number(invoice.ppnPersen)) / 100)
    : Number(invoice.ppn) || 0;

  const total = Math.max(0, subtotal - (Number(invoice.diskon) || 0)) + ppn;
  const rows = invoice.items.map((item, index) => ({
    no: index + 1,
    description: item.description,
    qty: Number(item.qty) || 0,
    price: Number(item.price) || 0,
    amount: (Number(item.qty) || 0) * (Number(item.price) || 0),
  }));

  let rowNo = rows.length;
  if ((Number(invoice.sspPph) || 0) > 0) {
    rowNo += 1;
    rows.push({
      no: rowNo,
      description: "Pajak SSP (PPh)",
      qty: 1,
      price: Number(invoice.sspPph) || 0,
      amount: Number(invoice.sspPph) || 0,
    });
  }
  if ((Number(invoice.sspdBphtb) || 0) > 0) {
    rowNo += 1;
    rows.push({
      no: rowNo,
      description: "Pajak SSPD (BPHTB)",
      qty: 1,
      price: Number(invoice.sspdBphtb) || 0,
      amount: Number(invoice.sspdBphtb) || 0,
    });
  }

  return {
    office: OFFICE,
    namaPejabat: displayNotaris(invoice.namaNotaris),
    subtotal,
    ppn,
    total,
    rows,
    hasPajak:
      (Number(invoice.nilaiTransaksi) || 0) > 0 ||
      (Number(invoice.njop) || 0) > 0 ||
      (Number(invoice.sspPph) || 0) > 0 ||
      (Number(invoice.sspdBphtb) || 0) > 0,
    issueDate: displayDate(invoice.tanggal),
    dueDate: displayDate(invoice.jatuhTempo),
    rupiah: (value: number) => rupiah(value),
  };
}
