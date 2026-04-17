import React, { useState, useEffect, useCallback } from 'react';
import GameLayout from './GameLayout';
import { fetchLB, saveGameScore, getCachedLB } from './gameUtils';

const WORD_LISTS = {
  4: [
    'CASA','MESA','GATO','AGUA','AMOR','VIDA','HORA','IDEA','LADO','NOTA',
    'OBRA','PASO','PESO','PLAN','RAMA','SALA','TEMA','TIPO','ZONA','ARTE',
    'BIEN','DATO','EDAD','FASE','AZUL','BESO','CAFE','DEDO','FRIO','GRIS',
    'HILO','ISLA','JOYA','KILO','LUNA','MANO','NUBE','OJOS','PIEL','ROJO',
    'SOLO','TREN','UVAS','VINO','ALTO','BAJO','CERO','DURO','FIJO','LOCO',
    'RICO','SECO','FINO','RARO','LISO','PURO','VIVO','APTO','BUEN','CARO',
  ],
  5: [
    'FICHA','SABER','MUNDO','LUGAR','FORMA','PARTE','GRUPO','PUNTO','ORDEN',
    'CAMPO','MEDIO','NIVEL','VALOR','CLASE','CURSO','GRADO','MARCO','PAPEL',
    'PLANO','RADIO','RANGO','RITMO','SALUD','SIGNO','TAREA','TEXTO','VISTA','VUELO',
    'ABRIL','ACTOR','ALBUM','ANGEL','ARENA','AUDIO','BAILE','BANCO','BARCO',
    'BARRO','BELLO','BORDE','BRAZO','BREVE','BUENO','CABLE','CARNE','CARTA',
    'CERRO','CHICO','CIELO','CINCO','CLIMA','COLOR','CUERO','DANZA','DEBER',
    'DECIR','DOLOR','DULCE','ENERO','ERROR','ESTAR','FALTA','FECHA','FELIZ',
    'FINAL','FONDO','FRUTA','FUEGO','GENTE','GOLPE','GRANO','GRAVE','GUSTO',
    'HACER','HECHO','HIELO','HONOR','HOTEL','HUESO','HUMOR','IGUAL','JUNTO',
    'LARGO','LECHE','LETRA','LIBRO','LINEA','LLAMA','LLENO','MADRE','MAYOR',
    'MENOR','METAL','METRO','MIEDO','MOVER','MUCHO','NACER','NEGRO','NOCHE',
    'NORTE','NUEVO','ORDEN','PADRE','PAPEL','PASAR','PECHO','PERRO','PIANO',
    'PIEZA','PLATA','PLAZA','PODER','QUESO','REINO','RESTO','ROBOT','SALIR',
    'SANTO','SERIO','SIGLO','SOBRE','SOLAR','SUELO','TABLA','TANTO','TARDE',
    'TECHO','TOTAL','TRAJE','TRATO','TURNO','VERDE','VIAJE','VISTA','VIVIR',
    'VUELO','ZORRO','BRAVO','CLARO','CORTO','DENSO','DULCE','FIRME','FLACO',
    'GORDO','JUSTO','LENTO','LIBRE','LLENO','NOBLE','POBRE','SABIO','SUCIO',
  ],
  6: [
    'FICHAR','SABADO','CIUDAD','TIEMPO','CAMINO','DINERO','FUTURO','IMAGEN',
    'LENGUA','MANERA','NUMERO','OBJETO','PRECIO','PUEBLO','REGION','SANGRE',
    'SEMANA','TIERRA','VERDAD','VIAJES','BLANCO','BONITO','BRILLO','CAMBIO',
    'CIERTO','COMIDA','CUENTA','CUANDO','DENTRO','DUENDE','ESCENA','ESPEJO',
    'ESTADO','FUERZA','GRANDE','GRUESO','HUMANO','INICIO','JARDÍN','JOVEN',
    'LIGERO','LIMPIO','LLUVIA','MADERA','MEDIDA','MODELO','MODULO','MOTIVO',
    'MUSICA','NACION','NORMAL','OSCURO','PASADO','PIEDRA','PLANTA','PODRIA',
    'PRIMER','PROPIO','PUERTA','RAPIDO','RECIBO','REGALO','REMOTO','RIESGO',
    'RITUAL','SABIDO','SECRETO','SEGURO','SENORA','SIMPLE','SOCIAL','SONIDO',
    'SUBIDA','SUERTE','TALENTO','TEATRO','TEJIDO','TESORO','TITULO','TRAIGO',
    'ULTIMO','UNIDAD','URBANO','VALIDO','VECINO','VENENO','VERANO','VIDRIO',
    'VIRGEN','VISION','VISITA','VIVIDO','VOLCAN','ZURDO','AGENTE','ALEGRE',
  ],
};

