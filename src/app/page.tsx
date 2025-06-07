'use client'
import { useEffect, useRef, useState } from 'react';

export default function AudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);

    mediaRecorderRef.current = mediaRecorder;
    audioChunks.current = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.current.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(audioBlob);
      setAudioURL(url);

    };

    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-2xl mb-4">Microphone Recorder</h1>

      <button
        onClick={recording ? stopRecording : startRecording}
        className={`px-6 py-3 rounded text-lg font-bold ${
          recording ? 'bg-red-600' : 'bg-green-500'
        }`}
      >
        {recording ? 'Stop Recording' : 'Start Recording'}
      </button>

      {audioURL && (
        <audio controls className="mt-6">
          <source src={audioURL} type="audio/webm" />
        </audio>
      )}
    </div>
  );
}
