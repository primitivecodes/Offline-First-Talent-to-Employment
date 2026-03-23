import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const MessagesPage = () => {
  const { user } = useAuth();
  const [contacts, setContacts]   = useState([]);
  const [active,   setActive]     = useState(null); // selected contact
  const [messages, setMessages]   = useState([]);
  const [draft,    setDraft]      = useState('');
  const [loading,  setLoading]    = useState(false);
  const [newContactId, setNewContactId] = useState('');
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  useEffect(() => {
    loadContacts();
    return () => clearInterval(pollRef.current);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages every 8 seconds when a conversation is open
  useEffect(() => {
    clearInterval(pollRef.current);
    if (active) {
      pollRef.current = setInterval(() => loadMessages(active.id), 8000);
    }
    return () => clearInterval(pollRef.current);
  }, [active]);

  const loadContacts = async () => {
    try {
      const { data } = await api.get('/messages/contacts');
      setContacts(data.contacts || []);
    } catch { /* contacts endpoint is best-effort */ }
  };

  const selectContact = async (contact) => {
    setActive(contact);
    await loadMessages(contact.id);
  };

  const loadMessages = async (contactId) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/messages/${contactId}`);
      setMessages(data.messages || []);
    } catch { toast.error('Could not load messages.'); }
    finally { setLoading(false); }
  };

  const sendMessage = async () => {
    if (!draft.trim() || !active) return;
    const temp = draft;
    setDraft('');
    try {
      await api.post('/messages', { receiverId: active.id, content: temp });
      await loadMessages(active.id);
    } catch {
      toast.error('Message failed. Please try again.');
      setDraft(temp);
    }
  };

  const startNewConversation = async () => {
    if (!newContactId.trim()) return;
    try {
      const { data } = await api.get(`/users/${newContactId}`);
      setActive(data.user);
      setMessages([]);
      setNewContactId('');
      setContacts((c) => {
        if (!c.find((x) => x.id === data.user.id)) return [...c, data.user];
        return c;
      });
    } catch { toast.error('User not found. Check the ID.'); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (ts) => new Date(ts).toLocaleDateString();

  return (
    <div style={page}>
      {/* Contacts sidebar */}
      <div style={sidebar}>
        <div style={sideHeader}>
          <h3 style={sideTitle}>Messages</h3>
        </div>

        {/* New conversation */}
        <div style={newConv}>
          <input
            style={newInput}
            placeholder="Start chat by user ID..."
            value={newContactId}
            onChange={(e) => setNewContactId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startNewConversation()}
          />
          <button style={newBtn} onClick={startNewConversation}>→</button>
        </div>

        {/* Contact list */}
        <div style={contactList}>
          {contacts.length === 0 && (
            <p style={emptyContacts}>No conversations yet. Start one using the field above.</p>
          )}
          {contacts.map((c) => (
            <div
              key={c.id}
              style={contactRow(active?.id === c.id)}
              onClick={() => selectContact(c)}
            >
              <div style={contactAvatar}>{(c.name || 'U')[0].toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={contactName}>{c.name}</div>
                <div style={contactRole}>{c.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      {active ? (
        <div style={chatArea}>
          {/* Chat header */}
          <div style={chatHeader}>
            <div style={chatAvatar}>{(active.name || 'U')[0].toUpperCase()}</div>
            <div>
              <div style={chatName}>{active.name}</div>
              <div style={chatRoleBadge}>{active.role}</div>
            </div>
          </div>

          {/* Messages */}
          <div style={msgList}>
            {loading && messages.length === 0 && (
              <div style={loadingMsg}>Loading...</div>
            )}
            {messages.length === 0 && !loading && (
              <div style={loadingMsg}>No messages yet. Say hello!</div>
            )}

            {(() => {
              let lastDate = null;
              return messages.map((m) => {
                const mine   = m.senderId === user.id;
                const mDate  = formatDate(m.sentAt);
                const newDay = mDate !== lastDate;
                lastDate = mDate;

                return (
                  <div key={m.id}>
                    {newDay && <div style={dateDivider}>{mDate}</div>}
                    <div style={msgRow(mine)}>
                      {!mine && <div style={msgAvatar}>{(active.name||'U')[0].toUpperCase()}</div>}
                      <div style={bubble(mine)}>
                        <div style={bubbleText}>{m.content}</div>
                        <div style={bubbleTime}>
                          {formatTime(m.sentAt)}
                          {mine && <span style={{ marginLeft: 4 }}>{m.isRead ? '✓✓' : '✓'}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={inputRow}>
            <textarea
              style={inputBox}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
              rows={2}
            />
            <button style={sendBtn(!!draft.trim())} onClick={sendMessage} disabled={!draft.trim()}>
              ➤
            </button>
          </div>
        </div>
      ) : (
        <div style={noChat}>
          <div style={{ fontSize: 48 }}>💬</div>
          <h3 style={{ color: '#1e3a5f' }}>Your Messages</h3>
          <p style={{ color: '#94a3b8', maxWidth: 280, textAlign: 'center' }}>
            Select a contact from the left or start a new conversation by entering a user ID.
          </p>
        </div>
      )}
    </div>
  );
};

// ── Styles ─────────────────────────────────────────────
const page          = { display: 'flex', height: '100vh', fontFamily: 'Inter, sans-serif', background: '#f8fafc', overflow: 'hidden' };
const sidebar       = { width: 300, background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flexShrink: 0 };
const sideHeader    = { padding: '20px 20px 12px', borderBottom: '1px solid #e2e8f0' };
const sideTitle     = { margin: 0, fontSize: 18, fontWeight: 700, color: '#1e3a5f' };
const newConv       = { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 8 };
const newInput      = { flex: 1, padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' };
const newBtn        = { padding: '8px 14px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 };
const contactList   = { flex: 1, overflowY: 'auto' };
const emptyContacts = { padding: '20px 16px', color: '#94a3b8', fontSize: 13, textAlign: 'center', lineHeight: 1.6 };
const contactRow    = (active) => ({ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', background: active ? '#eff6ff' : 'transparent', borderLeft: active ? '3px solid #1d4ed8' : '3px solid transparent' });
const contactAvatar = { width: 40, height: 40, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#1e3a5f', flexShrink: 0 };
const contactName   = { fontWeight: 600, color: '#1e3a5f', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const contactRole   = { fontSize: 12, color: '#94a3b8', marginTop: 2 };
const chatArea      = { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const chatHeader    = { background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 24px', display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0 };
const chatAvatar    = { width: 44, height: 44, borderRadius: '50%', background: '#1d4ed8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, flexShrink: 0 };
const chatName      = { fontWeight: 700, color: '#1e3a5f', fontSize: 15 };
const chatRoleBadge = { fontSize: 12, color: '#94a3b8', marginTop: 2 };
const msgList       = { flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 4 };
const loadingMsg    = { textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 20 };
const dateDivider   = { textAlign: 'center', fontSize: 11, color: '#94a3b8', margin: '12px 0', fontWeight: 600 };
const msgRow        = (mine) => ({ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', gap: 8, marginBottom: 4, alignItems: 'flex-end' });
const msgAvatar     = { width: 28, height: 28, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#334155', flexShrink: 0 };
const bubble        = (mine) => ({ maxWidth: '66%', background: mine ? '#1d4ed8' : '#fff', color: mine ? '#fff' : '#1e3a5f', borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '10px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: mine ? 'none' : '1px solid #e2e8f0' });
const bubbleText    = { fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' };
const bubbleTime    = { fontSize: 10, marginTop: 4, opacity: 0.65, textAlign: 'right' };
const inputRow      = { borderTop: '1px solid #e2e8f0', padding: '14px 24px', display: 'flex', gap: 10, alignItems: 'flex-end', background: '#fff', flexShrink: 0 };
const inputBox      = { flex: 1, padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 12, fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none' };
const sendBtn       = (active) => ({ padding: '10px 18px', background: active ? '#1d4ed8' : '#e2e8f0', color: active ? '#fff' : '#94a3b8', border: 'none', borderRadius: 12, cursor: active ? 'pointer' : 'default', fontWeight: 700, fontSize: 18, transition: 'background 0.2s' });
const noChat        = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 };
