export type Kategori = "NOTARIS" | "PPAT";
export type StatusAkta = "Draft" | "Selesai" | "Ditandatangani";
export type Dokumen = { name: string; url: string; type: string; size: number };
export type PihakAkta = { nama: string; nik: string; npwp: string; scanIdentitas?: Dokumen[] };
/** Tanda tangan digital notaris/pihak yang digambar langsung (canvas -> PNG dataURL). */
export type TandaTanganDigital = { nama: string; peran: string; dataUrl: string; tanggal: string };
export type Akta = {
  id: string; nomorAkta: string; tanggal: string; kategori: Kategori; jenisAkta: string;
  namaNotaris: string;
  /** Data baru: maksimal 6 pihak. */
  pihak: PihakAkta[];
  /** Field lama dipertahankan agar data lama dan template lama tetap kompatibel. */
  namaPihak: string; nik: string; npwp: string; alamat: string;
  nomorSertifikat: string; jenisHak: string; luasTanah: string; nilaiTransaksi: number;
  nopPbb: string; njop: number; tanggalSsp: string; sspPph: number; tanggalBphtb: string; bphtb: number;
  honorarium: number; status: StatusAkta; catatan: string; detail: Record<string,string>; dokumen: Dokumen[];
  /** Foto dokumentasi saat proses tanda tangan berlangsung. */
  fotoTtdKlien: Dokumen[];
  fotoTtdNotaris: Dokumen[];
  /** Berkas minuta akta (induk akta yang disimpan notaris). */
  minuta: Dokumen[];
  /** Tanda tangan digital (digambar via pad) terkait minuta, bisa lebih dari satu (notaris & saksi). */
  tandaTanganDigital: TandaTanganDigital[];
};
