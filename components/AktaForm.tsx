"use client";

import {
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  AKTA_NOTARIS,
  AKTA_PPAT,
  DYNAMIC_FIELDS,
} from "@/lib/constants";

import type {
  Akta,
  Dokumen,
  Kategori,
  PihakAkta,
  TandaTanganDigital,
} from "@/lib/types";

import SignaturePad from "./SignaturePad";
import CurrencyInput from "./CurrencyInput";

const landTypes = [
  "Akta Pengikatan Jual Beli",
  "Akta Kuasa Menjual",
  "Akta Hibah",
  "Akta Jual Beli",
  "Akta Pembagian Hak Bersama",
  "SKMHT",
  "APHT",
  "Akta Inbreng",
  "Akta Tukar-Menukar",
];

const emptyPihak = (): PihakAkta[] =>
  Array.from(
    { length: 6 },
    () => ({
      nama: "",
      nik: "",
      npwp: "",
      scanIdentitas: [],
    }),
  );

/* =========================================================
 * URL dokumen
 *
 * File baru:
 *   pathname -> /api/blob?pathname=...
 *
 * File lama:
 *   private.blob.vercel-storage.com -> dikonversi
 *   ke /api/blob?pathname=...
 * =======================================================*/
function documentHref(
  document: Dokumen,
) {
  if (document.pathname) {
    return (
      `/api/blob?pathname=${encodeURIComponent(
        document.pathname,
      )}`
    );
  }

  if (
    document.url &&
    document.url.startsWith(
      "/api/blob",
    )
  ) {
    return document.url;
  }

  if (document.url) {
    try {
      const parsed =
        new URL(document.url);

      if (
        parsed.hostname.endsWith(
          ".private.blob.vercel-storage.com",
        )
      ) {
        const pathname =
          decodeURIComponent(
            parsed.pathname.replace(
              /^\/+/,
              "",
            ),
          );

        return (
          `/api/blob?pathname=${encodeURIComponent(
            pathname,
          )}`
        );
      }
    } catch {
      // URL tidak valid,
      // gunakan URL asli.
    }
  }

  return document.url || "#";
}

/* =========================================================
 * Hapus file dari Vercel Blob
 * =======================================================*/
async function deleteDocumentFromBlob(
  document: Dokumen,
) {
  let pathname =
    document.pathname || "";

  /*
   * Untuk dokumen lama yang belum punya pathname,
   * ambil pathname dari URL Blob private.
   */
  if (!pathname && document.url) {
    try {
      const parsed =
        new URL(document.url);

      if (
        parsed.hostname.endsWith(
          ".private.blob.vercel-storage.com",
        )
      ) {
        pathname =
          decodeURIComponent(
            parsed.pathname.replace(
              /^\/+/,
              "",
            ),
          );
      }
    } catch {
      // Abaikan.
    }
  }

  /*
   * Jika tidak ada pathname, file mungkin
   * merupakan file lama yang hanya disimpan
   * sebagai URL biasa.
   */
  if (!pathname) {
    return;
  }

  const response =
    await fetch(
      `/api/blob?pathname=${encodeURIComponent(
        pathname,
      )}`,
      {
        method: "DELETE",
      },
    );

  const result =
    await response.json();

  if (!response.ok) {
    throw new Error(
      result?.error ||
        "Gagal menghapus dokumen.",
    );
  }
}

/* =========================================================
 * Normalisasi hasil upload
 * =======================================================*/
function normalizeUploadedFile(
  file: any,
): Dokumen {
  return {
    name:
      file.name ||
      file.namaFile ||
      "Dokumen",
    url: String(
      file.url || "",
    ),
    type:
      file.type ||
      file.tipe ||
      "",
    size: Number(
      file.size || 0,
    ),
    pathname:
      file.pathname ||
      undefined,
  };
}

