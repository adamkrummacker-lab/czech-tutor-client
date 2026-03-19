import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function FinalTest() {
  const navigate = useNavigate()

  useEffect(() => {
    // You can add logic here to fetch test questions or set up state
  }, [])

  return (
    <div className="final-test-page">
      <h1>📝 Otestuj mě</h1>
      <p>Zde bude závěrečný test po dokončení konverzační lekce.</p>
      {/* Add your test UI here */}
      <button onClick={() => navigate(-1)}>Zpět</button>
    </div>
  )
}
