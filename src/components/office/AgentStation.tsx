import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale, BarChart3, Megaphone, Search,
  TrendingUp, Building2, CalendarDays, Briefcase, ArrowRight,
} from 'lucide-react';
import type { Agent } from '../../types';

// ─── Deterministic per-agent offset (0–1) ────────────────────────────────────
function hashNum(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return ((h >>> 0) % 1000) / 1000;
}

// ─── Role icon ───────────────────────────────────────────────────────────────
function getRoleIcon(agent: Agent): React.ComponentType<{ size?: number; style?: React.CSSProperties }> {
  const t = `${agent.name} ${agent.title}`.toLowerCase();
  if (t.includes('юрист') || t.includes('право') || t.includes('закон')) return Scale;
  if (t.includes('финанс') || t.includes('налог') || t.includes('бухгалт')) return BarChart3;
  if (t.includes('маркет') || t.includes('контент') || t.includes('реклам')) return Megaphone;
  if (t.includes('исслед') || t.includes('аналит') || t.includes('данн'))   return Search;
  if (t.includes('продаж') || t.includes('sales')  || t.includes('менедж')) return TrendingUp;
  if (t.includes('недвиж') || t.includes('аренд')  || t.includes('real'))   return Building2;
  if (t.includes('личн')   || t.includes('personal')|| t.includes('организ')) return CalendarDays;
  return Briefcase;
}

// ─── Persona ─────────────────────────────────────────────────────────────────
interface Persona {
  gender: 'M' | 'F';
  s1: string; s2: string; s3: string;
  h1: string; h2: string;
  hair: 0 | 1 | 2 | 3 | 4;
  lip: string; eye: string;
}

function getPersona(agent: Agent): Persona {
  const t = `${agent.name} ${agent.title}`.toLowerCase();
  if (t.includes('юрист') || t.includes('право'))
    return { gender:'M', s1:'#d0a065', s2:'#a87838', s3:'#7a4e1e', h1:'#180c04', h2:'#2c180a', hair:0, lip:'rgba(150,78,46,0.60)', eye:'#1a1006' };
  if (t.includes('бизнес'))
    return { gender:'F', s1:'#f2ca98', s2:'#daa870', s3:'#ae7c42', h1:'#3e2808', h2:'#6a4418', hair:2, lip:'rgba(205,108,86,0.65)', eye:'#2e1e12' };
  if (t.includes('финанс') || t.includes('налог'))
    return { gender:'M', s1:'#dba870', s2:'#be8848', s3:'#985e30', h1:'#100a08', h2:'#504038', hair:1, lip:'rgba(148,80,50,0.52)', eye:'#1a1008' };
  if (t.includes('маркет') || t.includes('контент'))
    return { gender:'F', s1:'#e8b478', s2:'#cc8e52', s3:'#a86c34', h1:'#4a1c08', h2:'#7a3414', hair:3, lip:'rgba(215,105,80,0.68)', eye:'#281610' };
  if (t.includes('исслед') || t.includes('аналит'))
    return { gender:'M', s1:'#f0ccaa', s2:'#d8a878', s3:'#ae7c4e', h1:'#484040', h2:'#b0a8a0', hair:1, lip:'rgba(160,92,62,0.50)', eye:'#342820' };
  if (t.includes('продаж') || t.includes('sales'))
    return { gender:'M', s1:'#c09060', s2:'#9a6c3c', s3:'#784c22', h1:'#0c0806', h2:'#201410', hair:0, lip:'rgba(134,74,46,0.58)', eye:'#120e08' };
  if (t.includes('недвиж') || t.includes('аренд'))
    return { gender:'F', s1:'#e0b07c', s2:'#c48c58', s3:'#9e6838', h1:'#160e08', h2:'#2c1e10', hair:4, lip:'rgba(192,98,72,0.60)', eye:'#1e1410' };
  if (t.includes('личн') || t.includes('personal'))
    return { gender:'F', s1:'#f4cc9e', s2:'#dcaa76', s3:'#b47e4a', h1:'#120e0a', h2:'#241a10', hair:2, lip:'rgba(200,102,78,0.62)', eye:'#1e1810' };
  return { gender:'M', s1:'#daa870', s2:'#be8848', s3:'#985e30', h1:'#1a1008', h2:'#2e200c', hair:0, lip:'rgba(148,80,50,0.52)', eye:'#1a1008' };
}

