import { NextResponse } from "next/server";
import {
  createUser,
  listUsers,
  toPublicUser,
  type UserRole,
} from "@/lib/user-store";

const roles: UserRole[] = ["SUPER_ADMIN", "NOTARIS_PPAT", "STAFF"];

export async function GET() {
  const users = await listUsers();
  return NextResponse.json(users.map(toPublicUser));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nama = String(body.nama ?? "").trim();
    const email = String(body.email ?? "").trim();
    const password = String(body.password ?? "");
    const role = String(body.role ?? "STAFF") as UserRole;
    const aktif = body.aktif !== false;

    if (!nama || !email || !password) {
      return NextResponse.json(
        { message: "Nama, email, dan password wajib diisi." },
        { status: 400 },
      );
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ message: "Format email tidak valid." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password minimal 6 karakter." },
        { status: 400 },
      );
    }
    if (!roles.includes(role)) {
      return NextResponse.json({ message: "Peran tidak valid." }, { status: 400 });
    }

    const user = await createUser({ nama, email, password, role, aktif });
    return NextResponse.json(toPublicUser(user), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal menambah pengguna." },
      { status: 400 },
    );
  }
}
