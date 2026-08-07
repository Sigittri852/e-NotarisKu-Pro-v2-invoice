import AppShell from "@/components/AppShell";

export default function Page() {
  return (
    <AppShell>
      <section className="hero">
        <div>
          <h1>Laporan & Export Excel</h1>
          <div>Unduh laporan menggunakan template DRAFT LAP NOTARIS dan DRAFT LAP PPAT, atau rekap honorarium.</div>
        </div>
      </section>
      <div className="card">
        <h2>Export berdasarkan kategori (Template Resmi)</h2>
        <div className="actions">
          <a className="btn btn-primary" href="/api/export/NOTARIS">Download Laporan Notaris</a>
          <a className="btn btn-primary" href="/api/export/PPAT">Download Laporan PPAT</a>
        </div>
        <p className="muted">Data ditulis ke lembar pertama template Excel (Nilai Transaksi, NJOP, SSP PPh, SSPD BPHTB, dll). Sistem mencari baris header secara otomatis dan mengisi kolom yang dikenali.</p>
      </div>
      <div className="card">
        <h2>Rekap Honorarium</h2>
        <div className="actions">
          <a className="btn btn-primary" href="/api/export/honorarium">Download Excel Honorarium</a>
        </div>
        <p className="muted">Berisi seluruh honorarium akta beserta Nilai Transaksi, NJOP, SSP PPh, dan SSPD BPHTB — otomatis mengikuti data terbaru pada aplikasi.</p>
      </div>
    </AppShell>
  );
}