const getRandomWord = (length) => {
  const words = WORD_LISTS[length] || WORD_LISTS[5];
  return words[Math.floor(Math.random() * words.length)];
};

const MAX_ATTEMPTS = 6;

const KEYBOARD = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L','Ñ'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
];

const evaluate = (guess, word) => {
  const result = Array(word.length).fill(null).map((_, i) => ({ letter: guess[i], state: 'absent' }));
  const wordArr = word.split('');
  const guessArr = guess.split('');
  const wordUsed = Array(word.length).fill(false);
  for (let i = 0; i < word.length; i++) {
    if (guessArr[i] === wordArr[i]) { result[i].state = 'correct'; wordUsed[i] = true; }
  }
  for (let i = 0; i < word.length; i++) {
    if (result[i].state === 'correct') continue;
    for (let j = 0; j < word.length; j++) {
      if (!wordUsed[j] && guessArr[i] === wordArr[j]) { result[i].state = 'present'; wordUsed[j] = true; break; }
    }
  }
  return result;
};

const STATE_COLORS = {
  correct: { bg:'#34A853', text:'white' },
  present: { bg:'#FBBC05', text:'white' },
  absent:  { bg:'#374151', text:'white' },
  empty:   { bg:'rgba(255,255,255,0.15)', text:'#1d1d1f' },
  active:  { bg:'rgba(255,255,255,0.4)', text:'#1d1d1f' },
};

// ── Daily tracking: 1 partida por longitud por día ──
const DAILY_KEY = 'arachiz_wordle_daily_v2';
const getTodayStr = () => new Date().toISOString().slice(0, 10);
const getDailyRecord = () => { try { return JSON.parse(localStorage.getItem(DAILY_KEY)) || {}; } catch { return {}; } };
const markPlayed = (length) => {
  const rec = getDailyRecord();
  const today = getTodayStr();
  if (!rec[today]) rec[today] = {};
  rec[today][length] = true;
  // Limpiar días viejos
  Object.keys(rec).forEach(d => { if (d !== today) delete rec[d]; });
  localStorage.setItem(DAILY_KEY, JSON.stringify(rec));
};
const hasPlayedToday = (length) => {
  const rec = getDailyRecord();
  return !!(rec[getTodayStr()]?.[length]);
};

