import { NextResponse } from "next/server";
import { getInvoice } from "@/lib/invoice-store";
import { invoiceSubtotal, invoicePpn, invoiceTotal } from "@/lib/invoice";
import { rupiah } from "@/lib/constants";
import { OFFICE, displayDate, displayNotaris } from "@/lib/invoice-template";

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const x = await getInvoice(id);
  if (!x) return new NextResponse("Invoice tidak ditemukan", { status: 404 });

  const getLogoDataUrl = async (path: string) => {
    const assetUrl = new URL(path, request.url).toString();
    const res = await fetch(assetUrl);
    if (!res.ok) throw new Error(`Gagal memuat asset ${path}`);
    const svg = await res.text();
    const match = svg.match(/<image[^>]+href="data:image\/png;base64,([^"]+)"/);
    if (!match) throw new Error(`Format asset tidak didukung ${path}`);
    return `data:image/png;base64,${match[1]}`;
  };

  const logoIni = await getLogoDataUrl("/logo-ini.svg");
  const logoIppat = await getLogoDataUrl("/logo-ippat.svg");

  const subtotal = invoiceSubtotal(x);
  const ppnNominal = invoicePpn(x);
  const total = invoiceTotal(x);
  const namaPejabat = displayNotaris(x.namaNotaris);
  let rows = x.items
    .map(
      (it, i) =>
        `<tr><td>${i + 1}</td><td>${esc(it.description || "-")}</td><td style="text-align:center">${it.qty}</td><td style="text-align:right">${rupiah(it.price)}</td><td style="text-align:right">${rupiah((it.qty || 0) * (it.price || 0))}</td></tr>`
    )
    .join("");

  let nomorBaris = x.items.length;
  if ((x.sspPph || 0) > 0) {
    nomorBaris += 1;
    rows += `<tr><td>${nomorBaris}</td><td>Pajak SSP (PPh)</td><td style="text-align:center">1</td><td style="text-align:right">${rupiah(x.sspPph || 0)}</td><td style="text-align:right">${rupiah(x.sspPph || 0)}</td></tr>`;
  }
  if ((x.sspdBphtb || 0) > 0) {
    nomorBaris += 1;
    rows += `<tr><td>${nomorBaris}</td><td>Pajak SSPD (BPHTB)</td><td style="text-align:center">1</td><td style="text-align:right">${rupiah(x.sspdBphtb || 0)}</td><td style="text-align:right">${rupiah(x.sspdBphtb || 0)}</td></tr>`;
  }

  const adaDataPajak =
    (x.nilaiTransaksi || 0) > 0 ||
    (x.njop || 0) > 0 ||
    (x.sspPph || 0) > 0 ||
    (x.sspdBphtb || 0) > 0;

  const pajakBlock = adaDataPajak
    ? `<table style="width:100%;border-collapse:collapse;margin:18px 0 12px;border:1px solid #dfeaf8"><tr><th style="padding:8px;border:1px solid #dfeaf8;background:#edf5ff">Nilai Transaksi</th><th style="padding:8px;border:1px solid #dfeaf8;background:#edf5ff">NJOP PBB</th><th style="padding:8px;border:1px solid #dfeaf8;background:#edf5ff">SSP PPh</th><th style="padding:8px;border:1px solid #dfeaf8;background:#edf5ff">SSPD BPHTB</th></tr><tr><td style="padding:8px;border:1px solid #dfeaf8;text-align:right">${rupiah(x.nilaiTransaksi || 0)}</td><td style="padding:8px;border:1px solid #dfeaf8;text-align:right">${rupiah(x.njop || 0)}</td><td style="padding:8px;border:1px solid #dfeaf8;text-align:right">${rupiah(x.sspPph || 0)}</td><td style="padding:8px;border:1px solid #dfeaf8;text-align:right">${rupiah(x.sspdBphtb || 0)}</td></tr></table>`
    : "";

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(x.nomor)}</title><style>
    @page { size: A4; margin: 24mm; }
    body { font-family: Arial, sans-serif; color: #142a45; margin: 0; }
    .page { width: 100%; min-height: 100%; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #075de5; padding-bottom: 16px; margin-bottom: 18px; }
    .logos { display: flex; gap: 12px; align-items: center; }
    .logo { width: 54px; height: 54px; object-fit: contain; }
    .office { flex: 1; }
    .title { font-size: 20px; font-weight: 700; color: #0b2344; margin-top: 4px; }
    .name { font-size: 16px; font-weight: 700; color: #0b2344; margin: 6px 0 4px; }
    .contact { font-size: 11px; color: #3b4f69; line-height: 1.5; }
    .invoice-number { text-align: right; min-width: 170px; }
    .invoice-number .label { color: #516982; font-size: 10px; text-transform: uppercase; display: block; }
    .invoice-number .value { display: block; font-size: 12px; font-weight: 700; margin: 4px 0 10px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 18px; }
    .meta-box { display: flex; flex-direction: column; }
    .meta-label { color: #536a88; font-size: 10px; font-weight: 700; letter-spacing: 0.7px; text-transform: uppercase; margin-bottom: 8px; }
    .meta-value { font-size: 16px; font-weight: 700; color: #0b2344; margin-bottom: 4px; }
    .meta-small { font-size: 12px; color: #2f455e; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #dfeaf8; padding: 9px 8px; vertical-align: top; }
    th { background: #0d5ad7; color: white; text-align: left; font-size: 11px; }
    td { font-size: 12px; }
    .totals { width: 46%; margin-left: auto; border-collapse: collapse; margin-top: 18px; }
    .totals td { border: 0; padding: 6px 0; font-size: 12px; }
    .totals .grand { font-size: 18px; font-weight: 700; color: #0b2344; }
    .note { margin-top: 18px; font-size: 12px; }
    .note strong { display: block; margin-bottom: 6px; }
    .thanks { margin-top: 24px; font-size: 12px; }
    .signature { text-align: right; margin-top: 24px; font-size: 12px; }
    .signature .line { width: 160px; margin: 50px 0 8px auto; border-top: 1px solid #0b2344; }
  </style></head><body><div class="page"><div class="header"><div style="display:flex;align-items:flex-start;gap:12px;"><div class="logos"><img class="logo" src="/logo-ini.svg" alt="Logo INI" /><img class="logo" src="/logo-ippat.svg" alt="Logo IPPAT" /></div><div class="office"><div class="title">KANTOR NOTARIS</div><div class="name">PPAT ${esc(namaPejabat)}</div><div class="contact">${esc(OFFICE.address)}<br>Telepon: ${esc(OFFICE.phone)}<br>Email: ${esc(OFFICE.email)}</div></div></div><div class="invoice-number"><span class="label">No. Invoice</span><span class="value">${esc(x.nomor)}</span><span class="label">Tanggal</span><span class="value">${esc(displayDate(x.tanggal))}</span><span class="label">Jatuh Tempo</span><span class="value">${esc(displayDate(x.jatuhTempo))}</span></div></div><div class="meta"><div class="meta-box"><div class="meta-label">Ditagihkan kepada</div><div class="meta-value">${esc(x.pelanggan || "-")}</div><div class="meta-small">${esc(x.nik || "-")}</div><div class="meta-small">${esc(x.alamat || "-")}</div></div><div class="meta-box"><div class="meta-label">Referensi Akta</div><div class="meta-value">${esc(x.nomorAkta || "-")}</div><div class="meta-small">${esc(x.jenisAkta || "-")}</div><div class="meta-small">${esc(x.kategori || "NOTARIS / PPAT")}</div></div></div>${pajakBlock}<table><thead><tr><th style="width:40px">No</th><th>Uraian</th><th style="width:64px;text-align:center">Qty</th><th style="width:120px;text-align:right">Harga</th><th style="width:120px;text-align:right">Jumlah</th></tr></thead><tbody>${rows}</tbody></table><table class="totals"><tr><td>Subtotal</td><td style="text-align:right">${rupiah(subtotal)}</td></tr><tr><td>Diskon</td><td style="text-align:right">- ${rupiah(x.diskon)}</td></tr><tr><td>PPN (${x.ppnPersen || 0}%)</td><td style="text-align:right">${rupiah(ppnNominal)}</td></tr><tr><td colspan="2"><div style="border-top:2px solid #0d5ad7;margin:8px 0 6px"></div></td></tr><tr class="grand"><td>TOTAL</td><td style="text-align:right">${rupiah(total)}</td></tr></table><div class="note"><strong>Catatan</strong>${esc(x.catatan || "Terima kasih atas kepercayaan Anda.")}</div><div class="note"><strong>Metode Pembayaran</strong>${esc(x.metodePembayaran || "-")}</div><div class="signature"><div>Hormat kami,</div><div class="line"></div><div><strong>${esc(namaPejabat)}</strong></div><div>Notaris &amp; PPAT</div></div></div></body></html>`;

  const htmlWithEmbeddedLogos = html
    .replace('src="/logo-ini.svg"', `src="${logoIni}" width="54" height="54" style="width:54px;height:54px;"`)
    .replace('src="/logo-ippat.svg"', `src="${logoIppat}" width="54" height="54" style="width:54px;height:54px;"`)
    .replace('<div class="signature">', '<div class="thanks">Terima kasih atas kepercayaan Anda.</div><div class="signature">');

  return new NextResponse(htmlWithEmbeddedLogos, {
    headers: {
      "Content-Type": "application/msword; charset=utf-8",
      "Content-Disposition": `attachment; filename="${x.nomor.replace(/[^a-zA-Z0-9_-]/g, "_")}.doc"`,
    },
  });
}

