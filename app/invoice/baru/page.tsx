import AppShell from "@/components/AppShell";
import InvoiceForm from "@/components/InvoiceForm";
import { getAkta } from "@/lib/store";
import { getInvoice } from "@/lib/invoice-store";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    akta?: string;
    edit?: string;
  }>;
}) {
  const q = await searchParams;

  const akta = q.akta ? await getAkta(q.akta) : undefined;
  const invoice = q.edit ? await getInvoice(q.edit) : undefined;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-blue-700 to-blue-900 p-8 text-white">
          <h1 className="text-4xl font-bold">
            {invoice ? "Edit Invoice / Tagihan" : "Buat Invoice / Tagihan"}
          </h1>

          <p className="mt-2 text-lg">
            {akta
              ? `Dari Akta ${akta.nomorAkta} · ${akta.jenisAkta}`
              : invoice
                ? `Perbarui ${invoice.nomor}`
                : "Buat tagihan baru untuk klien."}
          </p>
        </div>

        <InvoiceForm
          akta={akta}
          invoice={invoice}
        />
      </div>
    </AppShell>
  );
}