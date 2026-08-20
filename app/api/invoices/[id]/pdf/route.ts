import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { getInvoice } from "@/lib/invoice-store";
import { invoiceSubtotal, invoicePpn, invoiceTotal } from "@/lib/invoice";
import { rupiah } from "@/lib/constants";

const OFFICE = {
  address: "Perumahan Puri Kosambi 1 Blok N Nomor 8, Klari - Karawang, Jawa Barat 41371",
  phone: "(0267) 8642922, (0813) 388958126",
  email: "sitorusapriani@gmail.com",
};

function displayDate(value: string) {
  if (!value) return "-";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function displayNotaris(value?: string) {
  const name = (value || "APRIANI, S.H., M.Kn.").trim();
  return name.toUpperCase().startsWith("PPAT ") ? name.slice(5) : name;
}

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
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = 42;

  // Dua emblem bergaya kop kantor.
  doc.setFillColor(244, 200, 75);
  doc.setDrawColor(19, 38, 75);
  doc.setLineWidth(2);
  doc.circle(margin + 28, y + 27, 25, "FD");
  doc.setFillColor(200, 25, 37);
  doc.circle(margin + 28, y + 27, 19, "F");
  doc.setFillColor(244, 214, 78);
  doc.circle(margin + 28, y + 27, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("INI", margin + 28, y + 29, { align: "center" });

  doc.setFillColor(244, 214, 78);
  doc.setDrawColor(19, 38, 75);
  doc.circle(margin + 88, y + 27, 25, "FD");
  doc.setFillColor(11, 138, 85);
  doc.circle(margin + 88, y + 27, 19, "F");
  doc.setFillColor(247, 247, 240);
  doc.circle(margin + 88, y + 27, 13, "F");
  doc.setTextColor(19, 38, 75);
  doc.setFontSize(6.5);
  doc.text("IPPAT", margin + 88, y + 29, { align: "center" });

  const officeX = margin + 122;
  doc.setTextColor(19, 38, 75);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.text("KANTOR NOTARIS", officeX, y + 20);
  doc.setFontSize(18);
  doc.text(`PPAT ${namaPejabat}`, officeX, y + 44);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(39, 55, 83);
  const addressLines = doc.splitTextToSize(OFFICE.address, 350);
  doc.text(addressLines, officeX, y + 62);
  let contactY = y + 62 + addressLines.length * 10;
  doc.text(`Telepon ${OFFICE.phone}`, officeX, contactY);
  doc.text(`Email : ${OFFICE.email}`, officeX, contactY + 11);

  // Metadata invoice.
  const rightX = pageWidth - margin;
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

  y = Math.max(contactY + 15, ry + 3);
  doc.setDrawColor(7, 93, 229);
  doc.setLineWidth(2.5);
  doc.line(margin, y, rightX, y);

  // Meta.
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
    doc.rect(margin, y, contentWidth, 48, "F");
    const w = contentWidth / 4;
    const refRow = (i: number, label: string, value: number) => {
      const cx = margin + 12 + i * w;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(53, 82, 126);
      doc.text(label, cx, y + 17);
      doc.setFontSize(10.5);
      doc.setTextColor(19, 38, 75);
      doc.text(rupiah(value), cx, y + 34);
    };
    refRow(0, "NILAI TRANSAKSI", x.nilaiTransaksi || 0);
    refRow(1, "NJOP PBB", x.njop || 0);
    refRow(2, "SSP PPh", x.sspPph || 0);
    refRow(3, "SSPD BPHTB", x.sspdBphtb || 0);
    y += 48;
  }

  // Tabel.
  y += 24;
  const tableX = margin;
  const tableW = contentWidth;
  const rowH = 24;
  doc.setFillColor(7, 93, 229);
  doc.rect(tableX, y, tableW, rowH, "F");
  const cols = [0, 34, tableW - 150, tableW - 92, tableW];
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("NO", tableX + 6, y + 16);
  doc.text("URAIAN", tableX + 44, y + 16);
  doc.text("QTY", tableX + cols[2] - 8, y + 16, { align: "right" });
  doc.text("HARGA", tableX + cols[3] - 8, y + 16, { align: "right" });
  doc.text("JUMLAH", tableX + cols[4] - 8, y + 16, { align: "right" });
  y += rowH;

  const drawRow = (no: number, description: string, qty: number, price: number) => {
    doc.setTextColor(19, 38, 75);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(String(no), tableX + 6, y + 16);
    const desc = doc.splitTextToSize(description || "-", tableW - 250);
    doc.text(desc.slice(0, 2), tableX + 44, y + 16);
    doc.text(String(qty), tableX + cols[2] - 8, y + 16, { align: "right" });
    doc.text(rupiah(price), tableX + cols[3] - 8, y + 16, { align: "right" });
    doc.text(rupiah((qty || 0) * (price || 0)), tableX + cols[4] - 8, y + 16, { align: "right" });
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

  // Ringkasan.
  y += 22;
  const totalsX = margin + half + 20;
  const totalRight = rightX;
  let ty = y;
  const totalLine = (label: string, value: string, big = false) => {
    doc.setFont("helvetica", big ? "bold" : "normal");
    doc.setFontSize(big ? 15 : 10);
    doc.setTextColor(19, 38, 75);
    doc.text(label, totalsX, ty);
    doc.text(value, totalRight, ty, { align: "right" });
    ty += big ? 23 : 17;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(7, 93, 229);
  doc.text("CATATAN", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(39, 55, 83);
  const noteLines = doc.splitTextToSize(x.catatan || "Terima kasih atas kepercayaan Anda.", half - 25);
  doc.text(noteLines, margin, y + 14);
  doc.setFont("helvetica", "bold");
  doc.text("METODE PEMBAYARAN", margin, y + 42 + noteLines.length * 10);
  doc.setFont("helvetica", "normal");
  doc.text(x.metodePembayaran || "-", margin, y + 56 + noteLines.length * 10);

  totalLine("SUBTOTAL", rupiah(subtotal));
  totalLine("DISKON", "- " + rupiah(x.diskon));
  totalLine(`PPN (${x.ppnPersen || 0}%)`, rupiah(ppnNominal));
  doc.setDrawColor(7, 93, 229);
  doc.setLineWidth(1.5);
  doc.line(totalsX, ty, totalRight, ty);
  ty += 18;
  totalLine("TOTAL", rupiah(total), true);

  // Tanda tangan.
  const footerY = Math.min(pageHeight - 52, Math.max(ty + 55, pageHeight - 95));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(39, 55, 83);
  doc.text("Terima kasih atas kepercayaan Anda.", margin, footerY);
  doc.text("Hormat kami,", rightX, footerY - 30, { align: "right" });
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
