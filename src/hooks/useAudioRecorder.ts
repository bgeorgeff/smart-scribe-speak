import { useState, useRef } from 'react';

const getSupportedMimeType = (): string => {
  const types = ['audio/webm', 'audio/mp4', 'audio/ogg'];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
};

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('audio/webm');

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;
      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  };

  const stopRecording = (): Promise<{ audio: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder) {
        reject(new Error('No media recorder found'));
        return;
      }

      mediaRecorder.onstop = () => {
        const mimeType = mimeTypeRef.current;
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        const reader = new FileReader();

        reader.onloadend = () => {
          const base64Audio = (reader.result as string).split(',')[1];
          resolve({ audio: base64Audio, mimeType });
        };

        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);

        // Clean up
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      };

      mediaRecorder.stop();
    });
  };

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
};
