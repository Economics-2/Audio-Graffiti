
import React, { useEffect, useRef, useState } from 'react';
import { GraffitiPin, UserLocation } from '../types';

interface ARViewerProps {
  pins: GraffitiPin[];
  userLoc: UserLocation | null;
  onCollect: (pin: GraffitiPin) => void;
}

const ARViewer: React.FC<ARViewerProps> = ({ pins, userLoc, onCollect }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [nearbyData, setNearbyData] = useState<{ pin: GraffitiPin; distance: number; angle: number }[]>([]);
  const [lockedPin, setLockedPin] = useState<{ pin: GraffitiPin; distance: number } | null>(null);

  // Initialize camera
  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' }, 
            audio: false 
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        console.error("Camera access error:", err);
      }
    }
    setupCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  // Proximity Audio Alert (Sonar Effect)
  useEffect(() => {
    if (!lockedPin) return;

    // Faster pings as you get closer
    // 10m -> 1000ms, 2m -> 200ms
    const pingInterval = Math.max(150, Math.min(1000, lockedPin.distance * 100));
    
    const interval = setInterval(() => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Frequency also shifts higher as you get closer
      const freq = Math.max(440, 1200 - (lockedPin.distance * 60));
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    }, pingInterval);

    return () => clearInterval(interval);
  }, [lockedPin?.pin.id, lockedPin?.distance]);

  // Update relative positions and handle proximity logic
  useEffect(() => {
    if (!userLoc) return;
    
    const METERS_PER_DEGREE = 111320;
    
    const processed = pins.map(pin => {
      const dy = (pin.latitude - userLoc.latitude) * METERS_PER_DEGREE;
      const dx = (pin.longitude - userLoc.longitude) * METERS_PER_DEGREE * Math.cos(userLoc.latitude * Math.PI / 180);
      const distance = Math.sqrt(dx * dx + dy * dy);
      // Angle used for horizontal positioning in our mock-AR view
      const angle = Math.atan2(dx, dy) * (180 / Math.PI);
      
      return { pin, distance, angle };
    }).filter(p => p.distance < 200); // Track pins within 200m
    
    setNearbyData(processed);

    // Closest pin within 12 meters triggers the alert
    const closest = processed.length > 0 
      ? processed.reduce((prev, curr) => curr.distance < prev.distance ? curr : prev) 
      : null;

    if (closest && closest.distance < 12) {
      setLockedPin({ pin: closest.pin, distance: closest.distance });
    } else {
      setLockedPin(null);
    }
  }, [pins, userLoc]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden font-mono">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover grayscale opacity-50"
      />
      
      {/* HUD Overlay - Stays fixed even if pin is not in view */}
      <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between z-20">
        <div className="flex justify-between items-start">
            <div className={`p-3 backdrop-blur-md border-l-4 transition-colors duration-300 ${lockedPin ? 'bg-red-950/40 border-red-500' : 'bg-black/40 border-cyan-500'}`}>
                <div className="flex items-center gap-3 mb-2">
                    <span className={`w-3 h-3 rounded-full ${lockedPin ? 'bg-red-500 animate-ping' : 'bg-cyan-500 animate-pulse'}`}></span>
                    <span className={`text-xs font-bold tracking-[0.2em] ${lockedPin ? 'text-red-400' : 'text-cyan-400'}`}>
                        {lockedPin ? 'SIGNAL_LOCKED' : 'SCANNING_ENVIRONMENT'}
                    </span>
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                    COORD: {userLoc?.latitude.toFixed(6)}, {userLoc?.longitude.toFixed(6)}<br/>
                    ACCURACY: ±{userLoc?.accuracy.toFixed(1)}M
                </div>
            </div>
            
            {lockedPin && (
              <div className="bg-red-600 px-3 py-1 text-black font-black italic animate-bounce shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                {lockedPin.distance.toFixed(1)}M
              </div>
            )}
        </div>

        {/* Big Center Alert */}
        {lockedPin && (
          <div className="flex flex-col items-center gap-2 scale-110">
             <div className="px-8 py-3 bg-red-600/30 border-2 border-red-500 backdrop-blur-lg rounded shadow-[0_0_40px_rgba(239,68,68,0.4)]">
                <h2 className="text-red-500 font-black tracking-[0.5em] italic text-2xl animate-pulse text-center">CAPTURE_ZONE</h2>
             </div>
             <p className="text-[10px] text-red-400 uppercase tracking-widest bg-black/80 px-4 py-1">
               Acoustic signature detected at 11 o'clock
             </p>
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
            <div className={`w-64 h-[2px] rounded-full transition-colors duration-500 ${lockedPin ? 'bg-red-500' : 'bg-cyan-500/30'}`}></div>
            <div className="text-[8px] tracking-[0.6em] text-center uppercase opacity-50 text-white">
                Synchronizing with local spatial audio grid
            </div>
        </div>
      </div>

      {/* AR Pin Viewport - Objects move as user turns (simulated) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible">
        {nearbyData.map(({ pin, distance, angle }, i) => {
          const isTarget = lockedPin?.pin.id === pin.id;
          const scale = isTarget ? 1.6 : Math.max(0.3, 1.2 - (distance / 150));
          const opacity = Math.max(0.1, 1 - (distance / 150));
          
          return (
            <div 
              key={pin.id}
              className="absolute pointer-events-auto cursor-pointer transition-all duration-700 ease-out"
              style={{
                // We use angle to push it off screen horizontally if it's "behind" or "to the side"
                transform: `translateX(${angle * 8}px) scale(${scale})`,
                opacity: opacity,
                zIndex: 100 - Math.round(distance)
              }}
              onClick={() => onCollect(pin)}
            >
              <div className="flex flex-col items-center group">
                <div className={`relative w-36 h-36 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${
                  isTarget ? 'border-red-500 shadow-[0_0_60px_rgba(239,68,68,0.8)]' : 'border-white/20'
                }`}>
                  {/* Outer spinning ring for target */}
                  {isTarget && (
                    <div className="absolute -inset-4 border-2 border-dashed border-red-500/40 rounded-full animate-[spin_5s_linear_infinite]"></div>
                  )}
                  
                  <div className="w-full h-full rounded-full overflow-hidden bg-black graffiti-glow">
                    {pin.visualImageUrl ? (
                      <img src={pin.visualImageUrl} className={`w-full h-full object-cover transition-transform duration-1000 ${isTarget ? 'scale-125' : 'group-hover:scale-110'}`} />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                         <i className="fa-solid fa-volume-high text-3xl text-slate-600"></i>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className={`mt-6 px-4 py-2 border backdrop-blur-md flex flex-col items-center transition-all ${
                  isTarget ? 'bg-red-600 border-red-400 -translate-y-2' : 'bg-black/60 border-pink-500'
                }`}>
                  <span className={`text-sm font-black italic tracking-tighter ${isTarget ? 'text-black' : 'text-white'}`}>
                    {pin.title.toUpperCase()}
                  </span>
                  <span className={`text-[9px] font-bold ${isTarget ? 'text-black/70' : 'text-pink-400'}`}>
                    {distance.toFixed(1)} METERS
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Radar HUD in bottom corner */}
      <div className={`absolute bottom-28 right-8 w-32 h-32 rounded-full border-2 transition-all duration-500 backdrop-blur-md overflow-hidden ${
        lockedPin ? 'bg-red-950/20 border-red-500/50 scale-110' : 'bg-cyan-950/10 border-cyan-500/20'
      }`}>
        {/* Sweep line */}
        <div className={`absolute inset-0 w-full h-full bg-gradient-to-tr animate-[spin_3s_linear_infinite] ${
          lockedPin ? 'from-red-500/20 via-transparent to-transparent' : 'from-cyan-500/10 via-transparent to-transparent'
        }`}></div>
        
        {/* Radar Blips */}
        {nearbyData.map((d) => {
          const r = (d.distance / 200) * 60; // scale distance to radar radius
          const rad = (d.angle - 90) * (Math.PI / 180);
          const isTarget = d.pin.id === lockedPin?.pin.id;
          return (
            <div 
              key={d.pin.id}
              className={`absolute w-2 h-2 rounded-full z-10 transition-colors ${
                isTarget ? 'bg-red-500 shadow-[0_0_10px_#ef4444] animate-ping' : 'bg-pink-500 shadow-[0_0_5px_rgba(236,72,153,0.5)]'
              }`}
              style={{
                top: '50%',
                left: '50%',
                transform: `translate(${Math.cos(rad) * r}px, ${Math.sin(rad) * r}px) translate(-50%, -50%)`
              }}
            ></div>
          );
        })}
        
        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 z-20"></div>
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(1deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
      `}</style>
    </div>
  );
};

export default ARViewer;
