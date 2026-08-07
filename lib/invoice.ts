export type InvoiceItem = {
  description: string;
  qty: number;
  price: number;
};

export type Invoice = {
  id: string;
  nomor: string;
  tanggal: string;
  jatuhTempo: string;
  aktaId?: string;
  nomorAkta?: string;
  jenisAkta?: string;
  kategori?: string;
  namaNotaris?: string;
  pelanggan: string;
  alamat?: string;
  nik?: string;
  items: InvoiceItem[];
  /** Data objek & pajak akta (khusus Notaris/PPAT) — bersifat referensi & dapat ditambahkan ke rincian tagihan. */
  nilaiTransaksi?: number;
  njop?: number;
  sspPph?: number;
  sspdBphtb?: number;
  diskon: number;
  /** Persentase PPN, mis. 11 untuk 11%. Jika diisi, nominal PPN dihitung otomatis dari subtotal. */
  ppnPersen?: number;
  ppn: number;
  status: "Belum Lunas" | "Sebagian" | "Lunas";
  catatan?: string;
  metodePembayaran?: string;
  createdAt: string;
};

export function invoiceSubtotal(invoice: Pick<Invoice, "items" | "sspPph" | "sspdBphtb">) {
  const itemsTotal = invoice.items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);
  return itemsTotal + (Number(invoice.sspPph) || 0) + (Number(invoice.sspdBphtb) || 0);
}

/** Menghitung nominal PPN: memakai persentase (dari subtotal) jika tersedia, jika tidak memakai nominal PPN tersimpan. */
export function invoicePpn(invoice: Pick<Invoice, "items" | "sspPph" | "sspdBphtb" | "ppnPersen" | "ppn">) {
  const persen = Number(invoice.ppnPersen) || 0;
  if (persen > 0) {
    const subtotal = invoiceSubtotal(invoice);
    return Math.round((subtotal * persen) / 100);
  }
  return Number(invoice.ppn) || 0;
}

export function invoiceTotal(invoice: Pick<Invoice, "items" | "sspPph" | "sspdBphtb" | "diskon" | "ppn" | "ppnPersen">) {
  const subtotal = invoiceSubtotal(invoice);
  const ppn = invoicePpn(invoice);
  return Math.max(0, subtotal - (Number(invoice.diskon) || 0)) + ppn;
}

