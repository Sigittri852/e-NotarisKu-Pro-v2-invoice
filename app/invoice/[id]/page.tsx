import AppShell from "@/components/AppShell";
import { getInvoice } from "@/lib/invoice-store";
import { invoiceSubtotal, invoicePpn, invoiceTotal } from "@/lib/invoice";
import { rupiah } from "@/lib/constants";
import PrintButton from "@/components/PrintButton";
import InvoiceDeleteButton from "@/components/InvoiceDeleteButton";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { OFFICE, displayDate, displayNotaris } from "@/lib/invoice-template";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const x = await getInvoice(id);
  if (!x) notFound();

  const subtotal = invoiceSubtotal(x);
  const ppnNominal = invoicePpn(x);
  const total = invoiceTotal(x);
  const adaDataPajak =
    (x.nilaiTransaksi || 0) > 0 ||
    (x.njop || 0) > 0 ||
    (x.sspPph || 0) > 0 ||
    (x.sspdBphtb || 0) > 0;

  const namaPejabat = displayNotaris(x.namaNotaris);

  return (
    <AppShell>
      <section className="hero no-print">
        <div>
          <h1>Invoice / Tagihan</h1>
          <div>{x.nomor} · {x.pelanggan}</div>
        </div>
        <div className="actions">
          <Link className="btn btn-light" href={`/invoice/baru?edit=${x.id}`}>Edit</Link>
          <a className="btn btn-light" href={`/api/invoices/${x.id}/pdf`}>Unduh PDF</a>
          <a className="btn btn-light" href={`/api/invoices/${x.id}/word`}>Export Word</a>
          <PrintButton />
          <InvoiceDeleteButton id={x.id} nomor={x.nomor} redirectTo="/invoice" />
        </div>
      </section>

      <article className="invoice-paper invoice-professional">
        <header className="invoice-pro-head">
          <div className="invoice-pro-identity">
            <div className="invoice-pro-logos">
              <Image src="/logo-ini.svg" alt="Logo INI" width={82} height={82} priority />
              <Image src="/logo-ippat.svg" alt="Logo IPPAT" width={82} height={82} priority />
            </div>
            <div className="invoice-pro-office">
              <div className="invoice-pro-title">KANTOR NOTARIS</div>
              <div className="invoice-pro-name">PPAT {namaPejabat}</div>
              <div className="invoice-pro-contact">
                <span>⌖ {OFFICE.address}</span>
                <span>☎ {OFFICE.phone}</span>
                <span>✉ {OFFICE.email}</span>
              </div>
            </div>
          </div>

          <div className="invoice-pro-number">
            <span>NO. INVOICE</span>
            <b>{x.nomor}</b>
            <span>TANGGAL</span>
            <b>{displayDate(x.tanggal)}</b>
            <span>JATUH TEMPO</span>
            <b>{displayDate(x.jatuhTempo)}</b>
          </div>
        </header>

        <div className="invoice-pro-rule" />

        <section className="invoice-pro-meta">
          <div>
            <small>DITAGIHKAN KEPADA</small>
            <strong>{x.pelanggan || "-"}</strong>
            <span>{x.nik || "-"}</span>
            <span>{x.alamat || "-"}</span>
          </div>
          <div>
            <small>REFERENSI AKTA</small>
            <strong>{x.nomorAkta || "-"}</strong>
            <span>{x.jenisAkta || "-"}</span>
            <span>{x.kategori || "NOTARIS / PPAT"}</span>
          </div>
        </section>

        {adaDataPajak && (
          <section className="invoice-pro-reference">
            <div><small>NILAI TRANSAKSI</small><strong>{rupiah(x.nilaiTransaksi || 0)}</strong></div>
            <div><small>NJOP PBB</small><strong>{rupiah(x.njop || 0)}</strong></div>
            <div><small>SSP PPh</small><strong>{rupiah(x.sspPph || 0)}</strong></div>
            <div><small>SSPD BPHTB</small><strong>{rupiah(x.sspdBphtb || 0)}</strong></div>
          </section>
        )}

        <table className="invoice-pro-table">
          <thead>
            <tr><th>NO</th><th>URAIAN</th><th>QTY</th><th>HARGA</th><th>JUMLAH</th></tr>
          </thead>
          <tbody>
            {x.items.map((it, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{it.description}</td>
                <td>{it.qty}</td>
                <td>{rupiah(it.price)}</td>
                <td>{rupiah(it.qty * it.price)}</td>
              </tr>
            ))}
            {(x.sspPph || 0) > 0 && (
              <tr>
                <td>{x.items.length + 1}</td><td>Pajak SSP (PPh)</td><td>1</td>
                <td>{rupiah(x.sspPph || 0)}</td><td>{rupiah(x.sspPph || 0)}</td>
              </tr>
            )}
            {(x.sspdBphtb || 0) > 0 && (
              <tr>
                <td>{x.items.length + ((x.sspPph || 0) > 0 ? 2 : 1)}</td><td>Pajak SSPD (BPHTB)</td><td>1</td>
                <td>{rupiah(x.sspdBphtb || 0)}</td><td>{rupiah(x.sspdBphtb || 0)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <section className="invoice-pro-bottom">
          <div className="invoice-pro-notes">
            <b>CATATAN</b>
            <p>{x.catatan || "Terima kasih atas kepercayaan Anda."}</p>
            <b>METODE PEMBAYARAN</b>
            <p>{x.metodePembayaran || "-"}</p>
          </div>

          <div className="invoice-pro-totals">
            <div><span>SUBTOTAL</span><b>{rupiah(subtotal)}</b></div>
            <div><span>DISKON</span><b>- {rupiah(x.diskon)}</b></div>
            <div><span>PPN ({x.ppnPersen || 0}%)</span><b>{rupiah(ppnNominal)}</b></div>
            <hr />
            <div className="invoice-pro-grand"><span>TOTAL</span><b>{rupiah(total)}</b></div>
          </div>
        </section>

        <footer className="invoice-pro-footer">
          <div>Terima kasih atas kepercayaan Anda.</div>
          <div className="invoice-pro-sign">
            <p>Hormat kami,</p>
            <div className="invoice-pro-sign-line" />
            <strong>{namaPejabat}</strong>
            <span>Notaris &amp; PPAT</span>
          </div>
        </footer>
      </article>

      <div className="actions no-print invoice-actions">
        <Link className="btn" href="/invoice">← Kembali</Link>
        <Link className="btn btn-light" href={`/invoice/baru?edit=${x.id}`}>Edit</Link>
        <a className="btn btn-light" href={`/api/invoices/${x.id}/pdf`}>Unduh PDF</a>
        <a className="btn btn-light" href={`/api/invoices/${x.id}/word`}>Export Word</a>
        <PrintButton />
        <InvoiceDeleteButton id={x.id} nomor={x.nomor} redirectTo="/invoice" />
      </div>
    </AppShell>
  );
}
