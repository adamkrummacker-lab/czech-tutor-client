import { useState, useEffect, useRef, useCallback } from 'react'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

export default function Chat({ api, user, token, authHeaders, topic, viewingStudent, onGoToFinalTest }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [listening, setListening] = useState(false)
  const [speakingMsgId, setSpeakingMsgId] = useState(null)
  const [evaluation, setEvaluation] = useState(null)
  const [evaluating, setEvaluating] = useState(false)
  const [xpNotif, setXpNotif] = useState(null)
  const [badgeNotif, setBadgeNotif] = useState(null)
  const [selectedWord, setSelectedWord] = useState(null)
  const [messageCount, setMessageCount] = useState(0)
  const [minMessages, setMinMessages] = useState(topic.min_messages || 10)
  const [submitted, setSubmitted] = useState(!!topic.submitted_at)
  const [submitting, setSubmitting] = useState(false)
  const messagesEndRef = useRef(null)
  const recognitionRef = useRef(null)

  const isReadOnly = user.role === 'teacher' && viewingStudent
  const isStudent = user.role === 'student'

  useEffect(() => {
    const url = isReadOnly
      ? `${api}/api/chat/${topic.id}/student/${viewingStudent.id}`
      : `${api}/api/chat/${topic.id}`
    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setMessages(data)
        setMessageCount(data.filter(m => m.role === 'user').length)
      })
  }, [topic.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!isStudent || messages.length === 0) return
    const last = messages[messages.length - 1]
    if (last.role === 'assistant' && !sending) {
      speakText(last.content, messages.length - 1)
    }
  }, [messages, sending])

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
      if (recognitionRef.current) recognitionRef.current.abort()
    }
  }, [])

  const speakText = useCallback((text, msgIndex) => {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'cs-CZ'
    utterance.rate = 0.9
    utterance.onstart = () => setSpeakingMsgId(msgIndex)
    utterance.onend = () => setSpeakingMsgId(null)
    utterance.onerror = () => setSpeakingMsgId(null)
    window.speechSynthesis.speak(utterance)
  }, [])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel()
    setSpeakingMsgId(null)
  }, [])

  const toggleListening = useCallback(() => {
    if (!SpeechRecognition) {
      alert('Tvůj prohlížeč nepodporuje hlasové ovládání. Zkus Chrome.')
      return
    }
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'cs-CZ'
    recognition.interimResults = true
    recognition.continuous = false
    recognitionRef.current = recognition
    recognition.onstart = () => setListening(true)
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map(r => r[0].transcript).join('')
      setInput(transcript)
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognition.start()
  }, [listening])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || sending) return
    setSending(true)
    stopSpeaking()

    const userMsg = { role: 'user', content: input, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')

    try {
      const res = await fetch(`${api}/api/chat/${topic.id}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ message: input }),
      })
      const data = await res.json()
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply, timestamp: new Date().toISOString() }])
        if (data.messageCount != null) setMessageCount(data.messageCount)
        if (data.minMessages != null) setMinMessages(data.minMessages)
        // Show XP notification
        if (data.xp) {
          setXpNotif(`+8 XP · Celkem: ${data.xp} XP`)
          setTimeout(() => setXpNotif(null), 3000)
        }
        // Show badge notification
        if (data.newBadges?.length) {
          setBadgeNotif(data.newBadges[0])
          setTimeout(() => setBadgeNotif(null), 4000)
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Chyba při komunikaci s AI. Zkus to znovu.', timestamp: new Date().toISOString() }])
    } finally {
      setSending(false)
    }
  }

  const evaluate = async () => {
    setEvaluating(true)
    try {
      const res = await fetch(`${api}/api/chat/${topic.id}/evaluate`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ studentId: viewingStudent?.id }),
      })
      const data = await res.json()
      setEvaluation(data.evaluation || data.error)
    } catch {
      setEvaluation('Chyba při hodnocení.')
    } finally {
      setEvaluating(false)
    }
  }

  const handleWordClick = (word) => {
    const clean = word.replace(/[.,!?;:""„"()]/g, '').trim()
    if (clean.length < 2) return
    setSelectedWord(clean)
  }

  const saveWord = async (translation) => {
    await fetch(`${api}/api/vocabulary`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ word: selectedWord, translation }),
    })
    setSelectedWord(null)
  }

  const exportChat = () => {
    const studentId = viewingStudent?.id || user.id
    window.open(`${api}/api/chat/${topic.id}/export?studentId=${studentId}`, '_blank')
  }

  const submitWork = async () => {
    if (submitted || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`${api}/api/topics/${topic.id}/submit`, {
        method: 'POST',
        headers: authHeaders(),
      })
      const data = await res.json()
      if (data.ok) {
        setSubmitted(true)
        if (data.xp) {
          setXpNotif(`+15 XP za odevzdání! Celkem: ${data.xp} XP`)
          setTimeout(() => setXpNotif(null), 3000)
        }
        setTimeout(() => {
          if (window.confirm('Gratuluji k dokončení lekce! Chceš si udělat závěrečný test?')) {
            onGoToFinalTest && onGoToFinalTest()
          }
        }, 500)
      }
    } catch {
      alert('Chyba při odevzdání.')
    } finally {
      setSubmitting(false)
    }
  }

  const renderContent = (text, msgRole) => {
    if (msgRole !== 'assistant' || !isStudent) return <p>{text}</p>
    const words = text.split(/(\s+)/)
    return (
      <p>
        {words.map((w, i) =>
          /\S/.test(w) ? (
            <span key={i} className="clickable-word" onClick={() => handleWordClick(w)}>{w}</span>
          ) : (
            <span key={i}>{w}</span>
          )
        )}
      </p>
    )
  }

  return (
    <div className="chat-page">
      {/* Notifications */}
      {xpNotif && <div className="xp-notification">{xpNotif}</div>}
      {badgeNotif && <div className="badge-notification">{badgeNotif.emoji} Nový odznak: {badgeNotif.name}!</div>}

      {/* Word save popup */}
      {selectedWord && (
        <div className="word-popup-overlay" onClick={() => setSelectedWord(null)}>
          <div className="word-popup" onClick={e => e.stopPropagation()}>
            <h4>📖 Uložit slovo: <strong>{selectedWord}</strong></h4>
            <form onSubmit={e => { e.preventDefault(); saveWord(e.target.translation.value) }}>
              <input name="translation" placeholder="Překlad (volitelné)" autoFocus />
              <div className="word-popup-buttons">
                <button type="submit">💾 Uložit do slovníčku</button>
                <button type="button" onClick={() => setSelectedWord(null)}>Zrušit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="chat-header">
        <div className="chat-header-top">
          <h2>💬 {topic.title}</h2>
          <div className="chat-header-actions">
            {topic.level && <span className="level-pill">{topic.level}</span>}
            <button className="btn-secondary" onClick={exportChat}>📥 Export</button>
            {messages.length >= 4 && (
              <button className="btn-evaluate" onClick={evaluate} disabled={evaluating}>
                {evaluating ? '⏳ Hodnotím...' : '📊 Hodnocení'}
              </button>
            )}
            {isStudent && !submitted && messageCount >= minMessages && (
              <button className="btn-submit" onClick={submitWork} disabled={submitting}>
                {submitting ? '⏳...' : '✅ Odevzdat práci'}
              </button>
            )}
            {submitted && <span className="submitted-badge">✅ Odevzdáno</span>}
          </div>
        </div>
        {topic.description && <p>{topic.description}</p>}

        {/* Conversation progress */}
        {isStudent && (
          <div className="chat-progress">
            <div className="chat-progress-label">
              📝 {messageCount}/{minMessages} zpráv {messageCount >= minMessages ? '— Můžeš odevzdat!' : `— Zbývá ${minMessages - messageCount}`}
            </div>
            <div className="chat-progress-bar">
              <div className="chat-progress-fill" style={{ width: `${Math.min(100, (messageCount / minMessages) * 100)}%` }}></div>
            </div>
          </div>
        )}

        {isReadOnly && <p className="read-only-badge">👁️ Prohlížíte chat žáka: {viewingStudent.name}</p>}
        {isStudent && <div className="voice-info">🎙️ Mluv česky – klikni na mikrofon! Klikni na slovo pro uložení do slovníčku.</div>}
      </div>

      {/* Evaluation */}
      {evaluation && (
        <div className="evaluation-card">
          <div className="eval-header">
            <h3>📊 Hodnocení konverzace</h3>
            <button onClick={() => setEvaluation(null)}>✕</button>
          </div>
          <div className="eval-content">{evaluation}</div>
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 && !isReadOnly && (
          <div className="chat-welcome">
            <div className="welcome-emoji">🎉</div>
            <p>👋 Ahoj! Napiš nebo <strong>řekni nahlas</strong> svou první zprávu česky!</p>
            <p>Neboj se chyb – jsem tu, abych ti pomohl! 💪</p>
          </div>
        )}
        {messages.length === 0 && isReadOnly && (
          <div className="chat-welcome"><p>Žák zatím nenapsal žádnou zprávu.</p></div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-avatar">{msg.role === 'user' ? '🧑‍🎓' : '🤖'}</div>
            <div className="message-bubble">
              {renderContent(msg.content, msg.role)}
              <div className="message-footer">
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.role === 'assistant' && (
                  <button
                    className={`btn-speak ${speakingMsgId === i ? 'speaking' : ''}`}
                    onClick={() => speakingMsgId === i ? stopSpeaking() : speakText(msg.content, i)}
                  >
                    {speakingMsgId === i ? '⏹️' : '🔊'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {sending && (
          <div className="message assistant">
            <div className="message-avatar">🤖</div>
            <div className="message-bubble typing"><span>●</span><span>●</span><span>●</span></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {!isReadOnly && (
        <form className="chat-input" onSubmit={sendMessage}>
          <button type="button" className={`btn-mic ${listening ? 'active' : ''}`} onClick={toggleListening}>
            {listening ? '⏺️' : '🎙️'}
          </button>
          <input
            type="text"
            placeholder={listening ? '🎤 Poslouchám...' : 'Napiš nebo řekni zprávu česky...'}
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={sending}
            autoFocus
          />
          <button type="submit" disabled={sending || !input.trim()}>
            {sending ? '...' : '➤'}
          </button>
        </form>
      )}
    </div>
  )
}
