import React, { useState, useEffect, useRef, useCallback } from 'react';
import GameRanking from './GameRanking';
import { fetchLB, saveGameScore, getCachedLB, glassLight, overlayStyle } from './gameUtils';

const GAME_DURATION = 10; // segundos

// Genera posición aleatoria dentro del área de juego (evita bordes)
const randPos = (areaW, areaH, r) => ({
  x: r + Math.random() * (areaW - r * 2),
  y: r + Math.random() * (areaH - r * 2),
});

// Radio del círculo — varía para dar dificultad
const randRadius = () => 22 + Math.floor(Math.random() * 22); // 22–44px

// Color aleatorio vibrante
const CIRCLE_COLORS = ['#EA4335','#4285F4','#34A853','#FBBC05','#9C27B0','#FF5722','#00BCD4','#E91E63','#FF9800','#8BC34A'];
const randColor = () => CIRCLE_COLORS[Math.floor(Math.random() * CIRCLE_COLORS.length)];

export default function ReactionTime({ onClose, currentUser }) {
  const [phase,    setPhase]    = useState('idle');   // idle | playing | done
  const [score,    setScore]    = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [circle,   setCircle]   = useState(null);     // { x, y, r, color, id }
  const [lb,       setLb]       = useState(getCachedLB('reaction'));
  const [isMobile, setIsMobile] = useState(window.innerWidth < 700);
  const [showLB,   setShowLB]   = useState(false);

  const timerRef  = useRef(null);
  const scoreRef  = useRef(0);
  const savedRef  = useRef(false);
  const circleId  = useRef(0);

  const AREA_W = isMobile ? Math.min(window.innerWidth - 48, 340) : 420;
  const AREA_H = isMobile ? 300 : 380;

  useEffect(() => {
    fetchLB('reaction').then(d => setLb(d));
    const f = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);

  // Spawn un nuevo círculo
  const spawnCircle = useCallback(() => {
    const r = randRadius();
    const pos = randPos(AREA_W, AREA_H, r);
    circleId.current += 1;
    setCircle({ ...pos, r, color: randColor(), id: circleId.current });
  }, [AREA_W, AREA_H]);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    savedRef.current = false;
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setPhase('playing');
    spawnCircle();

    // Countdown
    let t = GAME_DURATION;
    timerRef.current = setInterval(() => {
      t -= 1;
      setTimeLeft(t);
      if (t <= 0) {
        clearInterval(timerRef.current);
        setPhase('done');
        setCircle(null);
      }
    }, 1000);
  }, [spawnCircle]);

  // Guardar score al terminar
  useEffect(() => {
    if (phase === 'done' && !savedRef.current) {
      savedRef.current = true;
      if (scoreRef.current > 0) {
        saveGameScore('reaction', scoreRef.current)
          .then(() => fetchLB('reaction').then(d => setLb(d)));
      }
    }
  }, [phase]);

  // Cleanup
  useEffect(() => () => clearInterval(timerRef.current), []);

  const handleCircleClick = useCallback((e) => {
    e.stopPropagation();
    if (phase !== 'playing') return;
    scoreRef.current += 1;
    setScore(scoreRef.current);
    spawnCircle();
  }, [phase, spawnCircle]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { clearInterval(timerRef.current); onClose(); }
      if ((e.key === ' ' || e.key === 'Enter') && phase !== 'playing') {
        e.preventDefault(); startGame();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, phase, startGame]);

  // Barra de tiempo — color cambia según urgencia
  const barColor = timeLeft > 5 ? '#34A853' : timeLeft > 2 ? '#FBBC05' : '#EA4335';
  const barPct   = (timeLeft / GAME_DURATION) * 100;

  return (
    <div style={{ ...overlayStyle }} onClick={e => e.stopPropagation()}>
      <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', gap:12, alignItems:'flex-start', maxWidth:'98vw' }}>

        {/* Ranking desktop */}
        {!isMobile && (
          <div style={{ ...glassLight, padding:'18px 14px', minWidth:200 }}>
            <GameRanking lb={lb} game="reaction" maxHeight={380} />
          </div>
        )}

        {/* Panel juego */}
        <div style={{ ...glassLight, padding: isMobile ? '14px 14px 10px' : '20px 20px 16px', display:'flex', flexDirection:'column', alignItems:'center', gap: isMobile ? 10 : 14 }}>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%' }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
              <span style={{ fontSize: isMobile ? 16 : 20, fontWeight:800, color:'#1d1d1f', letterSpacing:'-0.5px' }}>💥 Revienta</span>
              <span style={{ fontSize: isMobile ? 13 : 15, fontWeight:700, color:'#007aff', background:'rgba(0,122,255,0.1)', padding:'2px 8px', borderRadius:20 }}>
                {score} pts
              </span>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {isMobile && (
                <button onClick={() => setShowLB(v => !v)}
                  style={{ background:'rgba(0,0,0,0.07)', border:'none', borderRadius:14, color:'#1d1d1f', padding:'5px 10px', cursor:'pointer', fontSize:11, fontWeight:600 }}>
                  🏆 Top
                </button>
              )}
              <button onClick={() => { clearInterval(timerRef.current); onClose(); }}
                style={{ background:'rgba(0,0,0,0.07)', border:'none', borderRadius:14, color:'#1d1d1f', padding: isMobile ? '5px 12px' : '6px 14px', cursor:'pointer', fontSize: isMobile ? 12 : 13, fontWeight:600 }}>
                Done
              </button>
            </div>
          </div>

          {isMobile && showLB ? (
            <div style={{ width:'100%', maxWidth:360, maxHeight:260, overflowY:'auto' }}>
              <GameRanking lb={lb} game="reaction" maxHeight={240} />
            </div>
          ) : (
            <>
              {/* Barra de tiempo */}
              {phase === 'playing' && (
                <div style={{ width: AREA_W, height:8, background:'rgba(0,0,0,0.1)', borderRadius:4, overflow:'hidden' }}>
                  <div style={{
                    height:'100%', borderRadius:4,
                    width:`${barPct}%`,
                    background: barColor,
                    transition:'width 1s linear, background 0.3s',
                  }}/>
                </div>
              )}

              {/* Área de juego */}
              <div style={{
                width: AREA_W, height: AREA_H,
                background:'linear-gradient(135deg,#1e293b,#0f172a)',
                borderRadius:20, position:'relative', overflow:'hidden',
                border:'1.5px solid rgba(255,255,255,0.12)',
                cursor: phase === 'playing' ? 'crosshair' : 'default',
                userSelect:'none',
              }}>

                {/* Idle */}
                {phase === 'idle' && (
                  <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
                    <span style={{ fontSize:52 }}>💥</span>
                    <p style={{ color:'white', fontWeight:800, fontSize:20, margin:0 }}>Revienta círculos</p>
                    <p style={{ color:'rgba(255,255,255,0.5)', fontSize:13, margin:0, textAlign:'center', padding:'0 24px' }}>
                      Toca todos los círculos en {GAME_DURATION} segundos
                    </p>
                    <button onClick={startGame}
                      style={{ background:'#007aff', color:'white', border:'none', borderRadius:22, padding:'12px 32px', fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:'0 6px 20px rgba(0,122,255,0.4)', marginTop:4 }}>
                      Iniciar
                    </button>
                  </div>
                )}

                {/* Done */}
                {phase === 'done' && (
                  <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10 }}>
                    <span style={{ fontSize:48 }}>🎯</span>
                    <p style={{ color:'white', fontWeight:800, fontSize:22, margin:0 }}>{score} círculos</p>
                    <p style={{ color:'rgba(255,255,255,0.5)', fontSize:13, margin:0 }}>
                      {score >= 20 ? '🔥 ¡Increíble!' : score >= 12 ? '⚡ Muy rápido' : score >= 7 ? '👍 Bien' : '🐢 Sigue practicando'}
                    </p>
                    <button onClick={startGame}
                      style={{ background:'#007aff', color:'white', border:'none', borderRadius:22, padding:'10px 28px', fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:'0 6px 20px rgba(0,122,255,0.4)', marginTop:4 }}>
                      ↻ Otra vez
                    </button>
                  </div>
                )}

                {/* Círculo activo */}
                {phase === 'playing' && circle && (
                  <div
                    key={circle.id}
                    onClick={handleCircleClick}
                    style={{
                      position:'absolute',
                      left: circle.x - circle.r,
                      top:  circle.y - circle.r,
                      width:  circle.r * 2,
                      height: circle.r * 2,
                      borderRadius:'50%',
                      background: circle.color,
                      boxShadow: `0 0 20px ${circle.color}99, 0 0 40px ${circle.color}44`,
                      cursor:'pointer',
                      animation:'popIn 0.12s ease-out',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}
                  />
                )}

                {/* Contador de tiempo encima del área */}
                {phase === 'playing' && (
                  <div style={{
                    position:'absolute', top:10, left:'50%', transform:'translateX(-50%)',
                    background:'rgba(0,0,0,0.45)', borderRadius:20, padding:'3px 14px',
                    color: barColor, fontWeight:800, fontSize:18, letterSpacing:'-0.5px',
                    backdropFilter:'blur(8px)',
                  }}>
                    {timeLeft}s
                  </div>
                )}
              </div>

              <style>{`
                @keyframes popIn {
                  from { transform: scale(0.3); opacity:0; }
                  to   { transform: scale(1);   opacity:1; }
                }
              `}</style>

              <p style={{ color:'rgba(0,0,0,0.3)', fontSize: isMobile ? 10 : 11, margin:0 }}>
                Toca los círculos · ESC cierra
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
