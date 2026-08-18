export type Kategori = "NOTARIS" | "PPAT";

export type StatusAkta =
  | "Draft"
  | "Selesai"
  | "Ditandatangani";

export type Dokumen = {
  name: string;
  url: string;
  type: string;
  size: number;
  pathname?: string;
};

export type PihakAkta = {
  nama: string;
  nik: string;
  npwp: string;
  scanIdentitas?: Dokumen[];
};

export type TandaTanganDigital = {
  nama: string;
  peran: string;
  dataUrl: string;
  tanggal: string;
};

export type Akta = {
  id: string;
  nomorAkta: string;
  tanggal: string;
  kategori: Kategori;
  jenisAkta: string;
  namaNotaris: string;

  pihak: PihakAkta[];

  namaPihak: string;
  nik: string;
  npwp: string;
  alamat: string;

  nomorSertifikat: string;
  jenisHak: string;
  luasTanah: string;

  nilaiTransaksi: number;

  nopPbb: string;
  njop: number;

  tanggalSsp: string;
  sspPph: number;

  tanggalBphtb: string;
  bphtb: number;

  honorarium: number;
  status: StatusAkta;
  catatan: string;

  detail: Record<string, string>;

  dokumen: Dokumen[];

  fotoTtdKlien: Dokumen[];
  fotoTtdNotaris: Dokumen[];

  minuta: Dokumen[];

  tandaTanganDigital: TandaTanganDigital[];
};