// ─── Hair ─────────────────────────────────────────────────────────────────────
function renderHair(style: Persona['hair'], h1: string, h2: string) {
  switch (style) {
    case 0: return (
      <>
        <path d="M49 23 C49 7 58 2 70 2 C82 2 91 7 91 23 Q88 13 70 10 Q52 13 49 23 Z" fill={h1} />
        <rect x="48" y="20" width="3.5" height="9" rx="1.5" fill={h1} />
        <rect x="88.5" y="20" width="3.5" height="9" rx="1.5" fill={h1} />
        <path d="M60 10 Q70 7 80 10" stroke={h2} strokeWidth="1.5" fill="none" opacity="0.22" />
      </>
    );
    case 1: return (
      <>
        <path d="M48 25 C47 8 57 2 70 1.5 C83 2 93 8 92 25 Q88 14 70 10 Q52 14 48 25 Z" fill={h1} />
        <rect x="46" y="20" width="4" height="13" rx="2" fill={h1} />
        <rect x="90" y="20" width="4" height="13" rx="2" fill={h1} />
        <path d="M60 9 Q70 6 80 9" stroke={h2} strokeWidth="2.2" fill="none" opacity="0.18" />
        <path d="M63 8 Q70 6 77 8" stroke={h2} strokeWidth="1" fill="none" opacity="0.14" />
      </>
    );
    case 2: return (
      <>
        <path d="M50 22 C50 8 58 3 70 2.5 C82 3 90 8 90 22 Q87 13 70 10 Q53 13 50 22 Z" fill={h1} />
        <rect x="49" y="19" width="3" height="18" rx="1.5" fill={h1} />
        <rect x="88" y="19" width="3" height="18" rx="1.5" fill={h1} />
        <circle cx="70" cy="8" r="9" fill={h1} />
        <circle cx="67.5" cy="5.5" r="4" fill={h2} opacity="0.20" />
        <line x1="63" y1="14" x2="77" y2="14" stroke={h2} strokeWidth="0.7" opacity="0.20" />
      </>
    );
    case 3: return (
      <>
        <path d="M47 24 C46 8 57 2 70 1.5 C83 2 94 8 93 24 Q89 13 70 10 Q51 13 47 24 Z" fill={h1} />
        <path d="M47 24 Q43 34 45 46 Q48 39 50 31" stroke={h1} strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M93 24 Q97 34 95 46 Q92 39 90 31" stroke={h1} strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M60 8 Q70 5 80 8" stroke={h2} strokeWidth="1.8" fill="none" opacity="0.18" />
      </>
    );
    case 4: return (
      <>
        <path d="M50 22 C50 8 58 3 70 2.5 C82 3 90 8 90 22 Q87 13 70 10 Q53 13 50 22 Z" fill={h1} />
        <rect x="47" y="18" width="5" height="34" rx="2.5" fill={h1} />
        <rect x="88" y="18" width="5" height="34" rx="2.5" fill={h1} />
        <line x1="70" y1="8" x2="70" y2="13" stroke={h2} strokeWidth="1.1" opacity="0.24" />
        <path d="M62 9 Q70 7 78 9" stroke={h2} strokeWidth="1.3" fill="none" opacity="0.16" />
      </>
    );
  }
}

