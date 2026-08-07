import Link from "next/link";
import AppShell from "@/components/AppShell";
import { listInvoices } from "@/lib/invoice-store";
import { invoiceTotal } from "@/lib/invoice";
import { rupiah } from "@/lib/constants";
import InvoiceDeleteButton from "@/components/InvoiceDeleteButton";
export const dynamic="force-dynamic";
export default async function Page(){
 const data=await listInvoices(); const total=data.reduce((s,x)=>s+invoiceTotal(x),0); const unpaid=data.filter(x=>x.status!=="Lunas").reduce((s,x)=>s+invoiceTotal(x),0);
 return <AppShell><section className="hero"><div><h1>Invoice & Tagihan</h1><div>Kelola tagihan honorarium Notaris dan PPAT, status pembayaran, serta cetak invoice.</div></div><Link className="btn btn-light" href="/invoice/baru">+ Buat Invoice</Link></section>
 <div className="grid stats"><div className="card stat">Jumlah Invoice<b>{data.length}</b></div><div className="card stat">Total Tagihan<b style={{fontSize:20}}>{rupiah(total)}</b></div><div className="card stat">Belum Lunas<b style={{fontSize:20}}>{rupiah(unpaid)}</b></div><div className="card stat">Sudah Lunas<b>{data.filter(x=>x.status==='Lunas').length}</b></div></div>
 <div className="card table-wrap"><table className="table"><thead><tr><th>No. Invoice</th><th>Tanggal</th><th>Klien</th><th>Referensi Akta</th><th>Jatuh Tempo</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{data.map(x=><tr key={x.id}><td><b>{x.nomor}</b></td><td>{x.tanggal}</td><td>{x.pelanggan}</td><td>{x.nomorAkta||'-'}</td><td>{x.jatuhTempo||'-'}</td><td><b>{rupiah(invoiceTotal(x))}</b></td><td><span className={`badge ${x.status==='Lunas'?'green':'gray'}`}>{x.status}</span></td><td className="row-actions"><Link href={`/invoice/${x.id}`} style={{color:'#1556ee'}}>Lihat</Link><Link href={`/invoice/baru?edit=${x.id}`} style={{color:'#1556ee'}}>Edit</Link><a href={`/api/invoices/${x.id}/pdf`} style={{color:'#1556ee'}}>Unduh PDF</a><InvoiceDeleteButton id={x.id} nomor={x.nomor}/></td></tr>)}</tbody></table></div></AppShell>
}