export default function WordleGame({ onClose, currentUser }) {
  const [wordLength, setWordLength] = useState(5);
  const [WORD, setWORD] = useState(() => getRandomWord(5));
  const [guesses,  setGuesses]  = useState([]);
  const [current,  setCurrent]  = useState('');
  const [phase,    setPhase]    = useState(() => hasPlayedToday(5) ? 'done' : 'playing');
  const [lb,       setLb]       = useState(getCachedLB('wordle'));
  const [shake,    setShake]    = useState(false);
  const savedRef = React.useRef(false);

  useEffect(() => { fetchLB('wordle').then(d => setLb(d)); }, []);

  useEffect(() => {
    if ((phase === 'won' || phase === 'lost') && !savedRef.current) {
      savedRef.current = true;
      markPlayed(wordLength);
      if (phase === 'won') {
        saveGameScore('wordle', guesses.length).then(() => fetchLB('wordle').then(d => setLb(d)));
      } else {
        fetchLB('wordle').then(d => setLb(d));
      }
    }
  }, [phase, guesses, wordLength]);

  const submit = useCallback(() => {
    if (phase !== 'playing') return;
    if (current.length !== WORD.length) { setShake(true); setTimeout(() => setShake(false), 500); return; }
    const result = evaluate(current, WORD);
    const newGuesses = [...guesses, result];
    setGuesses(newGuesses);
    setCurrent('');
    if (current === WORD) { setPhase('won'); return; }
    if (newGuesses.length >= MAX_ATTEMPTS) setPhase('lost');
  }, [current, guesses, WORD, phase]);

  const pressKey = useCallback((key) => {
    if (phase !== 'playing') return;
    if (key === '⌫' || key === 'Backspace') { setCurrent(p => p.slice(0, -1)); return; }
    if (key === 'ENTER' || key === 'Enter') { submit(); return; }
    if (/^[A-ZÑ]$/.test(key) && current.length < WORD.length) setCurrent(p => p + key);
  }, [phase, current, submit, WORD.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (phase === 'playing') {
        pressKey(e.key === 'Backspace' ? '⌫' : e.key.toUpperCase());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pressKey, onClose, phase]);

  const letterStates = {};
  guesses.flat().forEach(({ letter, state }) => {
    if (!letterStates[letter] || state === 'correct') letterStates[letter] = state;
  });

  const switchLength = (length) => {
    setWordLength(length);
    setWORD(getRandomWord(length));
    savedRef.current = false;
    setGuesses([]);
    setCurrent('');
    setPhase(hasPlayedToday(length) ? 'done' : 'playing');
  };

  const score = phase === 'won' ? guesses.length : 0;
  const alreadyPlayed = phase === 'done';

  return (
    <GameLayout title="📝 Wordle" score={score} lb={lb} game="wordle" onClose={onClose}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
        <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}`}</style>

        {/* Selector de longitud */}
        <div style={{ display:'flex', gap:8 }}>
          {[4, 5, 6].map(length => {
            const played = hasPlayedToday(length);
            return (
              <button key={length} onClick={() => switchLength(length)}
                style={{
                  background: wordLength === length ? '#007aff' : played ? 'rgba(52,168,83,0.25)' : 'rgba(255,255,255,0.3)',
                  color: wordLength === length ? 'white' : played ? '#34A853' : '#1d1d1f',
                  border: played ? '1.5px solid #34A853' : 'none',
                  borderRadius: 8, padding:'6px 12px', fontSize:12, fontWeight:700,
                  cursor:'pointer', backdropFilter:'blur(8px)',
                  position:'relative',
                }}>
                {length} letras {played ? '✓' : ''}
              </button>
            );
          })}
        </div>

        {/* Aviso si ya jugó hoy */}
        {alreadyPlayed && (
          <div style={{ background:'rgba(52,168,83,0.15)', border:'1.5px solid #34A853', borderRadius:12, padding:'10px 18px', textAlign:'center' }}>
            <p style={{ margin:0, fontWeight:700, color:'#34A853', fontSize:13 }}>✅ Ya jugaste {wordLength} letras hoy</p>
            <p style={{ margin:'4px 0 0', color:'#6e6e73', fontSize:11 }}>Vuelve mañana · Prueba otra longitud</p>
          </div>
        )}

        {/* Grid de intentos — siempre visible */}
        <div style={{ display:'flex', flexDirection:'column', gap:4, opacity: alreadyPlayed ? 0.5 : 1 }}>
          {Array.from({ length: MAX_ATTEMPTS }).map((_, row) => {
            const guess = guesses[row];
            const isActive = row === guesses.length && phase === 'playing';
            const letters = isActive
              ? current.padEnd(WORD.length, ' ').split('')
              : (guess ? guess.map(g => g.letter) : Array(WORD.length).fill(' '));
            const states = guess
              ? guess.map(g => g.state)
              : Array(WORD.length).fill(isActive ? 'active' : 'empty');

            return (
              <div key={row} style={{ display:'flex', gap:4, animation: isActive && shake ? 'shake 0.4s ease' : 'none' }}>
                {letters.map((l, col) => {
                  const s = STATE_COLORS[states[col]] || STATE_COLORS.empty;
                  return (
                    <div key={col} style={{
                      width:44, height:44, borderRadius:8,
                      background: s.bg, color: s.text,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:18, fontWeight:800,
                      border: states[col] === 'empty' || states[col] === 'active' ? '1.5px solid rgba(255,255,255,0.4)' : 'none',
                      transition:'background 0.2s',
                    }}>
                      {l.trim()}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Resultado */}
        {(phase === 'won' || phase === 'lost') && (
          <div style={{ textAlign:'center' }}>
            {phase === 'won'
              ? <p style={{ color:'#34A853', fontWeight:800, fontSize:15, margin:'4px 0' }}>🎉 ¡Correcto en {guesses.length} intentos!</p>
              : <p style={{ color:'#EA4335', fontWeight:800, fontSize:15, margin:'4px 0' }}>La palabra era: <strong>{WORD}</strong></p>
            }
            <p style={{ color:'#6e6e73', fontSize:11, margin:'4px 0 0' }}>Vuelve mañana para jugar de nuevo</p>
          </div>
        )}

        {/* Teclado — solo si está jugando */}
        {!alreadyPlayed && (
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {KEYBOARD.map((row, ri) => (
              <div key={ri} style={{ display:'flex', gap:3, justifyContent:'center' }}>
                {row.map(key => {
                  const st = letterStates[key];
                  const col = st ? STATE_COLORS[st] : { bg:'rgba(255,255,255,0.55)', text:'#1d1d1f' };
                  const isWide = key === 'ENTER' || key === '⌫';
                  const isDisabled = phase !== 'playing';
                  return (
                    <button key={key} onClick={() => pressKey(key)} disabled={isDisabled}
                      style={{
                        width: isWide ? 52 : 32, height:36, borderRadius:7, border:'none',
                        background: col.bg, color: col.text,
                        fontSize: isWide ? 10 : 13, fontWeight:700,
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        opacity: isDisabled ? 0.5 : 1,
                        backdropFilter:'blur(8px)', transition:'background 0.2s',
                      }}>
                      {key}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </GameLayout>
  );
}