// ─── Face ────────────────────────────────────────────────────────────────────
function renderFace(p: Persona, uid: string) {
  const { gender, s1, s2, s3, lip, h1, h2 } = p;
  const isFemale = gender === 'F';
  const sf = `url(#sf-${uid})`;
  const ir = `url(#ir-${uid})`;
  const sk = `url(#sk-${uid})`;

  const headPath = isFemale
    ? 'M70 4 C82 4 90 10 90 22 C90 32 84 40 70 40 C56 40 50 32 50 22 C50 10 58 4 70 4 Z'
    : 'M70 3 C84 3 92 10 92 24 C92 35 86 43 70 43 C54 43 48 35 48 24 C48 10 56 3 70 3 Z';

  const chinY  = isFemale ? 40 : 43;
  const eyeY   = isFemale ? 19 : 20;
  const eyeLX  = isFemale ? 62 : 61;
  const eyeRX  = isFemale ? 78 : 79;
  const eW     = isFemale ? 4.8 : 5.0;
  const eH     = isFemale ? 3.0 : 3.1;
  const iR     = 2.3;
  const noseY  = isFemale ? 28 : 30;
  const mouthY = isFemale ? 34 : 36;
  const earY   = isFemale ? 19 : 21;
  const earXL  = isFemale ? 50 : 48;
  const earXR  = isFemale ? 90 : 92;
  const browY  = isFemale ? 13 : 15;

  return (
    <>
      {/* Neck */}
      <rect x={65} y={chinY - 1} width={10} height={13} rx={3} fill={s2} />
      <rect x={65} y={chinY - 1} width={2.5} height={13} rx={1} fill={s3} opacity={0.28} />
      <rect x={72.5} y={chinY - 1} width={2.5} height={13} rx={1} fill={s3} opacity={0.28} />

      {/* Head base */}
      <path d={headPath} fill={s2} />
      <path d={headPath} fill={sk} />

      {/* Side shadows */}
      <path
        d={isFemale
          ? 'M50 22 C50 14 54 8 61 5 L61 37 Q51 34 50 22 Z'
          : 'M48 24 C48 15 53 9 61 5 L61 39 Q49 36 48 24 Z'}
        fill={s3} opacity={0.17} filter={sf} />
      <path
        d={isFemale
          ? 'M90 22 C90 14 86 8 79 5 L79 37 Q89 34 90 22 Z'
          : 'M92 24 C92 15 87 9 79 5 L79 39 Q91 36 92 24 Z'}
        fill={s3} opacity={0.17} filter={sf} />

      {/* Forehead highlight */}
      <ellipse cx={70} cy={isFemale ? 12 : 13} rx={isFemale ? 9 : 10} ry={6}
        fill={s1} opacity={0.38} filter={sf} />
      {/* Monitor light on lower face */}
      <ellipse cx={70} cy={chinY - 7} rx={12} ry={7}
        fill="rgba(130,180,255,0.07)" filter={sf} />
      {/* Chin shadow */}
      <ellipse cx={70} cy={chinY - 3} rx={isFemale ? 7 : 8} ry={3}
        fill={s3} opacity={0.15} filter={sf} />
      {/* Cheek flush */}
      <ellipse cx={eyeLX - 5} cy={eyeY + 8} rx={5} ry={4} fill="rgba(210,88,65,0.07)" filter={sf} />
      <ellipse cx={eyeRX + 5} cy={eyeY + 8} rx={5} ry={4} fill="rgba(210,88,65,0.07)" filter={sf} />

      {/* Hair */}
      {renderHair(p.hair, h1, h2)}

      {/* Ears */}
      <ellipse cx={earXL} cy={earY} rx={2.5} ry={4} fill={s2} stroke={s3} strokeWidth={0.5} strokeOpacity={0.38} />
      <ellipse cx={earXR} cy={earY} rx={2.5} ry={4} fill={s2} stroke={s3} strokeWidth={0.5} strokeOpacity={0.38} />

      {/* Eyebrows */}
      {isFemale ? (
        <>
          <path d={`M${eyeLX-5} ${browY+1} Q${eyeLX} ${browY-1} ${eyeLX+5} ${browY+1}`}
            stroke={h1} strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d={`M${eyeRX-5} ${browY+1} Q${eyeRX} ${browY-1} ${eyeRX+5} ${browY+1}`}
            stroke={h1} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d={`M${eyeLX-6} ${browY+1} Q${eyeLX} ${browY-1} ${eyeLX+6} ${browY+1}`}
            stroke={h1} strokeWidth="1.7" fill="none" strokeLinecap="round" />
          <path d={`M${eyeRX-6} ${browY+1} Q${eyeRX} ${browY-1} ${eyeRX+6} ${browY+1}`}
            stroke={h1} strokeWidth="1.7" fill="none" strokeLinecap="round" />
          <path d={`M${eyeLX-5} ${browY+1.8} Q${eyeLX} ${browY-0.2} ${eyeLX+5} ${browY+1.8}`}
            stroke={s3} strokeWidth="0.5" fill="none" strokeOpacity="0.28" />
          <path d={`M${eyeRX-5} ${browY+1.8} Q${eyeRX} ${browY-0.2} ${eyeRX+5} ${browY+1.8}`}
            stroke={s3} strokeWidth="0.5" fill="none" strokeOpacity="0.28" />
        </>
      )}

      {/* LEFT EYE */}
      <ellipse cx={eyeLX} cy={eyeY} rx={eW+0.9} ry={eH+0.9} fill={s3} opacity={0.11} filter={sf} />
      <ellipse cx={eyeLX} cy={eyeY} rx={eW} ry={eH} fill="#ede8df" />
      <ellipse cx={eyeLX-eW+1} cy={eyeY+0.3} rx={1.2} ry={0.9} fill="rgba(200,85,65,0.13)" />
      <ellipse cx={eyeLX} cy={eyeY-0.2} rx={iR} ry={iR} fill={ir} />
      <ellipse cx={eyeLX} cy={eyeY-0.2} rx={iR} ry={iR} fill="none"
        stroke="#060402" strokeWidth={0.6} strokeOpacity={0.48} />
      <ellipse cx={eyeLX} cy={eyeY-0.2} rx={1.2} ry={1.35} fill="#070504" />
      <path d={`M${eyeLX-eW} ${eyeY-0.8} Q${eyeLX} ${eyeY-eH-0.7} ${eyeLX+eW} ${eyeY-0.8}
        L${eyeLX+eW-0.5} ${eyeY-0.2} Q${eyeLX} ${eyeY-eH+0.1} ${eyeLX-eW+0.5} ${eyeY-0.2} Z`}
        fill={s2} />
      <path d={`M${eyeLX-eW} ${eyeY-0.8} Q${eyeLX} ${eyeY-eH-0.7} ${eyeLX+eW} ${eyeY-0.8}`}
        stroke={s3} strokeWidth={0.8} fill="none" strokeLinecap="round" strokeOpacity={0.38} />
      <path d={`M${eyeLX-eW+0.5} ${eyeY-0.2} Q${eyeLX} ${eyeY-eH+0.1} ${eyeLX+eW-0.5} ${eyeY-0.2}`}
        stroke={h1} strokeWidth={0.7} fill="none" strokeLinecap="round" strokeOpacity={0.58} />
      <path d={`M${eyeLX-eW+0.5} ${eyeY+eH-0.3} Q${eyeLX} ${eyeY+eH+0.5} ${eyeLX+eW-0.5} ${eyeY+eH-0.3}`}
        stroke={s3} strokeWidth={0.6} fill="none" strokeLinecap="round" strokeOpacity={0.18} />
      <circle cx={eyeLX+1.2} cy={eyeY-1.0} r={0.9} fill="rgba(255,255,255,0.82)" />
      <circle cx={eyeLX-0.8} cy={eyeY+0.7} r={0.38} fill="rgba(255,255,255,0.26)" />
      {isFemale && (
        <>
          <line x1={eyeLX-eW+0.5} y1={eyeY-0.4} x2={eyeLX-eW-0.9} y2={eyeY-2.1} stroke={h1} strokeWidth="0.9" />
          <line x1={eyeLX-2}      y1={eyeY-eH+0.1} x2={eyeLX-2.4} y2={eyeY-eH-1.7} stroke={h1} strokeWidth="0.9" />
          <line x1={eyeLX}        y1={eyeY-eH-0.2} x2={eyeLX}     y2={eyeY-eH-1.9} stroke={h1} strokeWidth="0.9" />
          <line x1={eyeLX+2}      y1={eyeY-eH+0.1} x2={eyeLX+2.4} y2={eyeY-eH-1.7} stroke={h1} strokeWidth="0.9" />
          <line x1={eyeLX+eW-0.5} y1={eyeY-0.4} x2={eyeLX+eW+0.9} y2={eyeY-2.1} stroke={h1} strokeWidth="0.9" />
        </>
      )}

      {/* RIGHT EYE */}
      <ellipse cx={eyeRX} cy={eyeY} rx={eW+0.9} ry={eH+0.9} fill={s3} opacity={0.11} filter={sf} />
      <ellipse cx={eyeRX} cy={eyeY} rx={eW} ry={eH} fill="#ede8df" />
      <ellipse cx={eyeRX+eW-1} cy={eyeY+0.3} rx={1.2} ry={0.9} fill="rgba(200,85,65,0.13)" />
      <ellipse cx={eyeRX} cy={eyeY-0.2} rx={iR} ry={iR} fill={ir} />
      <ellipse cx={eyeRX} cy={eyeY-0.2} rx={iR} ry={iR} fill="none"
        stroke="#060402" strokeWidth={0.6} strokeOpacity={0.48} />
      <ellipse cx={eyeRX} cy={eyeY-0.2} rx={1.2} ry={1.35} fill="#070504" />
      <path d={`M${eyeRX-eW} ${eyeY-0.8} Q${eyeRX} ${eyeY-eH-0.7} ${eyeRX+eW} ${eyeY-0.8}
        L${eyeRX+eW-0.5} ${eyeY-0.2} Q${eyeRX} ${eyeY-eH+0.1} ${eyeRX-eW+0.5} ${eyeY-0.2} Z`}
        fill={s2} />
      <path d={`M${eyeRX-eW} ${eyeY-0.8} Q${eyeRX} ${eyeY-eH-0.7} ${eyeRX+eW} ${eyeY-0.8}`}
        stroke={s3} strokeWidth={0.8} fill="none" strokeLinecap="round" strokeOpacity={0.38} />
      <path d={`M${eyeRX-eW+0.5} ${eyeY-0.2} Q${eyeRX} ${eyeY-eH+0.1} ${eyeRX+eW-0.5} ${eyeY-0.2}`}
        stroke={h1} strokeWidth={0.7} fill="none" strokeLinecap="round" strokeOpacity={0.58} />
      <path d={`M${eyeRX-eW+0.5} ${eyeY+eH-0.3} Q${eyeRX} ${eyeY+eH+0.5} ${eyeRX+eW-0.5} ${eyeY+eH-0.3}`}
        stroke={s3} strokeWidth={0.6} fill="none" strokeLinecap="round" strokeOpacity={0.18} />
      <circle cx={eyeRX+1.2} cy={eyeY-1.0} r={0.9} fill="rgba(255,255,255,0.82)" />
      <circle cx={eyeRX-0.8} cy={eyeY+0.7} r={0.38} fill="rgba(255,255,255,0.26)" />
      {isFemale && (
        <>
          <line x1={eyeRX-eW+0.5} y1={eyeY-0.4} x2={eyeRX-eW-0.9} y2={eyeY-2.1} stroke={h1} strokeWidth="0.9" />
          <line x1={eyeRX-2}      y1={eyeY-eH+0.1} x2={eyeRX-2.4} y2={eyeY-eH-1.7} stroke={h1} strokeWidth="0.9" />
          <line x1={eyeRX}        y1={eyeY-eH-0.2} x2={eyeRX}     y2={eyeY-eH-1.9} stroke={h1} strokeWidth="0.9" />
          <line x1={eyeRX+2}      y1={eyeY-eH+0.1} x2={eyeRX+2.4} y2={eyeY-eH-1.7} stroke={h1} strokeWidth="0.9" />
          <line x1={eyeRX+eW-0.5} y1={eyeY-0.4} x2={eyeRX+eW+0.9} y2={eyeY-2.1} stroke={h1} strokeWidth="0.9" />
        </>
      )}

      {/* Nose */}
      <line x1={70} y1={eyeY+2} x2={70} y2={noseY}
        stroke={s3} strokeWidth={1.3} strokeOpacity={0.15} strokeLinecap="round" />
      <ellipse cx={70} cy={noseY} rx={3.0} ry={1.8} fill={s1} opacity={0.30} />
      <circle  cx={71} cy={noseY-0.7} r={0.9} fill={s1} opacity={0.36} />
      <path d={`M67.2 ${noseY-0.5} Q66.2 ${noseY+1.5} 66.8 ${noseY+2.8}`}
        stroke={s3} strokeWidth={1.1} fill="none" strokeLinecap="round" strokeOpacity={0.26} />
      <path d={`M72.8 ${noseY-0.5} Q73.8 ${noseY+1.5} 73.2 ${noseY+2.8}`}
        stroke={s3} strokeWidth={1.1} fill="none" strokeLinecap="round" strokeOpacity={0.26} />
      <path d={`M67.2 ${noseY+2} Q70 ${noseY+3.5} 72.8 ${noseY+2}`}
        stroke={s3} strokeWidth={0.8} fill="none" strokeOpacity={0.17} />
      {/* Nasolabial folds */}
      <path d={`M66.5 ${noseY+2} Q65.2 ${noseY+5} 65.8 ${mouthY}`}
        stroke={s3} strokeWidth={0.8} fill="none" strokeOpacity={0.11} strokeLinecap="round" filter={sf} />
      <path d={`M73.5 ${noseY+2} Q74.8 ${noseY+5} 74.2 ${mouthY}`}
        stroke={s3} strokeWidth={0.8} fill="none" strokeOpacity={0.11} strokeLinecap="round" filter={sf} />

      {/* Mouth */}
      <line x1={70} y1={noseY+3} x2={70} y2={mouthY-0.8}
        stroke={s3} strokeWidth={0.7} strokeOpacity={0.14} />
      <ellipse cx={70} cy={mouthY} rx={3.2} ry={1.2} fill={s3} opacity={0.06} filter={sf} />
      {isFemale ? (
        <path d={`M66.8 ${mouthY} Q68.5 ${mouthY-1.4} 70 ${mouthY} Q71.5 ${mouthY-1.4} 73.2 ${mouthY}`}
          stroke={lip} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      ) : (
        <path d={`M67.0 ${mouthY} Q70 ${mouthY-1.0} 73.0 ${mouthY}`}
          stroke={lip} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      )}
      <path d={`M67.2 ${mouthY+0.8} Q70 ${mouthY+1.2} 72.8 ${mouthY+0.8}`}
        stroke={s3} strokeWidth={0.5} fill="none" strokeOpacity={0.18} />
      <ellipse cx={70} cy={mouthY+1.2} rx={2.2} ry={0.7} fill="rgba(245,236,222,0.16)" />
      <path d={isFemale
        ? `M66.5 ${mouthY+2} Q70 ${mouthY+4.0} 73.5 ${mouthY+2}`
        : `M67 ${mouthY+1.8} Q70 ${mouthY+3.8} 73 ${mouthY+1.8}`}
        stroke={lip} strokeWidth={isFemale ? 1.7 : 1.4} fill="none" strokeLinecap="round" />
      <circle cx={67} cy={mouthY+0.8} r={0.8} fill={s3} opacity={0.20} />
      <circle cx={73} cy={mouthY+0.8} r={0.8} fill={s3} opacity={0.20} />
      <ellipse cx={70} cy={mouthY+2.4} rx={2.2} ry={0.7} fill={s1} opacity={0.18} />
    </>
  );
}

