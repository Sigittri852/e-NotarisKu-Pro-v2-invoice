"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function InvoiceDeleteButton({ id, nomor, redirectTo }: { id: string; nomor?: string; redirectTo?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    const ok = confirm(`Hapus invoice ${nomor || ""}? Tindakan ini tidak dapat dibatalkan.`);
    if (!ok) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/invoices?id=${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Gagal menghapus invoice");
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    } catch (e) {
      alert("Terjadi kesalahan saat menghapus invoice.");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className="btn btn-danger no-print"
      disabled={busy}
      onClick={handleDelete}
      title="Hapus invoice ini"
    >
      {busy ? "Menghapus..." : "Hapus"}
    </button>
  );
}
