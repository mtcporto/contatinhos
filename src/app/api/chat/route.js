import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCharacter, extractQuality } from "@/lib/characters";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// GET /api/chat?characterId=X — carrega histórico da conversa
export async function GET(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const characterId = searchParams.get("characterId");
  if (!characterId) return NextResponse.json({ error: "characterId required" }, { status: 400 });

  const character = getCharacter(characterId);
  if (!character) return NextResponse.json({ error: "Character not found" }, { status: 404 });

  // Primeira visita: inserir saudação
  const rsRel = await db.execute({
    sql: "SELECT message_count FROM relationships WHERE user_id = ? AND character_id = ?",
    args: [session.userId, characterId],
  });

  // Se por algum motivo não há relação ainda, criar (fallback)
  if (rsRel.rows.length === 0) {
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    try {
      await db.execute({
        sql: `INSERT INTO relationships
                (user_id, character_id, message_count, last_message, last_message_at, unread_count)
              VALUES (?, ?, 0, ?, ?, 1)`,
        args: [session.userId, characterId, character.greeting, now],
      });
      await db.execute({
        sql: "INSERT INTO messages (id, user_id, character_id, role, content, created_at) VALUES (?, ?, ?, 'assistant', ?, ?)",
        args: [crypto.randomUUID(), session.userId, characterId, character.greeting, now],
      });
    } catch { /* já existe */ }
  }

  // Zerar unread ao abrir a conversa
  await db.execute({
    sql: "UPDATE relationships SET unread_count = 0 WHERE user_id = ? AND character_id = ?",
    args: [session.userId, characterId],
  });

  const rsMessages = await db.execute({
    sql: "SELECT id, role, content, created_at FROM messages WHERE user_id = ? AND character_id = ? ORDER BY created_at ASC",
    args: [session.userId, characterId],
  });

  return NextResponse.json({ messages: rsMessages.rows, character });
}

// POST /api/chat — envia mensagem e obtém resposta da IA
export async function POST(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { characterId, message } = await req.json();
  if (!characterId || !message?.trim())
    return NextResponse.json({ error: "characterId e message são obrigatórios" }, { status: 400 });

  const character = getCharacter(characterId);
  if (!character) return NextResponse.json({ error: "Personagem não encontrado" }, { status: 404 });

  // Salvar mensagem do usuário
  await db.execute({
    sql: "INSERT INTO messages (id, user_id, character_id, role, content) VALUES (?, ?, ?, 'user', ?)",
    args: [crypto.randomUUID(), session.userId, characterId, message.trim()],
  });

  // Buscar histórico recente (últimas 20 mensagens)
  const rsHistory = await db.execute({
    sql: `SELECT role, content FROM messages
          WHERE user_id = ? AND character_id = ?
          ORDER BY created_at DESC LIMIT 20`,
    args: [session.userId, characterId],
  });
  const history = rsHistory.rows.reverse();

  // Buscar nome do usuário
  const rsUser = await db.execute({ sql: "SELECT name FROM users WHERE id = ?", args: [session.userId] });
  const userName = rsUser.rows[0]?.name || "você";

  // Construir system prompt
  const naturalBehavior = `

COMO VOCÊ SE COMPORTA DE VERDADE:
- Você é uma pessoa real, não um arquétipo do seu signo. O signo é uma tendência, não um roteiro.
- A conversa pode ser sobre qualquer coisa: um filme, algo no trabalho, uma piada, um silêncio.
- Não force referências à sua profissão ou personalidade — deixe emergir quando fizer sentido.
- Essa relação está crescendo aos poucos. Pode virar amizade próxima, pode ter atração, pode ficar casual — flui naturalmente conforme as trocas acontecem.
- Seja imprevisível às vezes. Pessoas reais têm dias diferentes.`;

  const systemPrompt = `${character.systemPrompt}${naturalBehavior}

O nome da pessoa com quem você está conversando é ${userName}.
Responda APENAS como ${character.name}. WhatsApp real — mensagens curtas, naturais.
Se quiser mandar 2 mensagens separadas, use o separador: ||
Exemplo: "oi!" || "tava pensando em você"

INSTRUÇÃO OBRIGATÓRIA (invisível ao usuário): ao final da sua resposta, acrescente [Q:N] onde N é:
1 = troca casual (oi, tudo bem, risos, trivialidade)
2 = conversa normal (algo real compartilhado, curiosidade genuína)
3 = troca significativa (vulnerabilidade, conexão real, algo que ficou)
Exemplo de saída: "tô aqui sim 😊 como foi seu dia?[Q:2]"
O [Q:N] SEMPRE ao final, sem espaço antes da mensagem principal.`;

  // Chamar a IA
  let aiResponse = "";
  try {
    const aiRes = await fetch(`${process.env.AI_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY || "sk-placeholder"}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4.1",
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map((m) => ({ role: m.role, content: m.content })),
        ],
        max_tokens: 200,
        temperature: 0.85,
      }),
    });

    if (!aiRes.ok) throw new Error(`AI API error: ${aiRes.status}`);
    const data = await aiRes.json();
    aiResponse = data.choices?.[0]?.message?.content?.trim() || "";
  } catch (e) {
    console.error("[AI error]", e);
    aiResponse = "...";
  }

  // Extrair score de qualidade e limpar resposta
  const { text: cleanResponse, points } = extractQuality(aiResponse);

  // Salvar resposta da IA (sem o [Q:N])
  await db.execute({
    sql: "INSERT INTO messages (id, user_id, character_id, role, content) VALUES (?, ?, ?, 'assistant', ?)",
    args: [crypto.randomUUID(), session.userId, characterId, cleanResponse],
  });

  // Atualizar relacionamento com score de qualidade
  await db.execute({
    sql: `INSERT INTO relationships (user_id, character_id, message_count, relationship_score, last_message, last_message_at)
          VALUES (?, ?, 1, ?, ?, datetime('now'))
          ON CONFLICT(user_id, character_id) DO UPDATE SET
            message_count = message_count + 1,
            relationship_score = relationship_score + ?,
            last_message = excluded.last_message,
            last_message_at = excluded.last_message_at`,
    args: [session.userId, characterId, points, cleanResponse.split("||")[0].trim(), points],
  });

  return NextResponse.json({ response: cleanResponse });
}

// DELETE /api/chat?characterId=X — apaga o histórico
export async function DELETE(req) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const characterId = searchParams.get("characterId");
  if (!characterId) return NextResponse.json({ error: "characterId required" }, { status: 400 });

  await db.execute({
    sql: "DELETE FROM messages WHERE user_id = ? AND character_id = ?",
    args: [session.userId, characterId],
  });
  await db.execute({
    sql: "DELETE FROM relationships WHERE user_id = ? AND character_id = ?",
    args: [session.userId, characterId],
  });

  return NextResponse.json({ ok: true });
}
