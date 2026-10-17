import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUp, MessageCircle, Plus, Sprout } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { advisoryApi, getApiErrorMessage } from '../api/client';
import type { AdvisoryMessage, AdvisorySession } from '../api/types';
import { getNextPage } from '../api/pagination';
import { ErrorState, LoadingState, PageHeader } from '../components/Feedback';
import { formatDate } from '../components/formatDate';

export function AdvisoryPage() {
  const location = useLocation();
  const initialSession = (location.state as { sessionId?: string } | null)?.sessionId;
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>(initialSession);
  const [newConversation, setNewConversation] = useState(false);
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState('');
  const queryClient = useQueryClient();
  const messagesEnd = useRef<HTMLDivElement>(null);
  const sessionsQuery = useInfiniteQuery({
    queryKey: ['advisory', 'sessions'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => advisoryApi.getSessions(pageParam),
    getNextPageParam: getNextPage,
  });
  const sessions = useMemo(
    () => sessionsQuery.data?.pages.flatMap((page) => page.results) ?? [],
    [sessionsQuery.data],
  );
  const activeSessionId = newConversation
    ? undefined
    : selectedSessionId ?? sessions[0]?.id;
  const activeSession = sessions.find((session) => session.id === activeSessionId);
  const lastMessagePage = Math.max(
    1,
    Math.ceil((activeSession?.message_count ?? 0) / 20),
  );
  const messagesQuery = useInfiniteQuery({
    queryKey: ['advisory', 'messages', activeSessionId],
    initialPageParam: lastMessagePage,
    queryFn: ({ pageParam }) =>
      activeSessionId
        ? advisoryApi.getMessages(activeSessionId, pageParam)
        : Promise.resolve({ count: 0, next: null, previous: null, results: [] }),
    getPreviousPageParam: (firstPage, _pages, firstPageParam) =>
      firstPage.previous ? firstPageParam - 1 : undefined,
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.next ? lastPageParam + 1 : undefined,
    enabled: Boolean(activeSessionId),
  });
  const messages = useMemo(
    () => messagesQuery.data?.pages.flatMap((page) => page.results) ?? [],
    [messagesQuery.data],
  );
  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      advisoryApi.sendMessage(content, activeSessionId),
    onSuccess: async (response) => {
      setSelectedSessionId(response.session_id);
      setNewConversation(false);
      setDraft('');
      setSendError('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['advisory', 'sessions'] }),
        queryClient.invalidateQueries({ queryKey: ['advisory', 'messages', response.session_id] }),
      ]);
    },
    onError: (error: unknown) => setSendError(getApiErrorMessage(error)),
  });
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, sendMutation.isPending]);

  function startNewConversation() {
    setNewConversation(true);
    setSelectedSessionId(undefined);
    setDraft('');
    setSendError('');
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sendMutation.isPending) return;
    setSendError('');
    sendMutation.mutate(content);
  }

  const requestError = sessionsQuery.error;

  return (
    <>
      <PageHeader eyebrow="AGRICULTURAL GUIDANCE" title="Ask an advisor" description="Ask questions about crop care, planting, pests, diseases, or harvesting." action={<button className="button button-primary" onClick={startNewConversation} type="button"><Plus size={17} aria-hidden="true" /> New conversation</button>} />
      {requestError ? <ErrorState error={requestError} onRetry={() => void sessionsQuery.refetch()} title="Conversation history unavailable" /> : null}
      <div className="advisory-layout">
        <aside className="history-panel" aria-label="Advisory conversation history">
          <div className="history-panel-heading"><span>CONVERSATIONS</span><span>{sessions.length}</span></div>
          {sessionsQuery.isPending ? <LoadingState label="Loading history…" /> : sessions.length === 0 ? (
            <p className="history-empty">Your saved conversations will appear here.</p>
          ) : (
            <div className="session-list">
              {sessions.map((session) => <SessionButton active={session.id === activeSessionId} key={session.id} onClick={() => { setNewConversation(false); setSelectedSessionId(session.id); }} session={session} />)}
            </div>
          )}
          {sessionsQuery.hasNextPage ? <button className="history-more" disabled={sessionsQuery.isFetchingNextPage} onClick={() => void sessionsQuery.fetchNextPage()} type="button">{sessionsQuery.isFetchingNextPage ? 'Loading…' : 'Load older conversations'}</button> : null}
          <button className="history-new" onClick={startNewConversation} type="button"><Plus size={16} /> Start a new question</button>
        </aside>
        <section className="chat-panel" aria-label="Agricultural advisor chat">
          <div className="chat-header">
            <span className="chat-avatar"><Sprout size={20} aria-hidden="true" /></span>
            <span><strong>{activeSession?.title || activeSession?.crop_type || 'AgriSmart advisor'}</strong><small>Guidance for your farm · {activeSession ? `${activeSession.message_count} messages` : 'New conversation'}</small></span>
          </div>
          {messagesQuery.isError ? <div className="chat-error"><ErrorState error={messagesQuery.error} onRetry={() => void messagesQuery.refetch()} title="Could not load this conversation" /></div> : (
            <>
              <div className="chat-messages" aria-live="polite">
                {messagesQuery.isPending && activeSessionId ? <LoadingState label="Loading your conversation…" /> : null}
                {messagesQuery.hasPreviousPage ? <button className="load-earlier" disabled={messagesQuery.isFetchingPreviousPage} onClick={() => void messagesQuery.fetchPreviousPage()} type="button">{messagesQuery.isFetchingPreviousPage ? 'Loading earlier messages…' : 'Load earlier messages'}</button> : null}
                {messages.length === 0 && !messagesQuery.isPending ? (
                  <div className="chat-welcome"><span className="chat-welcome-icon"><LeafIcon /></span><h2>What is happening on your farm?</h2><p>Ask a question to start. Your replies and conversation history are saved to your AgriSmart account.</p><button className="suggestion-chip" onClick={() => setDraft('When is the best time to plant maize?')} type="button">When is the best time to plant maize?</button></div>
                ) : messages.map((message) => <MessageBubble key={message.id} message={message} />)}
                {sendMutation.isPending ? <div className="message-row advisor-row"><span className="typing-dot" aria-label="Advisor is responding" /><span className="message-bubble advisor-bubble">Getting guidance…</span></div> : null}
                <div ref={messagesEnd} />
              </div>
              {sendError ? <p className="form-error chat-send-error" role="alert">{sendError}</p> : null}
              <form className="chat-composer" onSubmit={submit}>
                <label className="sr-only" htmlFor="advisor-message">Message the agricultural advisor</label>
                <textarea id="advisor-message" maxLength={2000} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Ask about your crops…" rows={2} value={draft} />
                <button aria-label="Send message" className="send-button" disabled={!draft.trim() || sendMutation.isPending} type="submit"><ArrowUp size={19} aria-hidden="true" /></button>
              </form>
              <p className="chat-disclaimer">Guidance is informational. Consult a local extension officer for critical decisions.</p>
            </>
          )}
        </section>
      </div>
    </>
  );
}

