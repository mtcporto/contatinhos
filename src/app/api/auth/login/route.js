import { db } from "@/lib/db";
import { verifyPassword, createToken, COOKIE_NAME, SESSION_DURATION_MS } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    if (!email || !password)
      return NextResponse.json({ error: "Preencha e-mail e senha." }, { status: 400 });

    const rs = await db.execute({
      sql: "SELECT id, name, password_hash FROM users WHERE email = ?",
      args: [email.toLowerCase().trim()],
    });
    if (rs.rows.length === 0)
      return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });

    const user = rs.rows[0];
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok)
      return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });

    const token = await createToken({ userId: user.id, name: user.name });
    const res = NextResponse.json({ ok: true, name: user.name });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: SESSION_DURATION_MS / 1000,
      path: "/",
    });
    return res;
  } catch (e) {
    console.error("[login]", e);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
