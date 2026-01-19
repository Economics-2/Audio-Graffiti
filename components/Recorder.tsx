
import React, { useState, useEffect, useRef } from 'react';
import { analyzeAudioContent, generateGraffitiVisual, getNearbyContext, getTrendingIdeas } from '../services/gemini';
import { GraffitiPin, UserLocation } from '../types';

interface RecorderProps {
  userLoc: UserLocation | null;
  onPinSaved: (pin: GraffitiPin) => void;
  onCancel: () => void;
}

const Recorder: React.FC<RecorderProps> = ({ userLoc, onPinSaved, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [title, setTitle] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [locationVibe, setLocationVibe] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (userLoc && !locationVibe) {
      getNearbyContext(userLoc.latitude, userLoc.longitude).then(setLocationVibe);
    }
  }, [userLoc]);

  const fetchSuggestions = async () => {
    if (!locationVibe) return;
    setIsProcessing(true);
    const ideas = await getTrendingIdeas(locationVibe);
    setSuggestions(ideas);
    setShowSuggestions(true);
    setIsProcessing(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.readAsDataURL(blob);
    });
  };

  const handleSave = async () => {
    if (!audioBlob || !userLoc || !title) return;
    setIsProcessing(true);
    try {
      const base64Audio = await blobToBase64(audioBlob);
      const analysis = await analyzeAudioContent(base64Audio);
      const visualUrl = await generateGraffitiVisual(title, analysis);

      const newPin: GraffitiPin = {
        id: Date.now().toString(),
        latitude: userLoc.latitude,
        longitude: userLoc.longitude,
        audioData: base64Audio,
        title,
        creator: 'Artist_' + Math.floor(Math.random() * 999),
        timestamp: Date.now(),
        visualPrompt: analysis,
        visualImageUrl: visualUrl
      };
      onPinSaved(newPin);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white p-6 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-4xl font-black text-cyan-400 italic tracking-tighter">ETCH THE VOID</h2>
        <div className="mt-2 p-3 bg-cyan-950/30 border border-cyan-500/20 rounded-lg">
          <p className="text-[10px] text-cyan-500 font-mono uppercase tracking-widest mb-1">Location Context</p>
          <p className="text-sm text-slate-300 italic">{locationVibe || "Analyzing surrounding signatures..."}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] py-8">
        {!audioBlob ? (
          <div className="flex flex-col items-center gap-8">
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 ${
                isRecording 
                  ? 'bg-red-500 scale-110 shadow-[0_0_60px_rgba(239,68,68,0.7)]' 
                  : 'bg-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:scale-105'
              }`}
            >
              <i className={`fa-solid ${isRecording ? 'fa-microphone-lines animate-pulse' : 'fa-microphone'} text-5xl`}></i>
            </button>
            <p className="text-slate-500 font-mono text-xs uppercase tracking-[0.2em]">
              {isRecording ? 'Capturing Signal...' : 'Hold to Record Fragment'}
            </p>
            
            <button 
              onClick={fetchSuggestions}
              className="text-xs text-cyan-400/60 hover:text-cyan-400 underline decoration-cyan-400/20"
            >
              Need inspiration for this spot?
            </button>
          </div>
        ) : (
          <div className="w-full space-y-6">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 graffiti-glow">
               <div className="flex items-center gap-4">
                    <button onClick={() => setAudioBlob(null)} className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                        <i className="fa-solid fa-trash-can"></i>
                    </button>
                    <div className="flex-1 flex flex-col gap-1">
                        <span className="text-[10px] text-slate-500 font-mono">SIGNAL_STRENGTH: 98%</span>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-400 w-full animate-pulse"></div>
                        </div>
                    </div>
               </div>
            </div>
            
            <input
              type="text"
              placeholder="GRAFFITI_NAME_ID"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 p-4 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none font-mono text-cyan-400 placeholder:text-slate-700"
            />
          </div>
        )}
      </div>

      {showSuggestions && (
        <div className="mb-6 p-4 bg-slate-900 border border-cyan-500/30 rounded-xl max-h-40 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-[10px] text-cyan-500 font-mono font-bold uppercase tracking-widest">AI Brainstorm</h4>
            <button onClick={() => setShowSuggestions(false)} className="text-slate-500 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
          </div>
          <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{suggestions}</div>
        </div>
      )}

      <div className="flex gap-4 mt-auto">
        <button
          onClick={onCancel}
          className="px-6 py-4 bg-slate-900 border border-slate-800 rounded-xl font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!audioBlob || !title || isProcessing}
          className="flex-1 py-4 bg-cyan-500 rounded-xl font-black uppercase tracking-widest text-black hover:bg-cyan-400 disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-3 shadow-lg shadow-cyan-500/20"
        >
          {isProcessing ? (
            <><i className="fa-solid fa-circle-notch animate-spin"></i> GENERATING...</>
          ) : (
            'DEPLOY FRAGMENT'
          )}
        </button>
      </div>
    </div>
  );
};

export default Recorder;