function SessionButton({ session, active, onClick }: { session: AdvisorySession; active: boolean; onClick: () => void }) {
  return (
    <button aria-current={active ? 'true' : undefined} className={`session-button${active ? ' session-button-active' : ''}`} onClick={onClick} type="button">
      <span className="session-icon"><MessageCircle size={16} aria-hidden="true" /></span>
      <span className="session-copy"><strong>{session.title || session.crop_type || 'Farm conversation'}</strong><small>{session.last_message?.content || 'No messages yet'}</small><small>{formatDate(session.updated_at)}</small></span>
    </button>
  );
}

function MessageBubble({ message }: { message: AdvisoryMessage }) {
  const isUser = message.sender === 'user';
  return (
    <div className={`message-row${isUser ? ' user-row' : ' advisor-row'}`}>
      {!isUser ? <span className="message-avatar"><Sprout size={14} aria-hidden="true" /></span> : null}
      <div className={`message-bubble${isUser ? ' user-bubble' : ' advisor-bubble'}`}>
        <p>{message.content}</p>
        {!isUser && message.sources.length ? <small className="message-sources">Sources: {message.sources.join(', ')}</small> : null}
        <time dateTime={message.created_at}>{formatDate(message.created_at)}</time>
      </div>
    </div>
  );
}

function LeafIcon() {
  return <MessageCircle size={22} aria-hidden="true" />;
}
