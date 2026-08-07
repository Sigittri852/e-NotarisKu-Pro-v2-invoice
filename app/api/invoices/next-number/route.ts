import { NextResponse } from "next/server";
import { listInvoices } from "@/lib/invoice-store";
export async function GET(){
  const now=new Date(); const prefix=`INV-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}-`;
  const all=await listInvoices(); const seq=all.map(x=>x.nomor).filter(x=>x.startsWith(prefix)).map(x=>Number(x.slice(prefix.length))).filter(Number.isFinite);
  return NextResponse.json({nomor:`${prefix}${String((seq.length?Math.max(...seq):0)+1).padStart(4,"0")}`});
}
