'use client'
import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    webkitSpeechRecognition: any
    SpeechRecognition: any
  }

  interface SpeechRecognitionEvent {
    readonly resultIndex: number
    readonly results: SpeechRecognitionResultList
  }
}

export default function Transcriber() {
  const [transcript, setTranscript] = useState<string>('')
  const [isListening, setIsListening] = useState<boolean>(false)
  const [volume, setVolume] = useState<number>(0)
  const [freqBins, setFreqBins] = useState<number[]>([])

  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const animationRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    let recognition: any

    async function startAll() {
      // 1) SpeechRecognition setup
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SR) {
        alert('SpeechRecognition not supported')
      } else {
        recognition = new SR()
        recognition.lang = 'en-US'
        recognition.continuous = true
        recognition.interimResults = false
        recognition.onresult = (evt: SpeechRecognitionEvent) => {
          const { resultIndex, results } = evt
          setTranscript(results[resultIndex][0].transcript)
        }
        recognition.onerror = (e: { error: string }) =>
          console.error('Speech recognition error:', e.error)
        recognition.start()
      }

      // 2) AudioContext & Analyser setup
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream

        const audioCtx = new AudioContext()
        audioCtxRef.current = audioCtx
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 64
        analyser.minDecibels = -90
        analyser.maxDecibels = -10
        analyser.smoothingTimeConstant = 0.8
        source.connect(analyser)
        analyserRef.current = analyser

        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        dataArrayRef.current = dataArray

        // 3) Visualization loop
        const tick = () => {
          if (analyserRef.current && dataArrayRef.current) {
            analyserRef.current.getByteFrequencyData(dataArrayRef.current)
            const normBins = Array.from(dataArrayRef.current).map((v) => v / 255)
            setFreqBins(normBins)
            const avg =
              normBins.reduce((sum, b) => sum + b, 0) / normBins.length
            setVolume(avg)
            animationRef.current = requestAnimationFrame(tick)
          }
        }
        tick()
      } catch (err) {
        console.error('Microphone error:', err)
      }
    }

    if (isListening) {
      startAll()
    } else {
      // Stop recognition
      recognition?.stop()
      // Stop visualization
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      // Close audio context
      audioCtxRef.current?.close()
      audioCtxRef.current = null
      analyserRef.current = null
      dataArrayRef.current = null
      // Stop tracks
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }

    return () => {
      recognition?.stop()
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }
      audioCtxRef.current?.close()
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [isListening])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-4">Voice Transcriber</h1>

      {/* Visualization */}
      <div className="relative w-64 h-64 mb-6 flex items-center justify-center">
        {/* Pulsing Center Circle */}
        <div
          className="rounded-full bg-blue-500 transition-all duration-100"
          style={{
            width: `${100 + volume * 200}px`,
            height: `${100 + volume * 200}px`,
          }}
        />

        {/* Radial Frequency Bars */}
        <div className="absolute inset-0">
          {freqBins.map((bin, i) => (
            <div
              key={i}
              className="absolute bottom-1/2 left-1/2 w-1 bg-green-400 rounded-sm transition-all duration-75"
              style={{
                height: `${20 + bin * 80}px`,
                transform: `rotate(${(360 / freqBins.length) * i}deg) translateX(-50%) translateY(50%)`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Controls */}
      <button
        onClick={() => setIsListening((prev) => !prev)}
        className={`px-6 py-2 text-lg font-semibold rounded transition-colors ${
          isListening ? 'bg-red-500' : 'bg-green-500'
        }`}
      >
        {isListening ? 'Stop Recording' : 'Start Recording'}
      </button>

      {/* Transcript */}
      <p className="mt-6 text-xl max-w-xl text-center text-white font-mono">
        {transcript || 'Press the button and speak...'}
      </p>
    </div>
  )
}
