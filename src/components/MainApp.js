"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Search, ArrowLeft, Info, Trash2, X, User, MapPin, Briefcase, Star } from "lucide-react";
import { AVATAR_STYLES } from "@/lib/characters";

// ─── Avatar ─────────────────────────────────────────────────────────────────
const FEMALE_ADVENTURER_HAIR = [
  "long01","long02","long03","long04","long05","long06","long07","long08",
  "long09","long10","long11","long12","long13","long14","long15","long16",
  "long17","long18","long19","long20","long21","long22","long23","long24","long25","long26",
].map((h) => `hair[]=${h}`).join("&");

const MALE_ADVENTURER_HAIR = [
  "short01","short02","short03","short04","short05","short06","short07",
  "short08","short09","short10","short11","short12","short13","short14","short15","short16",
].map((h) => `hair[]=${h}`).join("&");

const FEMALE_BIGSMILE_HAIR = ["wavyBob","curlyBob","straightHair","braids","bunHair","froBun","bangs"]
  .map((h) => `hair[]=${h}`).join("&");
const MALE_BIGSMILE_HAIR = ["shortHair","mohawk","bowlCutHair","shavedHead","halfShavedHead","curlyShortHair"]
  .map((h) => `hair[]=${h}`).join("&");

function buildAvatarUrl(id, style, gender) {
  const base = `https://api.dicebear.com/9.x/${style}/svg?seed=${id}`;
  const isFemale = gender === "F";
  if (style === "adventurer") return `${base}&${isFemale ? FEMALE_ADVENTURER_HAIR : MALE_ADVENTURER_HAIR}`;
  if (style === "big-smile")  return `${base}&${isFemale ? FEMALE_BIGSMILE_HAIR : MALE_BIGSMILE_HAIR}`;
  return base; // lorelei, lorelei-neutral, adventurer-neutral: sem filtro de cabelo
}

function Avatar({ contact, size = "md" }) {
  const [failed, setFailed] = useState(false);
  const cls = size === "sm" ? "avatar avatar-sm" : "avatar";
  const style = AVATAR_STYLES[contact.id] || (contact.gender === "F" ? "adventurer" : "adventurer-neutral");
  const url = buildAvatarUrl(contact.id, style, contact.gender);

  return (
    <div className={cls} style={{ background: contact.color, overflow: "hidden", padding: 0, position: "relative" }}>
      <span style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: "inherit",
      }}>
        {contact.initials}
      </span>
      {!failed && (
        <img
          src={url}
          alt={contact.name}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

// ─── Stars ──────────────────────────────────────────────────────────────────
function Stars({ level, max = 5 }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {Array.from({ length: max }, (_, i) => (
        <div key={i} className={`star-dot ${i < level ? "filled" : ""}`} />
      ))}
    </div>
  );
}

// ─── Format Time ────────────────────────────────────────────────────────────
function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts + (ts.includes("Z") ? "" : "Z"));
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatContactTime(ts) {
  if (!ts) return "";
  const d = new Date(ts + (ts.includes("Z") ? "" : "Z"));
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 86400) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (diff < 172800) return "ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function isSameDay(a, b) {
  const da = new Date(a + (a?.includes("Z") ? "" : "Z"));
  const db = new Date(b + (b?.includes("Z") ? "" : "Z"));
  return da.toDateString() === db.toDateString();
}

