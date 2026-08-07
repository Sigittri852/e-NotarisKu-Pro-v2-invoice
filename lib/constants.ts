export const AKTA_NOTARIS=["Akta Pengikatan Jual Beli","Akta Kuasa Menjual","Akta Kuasa Pengambilan Sertipikat dan Dokumen di Bank","Akta Kuasa (Umum)","Akta Pernyataan","Akta Pendirian PT","Akta Pendirian CV","Pendirian Yayasan","Akta BARUPS PT","Akta Perubahan PT","Akta Perubahan CV","Akta Perubahan Yayasan","Akta Hibah","Akta Wasiat","Akta Kerjasama"];
export const AKTA_PPAT=["Akta Jual Beli","Akta Hibah","Akta Pembagian Hak Bersama","SKMHT","APHT","Akta Inbreng","Akta Tukar-Menukar"];
export const DYNAMIC_FIELDS:Record<string,string[]>={
"Akta Pendirian PT":["Nama PT","Nomor AHU","Modal Dasar","Modal Disetor","Direktur","Komisaris","Bidang Usaha"],
"Akta Pendirian CV":["Nama CV","Sekutu Aktif","Sekutu Pasif","Modal","Bidang Usaha"],
"Pendirian Yayasan":["Nama Yayasan","Pembina","Pengurus","Pengawas","Tujuan Yayasan"],
"Akta BARUPS PT":["Nama PT","Agenda RUPS","Pimpinan Rapat","Kuorum","Keputusan Rapat"],
"Akta Perubahan PT":["Nama PT","Nomor AHU Lama","Jenis Perubahan","Data Sebelum","Data Sesudah"],
"Akta Perubahan CV":["Nama CV","Jenis Perubahan","Data Sebelum","Data Sesudah"],
"Akta Perubahan Yayasan":["Nama Yayasan","Jenis Perubahan","Data Sebelum","Data Sesudah"],
"Akta Hibah":["Pemberi Hibah","Penerima Hibah","Objek Hibah","Nilai Hibah"],
"Akta Wasiat":["Pewasiat","Penerima Wasiat","Objek Wasiat","Pelaksana Wasiat"],
"Akta Kerjasama":["Pihak Pertama","Pihak Kedua","Ruang Lingkup","Jangka Waktu","Nilai Kerjasama"],
"Akta Jual Beli":["Penjual","Pembeli","Objek Tanah","Nomor Persil"],
"Akta Pembagian Hak Bersama":["Para Pemegang Hak","Dasar Kepemilikan","Pembagian Hak"],
"SKMHT":["Pemberi Kuasa","Penerima Kuasa","Kreditur","Nilai Tanggungan"],
"APHT":["Pemberi Hak Tanggungan","Kreditur","Peringkat Hak Tanggungan","Nilai Tanggungan"],
"Akta Inbreng":["Pemberi Inbreng","Penerima Inbreng","Objek Inbreng","Nilai Inbreng"],
"Akta Tukar-Menukar":["Pihak Pertama","Pihak Kedua","Objek Pertama","Objek Kedua"]
};
export const rupiah=(n:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n||0);