// ─── WorkstationSVG ──────────────────────────────────────────────────────────
// Animations:
//   typing  — random periodic burst: keyboard, hands, cursor, active title bar
//   blinking — brief eyelid close every few seconds
function WorkstationSVG({ agent, isExecutive, hovered, animOffset }: {
  agent: Agent;
  isExecutive: boolean;
  hovered: boolean;
  animOffset: number;
}) {
  const [typing,   setTyping]   = useState(false);
  const [blinking, setBlinking] = useState(false);

  // ── Typing cycle ─────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    const cycle = () => {
      if (!alive) return;
      const pauseMs = 3500 + Math.random() * 5500 + animOffset * 1500;
      setTimeout(() => {
        if (!alive) return;
        setTyping(true);
        const typeMs = 1400 + Math.random() * 2200;
        setTimeout(() => {
          if (!alive) return;
          setTyping(false);
          cycle();
        }, typeMs);
      }, pauseMs);
    };
    const init = setTimeout(cycle, 400 + animOffset * 2200);
    return () => { alive = false; clearTimeout(init); };
  }, [animOffset]);

  // ── Blink cycle ──────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    const blink = () => {
      if (!alive) return;
      const waitMs = 2800 + Math.random() * 3200 + animOffset * 1200;
      setTimeout(() => {
        if (!alive) return;
        setBlinking(true);
        setTimeout(() => {
          if (!alive) return;
          setBlinking(false);
          blink();
        }, 145);
      }, waitMs);
    };
    const init = setTimeout(blink, 600 + animOffset * 1200);
    return () => { alive = false; clearTimeout(init); };
  }, [animOffset]);

  const persona = getPersona(agent);
  const S  = isExecutive ? 1.18 : 1.0;
  const W  = Math.round(140 * S);
  const H  = Math.round(162 * S);

  const uid  = agent.id.replace(/[^a-z0-9]/gi, '');
  const gId  = `wa-${uid}`;
  const suId = `su-${uid}`;
  const dkId = `dk-${uid}`;
  const shId = `sh-${uid}`;

  const acc  = agent.accentColor;
  const glow = agent.glowColor;
  const { s2 } = persona;

  // Eye coords needed for blink overlays (mirror of renderFace)
  const isFemale = persona.gender === 'F';
  const eyeY  = isFemale ? 19 : 20;
  const eyeLX = isFemale ? 62 : 61;
  const eyeRX = isFemale ? 78 : 79;
  const eW    = isFemale ? 4.8 : 5.0;
  const eH    = isFemale ? 3.0 : 3.1;

  return (
    <svg
      width={W} height={H}
      viewBox="0 0 140 162"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={gId} cx="50%" cy="22%" r="55%">
          <stop offset="0%"   stopColor={glow} stopOpacity={hovered ? 0.38 : 0.11} />
          <stop offset="100%" stopColor={glow} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={suId} x1="0" y1="0" x2="140" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#0b1220" />
          <stop offset="25%"  stopColor="#162040" />
          <stop offset="50%"  stopColor="#1c2c54" />
          <stop offset="75%"  stopColor="#162040" />
          <stop offset="100%" stopColor="#0b1220" />
        </linearGradient>
        <linearGradient id={dkId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#2c1e0c" />
          <stop offset="100%" stopColor="#1a1006" />
        </linearGradient>
        <linearGradient id={shId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.09)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.00)" />
        </linearGradient>
        <filter id={`sf-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.65" />
        </filter>
        <radialGradient id={`ir-${uid}`} cx="38%" cy="32%" r="72%">
          <stop offset="0%"   stopColor={persona.eye} stopOpacity="0.55" />
          <stop offset="58%"  stopColor={persona.eye} />
          <stop offset="100%" stopColor="#030201" />
        </radialGradient>
        <radialGradient id={`sk-${uid}`} cx="50%" cy="44%" r="56%">
          <stop offset="0%"   stopColor="rgba(255,145,105,0.09)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      {/* Aura */}
      <ellipse cx="70" cy="28" rx="74" ry="58" fill={`url(#${gId})`} />

      {/* Chair back */}
      <rect x="38" y="0" width="64" height="86" rx="32"
        fill="#17130d"
        stroke={`rgba(255,165,60,${hovered ? '0.17' : '0.06'})`}
        strokeWidth="1"
      />
      <rect x="50" y="0" width="40" height="3.5" rx="2" fill="rgba(255,150,50,0.08)" />
      <rect x="54" y="68" width="32" height="1.2" rx="1" fill="rgba(0,0,0,0.20)" />
      <rect x="27" y="78" width="17" height="4.5" rx="2.3" fill="#141008" stroke="rgba(255,150,60,0.04)" strokeWidth="0.5" />
      <rect x="96" y="78" width="17" height="4.5" rx="2.3" fill="#141008" stroke="rgba(255,150,60,0.04)" strokeWidth="0.5" />

      {/* Shoulders */}
      <path d="M22 57 L26 100 L114 100 L118 57 Q94 50 70 49 Q46 50 22 57 Z" fill={`url(#${suId})`} />
      <path d="M22 57 Q70 49 118 57 L115 63 Q70 54 25 63 Z" fill={`url(#${shId})`} />

      {/* Left arm */}
      <path d="M26 80 Q19 107 17 123" stroke="#0e1628" strokeWidth="14" strokeLinecap="round" fill="none" />
      <path d="M28 80 Q21 106 19 122" stroke="rgba(255,255,255,0.035)" strokeWidth="4" strokeLinecap="round" fill="none" />

      {/* Right arm */}
      <path d="M114 80 Q121 107 123 123" stroke="#0e1628" strokeWidth="14" strokeLinecap="round" fill="none" />
      <path d="M112 80 Q119 106 121 122" stroke="rgba(255,255,255,0.035)" strokeWidth="4" strokeLinecap="round" fill="none" />

      {/* Shirt collar */}
      <path d="M63 51 L66 63 L70 67 L74 63 L77 51 Q72 48 70 48 Q68 48 63 51 Z" fill="rgba(228,232,244,0.88)" />
      <path d="M63 51 L66 63 L70 67 L74 63 L77 51" fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth="0.5" />
      {persona.gender === 'M' && (
        <>
          <path d="M69 54 L70 63 L71 54 Q70 51 69 54 Z" fill={`${acc}88`} />
          <ellipse cx="70" cy="53" rx="1.8" ry="1.2" fill={`${acc}aa`} />
        </>
      )}
      <path d="M63 51 L22 57 L26 100 L52 100 L52 66 Z" fill={`url(#${suId})`} />
      <path d="M77 51 L118 57 L114 100 L88 100 L88 66 Z" fill={`url(#${suId})`} />
      <path d="M63 51 L52 66 L53 69 Q57 60 65 56 Z" fill="rgba(255,255,255,0.04)" />
      <path d="M77 51 L88 66 L87 69 Q83 60 75 56 Z" fill="rgba(255,255,255,0.04)" />

      {/* Monitor frame */}
      <rect x="20" y="62" width="100" height="62" rx="5"
        fill="#04070d"
        stroke={`${acc}${hovered ? '40' : '24'}`}
        strokeWidth="1.2"
      />
      {/* Screen */}
      <rect x="24" y="66" width="92" height="54" rx="3" fill="#080e1c" />
      {/* Header band — brightens when typing */}
      <motion.rect
        x={24} y={66} width={92} height={18} rx={3}
        animate={{ opacity: typing ? [0.85, 1.3, 0.85] : 1 }}
        transition={typing ? { duration: 0.9, repeat: Infinity } : { duration: 0.5 }}
        fill={`${acc}0e`}
      />
      {/* Active title bar — pulses width during typing */}
      <motion.rect
        x={28} y={70} height={5.5} rx={2}
        animate={{ width: typing ? [52, 62, 44, 58, 52] : 52 }}
        transition={typing ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.4 }}
        fill={`${acc}2c`}
      />
      {/* Cursor — blinks fast while typing, slow at rest */}
      <motion.rect
        x={83} y={70} width={1.5} height={5.5} rx={0.5}
        fill={acc}
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: typing ? 0.22 : 0.58, repeat: Infinity, ease: [0, 0, 1, 1] }}
      />
      {/* Static content lines */}
      <rect x="28" y="79" width="38" height="2.2" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="28" y="83.5" width="62" height="2.2" rx="1" fill="rgba(255,255,255,0.05)" />
      <rect x="28" y="88" width="48" height="2.2" rx="1" fill="rgba(255,255,255,0.04)" />
      <rect x="28" y="92.5" width="56" height="2.2" rx="1" fill="rgba(255,255,255,0.04)" />
      {/* Active lines — animate during typing */}
      <motion.rect
        x={28} y={97} height={2.2} rx={1}
        animate={{ width: typing ? [30, 52, 20, 60, 30] : 30, opacity: typing ? [0.04, 0.08, 0.04] : 0.03 }}
        transition={typing ? { duration: 1.6, repeat: Infinity } : { duration: 0.5 }}
      />
      <motion.rect
        x={28} y={101.5} height={2.2} rx={1}
        animate={{ width: typing ? [44, 18, 56, 30, 44] : 44, opacity: typing ? [0.03, 0.07, 0.03] : 0.03 }}
        transition={typing ? { duration: 1.4, repeat: Infinity, delay: 0.3 } : { duration: 0.5 }}
      />
      <rect x="28" y="106" width="36" height="2.2" rx="1" fill="rgba(255,255,255,0.02)" />
      {/* Glare */}
      <path d="M24 66 L70 66 L24 86 Z" fill="rgba(255,255,255,0.016)" />
      {/* Status bar */}
      <rect x="20" y="117" width="100" height="4.5" rx="0" fill="rgba(0,0,0,0.62)" />
      {agent.status === 'active' && (
        <circle cx="67" cy="119.2" r="1.7" fill="#10b981" opacity="0.88" />
      )}
      <rect x="63" y="121.5" width="14" height="4" rx="1.5" fill="#090807" />

      {/* Desk */}
      <rect x="0" y="128" width="140" height="16" rx="2" fill={`url(#${dkId})`} />
      <rect x="0" y="128" width="140" height="2" fill="rgba(255,190,70,0.26)" />
      <line x1="0" y1="134" x2="140" y2="134" stroke="rgba(255,185,65,0.04)" strokeWidth="0.5" />
      <line x1="0" y1="139" x2="140" y2="139" stroke="rgba(255,185,65,0.03)" strokeWidth="0.5" />
      <rect x="0" y="144" width="140" height="15" rx="1" fill="#161008" />
      <rect x="0" y="144" width="140" height="1.5" fill="rgba(255,170,55,0.05)" />

      {/* Keyboard — glows during typing */}
      <motion.rect
        x={32} y={133} width={76} height={7} rx={2}
        stroke={`${acc}20`} strokeWidth={0.5}
        animate={{ fill: typing ? [acc + '22', acc + '30', acc + '22'] : acc + '18' }}
        transition={typing ? { duration: 0.35, repeat: Infinity } : { duration: 0.4 }}
      />
      <rect x="34" y="134.5" width="72" height="1.4" rx="0.5" fill={`${acc}0b`} />
      <rect x="34" y="137" width="72" height="1.4" rx="0.5" fill={`${acc}07`} />

      {/* Mouse */}
      <ellipse cx="118" cy="135" rx="5" ry="3.8" fill={`${acc}10`} stroke={`${acc}1a`} strokeWidth="0.5" />

      {/* Hands — bounce during typing */}
      <motion.ellipse
        cx={17} cy={131} rx={7.5} ry={3.8}
        fill={s2} opacity={0.88}
        animate={typing ? { cy: [131, 129.8, 131] } : { cy: 131 }}
        transition={typing ? { duration: 0.28, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
      />
      <motion.ellipse
        cx={123} cy={131} rx={7.5} ry={3.8}
        fill={s2} opacity={0.88}
        animate={typing ? { cy: [131, 130.2, 131] } : { cy: 131 }}
        transition={typing ? { duration: 0.28, repeat: Infinity, delay: 0.14, ease: 'easeInOut' } : { duration: 0.3 }}
      />

      {/* Screen glow on face */}
      <ellipse cx="70" cy="64" rx="30" ry="14" fill={`${acc}09`} />

      {/* Face */}
      {renderFace(persona, uid)}

      {/* ── Eye blink overlays — drawn on top of face ── */}
      {/* Left eye lid */}
      <motion.ellipse
        cx={eyeLX} cy={eyeY} rx={eW + 0.2}
        ry={0.01}
        fill={persona.s2}
        animate={{ ry: blinking ? eH + 0.5 : 0.01 }}
        transition={{ duration: blinking ? 0.07 : 0.11, ease: 'easeInOut' }}
      />
      {/* Right eye lid */}
      <motion.ellipse
        cx={eyeRX} cy={eyeY} rx={eW + 0.2}
        ry={0.01}
        fill={persona.s2}
        animate={{ ry: blinking ? eH + 0.5 : 0.01 }}
        transition={{ duration: blinking ? 0.07 : 0.11, ease: 'easeInOut' }}
      />
    </svg>
  );
}

