import { promises as fs } from "fs";
import path from "path";
import type { Akta } from "./types";
const file = path.join(process.cwd(), "data", "akta.json");
export async function listAkta(): Promise<Akta[]> { try { return JSON.parse(await fs.readFile(file, "utf8")); } catch { return []; } }
export async function saveAkta(data: Akta[]) { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify(data, null, 2)); }
export async function getAkta(id: string) { return (await listAkta()).find(x => x.id === id); }