export default function AktaForm({
  initial,
}: {
  initial?: Akta;
}) {
  const router = useRouter();

  const [
    kategori,
    setKategori,
  ] = useState<Kategori>(
    initial?.kategori ||
      "NOTARIS",
  );

  const jenisList =
    useMemo(
      () =>
        kategori === "NOTARIS"
          ? AKTA_NOTARIS
          : AKTA_PPAT,
      [kategori],
    );

  const [
    jenisAkta,
    setJenisAkta,
  ] = useState(
    initial?.jenisAkta ||
      jenisList[0],
  );

  const [
    dokumen,
    setDokumen,
  ] = useState<Dokumen[]>(
    initial?.dokumen || [],
  );

  const [pihak, setPihak] =
    useState<PihakAkta[]>(() => {
      const lama =
        initial?.pihak?.length
          ? initial.pihak
          : [
              {
                nama:
                  initial?.namaPihak ||
                  "",
                nik:
                  initial?.nik ||
                  "",
                npwp:
                  initial?.npwp ||
                  "",
              },
            ];

      return Array.from(
        { length: 6 },
        (_, i) => ({
          scanIdentitas: [],
          ...(
            lama[i] || {
              nama: "",
              nik: "",
              npwp: "",
            }
          ),
        }),
      );
    });

  const [
    fotoTtdKlien,
    setFotoTtdKlien,
  ] = useState<Dokumen[]>(
    initial?.fotoTtdKlien || [],
  );

  const [
    fotoTtdNotaris,
    setFotoTtdNotaris,
  ] = useState<Dokumen[]>(
    initial?.fotoTtdNotaris || [],
  );

  const [
    minuta,
    setMinuta,
  ] = useState<Dokumen[]>(
    initial?.minuta || [],
  );

  const [
    tandaTanganDigital,
    setTandaTanganDigital,
  ] =
    useState<TandaTanganDigital[]>(
      initial?.tandaTanganDigital ||
        [],
    );

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    nilaiTransaksi,
    setNilaiTransaksi,
  ] = useState<number>(
    initial?.nilaiTransaksi ||
      0,
  );

  const [njop, setNjop] =
    useState<number>(
      initial?.njop || 0,
    );

  const [
    sspPph,
    setSspPph,
  ] = useState<number>(
    initial?.sspPph || 0,
  );

  const [
    bphtb,
    setBphtb,
  ] = useState<number>(
    initial?.bphtb || 0,
  );

  const [
    honorarium,
    setHonorarium,
  ] = useState<number>(
    initial?.honorarium || 0,
  );

  const dynamic =
    DYNAMIC_FIELDS[jenisAkta] ||
    [];

  const showLand =
    kategori === "PPAT" ||
    landTypes.includes(
      jenisAkta,
    );

  const changeKategori = (
    k: Kategori,
  ) => {
    setKategori(k);

    setJenisAkta(
      (
        k === "NOTARIS"
          ? AKTA_NOTARIS
          : AKTA_PPAT
      )[0],
    );
  };

  const updatePihak = (
    index: number,
    key: keyof PihakAkta,
    value: string,
  ) => {
    setPihak((current) =>
      current.map(
        (item, i) =>
          i === index
            ? {
                ...item,
                [key]: value,
              }
            : item,
      ),
    );
  };

  /* =========================================================
   * Upload umum
   * =======================================================*/
  async function uploadTo(
    files: FileList | null,
    setter: (
      fn: (
        current: Dokumen[],
      ) => Dokumen[],
    ) => void,
  ) {
    if (
      !files ||
      !files.length
    ) {
      return;
    }

    setBusy(true);

    try {
      const formData =
        new FormData();

      Array.from(files).forEach(
        (file) => {
          formData.append(
            "files",
            file,
          );
        },
      );

      const response =
        await fetch(
          "/api/upload",
          {
            method: "POST",
            body: formData,
          },
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ||
            result?.error ||
            "Upload gagal.",
        );
      }

      const uploaded =
        Array.isArray(
          result?.files,
        )
          ? result.files.map(
              normalizeUploadedFile,
            )
          : [];

      if (!uploaded.length) {
        throw new Error(
          "Server tidak mengembalikan file hasil upload.",
        );
      }

      setter((current) => [
        ...current,
        ...uploaded,
      ]);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Upload gagal.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function upload(
    files: FileList | null,
  ) {
    await uploadTo(
      files,
      setDokumen,
    );
  }

  /* =========================================================
   * Upload KTP / Identitas
   * =======================================================*/
  async function uploadIdentitas(
    index: number,
    files: FileList | null,
  ) {
    if (
      !files ||
      !files.length
    ) {
      return;
    }

    setBusy(true);

    try {
      const formData =
        new FormData();

      Array.from(files).forEach(
        (file) => {
          formData.append(
            "files",
            file,
          );
        },
      );

      const response =
        await fetch(
          "/api/upload",
          {
            method: "POST",
            body: formData,
          },
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ||
            result?.error ||
            "Upload KTP gagal.",
        );
      }

      const uploaded =
        Array.isArray(
          result?.files,
        )
          ? result.files.map(
              normalizeUploadedFile,
            )
          : [];

      setPihak((current) =>
        current.map(
          (item, i) =>
            i === index
              ? {
                  ...item,
                  scanIdentitas: [
                    ...(item.scanIdentitas ||
                      []),
                    ...uploaded,
                  ],
                }
              : item,
        ),
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Upload KTP gagal.",
      );
    } finally {
      setBusy(false);
    }
  }

  /* =========================================================
   * Hapus KTP
   * =======================================================*/
  async function removeIdentitas(
    partyIndex: number,
    documentIndex: number,
  ) {
    const document =
      pihak[
        partyIndex
      ]?.scanIdentitas?.[
        documentIndex
      ];

    if (!document) {
      return;
    }

    if (
      !window.confirm(
        `Hapus dokumen "${document.name}"?`,
      )
    ) {
      return;
    }

    try {
      setBusy(true);

      await deleteDocumentFromBlob(
        document,
      );

      setPihak((current) =>
        current.map(
          (item, i) =>
            i === partyIndex
              ? {
                  ...item,
                  scanIdentitas:
                    (
                      item.scanIdentitas ||
                      []
                    ).filter(
                      (
                        _,
                        k,
                      ) =>
                        k !==
                        documentIndex,
                    ),
                }
              : item,
        ),
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal menghapus KTP.",
      );
    } finally {
      setBusy(false);
    }
  }

  /* =========================================================
   * Hapus dokumen umum
   * =======================================================*/
  async function removeDocument(
    documents: Dokumen[],
    index: number,
    setter: (
      fn: (
        current: Dokumen[],
      ) => Dokumen[],
    ) => void,
  ) {
    const document =
      documents[index];

    if (!document) {
      return;
    }

    if (
      !window.confirm(
        `Hapus dokumen "${document.name}"?`,
      )
    ) {
      return;
    }

    try {
      setBusy(true);

      await deleteDocumentFromBlob(
        document,
      );

      setter((current) =>
        current.filter(
          (_, i) =>
            i !== index,
        ),
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal menghapus dokumen.",
      );
    } finally {
      setBusy(false);
    }
  }

  /* =========================================================
   * Tanda tangan digital
   * =======================================================*/
  const addTandaTangan = (
    dataUrl: string,
    nama: string,
    peran: string,
  ) => {
    setTandaTanganDigital(
      (current) => [
        ...current,
        {
          nama,
          peran,
          dataUrl,
          tanggal:
            new Date().toISOString(),
        },
      ],
    );
  };

  const removeTandaTangan = (
    index: number,
  ) => {
    setTandaTanganDigital(
      (current) =>
        current.filter(
          (_, i) =>
            i !== index,
        ),
    );
  };

  /* =========================================================
   * Simpan Akta
   * =======================================================*/
  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setBusy(true);

    try {
      const formData =
        new FormData(
          event.currentTarget,
        );

      const raw =
        Object.fromEntries(
          formData.entries(),
        );

      const detail =
        Object.fromEntries(
          dynamic.map(
            (label) => [
              label,
              String(
                raw[
                  `detail_${label}`
                ] || "",
              ),
            ],
          ),
        );

      const pihakTerisi =
        pihak.filter(
          (item) =>
            item.nama.trim() ||
            item.nik.trim() ||
            item.npwp.trim() ||
            (
              item.scanIdentitas &&
              item.scanIdentitas
                .length
            ),
        );

      if (
        !pihakTerisi.length
      ) {
        throw new Error(
          "Minimal satu nama pihak harus diisi.",
        );
      }

      const body = {
        ...raw,
        kategori,
        jenisAkta,
        pihak:
          pihakTerisi,
        detail,
        dokumen,
        fotoTtdKlien,
        fotoTtdNotaris,
        minuta,
        tandaTanganDigital,
        nilaiTransaksi,
        njop,
        sspPph,
        bphtb,
        honorarium,
      };

      const response =
        await fetch(
          initial
            ? `/api/akta?id=${initial.id}`
            : "/api/akta",
          {
            method: initial
              ? "PUT"
              : "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              body,
            ),
          },
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Gagal menyimpan Akta.",
        );
      }

      router.push(
        `/akta/${
          result.id ||
          initial?.id
        }`,
      );

      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan Akta.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="card form-card"
      onSubmit={submit}
    >
      <div className="category-tabs">
        <button
          type="button"
          className={
            kategori === "NOTARIS"
              ? "tab active"
              : "tab"
          }
          onClick={() =>
            changeKategori(
              "NOTARIS",
            )
          }
        >
          ⚖ Akta Notaris
        </button>

        <button
          type="button"
          className={
            kategori === "PPAT"
              ? "tab active"
              : "tab"
          }
          onClick={() =>
            changeKategori(
              "PPAT",
            )
          }
        >
          🏛 Akta PPAT
        </button>
      </div>

      <div className="grid form-grid">

        <div className="field">
          <label>
            Nomor Akta
          </label>

          <input
            name="nomorAkta"
            required
            defaultValue={
              initial?.nomorAkta
            }
          />
        </div>

        <div className="field">
          <label>
            Tanggal Akta
          </label>

          <input
            type="date"
            name="tanggal"
            required
            defaultValue={
              initial?.tanggal ||
              new Date()
                .toISOString()
                .slice(0, 10)
            }
          />
        </div>

        <div className="field">
          <label>
            Jenis Akta {kategori}
          </label>

          <select
            name="jenisAkta"
            value={jenisAkta}
            onChange={(event) =>
              setJenisAkta(
                event.target.value,
              )
            }
          >
            {jenisList.map(
              (item) => (
                <option
                  key={item}
                >
                  {item}
                </option>
              ),
            )}
          </select>
        </div>

        <div className="field">
          <label>
            Nama Notaris / PPAT
          </label>

          <input
            name="namaNotaris"
            required
            placeholder="Nama lengkap dan gelar"
            defaultValue={
              initial?.namaNotaris
            }
          />
        </div>

        {/* =================================================
         * PARA PIHAK + KTP
         * =============================================== */}
        <div className="field full pihak-section">
          <div className="pihak-title">
            <div>
              <label>
                Data Para Pihak
              </label>

              <small>
                Isi maksimal 6 pihak.
                Baris yang tidak digunakan
                boleh dikosongkan.
              </small>
            </div>

            <span className="badge">
              6 Pihak
            </span>
          </div>

          <div className="pihak-table-wrap">
            <table className="pihak-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>
                    Nama Pihak
                  </th>
                  <th>
                    KTP / NIK
                  </th>
                  <th>
                    NPWP
                  </th>
                  <th>
                    Scan Identitas
                  </th>
                </tr>
              </thead>

              <tbody>
                {pihak.map(
                  (item, index) => (
                    <tr
                      key={index}
                    >
                      <td>
                        <b>
                          {index + 1}
                        </b>
                      </td>

                      <td>
                        <input
                          aria-label={`Nama pihak ${
                            index + 1
                          }`}
                          value={
                            item.nama
                          }
                          onChange={(
                            event,
                          ) =>
                            updatePihak(
                              index,
                              "nama",
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder={`Nama pihak ${
                            index + 1
                          }`}
                          required={
                            index === 0
                          }
                        />
                      </td>

                      <td>
                        <input
                          aria-label={`NIK pihak ${
                            index + 1
                          }`}
                          value={
                            item.nik
                          }
                          onChange={(
                            event,
                          ) =>
                            updatePihak(
                              index,
                              "nik",
                              event
                                .target
                                .value
                                .replace(
                                  /\D/g,
                                  "",
                                )
                                .slice(
                                  0,
                                  16,
                                ),
                            )
                          }
                          inputMode="numeric"
                          maxLength={16}
                          placeholder="16 digit NIK"
                        />
                      </td>

                      <td>
                        <input
                          aria-label={`NPWP pihak ${
                            index + 1
                          }`}
                          value={
                            item.npwp
                          }
                          onChange={(
                            event,
                          ) =>
                            updatePihak(
                              index,
                              "npwp",
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder="Nomor NPWP"
                        />
                      </td>

                      <td>
                        <label className="mini-upload-btn">
                          📷 Scan KTP

                          <input
                            type="file"
                            accept="image/*,.pdf"
                            multiple
                            hidden
                            onChange={(
                              event,
                            ) =>
                              uploadIdentitas(
                                index,
                                event
                                  .target
                                  .files,
                              )
                            }
                          />
                        </label>

                        {Boolean(
                          item
                            .scanIdentitas
                            ?.length,
                        ) && (
                          <ul className="mini-file-list">
                            {item.scanIdentitas!.map(
                              (
                                document,
                                documentIndex,
                              ) => (
                                <li
                                  key={`${document.name}-${documentIndex}`}
                                >
                                  <a
                                    href={documentHref(
                                      document,
                                    )}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {document.name.length >
                                    16
                                      ? `${document.name.slice(
                                          0,
                                          14,
                                        )}…`
                                      : document.name}
                                  </a>

                                  <button
                                    type="button"
                                    title="Hapus KTP"
                                    disabled={
                                      busy
                                    }
                                    onClick={() =>
                                      removeIdentitas(
                                        index,
                                        documentIndex,
                                      )
                                    }
                                  >
                                    ✕
                                  </button>
                                </li>
                              ),
                            )}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="field full">
          <label>
            Alamat
          </label>

          <textarea
            name="alamat"
            defaultValue={
              initial?.alamat
            }
          />
        </div>

        {/* =================================================
         * DATA TANAH / PAJAK
         * =============================================== */}
        {showLand && (
          <>
            <div className="field">
              <label>
                Nomor Sertipikat
              </label>

              <input
                name="nomorSertifikat"
                defaultValue={
                  initial?.nomorSertifikat
                }
              />
            </div>

            <div className="field">
              <label>
                Jenis Hak
              </label>

              <input
                name="jenisHak"
                placeholder="SHM / HGB / Hak Pakai"
                defaultValue={
                  initial?.jenisHak
                }
              />
            </div>

            <div className="field">
              <label>
                Luas Tanah (m²)
              </label>

              <input
                name="luasTanah"
                type="number"
                step="0.01"
                defaultValue={
                  initial?.luasTanah
                }
              />
            </div>

            <div className="field">
              <label>
                Nilai Transaksi (Rp)
              </label>

              <CurrencyInput
                value={
                  nilaiTransaksi
                }
                onValueChange={
                  setNilaiTransaksi
                }
              />

              <small>
                Contoh:
                1.000.000.000
              </small>
            </div>

            <div className="field">
              <label>
                NOP PBB / Tahun
              </label>

              <input
                name="nopPbb"
                defaultValue={
                  initial?.nopPbb
                }
              />
            </div>

            <div className="field">
              <label>
                NJOP (Rp)
              </label>

              <CurrencyInput
                value={njop}
                onValueChange={
                  setNjop
                }
              />
            </div>

            <div className="field">
              <label>
                Tanggal SSP PPh
              </label>

              <input
                name="tanggalSsp"
                type="date"
                defaultValue={
                  initial?.tanggalSsp
                }
              />
            </div>

            <div className="field">
              <label>
                SSP PPh (Rp)
              </label>

              <CurrencyInput
                value={sspPph}
                onValueChange={
                  setSspPph
                }
              />
            </div>

            <div className="field">
              <label>
                Tanggal SSPD BPHTB
              </label>

              <input
                name="tanggalBphtb"
                type="date"
                defaultValue={
                  initial?.tanggalBphtb
                }
              />
            </div>

            <div className="field">
              <label>
                SSPD BPHTB (Rp)
              </label>

              <CurrencyInput
                value={bphtb}
                onValueChange={
                  setBphtb
                }
              />
            </div>
          </>
        )}

        {/* =================================================
         * DYNAMIC FIELD
         * =============================================== */}
        {dynamic.map(
          (label) => (
            <div
              className="field"
              key={label}
            >
              <label>
                {label}
              </label>

              <input
                name={`detail_${label}`}
                defaultValue={
                  initial?.detail?.[
                    label
                  ] || ""
                }
              />
            </div>
          ),
        )}

        <div className="field">
          <label>
            Honorarium (Rp)
          </label>

          <CurrencyInput
            value={honorarium}
            onValueChange={
              setHonorarium
            }
          />
        </div>

        <div className="field">
          <label>
            Status
          </label>

          <select
            name="status"
            defaultValue={
              initial?.status ||
              "Draft"
            }
          >
            <option>
              Draft
            </option>

            <option>
              Selesai
            </option>

            <option>
              Ditandatangani
            </option>
          </select>
        </div>

        <div className="field full">
          <label>
            Keterangan / Catatan
          </label>

          <textarea
            name="catatan"
            defaultValue={
              initial?.catatan
            }
          />
        </div>

        {/* =================================================
         * DOKUMEN DIGITAL
         * =============================================== */}
        <div className="field full upload-box">
          <label>
            Upload Dokumen Digital
          </label>

          <input
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
            onChange={(event) =>
              upload(
                event.target.files,
              )
            }
          />

          <small>
            Foto, PDF, Word, Excel,
            dan ZIP. Maksimal 25 MB
            per file.
          </small>

          {dokumen.length > 0 && (
            <ul className="upload-list">
              {dokumen.map(
                (document, index) => (
                  <li
                    key={`${document.name}-${index}`}
                  >
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href={documentHref(
                        document,
                      )}
                    >
                      {document.name}
                    </a>

                    <button
                      type="button"
                      className="link-danger"
                      disabled={busy}
                      onClick={() =>
                        removeDocument(
                          dokumen,
                          index,
                          setDokumen,
                        )
                      }
                    >
                      hapus
                    </button>
                  </li>
                ),
              )}
            </ul>
          )}
        </div>

        {/* =================================================
         * FOTO TTD
         * =============================================== */}
        <div className="field full section-box">
          <div className="pihak-title">
            <div>
              <label>
                📸 Dokumentasi Proses
                Tanda Tangan
              </label>

              <small>
                Unggah foto saat
                penandatanganan
                berlangsung bersama
                klien maupun notaris.
              </small>
            </div>
          </div>

          <div
            className="grid form-grid"
            style={{ padding: 0 }}
          >
            {/* TTD KLIEN */}
            <div className="field upload-box">
              <label>
                Foto Tanda Tangan dengan
                Klien
              </label>

              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(event) =>
                  uploadTo(
                    event.target.files,
                    setFotoTtdKlien,
                  )
                }
              />

              <small>
                Foto momen
                penandatanganan bersama
                klien / para pihak.
              </small>

              {fotoTtdKlien.length >
                0 && (
                <ul className="upload-list">
                  {fotoTtdKlien.map(
                    (
                      document,
                      index,
                    ) => (
                      <li
                        key={`${document.name}-${index}`}
                      >
                        <a
                          target="_blank"
                          rel="noreferrer"
                          href={documentHref(
                            document,
                          )}
                        >
                          {
                            document.name
                          }
                        </a>

                        <button
                          type="button"
                          className="link-danger"
                          disabled={busy}
                          onClick={() =>
                            removeDocument(
                              fotoTtdKlien,
                              index,
                              setFotoTtdKlien,
                            )
                          }
                        >
                          hapus
                        </button>
                      </li>
                    ),
                  )}
                </ul>
              )}
            </div>

            {/* TTD NOTARIS */}
            <div className="field upload-box">
              <label>
                Foto Tanda Tangan dengan
                Notaris
              </label>

              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(event) =>
                  uploadTo(
                    event.target.files,
                    setFotoTtdNotaris,
                  )
                }
              />

              <small>
                Foto momen
                penandatanganan bersama
                notaris/PPAT.
              </small>

              {fotoTtdNotaris.length >
                0 && (
                <ul className="upload-list">
                  {fotoTtdNotaris.map(
                    (
                      document,
                      index,
                    ) => (
                      <li
                        key={`${document.name}-${index}`}
                      >
                        <a
                          target="_blank"
                          rel="noreferrer"
                          href={documentHref(
                            document,
                          )}
                        >
                          {
                            document.name
                          }
                        </a>

                        <button
                          type="button"
                          className="link-danger"
                          disabled={busy}
                          onClick={() =>
                            removeDocument(
                              fotoTtdNotaris,
                              index,
                              setFotoTtdNotaris,
                            )
                          }
                        >
                          hapus
                        </button>
                      </li>
                    ),
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* =================================================
         * MINUTA
         * =============================================== */}
        <div className="field full section-box">
          <div className="pihak-title">
            <div>
              <label>
                🗂 Minuta &amp; Tanda
                Tangan Digital Notaris
              </label>

              <small>
                Unggah berkas minuta akta
                dan bubuhkan tanda tangan
                digital yang berhubungan
                dengan notaris.
              </small>
            </div>
          </div>

          <div
            className="field upload-box"
            style={{
              marginBottom: 16,
            }}
          >
            <label>
              Upload Berkas Minuta
            </label>

            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,image/*"
              onChange={(event) =>
                uploadTo(
                  event.target.files,
                  setMinuta,
                )
              }
            />

            <small>
              Salinan minuta / naskah
              asli akta yang disimpan
              notaris. PDF, Word, atau
              foto.
            </small>

            {minuta.length > 0 && (
              <ul className="upload-list">
                {minuta.map(
                  (
                    document,
                    index,
                  ) => (
                    <li
                      key={`${document.name}-${index}`}
                    >
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={documentHref(
                          document,
                        )}
                      >
                        {
                          document.name
                        }
                      </a>

                      <button
                        type="button"
                        className="link-danger"
                        disabled={busy}
                        onClick={() =>
                          removeDocument(
                            minuta,
                            index,
                            setMinuta,
                          )
                        }
                      >
                        hapus
                      </button>
                    </li>
                  ),
                )}
              </ul>
            )}
          </div>

          <SignaturePad
            onSave={
              addTandaTangan
            }
          />

          {tandaTanganDigital.length >
            0 && (
            <div className="sig-list">
              {tandaTanganDigital.map(
                (signature, index) => (
                  <div
                    className="sig-item"
                    key={index}
                  >
                    <img
                      src={
                        signature.dataUrl
                      }
                      alt={
                        signature.nama
                      }
                    />

                    <div>
                      <b>
                        {
                          signature.nama
                        }
                      </b>

                      <small>
                        {
                          signature.peran
                        }{" "}
                        ·{" "}
                        {new Date(
                          signature.tanggal,
                        ).toLocaleString(
                          "id-ID",
                        )}
                      </small>
                    </div>

                    <button
                      type="button"
                      className="link-danger"
                      onClick={() =>
                        removeTandaTangan(
                          index,
                        )
                      }
                    >
                      hapus
                    </button>
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        {/* =================================================
         * ACTIONS
         * =============================================== */}
        <div className="actions full">
          <button
            disabled={busy}
            className="btn btn-primary"
          >
            {busy
              ? "Memproses..."
              : "Simpan Akta"}
          </button>

          <button
            type="reset"
            className="btn"
            disabled={busy}
            onClick={() =>
              setPihak(
                emptyPihak(),
              )
            }
          >
            Reset
          </button>

          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() =>
              router.back()
            }
          >
            Batal
          </button>
        </div>
      </div>
    </form>
  );
}