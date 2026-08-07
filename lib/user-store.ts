import { promises as fs } from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export type UserRole = "SUPER_ADMIN" | "NOTARIS_PPAT" | "STAFF";

export type StoredUser = {
  id: string;
  nama: string;
  email: string;
  role: UserRole;
  aktif: boolean;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicUser = Omit<StoredUser, "passwordHash">;

const file = path.join(process.cwd(), "data", "users.json");

const defaultUsers: StoredUser[] = [
  {
    id: "admin-default",
    nama: "Administrator",
    email: "admin@notaris.local",
    role: "SUPER_ADMIN",
    aktif: true,
    passwordHash: bcrypt.hashSync("admin123", 10),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "staff-default",
    nama: "Staf Kantor",
    email: "staf@notaris.local",
    role: "STAFF",
    aktif: true,
    passwordHash: bcrypt.hashSync("staff123", 10),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function ensureFile() {
  try {
    await fs.access(file);
  } catch {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(defaultUsers, null, 2), "utf8");
  }
}

export async function listUsers(): Promise<StoredUser[]> {
  await ensureFile();
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveUsers(users: StoredUser[]) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(users, null, 2), "utf8");
}

export function toPublicUser(user: StoredUser): PublicUser {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

export async function createUser(input: {
  nama: string;
  email: string;
  role: UserRole;
  aktif: boolean;
  password: string;
}) {
  const users = await listUsers();
  const email = input.email.trim().toLowerCase();
  if (users.some((item) => item.email.toLowerCase() === email)) {
    throw new Error("Email sudah digunakan.");
  }

  const now = new Date().toISOString();
  const user: StoredUser = {
    id: randomUUID(),
    nama: input.nama.trim(),
    email,
    role: input.role,
    aktif: input.aktif,
    passwordHash: await bcrypt.hash(input.password, 10),
    createdAt: now,
    updatedAt: now,
  };
  users.push(user);
  await saveUsers(users);
  return user;
}

export async function updateUser(
  id: string,
  input: {
    nama: string;
    email: string;
    role: UserRole;
    aktif: boolean;
    password?: string;
  },
) {
  const users = await listUsers();
  const index = users.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Pengguna tidak ditemukan.");

  const email = input.email.trim().toLowerCase();
  if (users.some((item) => item.id !== id && item.email.toLowerCase() === email)) {
    throw new Error("Email sudah digunakan.");
  }

  const current = users[index];
  users[index] = {
    ...current,
    nama: input.nama.trim(),
    email,
    role: input.role,
    aktif: input.aktif,
    passwordHash: input.password
      ? await bcrypt.hash(input.password, 10)
      : current.passwordHash,
    updatedAt: new Date().toISOString(),
  };
  await saveUsers(users);
  return users[index];
}
