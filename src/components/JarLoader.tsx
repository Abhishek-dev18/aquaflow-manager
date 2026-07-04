import React from 'react';

interface JarLoaderProps {
  message?: string;
}

const JarLoader: React.FC<JarLoaderProps> = ({ message = 'Loading…' }) => (
  <div className="flex flex-col items-center justify-center h-full p-20 gap-6">
    <style>{`
      @keyframes jarFillUp {
        0%   { transform: translateY(100%); }
        100% { transform: translateY(8%); }
      }
      @keyframes jarWave {
        0%, 100% { border-radius: 40% 60% 55% 45% / 50% 50% 50% 50%; }
        50%       { border-radius: 60% 40% 45% 55% / 50% 50% 50% 50%; }
      }
      @keyframes jarDrop {
        0%   { transform: translateY(0px);  opacity: 0; }
        10%  { opacity: 1; }
        75%  { transform: translateY(34px); opacity: 0.9; }
        100% { transform: translateY(38px); opacity: 0; }
      }
      @keyframes jarDropSway {
        0%, 100% { transform: translateY(0px) scaleX(1); }
        50%       { transform: translateY(2px) scaleX(0.85); }
      }
    `}</style>

    <div style={{ position: 'relative', width: 60, height: 90 }}>

      {/* Three falling water drops */}
      {[
        { left: 15, delay: '0s',    w: 8,  h: 11 },
        { left: 26, delay: '0.6s',  w: 10, h: 14 },
        { left: 40, delay: '1.2s',  w: 8,  h: 11 },
      ].map((d, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: 0,
            left: d.left,
            width: d.w,
            height: d.h,
            background: 'linear-gradient(180deg, #7dd3fc 0%, #0284c7 100%)',
            borderRadius: '50% 50% 45% 45% / 40% 40% 60% 60%',
            opacity: 0,
            animation: `jarDrop 1.8s ease-in ${d.delay} infinite`,
          }}
        />
      ))}

      {/* Jar neck / spout */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 32,
          height: 9,
          background: 'white',
          border: '2.5px solid #0284c7',
          borderRadius: 4,
          zIndex: 3,
        }}
      />

      {/* Jar body */}
      <div
        style={{
          position: 'absolute',
          top: 31,
          left: 2,
          width: 56,
          height: 56,
          background: 'white',
          border: '2.5px solid #0284c7',
          borderRadius: '5px 5px 16px 16px',
          overflow: 'hidden',
          zIndex: 2,
        }}
      >
        {/* Water fill — rises from bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '100%',
            background: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)',
            opacity: 0.55,
            transform: 'translateY(100%)',
            animation: 'jarFillUp 1.8s ease-in-out infinite alternate',
          }}
        />

        {/* Wave on water surface */}
        <div
          style={{
            position: 'absolute',
            left: '-15%',
            width: '130%',
            height: 10,
            bottom: '50%',
            background: '#7dd3fc',
            opacity: 0.5,
            animation: 'jarFillUp 1.8s ease-in-out infinite alternate, jarWave 1.1s ease-in-out infinite',
          }}
        />
      </div>

      {/* Jar highlight (gloss strip) */}
      <div
        style={{
          position: 'absolute',
          top: 35,
          left: 10,
          width: 6,
          height: 36,
          background: 'rgba(255,255,255,0.55)',
          borderRadius: 4,
          zIndex: 4,
          pointerEvents: 'none',
        }}
      />
    </div>

    <p className="text-sm text-slate-400 font-medium tracking-wide">{message}</p>
  </div>
);

export default JarLoader;
