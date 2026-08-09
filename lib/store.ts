import { prisma } from "./prisma";
import type { Akta, Dokumen, PihakAkta, TandaTanganDigital } from "./types";

const parse = <T>(value: string | null | undefined, fallback: T): T => {
  try { return value ? (JSON.parse(value) as T) : fallback; } catch { return fallback; }
};
const toDate = (value?: string | null) => { const d = value ? new Date(value) : new Date(); return Number.isNaN(d.getTime()) ? new Date() : d; };

function fromDb(x: any): Akta {
  const pihak = parse<PihakAkta[]>(x.pihakJson, []);
  return {
    id:x.id, nomorAkta:x.nomorAkta, tanggal:new Date(x.tanggal).toISOString().slice(0,10),
    kategori:x.kategori === "PPAT" ? "PPAT" : "NOTARIS", jenisAkta:x.jenisAkta, namaNotaris:x.namaNotaris,
    pihak, namaPihak:x.namaPihak || pihak.map(p=>p.nama).filter(Boolean).join("; "),
    nik:x.nik || pihak.map(p=>p.nik).filter(Boolean).join("; "), npwp:x.npwp || pihak.map(p=>p.npwp).filter(Boolean).join("; "),
    alamat:x.alamat || "", nomorSertifikat:x.nomorSertifikat || "", jenisHak:x.jenisHak || "", luasTanah:x.luasTanah == null ? "" : String(x.luasTanah),
    nilaiTransaksi:Number(x.nilaiTransaksi||0), nopPbb:x.nopPbb||"", njop:Number(x.njop||0),
    tanggalSsp:x.tanggalSsp ? new Date(x.tanggalSsp).toISOString().slice(0,10) : "", sspPph:Number(x.sspPph||0),
    tanggalBphtb:x.tanggalBphtb ? new Date(x.tanggalBphtb).toISOString().slice(0,10) : "", bphtb:Number(x.bphtb||0),
    honorarium:Number(x.honorarium||0), status:x.status||"Draft", catatan:x.catatan||"",
    detail:parse<Record<string,string>>(x.detailJson,{}), dokumen:parse<Dokumen[]>(x.dokumenJson,[]),
    fotoTtdKlien:parse<Dokumen[]>(x.fotoTtdKlienJson,[]), fotoTtdNotaris:parse<Dokumen[]>(x.fotoTtdNotarisJson,[]),
    minuta:parse<Dokumen[]>(x.minutaJson,[]), tandaTanganDigital:parse<TandaTanganDigital[]>(x.tandaTanganDigitalJson,[])
  };
}

export async function listAkta(): Promise<Akta[]> {
  return (await prisma.akta.findMany({orderBy:{createdAt:"desc"}})).map(fromDb);
}
export async function getAkta(id:string) {
  const row=await prisma.akta.findUnique({where:{id}}); return row ? fromDb(row) : undefined;
}
export async function upsertAkta(a:Akta) {
  const data:any={
    nomorAkta:a.nomorAkta,tanggal:toDate(a.tanggal),kategori:a.kategori,jenisAkta:a.jenisAkta,namaNotaris:a.namaNotaris,
    namaPihak:a.namaPihak,nik:a.nik,npwp:a.npwp,alamat:a.alamat,nomorSertifikat:a.nomorSertifikat||null,jenisHak:a.jenisHak||null,
    luasTanah:a.luasTanah ? Number(a.luasTanah) : null,nilaiTransaksi:Number(a.nilaiTransaksi||0),nopPbb:a.nopPbb||null,njop:Number(a.njop||0),
    tanggalSsp:a.tanggalSsp?toDate(a.tanggalSsp):null,sspPph:Number(a.sspPph||0),tanggalBphtb:a.tanggalBphtb?toDate(a.tanggalBphtb):null,
    bphtb:Number(a.bphtb||0),honorarium:Number(a.honorarium||0),status:a.status||"Draft",catatan:a.catatan||null,
    detailJson:JSON.stringify(a.detail||{}),pihakJson:JSON.stringify(a.pihak||[]),dokumenJson:JSON.stringify(a.dokumen||[]),
    fotoTtdKlienJson:JSON.stringify(a.fotoTtdKlien||[]),fotoTtdNotarisJson:JSON.stringify(a.fotoTtdNotaris||[]),
    minutaJson:JSON.stringify(a.minuta||[]),tandaTanganDigitalJson:JSON.stringify(a.tandaTanganDigital||[])
  };
  return prisma.akta.upsert({where:{id:a.id},create:{id:a.id,...data},update:data});
}
export async function saveAkta(data:Akta[]) {
  const existing=await prisma.akta.findMany({select:{id:true}}); const wanted=new Set(data.map(x=>x.id));
  const remove=existing.filter(x=>!wanted.has(x.id)).map(x=>x.id); if(remove.length) await prisma.akta.deleteMany({where:{id:{in:remove}}});
  for(const a of data) await upsertAkta(a);
}
