import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ user: null }, { status: 401 });

  try {
    const rs = await db.execute({ sql: "SELECT id, name, email, avatar_key FROM users WHERE id = ?", args: [session.userId] });
    if (rs.rows.length === 0) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json({ user: rs.rows[0] });
  } catch {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
