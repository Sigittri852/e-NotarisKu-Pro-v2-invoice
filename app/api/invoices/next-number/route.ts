import { NextResponse } from "next/server";
import { listInvoices } from "@/lib/invoice-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();

    const prefix =
      `INV-${now.getFullYear()}` +
      `${String(now.getMonth() + 1).padStart(2, "0")}-`;

    const all = await listInvoices();

    const seq = all
      .map((x) => x.nomor)
      .filter((x) => typeof x === "string" && x.startsWith(prefix))
      .map((x) => Number(x.slice(prefix.length)))
      .filter(Number.isFinite);

    const next = (seq.length ? Math.max(...seq) : 0) + 1;

    return NextResponse.json({
      nomor: `${prefix}${String(next).padStart(4, "0")}`,
    });
  } catch (error) {
    console.error("NEXT NUMBER ERROR:", error);

    return NextResponse.json(
      {
        error: "Gagal membuat nomor invoice",
        nomor: `INV-${new Date().getFullYear()}${String(
          new Date().getMonth() + 1
        ).padStart(2, "0")}-0001`,
      },
      { status: 500 }
    );
  }
}