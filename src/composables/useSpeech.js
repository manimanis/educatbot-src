import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * Composable pour la synthèse vocale (TTS) et la reconnaissance vocale (STT).
 * Utilise les Web Speech APIs natives du navigateur.
 */

export function useSpeech() {
  const isSpeaking = ref(false)
  const isListening = ref(false)
  const supportedTTS = ref(false)
  const supportedSTT = ref(false)
  const sttError = ref(null)

  let utterance = null
  let recognition = null

  onMounted(() => {
    supportedTTS.value = 'speechSynthesis' in window
    supportedSTT.value = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  })

  onBeforeUnmount(() => {
    stopSpeaking()
    stopListening()
  })

  /* ---------- TTS ---------- */

  function speak(text, { lang = 'fr-FR', rate = 1, pitch = 1 } = {}) {
    if (!supportedTTS.value || !text) return
    stopSpeaking()

    // Nettoyer le texte Markdown basique
    const clean = text
      .replace(/```[\s\S]*?```/g, ' bloc de code ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_#>|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    utterance = new SpeechSynthesisUtterance(clean)
    utterance.lang = lang
    utterance.rate = rate
    utterance.pitch = pitch
    utterance.onstart = () => { isSpeaking.value = true }
    utterance.onend = () => { isSpeaking.value = false }
    utterance.onerror = () => { isSpeaking.value = false }
    window.speechSynthesis.speak(utterance)
  }

  function stopSpeaking() {
    if (supportedTTS.value) {
      window.speechSynthesis.cancel()
    }
    isSpeaking.value = false
  }

  function toggleSpeak(text) {
    if (isSpeaking.value) stopSpeaking()
    else speak(text)
  }

  /* ---------- STT ---------- */

  function startListening({ lang = 'fr-FR', onResult, onEnd } = {}) {
    if (!supportedSTT.value) {
      sttError.value = 'Reconnaissance vocale non supportée par ce navigateur.'
      return
    }
    stopListening()
    sttError.value = null

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    recognition = new SR()
    recognition.lang = lang
    recognition.interimResults = true
    recognition.continuous = false

    let finalTranscript = ''

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) finalTranscript += r[0].transcript
        else interim += r[0].transcript
      }
      onResult?.(finalTranscript + interim, { final: !!finalTranscript, interim })
    }

    recognition.onerror = (e) => {
      sttError.value = `Erreur STT : ${e.error}`
      isListening.value = false
    }

    recognition.onend = () => {
      isListening.value = false
      onEnd?.(finalTranscript)
    }

    recognition.start()
    isListening.value = true
  }

  function stopListening() {
    if (recognition) {
      try { recognition.stop() } catch {}
      recognition = null
    }
    isListening.value = false
  }

  function toggleListening({ onResult, onEnd, lang } = {}) {
    if (isListening.value) stopListening()
    else startListening({ onResult, onEnd, lang })
  }

  return {
    isSpeaking, isListening,
    supportedTTS, supportedSTT,
    sttError,
    speak, stopSpeaking, toggleSpeak,
    startListening, stopListening, toggleListening
  }
}
