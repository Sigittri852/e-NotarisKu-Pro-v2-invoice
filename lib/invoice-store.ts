import { promises as fs } from "fs";
import path from "path";
import type { Invoice } from "./invoice";

const file = path.join(process.cwd(), "data", "invoices.json");

export async function listInvoices(): Promise<Invoice[]> {
  try { return JSON.parse(await fs.readFile(file, "utf8")); } catch { return []; }
}
export async function saveInvoices(data: Invoice[]) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}
export async function getInvoice(id: string) { return (await listInvoices()).find(x => x.id === id); }