function dayLabel(ts) {
  const d = new Date(ts + (ts?.includes("Z") ? "" : "Z"));
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

// ─── Avatar Picker Modal ──────────────────────────────────────────────────────
const PICKER_OPTIONS = [
  // adventurer
  { key: "adventurer/sunny", style: "adventurer", seed: "sunny" },
  { key: "adventurer/ocean", style: "adventurer", seed: "ocean" },
  { key: "adventurer/violet", style: "adventurer", seed: "violet" },
  { key: "adventurer/cactus", style: "adventurer", seed: "cactus" },
  // adventurer-neutral
  { key: "adventurer-neutral/storm", style: "adventurer-neutral", seed: "storm" },
  { key: "adventurer-neutral/cedar", style: "adventurer-neutral", seed: "cedar" },
  { key: "adventurer-neutral/orbit", style: "adventurer-neutral", seed: "orbit" },
  { key: "adventurer-neutral/ember", style: "adventurer-neutral", seed: "ember" },
  // big-smile
  { key: "big-smile/nova", style: "big-smile", seed: "nova" },
  { key: "big-smile/pixel", style: "big-smile", seed: "pixel" },
  { key: "big-smile/jazz", style: "big-smile", seed: "jazz" },
  { key: "big-smile/comet", style: "big-smile", seed: "comet" },
  // lorelei
  { key: "lorelei/river", style: "lorelei", seed: "river" },
  { key: "lorelei/fern", style: "lorelei", seed: "fern" },
  { key: "lorelei/amber", style: "lorelei", seed: "amber" },
  { key: "lorelei/dusk", style: "lorelei", seed: "dusk" },
  // lorelei-neutral
  { key: "lorelei-neutral/pine", style: "lorelei-neutral", seed: "pine" },
  { key: "lorelei-neutral/slate", style: "lorelei-neutral", seed: "slate" },
  { key: "lorelei-neutral/tide", style: "lorelei-neutral", seed: "tide" },
  { key: "lorelei-neutral/mist", style: "lorelei-neutral", seed: "mist" },
];

function AvatarPickerModal({ current, onSelect, onClose }) {
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        background: "var(--wa-panel)",
        border: "1px solid var(--wa-border)",
        borderRadius: 16,
        zIndex: 50,
        padding: 24,
        width: "min(420px, 95vw)",
        maxHeight: "80dvh",
        overflowY: "auto",
        animation: "fadeUp 0.2s ease",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>Escolha sua foto</span>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {PICKER_OPTIONS.map((opt) => {
            const url = `https://api.dicebear.com/9.x/${opt.style}/svg?seed=${opt.seed}`;
            const isSelected = current === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => onSelect(opt.key)}
                style={{
                  background: isSelected ? "var(--wa-accent)" : "var(--wa-surface2)",
                  border: isSelected ? "2px solid var(--wa-accent)" : "2px solid transparent",
                  borderRadius: 12,
                  padding: 4,
                  cursor: "pointer",
                  aspectRatio: "1",
                  overflow: "hidden",
                  transition: "border 0.15s",
                }}
              >
                <img src={url} alt={opt.seed} style={{ width: "100%", height: "100%", display: "block" }} />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── User Avatar ──────────────────────────────────────────────────────────────
function UserAvatar({ avatarKey, name, size = 36 }) {
  if (avatarKey) {
    const [style, seed] = avatarKey.split("/");
    const url = `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}`;
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        overflow: "hidden", flexShrink: 0,
        background: "var(--wa-accent)",
        cursor: "pointer",
      }}>
        <img src={url} alt={name} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "var(--wa-accent)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 700, fontSize: size * 0.38,
      flexShrink: 0, cursor: "pointer",
    }}>
      {name?.[0]?.toUpperCase() || "U"}
    </div>
  );
}
function ProfileDrawer({ contact, onClose, onClearChat }) {
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <button className="icon-btn" onClick={onClose} style={{ alignSelf: "flex-start", marginBottom: -8 }}>
            <X size={20} />
          </button>
          <Avatar contact={contact} />
          <div className="drawer-name">{contact.name}</div>
          <div className="drawer-tag">{contact.signSymbol} {contact.signName} · {contact.age} anos</div>
          <Stars level={contact.relationshipLevel} />
          <div style={{ fontSize: 12, color: "var(--wa-text-sec)" }}>{contact.relationshipLabel}</div>
        </div>

        <div className="drawer-section">
          <div className="drawer-section-title">Sobre</div>
          <div className="drawer-row"><Briefcase size={16} /> {contact.profession}</div>
          <div className="drawer-row"><MapPin size={16} /> {contact.city || "Brasil"}</div>
        </div>

        <div className="drawer-section">
          <div className="drawer-section-title">Relacionamento</div>
          <div style={{ marginBottom: 8 }}>
            <Stars level={contact.relationshipLevel} />
          </div>
          <div style={{ fontSize: 13, color: "var(--wa-text-sec)" }}>
            {contact.relationshipLabel} · {contact.messageCount || 0} mensagens · {contact.relationshipScore || 0}pts
          </div>
        </div>

        <div className="drawer-section">
          <div className="drawer-section-title">Conversa</div>
          <button
            className="icon-btn danger"
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", width: "100%", borderRadius: 8 }}
            onClick={() => { onClearChat(); onClose(); }}
          >
            <Trash2 size={16} />
            <span style={{ fontSize: 14, color: "var(--wa-danger)" }}>Apagar conversa</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Contact Item ────────────────────────────────────────────────────────────
function ContactItem({ contact, isActive, onClick }) {
  return (
    <div className={`contact-item ${isActive ? "active" : ""}`} onClick={onClick}>
      <Avatar contact={contact} />
      <div className="contact-info">
        <div className="contact-name" style={{ fontWeight: contact.unreadCount > 0 ? 700 : 500 }}>
          {contact.name}
        </div>
        <div className="contact-meta">
          <span className="contact-sign">{contact.signSymbol}</span>
          <span className="contact-preview" style={{ color: contact.unreadCount > 0 ? "var(--wa-text)" : undefined }}>
            {contact.lastMessage || <em style={{ opacity: 0.5 }}>Diga olá</em>}
          </span>
        </div>
      </div>
      <div className="contact-side">
        {contact.lastMessageAt && (
          <span className="contact-time" style={{ color: contact.unreadCount > 0 ? "var(--wa-accent)" : undefined }}>
            {formatContactTime(contact.lastMessageAt)}
          </span>
        )}
        {contact.unreadCount > 0 ? (
          <span className="unread-badge">{contact.unreadCount}</span>
        ) : contact.relationshipLevel > 1 ? (
          <span className="stars">{"★".repeat(contact.relationshipLevel)}</span>
        ) : null}
      </div>
    </div>
  );
}

// ─── Typing Indicator ────────────────────────────────────────────────────────
function TypingIndicator({ contact }) {
  return (
    <div className="msg-row in">
      <Avatar contact={contact} size="sm" />
      <div className="typing-indicator">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  );
}

// ─── Messages Area ────────────────────────────────────────────────────────────
function MessagesArea({ messages, contact, isTyping, bottomRef }) {
  // Group messages to show date dividers
  let lastDate = null;

  return (
    <div className="messages-area">
      {messages.map((msg, i) => {
        const ts = msg.created_at || "";
        const showDate = !lastDate || !isSameDay(lastDate, ts);
        if (ts) lastDate = ts;

        // Split AI messages by || separator into multiple bubbles
        const parts = msg.role === "assistant"
          ? msg.content.split("||").map((s) => s.trim()).filter(Boolean)
          : [msg.content];

        return (
          <div key={msg.id || i}>
            {showDate && ts && (
              <div className="date-divider"><span>{dayLabel(ts)}</span></div>
            )}
            {parts.map((part, pi) => (
              <div key={pi} className={`msg-row ${msg.role === "user" ? "out" : "in"}`}>
                {msg.role === "assistant" && pi === 0 && <Avatar contact={contact} size="sm" />}
                {msg.role === "assistant" && pi > 0 && <div style={{ width: 36 }} />}
                <div className="msg-bubble">
                  {part}
                  <span className="msg-time">{formatTime(ts)}</span>
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {isTyping && <TypingIndicator contact={contact} />}
      <div ref={bottomRef} />
    </div>
  );
}

// ─── Chat Window ──────────────────────────────────────────────────────────────
function ChatWindow({ contact, messages, isTyping, onSend, onBack, onShowProfile, onClearChat }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    setInput("");
    textareaRef.current?.focus();
  }, [contact?.id]);

  const send = () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;
    onSend(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  };

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-header">
        <button className="icon-btn back-btn" onClick={onBack}><ArrowLeft size={22} /></button>
        <Avatar contact={contact} />
        <div className="chat-header-info">
          <div className="chat-header-name">{contact.name}</div>
          <div className="chat-header-sub">
            {contact.signSymbol} {contact.signName} · {contact.profession}
            {isTyping && <span style={{ marginLeft: 8, color: "var(--wa-accent)" }}>digitando...</span>}
          </div>
        </div>
        <div className="chat-header-actions">
          <button className="icon-btn" onClick={() => setShowProfile(true)} title="Perfil">
            <Info size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <MessagesArea
        messages={messages}
        contact={contact}
        isTyping={isTyping}
        bottomRef={bottomRef}
      />

      {/* Input */}
      <div className="chat-input-area">
        <div className="chat-input-wrap">
          <textarea
            ref={textareaRef}
            className="chat-input"
            rows={1}
            placeholder={`Mensagem para ${contact.name.split(" ")[0]}...`}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKey}
          />
        </div>
        <button className="send-btn" onClick={send} disabled={!input.trim() || isTyping}>
          <Send size={20} />
        </button>
      </div>

      {/* Profile Drawer */}
      {showProfile && (
        <ProfileDrawer
          contact={contact}
          onClose={() => setShowProfile(false)}
          onClearChat={onClearChat}
        />
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ contacts, selected, onSelect, user, onLogout, onChangeAvatar, mobileHidden }) {
  const [search, setSearch] = useState("");
  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.signName.toLowerCase().includes(search.toLowerCase()) ||
    c.profession.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`sidebar ${mobileHidden ? "hidden" : ""}`}>
      <div className="sidebar-header">
        <div onClick={onChangeAvatar} title="Mudar foto de perfil">
          <UserAvatar avatarKey={user?.avatar_key} name={user?.name} />
        </div>
        <span className="sidebar-title">Contatinhos</span>
        <button className="icon-btn" onClick={onLogout} title="Sair">
          <User size={18} />
        </button>
      </div>

      <div className="sidebar-search">
        <div className="search-box">
          <Search size={16} color="var(--wa-text-sec)" />
          <input
            placeholder="Pesquisar contato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="contacts-list">
        {filtered.map((c) => (
          <ContactItem
            key={c.id}
            contact={c}
            isActive={selected?.id === c.id}
            onClick={() => onSelect(c)}
          />
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--wa-text-sec)", fontSize: 14 }}>
            Nenhum contato encontrado
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">💬</div>
      <h2>Contatinhos</h2>
      <p>Selecione um contato para começar uma conversa. Você tem 24 personagens esperando por você.</p>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function MainApp({ userName }) {
  const [user, setUser] = useState({ name: userName, avatar_key: null });
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const loadingRef = useRef(false);

  // Load user profile
  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => { if (d.user) setUser(d.user); }).catch(() => {});
  }, []);

  // Load contacts
  const loadContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/contacts");
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch {}
  }, []);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  // Load messages when contact is selected
  const selectContact = useCallback(async (contact) => {
    setSelected(contact);
    setMessages([]);
    setMobileShowChat(true);
    // Zerar badge localmente de imediato
    setContacts((prev) =>
      prev.map((c) => c.id === contact.id ? { ...c, unreadCount: 0 } : c)
    );
    try {
      const res = await fetch(`/api/chat?characterId=${contact.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {}
  }, []);

  // Send message
  const sendMessage = useCallback(async (text) => {
    if (!selected || loadingRef.current) return;
    loadingRef.current = true;

    const optimistic = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
    };
    setMessages((prev) => [...prev, optimistic]);
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: selected.id, message: text }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: data.response,
          created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
        };
        setMessages((prev) => [...prev, aiMsg]);

        // Atualizar e reordenar contato para o topo
        setContacts((prev) => {
          const updated = prev.map((c) =>
            c.id === selected.id
              ? {
                  ...c,
                  lastMessage: data.response.split("||")[0].trim(),
                  lastMessageAt: aiMsg.created_at,
                  messageCount: (c.messageCount || 0) + 1,
                  unreadCount: 0,
                }
              : c
          );
          // Mover para o topo
          updated.sort((a, b) => {
            if (a.lastMessageAt && b.lastMessageAt)
              return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
            if (a.lastMessageAt) return -1;
            if (b.lastMessageAt) return 1;
            return a.name.localeCompare(b.name);
          });
          return updated;
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Desculpa, não consegui responder agora. Tenta de novo?",
          created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
        },
      ]);
    } finally {
      setIsTyping(false);
      loadingRef.current = false;
    }
  }, [selected]);

  // Clear chat
  const clearChat = useCallback(async () => {
    if (!selected) return;
    await fetch(`/api/chat?characterId=${selected.id}`, { method: "DELETE" });
    setMessages([]);
    setContacts((prev) =>
      prev.map((c) =>
        c.id === selected.id
          ? { ...c, lastMessage: null, lastMessageAt: null, messageCount: 0, relationshipLevel: 1 }
          : c
      )
    );
    // Reload greeting
    selectContact(selected);
  }, [selected, selectContact]);

  // Change avatar
  const changeAvatar = useCallback(async (avatarKey) => {
    await fetch("/api/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarKey }),
    });
    setUser((u) => ({ ...u, avatar_key: avatarKey }));
    setShowAvatarPicker(false);
  }, []);

  // Logout
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const goBack = () => {
    setMobileShowChat(false);
    setSelected(null);
  };

  return (
    <div className="app-root">
      <Sidebar
        contacts={contacts}
        selected={selected}
        onSelect={selectContact}
        user={user}
        onLogout={logout}
        onChangeAvatar={() => setShowAvatarPicker(true)}
        mobileHidden={mobileShowChat}
      />

      {selected ? (
        <ChatWindow
          contact={{
            ...selected,
            ...contacts.find((c) => c.id === selected.id),
          }}
          messages={messages}
          isTyping={isTyping}
          onSend={sendMessage}
          onBack={goBack}
          onClearChat={clearChat}
        />
      ) : (
        <EmptyState />
      )}

      {showAvatarPicker && (
        <AvatarPickerModal
          current={user?.avatar_key}
          onSelect={changeAvatar}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
    </div>
  );
}
