import { useState, useEffect, useRef, useCallback } from 'react'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

export default function Chat({ api, user, token, authHeaders, topic, viewingStudent, onGoToFinalTest }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [listening, setListening] = useState(false)
  const [speakingMsgId, setSpeakingMsgId] = useState(null)
  const [evaluation, setEvaluation] = useState(null)
  const [evaluationData, setEvaluationData] = useState(null)
  const [evaluating, setEvaluating] = useState(false)
  const [xpNotif, setXpNotif] = useState(null)
  const [badgeNotif, setBadgeNotif] = useState(null)
  const [selectedWord, setSelectedWord] = useState(null)
  const [messageCount, setMessageCount] = useState(0)
  const [minMessages, setMinMessages] = useState(topic.min_messages || 10)
  const [submitted, setSubmitted] = useState(!!topic.submitted_at)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [showIntro, setShowIntro] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const REACTION_EMOJIS = ['👍', '❤️', '😂', '🤔', '🎉']
  const recognitionRef = useRef(null)

  const isReadOnly = user.role === 'teacher' && viewingStudent
  const isStudent = user.role === 'student'

  useEffect(() => {
    const fetchData = async () => {
      const url = isReadOnly
        ? `${api}/api/chat/${topic.id}/student/${viewingStudent.id}`
        : `${api}/api/chat/${topic.id}`
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      const data = await res.json()
      setMessages(data)
      setMessageCount(data.filter(m => m.role === 'user').length)

      const evalUrl = `${api}/api/chat/${topic.id}/evaluation${isReadOnly && viewingStudent ? `?studentId=${viewingStudent.id}` : ''}`
      const evalRes = await fetch(evalUrl, { headers: { 'Authorization': `Bearer ${token}` } })
      const evalData = await evalRes.json()
      if (evalData?.evaluation) {
        setEvaluation(evalData.evaluation)
        setEvaluationData(evalData)
      }
    }

    fetchData().catch(() => {})
  }, [topic.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isStudent && !isReadOnly && messages.length === 0) {
      setShowIntro(true)
    } else {
      setShowIntro(false)
    }
  }, [isStudent, isReadOnly, messages.length])

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

  useEffect(() => {
    if (!isStudent || messages.length === 0) return
    const last = messages[messages.length - 1]
    if (last.role === 'assistant' && !sending) {
      speakText(last.content, messages.length - 1)
    }
  }, [messages, sending, isStudent, speakText])

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
      if (recognitionRef.current) recognitionRef.current.abort()
    }
  }, [])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel()
    setSpeakingMsgId(null)
  }, [])

  const startLesson = () => {
    setShowIntro(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

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

    const tempId = `tmp-${Date.now()}`
    const userMsg = { id: tempId, role: 'user', content: input, timestamp: new Date().toISOString(), reactions: [] }
    setMessages(prev => [...prev, userMsg])
    setInput('')

    try {
      // Temporarily use regular chat endpoint to test OpenAI
      const chatEndpoint = topic.level === 'assigned' ? `${api}/api/chat/${topic.id}` : `${api}/api/chat/${topic.id}`
      const requestBody = topic.level === 'assigned' 
        ? { message: input, lectureContent: topic.description }
        : { message: input }
      
      console.log('Sending chat request:', { endpoint: chatEndpoint, topicId: topic.id, topicLevel: topic.level });
      
      const res = await fetch(chatEndpoint, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(requestBody),
      })
      
      console.log('Chat response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Chat API error:', errorText);
        throw new Error(`API Error: ${res.status} - ${errorText}`);
      }
      
      const data = await res.json()
      console.log('Chat response data:', data);
      if (data.reply) {
        if (data.userMessageId) {
          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.userMessageId } : m))
        }

        setMessages(prev => [...prev, { id: data.assistantMessageId, role: 'assistant', content: data.reply, timestamp: new Date().toISOString(), reactions: [] }])
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

  const toggleReaction = async (messageId, emoji) => {
    try {
      const res = await fetch(`${api}/api/chat/${topic.id}/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ emoji }),
      })
      const data = await res.json()
      if (data.reactions) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: data.reactions } : m))
      }
    } catch {
      // ignore
    }
  }

  const retryMessage = async (messageId) => {
    try {
      const res = await fetch(`${api}/api/chat/${topic.id}/retry`, {
        method: 'POST',
        headers: authHeaders(),
      })
      const data = await res.json()
      if (data.reply) {
        setMessages(prev => [...prev, { id: data.assistantMessageId, role: 'assistant', content: data.reply, timestamp: new Date().toISOString(), reactions: [] }])
      }
    } catch {
      // ignore
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
      setEvaluationData({ score: data.score, grade: data.grade, evaluation: data.evaluation })
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
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
      })
      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        data = null
      }

      if (!res.ok) {
        const errMsg = (data && data.error) || text || `${res.status} ${res.statusText}`
        setSubmitError(`Chyba při odevzdání: ${errMsg}`)
        console.error('Submit work error', res.status, errMsg, text)
        return
      }

      if (data?.ok) {
        setSubmitted(true)
        setSubmitError(null)
        if (data.xp) {
          setXpNotif(`+15 XP za odevzdání! Celkem: ${data.xp} XP`)
          setTimeout(() => setXpNotif(null), 3000)
        }
        setTimeout(() => {
          if (window.confirm('Gratuluji k dokončení lekce! Chceš si udělat závěrečný test?')) {
            onGoToFinalTest && onGoToFinalTest()
          }
        }, 500)
      } else {
        const errMsg = (data && data.error) || 'Neznámá chyba při odevzdání.'
        setSubmitError(errMsg)
        console.error('Submit work non-ok response', data)
      }
    } catch (err) {
      setSubmitError('Chyba při odevzdání. Zkontroluj připojení a zkus to znovu.')
      console.error('Submit work exception', err)
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

  const progressRatio = Math.min(1, minMessages > 0 ? messageCount / minMessages : 0)
  const kidScore = evaluationData?.score
  const kidEmoji = kidScore >= 8 ? '😀' : kidScore >= 5 ? '🙂' : kidScore != null ? '😕' : '🙂'
  const kidLabel = kidScore >= 8 ? 'Skvělé!' : kidScore >= 5 ? 'Dobrá práce!' : kidScore != null ? 'Zkusíme to příště!' : 'Dobrá práce!'
  const lessonSteps = [
    { key: 'start', label: 'Start', done: messages.length > 0 },
    { key: 'chat', label: `Chat ${messageCount}/${minMessages}`, done: messageCount >= minMessages },
    { key: 'submit', label: 'Odevzdání', done: submitted },
    { key: 'feedback', label: 'Hodnocení', done: !!evaluation }
  ]

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
            {submitError && <div className="submit-error">⚠️ {submitError}</div>}
            {isStudent && !submitted && messageCount >= minMessages && (
              <button className="btn-submit" onClick={submitWork} disabled={submitting}>
                {submitting ? '⏳...' : '✅ Odevzdat práci'}
              </button>
            )}
            {submitted && <span className="submitted-badge">✅ Odevzdáno</span>}
          </div>
        </div>
        {topic.description && <p>{topic.description}</p>}

        {isStudent && (
          <div className="lesson-flow">
            <div className="lesson-steps">
              {lessonSteps.map(step => (
                <div key={step.key} className={`lesson-step ${step.done ? 'done' : ''}`}>
                  <span className="step-dot"></span>
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
            <div className="lesson-progress">
              <div className="lesson-progress-fill" style={{ width: `${Math.round(progressRatio * 100)}%` }}></div>
            </div>
          </div>
        )}

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
          {evaluationData?.grade != null && (
            <div className="eval-grade">
              <strong>Známka:</strong> {evaluationData.grade} / 5&nbsp;·&nbsp;<strong>Skóre:</strong> {evaluationData.score}/10
            </div>
          )}
          <div className="eval-content">{evaluation}</div>
        </div>
      )}

      {evaluation && isStudent && (
        <div className="kid-eval">
          <div className="kid-eval-emoji">{kidEmoji}</div>
          <div>
            <div className="kid-eval-title">{kidLabel}</div>
            <div className="kid-eval-subtitle">Lekce hotová. Skvěle!</div>
          </div>
        </div>
      )}

      <div className="chat-messages">
        {showIntro && (
          <div className="lesson-intro">
            <div className="lesson-intro-emoji">🚀</div>
            <h3>Začni lekci</h3>
            <p>Řekni nebo napiš pár jednoduchých vět. Každá zpráva se počítá.</p>
            <button className="btn-start-lesson" onClick={startLesson}>Začít</button>
          </div>
        )}
        {messages.length === 0 && !isReadOnly && !showIntro && (
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

              <div className="message-reactions">
                {REACTION_EMOJIS.map((emoji) => {
                  const reaction = (msg.reactions || []).find(r => r.emoji === emoji)
                  const count = reaction?.count || 0
                  const me = !!reaction?.me
                  return (
                    <button
                      key={emoji}
                      type="button"
                      className={`btn-reaction ${me ? 'mine' : ''}`}
                      onClick={() => toggleReaction(msg.id, emoji)}
                    >
                      {emoji} {count > 0 ? count : ''}
                    </button>
                  )
                })}
              </div>

              <div className="message-footer">
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.role === 'assistant' && (
                  <>
                    <button
                      className={`btn-speak ${speakingMsgId === i ? 'speaking' : ''}`}
                      onClick={() => speakingMsgId === i ? stopSpeaking() : speakText(msg.content, i)}
                    >
                      {speakingMsgId === i ? '⏹️' : '🔊'}
                    </button>
                    <button className="btn-retry" onClick={() => retryMessage(msg.id)}>
                      🔁 Zopakovat
                    </button>
                  </>
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
            ref={inputRef}
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
