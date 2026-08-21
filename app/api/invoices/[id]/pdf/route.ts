import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { getInvoice } from "@/lib/invoice-store";
import { invoiceSubtotal, invoicePpn, invoiceTotal } from "@/lib/invoice";
import { rupiah } from "@/lib/constants";
import { OFFICE, displayDate, displayNotaris } from "@/lib/invoice-template";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const x = await getInvoice(id);
  if (!x) return new NextResponse("Invoice tidak ditemukan", { status: 404 });

  const subtotal = invoiceSubtotal(x);
  const ppnNominal = invoicePpn(x);
  const total = invoiceTotal(x);
  const namaPejabat = displayNotaris(x.namaNotaris);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  let y = 36;
  const logoSize = 52;
  const logoGap = 14;
  const leftLogoX = margin + 8;
  const secondLogoX = leftLogoX + logoSize + logoGap;

  const getAssetPng = async (path: string) => {
    const assetUrl = new URL(path, _.url).toString();
    const res = await fetch(assetUrl);
    if (!res.ok) throw new Error(`Gagal memuat asset ${path}`);
    const svg = await res.text();
    const match = svg.match(/<image[^>]+href="data:image\/png;base64,([^"]+)"/);
    if (!match) throw new Error(`Format asset tidak didukung ${path}`);
    return `data:image/png;base64,${match[1]}`;
  };

  const addLogo = async (src: string, x: number, yPos: number, size: number) => {
    try {
      const pngData = await getAssetPng(src);
      doc.addImage(pngData, "PNG", x, yPos, size, size);
    } catch {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, yPos, size, size, 8, 8, "F");
      doc.setTextColor(19, 38, 75);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(src.includes("ippat") ? "IPPAT" : "INI", x + size / 2, yPos + size / 2 + 2, { align: "center" });
    }
  };

  await addLogo("/logo-ini.svg", leftLogoX, y + 3, logoSize);
  await addLogo("/logo-ippat.svg", secondLogoX, y + 3, logoSize);

  const officeX = margin + 160;
  doc.setTextColor(19, 38, 75);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.text("KANTOR NOTARIS", officeX, y + 24);
  doc.setFontSize(18);
  doc.text(`PPAT ${namaPejabat}`, officeX, y + 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(39, 55, 83);
  const addressLines = doc.splitTextToSize(OFFICE.address, 330);
  doc.text(addressLines, officeX, y + 62);
  let contactY = y + 62 + addressLines.length * 10;
  doc.text(`Telepon: ${OFFICE.phone}`, officeX, contactY);
  doc.text(`Email: ${OFFICE.email}`, officeX, contactY + 12);

  const rightX = pageWidth - margin + 2;
  let ry = y + 8;
  const rightRow = (label: string, value: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(53, 82, 126);
    doc.text(label, rightX, ry, { align: "right" });
    ry += 13;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(19, 38, 75);
    doc.text(value || "-", rightX, ry, { align: "right" });
    ry += 18;
  };
  rightRow("NO. INVOICE", x.nomor);
  rightRow("TANGGAL", displayDate(x.tanggal));
  rightRow("JATUH TEMPO", displayDate(x.jatuhTempo));

  y = Math.max(contactY + 18, ry + 8);
  doc.setDrawColor(7, 93, 229);
  doc.setLineWidth(2.2);
  doc.line(margin, y, rightX, y);

  y += 26;
  const half = contentWidth / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(53, 82, 126);
  doc.text("DITAGIHKAN KEPADA", margin, y);
  doc.text("REFERENSI AKTA", margin + half, y);

  y += 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(19, 38, 75);
  doc.text(x.pelanggan || "-", margin, y);
  doc.text(x.nomorAkta || "-", margin + half, y);

  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(39, 55, 83);
  doc.text(x.nik || "-", margin, y);
  doc.text(x.jenisAkta || "-", margin + half, y);
  y += 14;
  doc.text(x.alamat || "-", margin, y);
  doc.text(x.kategori || "NOTARIS / PPAT", margin + half, y);

  const adaDataPajak =
    (x.nilaiTransaksi || 0) > 0 ||
    (x.njop || 0) > 0 ||
    (x.sspPph || 0) > 0 ||
    (x.sspdBphtb || 0) > 0;

  if (adaDataPajak) {
    y += 20;
    doc.setFillColor(245, 248, 253);
    doc.roundedRect(margin, y, contentWidth, 48, 6, 6, "F");
    const w = contentWidth / 4;
    const refRow = (i: number, label: string, value: number) => {
      const cx = margin + 14 + i * w;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(53, 82, 126);
      doc.text(label, cx, y + 16);
      doc.setFontSize(10.5);
      doc.setTextColor(19, 38, 75);
      doc.text(rupiah(value), cx, y + 33);
    };
    refRow(0, "NILAI TRANSAKSI", x.nilaiTransaksi || 0);
    refRow(1, "NJOP PBB", x.njop || 0);
    refRow(2, "SSP PPh", x.sspPph || 0);
    refRow(3, "SSPD BPHTB", x.sspdBphtb || 0);
    y += 52;
  }

  y += 18;
  const tableX = margin;
  const tableW = contentWidth;
  const rowH = 24;
  doc.setFillColor(7, 93, 229);
  doc.rect(tableX, y, tableW, rowH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("NO", tableX + 10, y + 16);
  doc.text("URAIAN", tableX + 50, y + 16);
  doc.text("QTY", tableX + tableW - 178, y + 16, { align: "right" });
  doc.text("HARGA", tableX + tableW - 112, y + 16, { align: "right" });
  doc.text("JUMLAH", tableX + tableW - 25, y + 16, { align: "right" });
  y += rowH;

  const drawRow = (no: number, description: string, qty: number, price: number) => {
    doc.setTextColor(19, 38, 75);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(String(no), tableX + 10, y + 16);
    const desc = doc.splitTextToSize(description || "-", tableW - 240);
    doc.text(desc.slice(0, 2), tableX + 50, y + 16);
    doc.text(String(qty), tableX + tableW - 178, y + 16, { align: "right" });
    doc.text(rupiah(price), tableX + tableW - 112, y + 16, { align: "right" });
    doc.text(rupiah((qty || 0) * (price || 0)), tableX + tableW - 25, y + 16, { align: "right" });
    doc.setDrawColor(219, 229, 242);
    doc.line(tableX, y + rowH, tableX + tableW, y + rowH);
    y += rowH;
  };

  x.items.forEach((it, i) => drawRow(i + 1, it.description, it.qty, it.price));
  let no = x.items.length;
  if ((x.sspPph || 0) > 0) {
    no += 1;
    drawRow(no, "Pajak SSP (PPh)", 1, x.sspPph || 0);
  }
  if ((x.sspdBphtb || 0) > 0) {
    no += 1;
    drawRow(no, "Pajak SSPD (BPHTB)", 1, x.sspdBphtb || 0);
  }

  y += 18;
  const totalsX = margin + 280;
  let ty = y;
  const totalLine = (label: string, value: string, big = false) => {
    doc.setFont("helvetica", big ? "bold" : "normal");
    doc.setFontSize(big ? 15 : 9.5);
    doc.setTextColor(19, 38, 75);
    doc.text(label, totalsX, ty);
    doc.text(value, rightX, ty, { align: "right" });
    ty += big ? 22 : 16;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(7, 93, 229);
  doc.text("CATATAN", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(39, 55, 83);
  const noteLines = doc.splitTextToSize(x.catatan || "Terima kasih atas kepercayaan Anda.", 200);
  doc.text(noteLines, margin, y + 14);
  doc.setFont("helvetica", "bold");
  doc.text("METODE PEMBAYARAN", margin, y + 42 + noteLines.length * 10);
  doc.setFont("helvetica", "normal");
  doc.text(x.metodePembayaran || "-", margin, y + 56 + noteLines.length * 10);

  totalLine("SUBTOTAL", rupiah(subtotal));
  totalLine("DISKON", "- " + rupiah(x.diskon));
  totalLine(`PPN (${x.ppnPersen || 0}%)`, rupiah(ppnNominal));
  doc.setDrawColor(7, 93, 229);
  doc.setLineWidth(1.3);
  doc.line(totalsX, ty, rightX, ty);
  ty += 18;
  totalLine("TOTAL", rupiah(total), true);

  const footerY = Math.min(pageHeight - 58, Math.max(ty + 55, pageHeight - 90));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(39, 55, 83);
  doc.text("Terima kasih atas kepercayaan Anda.", margin, footerY);
  doc.text("Hormat kami,", rightX, footerY - 28, { align: "right" });
  doc.setDrawColor(19, 38, 75);
  doc.setLineWidth(0.8);
  doc.line(rightX - 170, footerY + 3, rightX, footerY + 3);
  doc.setFont("helvetica", "bold");
  doc.text(namaPejabat, rightX, footerY + 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text("Notaris & PPAT", rightX, footerY + 31, { align: "right" });

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  const filename = `Invoice_${(x.nomor || "invoice").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
