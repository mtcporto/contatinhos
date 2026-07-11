import { db } from "@/lib/db";
import { hashPassword, verifyPassword, createToken, COOKIE_NAME, SESSION_DURATION_MS } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { name, email, password } = await req.json();
    if (!name || !email || !password)
      return NextResponse.json({ error: "Preencha todos os campos." }, { status: 400 });
    if (password.length < 6)
      return NextResponse.json({ error: "A senha deve ter pelo menos 6 caracteres." }, { status: 400 });

    const existing = await db.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [email] });
    if (existing.rows.length > 0)
      return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });

    const id = crypto.randomUUID();
    const hash = await hashPassword(password);
    await db.execute({
      sql: "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
      args: [id, name.trim(), email.toLowerCase().trim(), hash],
    });

    const token = await createToken({ userId: id, name: name.trim() });
    const res = NextResponse.json({ ok: true, name: name.trim() });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: SESSION_DURATION_MS / 1000,
      path: "/",
    });
    return res;
  } catch (e) {
    console.error("[register]", e);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
