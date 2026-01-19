
import React, { useState, useEffect } from 'react';
import { GraffitiPin, UserLocation, AppView } from './types';
import { getPins, savePin, seedPins } from './services/storage';
import MapView from './components/MapView';
import ARViewer from './components/ARViewer';
import Recorder from './components/Recorder';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('map');
  const [pins, setPins] = useState<GraffitiPin[]>([]);
  const [userLoc, setUserLoc] = useState<UserLocation | null>(null);
  const [selectedPin, setSelectedPin] = useState<GraffitiPin | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    seedPins();
    setPins(getPins());

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLoc({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => console.error("Location error:", err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const handlePinSaved = (newPin: GraffitiPin) => {
    savePin(newPin);
    setPins([...pins, newPin]);
    setView('map');
  };

  const handleCollect = (pin: GraffitiPin) => {
    setSelectedPin(pin);
  };

  const playAudio = (base64: string) => {
    if (!base64) return;
    const audio = new Audio(`data:audio/webm;base64,${base64}`);
    setIsPlaying(true);
    audio.play();
    audio.onended = () => setIsPlaying(false);
  };

  return (
    <div className="flex flex-col h-screen w-full relative">
      {/* Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {view === 'map' && (
          <MapView 
            pins={pins} 
            userLoc={userLoc} 
            onSelectPin={setSelectedPin} 
          />
        )}
        {view === 'ar' && (
          <ARViewer 
            pins={pins} 
            userLoc={userLoc} 
            onCollect={handleCollect} 
          />
        )}
        {view === 'record' && (
          <Recorder 
            userLoc={userLoc} 
            onPinSaved={handlePinSaved} 
            onCancel={() => setView('map')} 
          />
        )}
      </main>

      {/* Pin Detail Overlay */}
      {selectedPin && (
        <div className="absolute inset-x-0 bottom-24 p-4 z-50">
          <div className="bg-slate-900 border-t-4 border-pink-500 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 relative animate-in slide-in-from-bottom-8 duration-300">
            <button 
                onClick={() => setSelectedPin(null)}
                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-slate-400"
            >
                <i className="fa-solid fa-xmark"></i>
            </button>
            <div className="flex gap-4">
                <div className="w-16 h-16 rounded-lg bg-slate-800 overflow-hidden shrink-0 border border-slate-700">
                    <img src={selectedPin.visualImageUrl} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                    <h3 className="text-xl font-black text-pink-400 truncate">{selectedPin.title}</h3>
                    <p className="text-xs text-slate-500">by {selectedPin.creator} • {new Date(selectedPin.timestamp).toLocaleDateString()}</p>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => playAudio(selectedPin.audioData)}
                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl font-bold uppercase tracking-wider transition-all ${
                        isPlaying ? 'bg-pink-600 animate-pulse' : 'bg-pink-500'
                    }`}
                >
                    <i className={`fa-solid ${isPlaying ? 'fa-circle-stop' : 'fa-play'}`}></i>
                    {isPlaying ? 'PLAYING...' : 'LISTEN TO SIGNAL'}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <nav className="h-24 bg-black/90 backdrop-blur-xl border-t border-slate-800 flex items-center justify-around px-4 pb-4">
        <button 
          onClick={() => setView('map')}
          className={`flex flex-col items-center gap-1 transition-colors ${view === 'map' ? 'text-cyan-400' : 'text-slate-500'}`}
        >
          <i className="fa-solid fa-map-location-dot text-xl"></i>
          <span className="text-[10px] font-bold uppercase tracking-widest">Radar</span>
        </button>

        <button 
          onClick={() => setView('record')}
          className="w-16 h-16 -mt-12 bg-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] border-4 border-black group"
        >
          <div className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center group-active:scale-90 transition-transform">
            <i className="fa-solid fa-plus text-white text-xl"></i>
          </div>
        </button>

        <button 
          onClick={() => setView('ar')}
          className={`flex flex-col items-center gap-1 transition-colors ${view === 'ar' ? 'text-pink-400' : 'text-slate-500'}`}
        >
          <i className="fa-solid fa-camera-retro text-xl"></i>
          <span className="text-[10px] font-bold uppercase tracking-widest">AR View</span>
        </button>
      </nav>
      
      {/* Visual Glitch Decor */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-cyan-400/20 z-0"></div>
      <div className="absolute bottom-24 left-0 w-full h-[1px] bg-pink-400/20 z-0"></div>
    </div>
  );
};

export default App;