// ─── AgentStation ─────────────────────────────────────────────────────────────

interface AgentStationProps {
  agent: Agent;
  isExecutive?: boolean;
  onOpen?: (agent: Agent) => void;
  cardSide?: 'left' | 'right' | 'below';
}

export function AgentStation({ agent, isExecutive = false, onOpen, cardSide = 'below' }: AgentStationProps) {
  const [hovered, setHovered] = useState(false);
  const Icon = getRoleIcon(agent);

  // Per-agent animation offset — keeps all agents out of sync
  const animOffset = hashNum(agent.id);

  const S     = isExecutive ? 1.18 : 1.0;
  const svgW  = Math.round(140 * S);
  const svgH  = Math.round(162 * S);
  const cardW = Math.round(136 * S);
  const contW = cardSide === 'below' ? Math.max(svgW, cardW) : svgW;
  const cardTop = Math.round(svgH * 0.40);

  const cardPositionStyle: React.CSSProperties =
    cardSide === 'left'  ? { position: 'absolute', right: contW + 10, top: cardTop } :
    cardSide === 'right' ? { position: 'absolute', left:  contW + 10, top: cardTop } :
    /* below */            { position: 'relative', marginTop: 5 };

  // Breathing period — 3.6 – 4.4 s, unique per agent
  const breathPeriod = 3.6 + animOffset * 0.8;
  const breathDelay  = animOffset * 2.5;

  return (
    <div
      className="relative flex flex-col items-center"
      style={{ width: contW, cursor: 'pointer', userSelect: 'none', overflow: 'visible' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen?.(agent)}
    >
      {/* ── Hover lift layer ── */}
      <motion.div
        animate={{ y: hovered ? -5 : 0 }}
        transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ flexShrink: 0 }}
      >
        {/* ── Breathing layer (always running, ignored during hover) ── */}
        <motion.div
          animate={hovered ? { y: 0 } : { y: [0, -1.6, 0] }}
          transition={hovered
            ? { duration: 0.18 }
            : { duration: breathPeriod, repeat: Infinity, ease: 'easeInOut', delay: breathDelay }}
        >
          <WorkstationSVG
            agent={agent}
            isExecutive={isExecutive}
            hovered={hovered}
            animOffset={animOffset}
          />
        </motion.div>
      </motion.div>

      {/* ── Label card ── */}
      <motion.div
        animate={hovered ? { y: -3, scale: 1.02 } : { y: 0, scale: 1 }}
        transition={{ duration: 0.22 }}
        style={{
          width:  cardW,
          ...cardPositionStyle,
          padding: '6px 9px 6px',
          borderRadius: 9,
          background:   'rgba(6,4,2,0.96)',
          border:       `1px solid ${agent.accentColor}${hovered ? '58' : '30'}`,
          boxShadow: [
            '0 8px 28px rgba(0,0,0,0.86)',
            `0 0 ${hovered ? 24 : 10}px ${agent.glowColor}`,
          ].join(', '),
          backdropFilter:       'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          zIndex: 4, flexShrink: 0,
          overflow: 'visible',
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}
      >
        {/* Icon badge */}
        <div style={{
          position: 'absolute', top: -14, right: 6, zIndex: 50,
          width: 26, height: 26, borderRadius: 8,
          background: 'rgba(4,2,0,0.97)',
          border: `1.5px solid ${agent.accentColor}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 14px ${agent.glowColor}, 0 2px 8px rgba(0,0,0,0.9)`,
        }}>
          <Icon size={13} style={{ color: agent.accentColor, filter: `drop-shadow(0 0 4px ${agent.glowColor})` }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: isExecutive ? 11 : 9.5, fontWeight: 700, color: '#fff',
              lineHeight: 1.25, marginBottom: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {agent.name}
            </div>
            <div style={{
              fontSize: isExecutive ? 8.5 : 7.5, lineHeight: 1.3,
              color: `${agent.accentColor}cc`,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {agent.title}
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          marginTop:  isExecutive ? 7 : 5,
          paddingTop: isExecutive ? 5 : 4,
          borderTop: `1px solid ${agent.accentColor}18`,
        }}>
          {agent.status === 'active' ? (
            <>
              <motion.span
                style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', display: 'inline-block', flexShrink: 0 }}
                animate={{ opacity: [1, 0.35, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span style={{ fontSize: isExecutive ? 8.5 : 7.5, color: '#10b981', fontWeight: 600 }}>Онлайн</span>
            </>
          ) : agent.status === 'busy' ? (
            <>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: isExecutive ? 8.5 : 7.5, color: '#f59e0b', fontWeight: 600 }}>Занят</span>
            </>
          ) : (
            <>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6b7280', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: isExecutive ? 8.5 : 7.5, color: '#6b7280', fontWeight: 600 }}>Офлайн</span>
            </>
          )}
          <AnimatePresence>
            {hovered && (
              <motion.span
                initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -3 }}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', color: agent.accentColor }}
              >
                <ArrowRight size={isExecutive ? 11 : 9} />
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
