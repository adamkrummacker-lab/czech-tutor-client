import { useState, useEffect, useRef, useCallback } from 'react'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

export default function Chat({ api, user, token, authHeaders, topic, viewingStudent, onGoToFinalTest, t }) {
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
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackRating, setFeedbackRating] = useState(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const tr = t || ((key, vars) => key)

  const REACTION_EMOJIS = ['👍', '❤️', '😂', '🤔', '🎉']
  const recognitionRef = useRef(null)

  const prefs = user?.preferences || {}
  const ttsEnabled = prefs.ttsEnabled !== false
  const micEnabled = prefs.micEnabled !== false
  const preferredVoice = prefs.ttsVoice || ''
  const uiLanguage = prefs.uiLanguage || 'cs'
  const langMap = { cs: 'cs-CZ', de: 'de-DE', en: 'en-US' }
  const speechLang = langMap[uiLanguage] || 'cs-CZ'

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
    if (!ttsEnabled) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = speechLang
    utterance.rate = 0.9
    if (preferredVoice) {
      const voice = window.speechSynthesis.getVoices().find(v => v.name === preferredVoice)
      if (voice) utterance.voice = voice
    }
    utterance.onstart = () => setSpeakingMsgId(msgIndex)
    utterance.onend = () => setSpeakingMsgId(null)
    utterance.onerror = () => setSpeakingMsgId(null)
    window.speechSynthesis.speak(utterance)
  }, [ttsEnabled, preferredVoice, speechLang])

  useEffect(() => {
    if (!isStudent || messages.length === 0 || !ttsEnabled) return
    const last = messages[messages.length - 1]
    if (last.role === 'assistant' && !sending) {
      speakText(last.content, messages.length - 1)
    }
  }, [messages, sending, isStudent, ttsEnabled, speakText])

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
      alert(tr('chat_unsupported'))
      return
    }
    if (!micEnabled) return
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = speechLang
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
  }, [listening, micEnabled, speechLang])

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
          const delta = data.xpDelta || 8
          setXpNotif(tr('chat_xp_gain', { delta, total: data.xp }))
          setTimeout(() => setXpNotif(null), 3000)
        }
        // Show badge notification
        if (data.newBadges?.length) {
          setBadgeNotif(data.newBadges[0])
          setTimeout(() => setBadgeNotif(null), 4000)
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: tr('chat_error_ai'), timestamp: new Date().toISOString() }])
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
        setTimeout(() => setShowFeedback(true), 400)
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

  const saveFeedback = () => {
    const payload = {
      topicId: topic.id,
      topicTitle: topic.title,
      rating: feedbackRating,
      text: feedbackText.trim(),
      createdAt: new Date().toISOString(),
    }
    const storeLocal = () => {
      try {
        const existing = JSON.parse(window.localStorage.getItem('kamoFeedback') || '[]')
        existing.push(payload)
        window.localStorage.setItem('kamoFeedback', JSON.stringify(existing))
      } catch {
        // ignore
      }
    }

    fetch(`${api}/api/feedback`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ topicId: topic.id, rating: feedbackRating, text: feedbackText.trim() }),
    })
      .then(res => {
        if (!res.ok) storeLocal()
      })
      .catch(() => storeLocal())
      .finally(() => {
        setFeedbackSent(true)
        setTimeout(() => {
          setShowFeedback(false)
          setFeedbackSent(false)
          setFeedbackRating(null)
          setFeedbackText('')
          if (window.confirm(tr('chat_submit_confirm'))) {
            onGoToFinalTest && onGoToFinalTest()
          }
        }, 400)
      })
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
  const kidLabel = kidScore >= 8
    ? tr('chat_kid_great')
    : kidScore >= 5
      ? tr('chat_kid_good')
      : kidScore != null
        ? tr('chat_kid_try_next')
        : tr('chat_kid_good')
  const lessonSteps = [
    { key: 'start', label: tr('chat_lesson_steps_start'), done: messages.length > 0 },
    { key: 'chat', label: tr('chat_lesson_steps_chat', { count: messageCount, total: minMessages }), done: messageCount >= minMessages },
    { key: 'submit', label: tr('chat_lesson_steps_submit'), done: submitted },
    { key: 'feedback', label: tr('chat_lesson_steps_feedback'), done: !!evaluation }
  ]

  return (
    <div className="chat-page">
      {/* Notifications */}
      {xpNotif && <div className="xp-notification">{xpNotif}</div>}
      {badgeNotif && <div className="badge-notification">{tr('chat_new_badge', { emoji: badgeNotif.emoji, name: badgeNotif.name })}</div>}

      {/* Word save popup */}
      {selectedWord && (
        <div className="word-popup-overlay" onClick={() => setSelectedWord(null)}>
          <div className="word-popup" onClick={e => e.stopPropagation()}>
            <h4>{tr('chat_word_save_title', { word: selectedWord })}</h4>
            <form onSubmit={e => { e.preventDefault(); saveWord(e.target.translation.value) }}>
              <input name="translation" placeholder={tr('chat_word_translation_placeholder')} autoFocus />
              <div className="word-popup-buttons">
                <button type="submit">{tr('chat_word_save')}</button>
                <button type="button" onClick={() => setSelectedWord(null)}>{tr('chat_cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFeedback && (
        <div className="feedback-overlay" onClick={() => setShowFeedback(false)}>
          <div className="feedback-modal" onClick={e => e.stopPropagation()}>
            <h3>{tr('chat_feedback_title')}</h3>
            <p>{tr('chat_feedback_prompt')}</p>
            <div className="feedback-rating">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  className={`feedback-pill ${feedbackRating === n ? 'active' : ''}`}
                  onClick={() => setFeedbackRating(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <textarea
              rows="3"
              placeholder={tr('chat_feedback_placeholder')}
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
            />
            <div className="feedback-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowFeedback(false)}>
                {tr('chat_feedback_skip')}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={saveFeedback}
                disabled={!feedbackRating || feedbackSent}
              >
                {feedbackSent ? tr('chat_feedback_thanks') : tr('chat_feedback_send')}
              </button>
            </div>
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
                {evaluating ? tr('chat_header_evaluating') : tr('chat_header_evaluate')}
              </button>
            )}
            {submitError && <div className="submit-error">⚠️ {submitError}</div>}
            {isStudent && !submitted && messageCount >= minMessages && (
              <button className="btn-submit" onClick={submitWork} disabled={submitting}>
                {submitting ? tr('chat_submitting') : tr('chat_submit')}
              </button>
            )}
            {submitted && <span className="submitted-badge">{tr('chat_submitted')}</span>}
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
              📝 {messageCount}/{minMessages} {messageCount >= minMessages ? tr('chat_progress_label_done') : tr('chat_progress_label_left', { left: minMessages - messageCount })}
            </div>
            <div className="chat-progress-bar">
              <div className="chat-progress-fill" style={{ width: `${Math.min(100, (messageCount / minMessages) * 100)}%` }}></div>
            </div>
          </div>
        )}

        {isReadOnly && <p className="read-only-badge">{tr('chat_readonly', { name: viewingStudent.name })}</p>}
        {isStudent && (
          <div className="voice-info">
            {micEnabled
              ? tr('chat_voice_info_on')
              : tr('chat_voice_info_off')}
          </div>
        )}
      </div>

      {/* Evaluation */}
      {evaluation && (
        <div className="evaluation-card">
          <div className="eval-header">
            <h3>{tr('chat_eval_title')}</h3>
            <button onClick={() => setEvaluation(null)}>✕</button>
          </div>
          {evaluationData?.grade != null && (
            <div className="eval-grade">
              <strong>{tr('chat_grade_label')}</strong> {evaluationData.grade} / 5&nbsp;·&nbsp;<strong>{tr('chat_score_label')}</strong> {evaluationData.score}/10
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
            <div className="kid-eval-subtitle">{tr('chat_kid_subtitle')}</div>
          </div>
        </div>
      )}

      <div className="chat-messages">
        {showIntro && (
          <div className="lesson-intro">
            <div className="lesson-intro-emoji">🚀</div>
            <h3>{tr('chat_intro_title')}</h3>
            <p>{tr('chat_intro_body')}</p>
            <button className="btn-start-lesson" onClick={startLesson}>{tr('chat_intro_start')}</button>
          </div>
        )}
        {messages.length === 0 && !isReadOnly && !showIntro && (
          <div className="chat-welcome">
            <div className="welcome-emoji">🎉</div>
            <p>{tr('chat_welcome_title')}</p>
            <p>{tr('chat_welcome_body')}</p>
          </div>
        )}
        {messages.length === 0 && isReadOnly && (
          <div className="chat-welcome"><p>{tr('chat_readonly_empty')}</p></div>
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
                      {tr('chat_retry')}
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
          {micEnabled && (
            <button type="button" className={`btn-mic ${listening ? 'active' : ''}`} onClick={toggleListening}>
              {listening ? '⏺️' : '🎙️'}
            </button>
          )}
          <input
            ref={inputRef}
            type="text"
            placeholder={listening ? tr('chat_listening') : tr('chat_placeholder')}
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
