import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function PUT(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { avatarKey } = await req.json();
  if (!avatarKey) return NextResponse.json({ error: "avatarKey required" }, { status: 400 });

  await db.execute({
    sql: "UPDATE users SET avatar_key = ? WHERE id = ?",
    args: [avatarKey, session.userId],
  });

  return NextResponse.json({ ok: true, avatarKey });
}
