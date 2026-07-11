import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { db } from "@/lib/db";
import { CHARACTERS, getRelationshipLevel, RELATIONSHIP_LABELS } from "@/lib/characters";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Buscar relacionamentos existentes
  const rs = await db.execute({
    sql: `SELECT character_id, message_count, relationship_score, last_message, last_message_at, unread_count
          FROM relationships WHERE user_id = ?`,
    args: [session.userId],
  });

  const relMap = {};
  for (const row of rs.rows) relMap[row.character_id] = row;

  // Confirmar que o usuário existe no DB antes de inserir (evita FK violation)
  const rsUser = await db.execute({ sql: "SELECT id FROM users WHERE id = ?", args: [session.userId] });
  if (rsUser.rows.length === 0) return NextResponse.json({ error: "User not found" }, { status: 401 });

  // Pré-popular greetings para personagens ainda sem conversa (sequencial para não sobrecarregar Turso)
  const missing = CHARACTERS.filter((c) => !relMap[c.id]);
  for (const c of missing) {
    const msgId = crypto.randomUUID();
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    try {
      await db.execute({
        sql: `INSERT INTO relationships
                (user_id, character_id, message_count, last_message, last_message_at, unread_count)
              VALUES (?, ?, 0, ?, ?, 1)`,
        args: [session.userId, c.id, c.greeting, now],
      });
      await db.execute({
        sql: `INSERT INTO messages (id, user_id, character_id, role, content, created_at)
              VALUES (?, ?, ?, 'assistant', ?, ?)`,
        args: [msgId, session.userId, c.id, c.greeting, now],
      });
      relMap[c.id] = { message_count: 0, last_message: c.greeting, last_message_at: now, unread_count: 1 };
    } catch {
      // já existia ou outro erro não-crítico — ignora
    }
  }

  const contacts = CHARACTERS.map((c) => {
    const rel = relMap[c.id] || { message_count: 0, relationship_score: 0, last_message: null, last_message_at: null, unread_count: 0 };
    const level = getRelationshipLevel(Number(rel.relationship_score ?? 0));
    return {
      id: c.id,
      name: c.name,
      sign: c.sign,
      signSymbol: c.signSymbol,
      signName: c.signName,
      gender: c.gender,
      age: c.age,
      profession: c.profession,
      color: c.color,
      initials: c.initials,
      lastMessage: rel.last_message,
      lastMessageAt: rel.last_message_at,
      messageCount: Number(rel.message_count),
      relationshipScore: Number(rel.relationship_score ?? 0),
      unreadCount: Number(rel.unread_count ?? 0),
      relationshipLevel: level,
      relationshipLabel: RELATIONSHIP_LABELS[level],
    };
  });

  // Ordenar: não lidos primeiro, depois por data, depois por nome
  contacts.sort((a, b) => {
    if (a.lastMessageAt && b.lastMessageAt)
      return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
    if (a.lastMessageAt) return -1;
    if (b.lastMessageAt) return 1;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({ contacts });
}
