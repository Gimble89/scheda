/* ---------------- figure ----------------
   Ogni figura ha: muscolo bersaglio evidenziato (MUS), posa iniziale in
   trasparenza (GHOST), posa finale piena (INK) e freccia di direzione (ARR). */
const RAW={
 squat:{
  mus:`<ellipse cx="36" cy="70" rx="7.5" ry="12" transform="rotate(-12 36 70)"/>`,
  ghost:`<circle cx="52" cy="18" r="7.5"/><path d="M52 26 L52 54"/><path d="M52 54 L46 88"/><path d="M46 88 L44 92"/>
    <line x1="30" y1="30" x2="76" y2="30" stroke-width="3.6"/>`,
  ink:`<line x1="8" y1="92" x2="92" y2="92" stroke-width="2" opacity=".5"/>
    <circle cx="56" cy="26" r="8" fill="#FFF"/><path d="M56 34 L50 48 L46 58"/>
    <line x1="26" y1="36" x2="86" y2="36" stroke-width="4.4"/>
    <circle cx="24" cy="36" r="6" stroke="none" fill="#FFF"/><circle cx="88" cy="36" r="6" stroke="none" fill="#FFF"/>
    <path d="M46 58 L30 64 L34 90"/><path d="M46 58 L58 70 L56 90"/>
    <line x1="26" y1="92" x2="42" y2="92" stroke-width="4"/><line x1="48" y1="92" x2="64" y2="92" stroke-width="4"/>`,
  arr:`<path d="M80 50 L80 70"/><path d="M75 65 L80 71 L85 65"/>`},

 hinge:{
  mus:`<ellipse cx="62" cy="62" rx="7" ry="12" transform="rotate(6 62 62)"/>`,
  ghost:`<circle cx="58" cy="18" r="7.5"/><path d="M58 26 L58 56"/><path d="M58 56 L56 88"/>
    <line x1="38" y1="52" x2="78" y2="52" stroke-width="3.6"/>`,
  ink:`<line x1="8" y1="92" x2="92" y2="92" stroke-width="2" opacity=".5"/>
    <circle cx="24" cy="32" r="8" fill="#FFF"/><path d="M31 36 L58 44"/>
    <path d="M58 44 L60 68 L58 90"/><path d="M38 40 L38 64"/>
    <line x1="20" y1="64" x2="56" y2="64" stroke-width="4.4"/>
    <circle cx="18" cy="64" r="6" stroke="none" fill="#FFF"/><circle cx="58" cy="64" r="6" stroke="none" fill="#FFF"/>
    <line x1="50" y1="92" x2="68" y2="92" stroke-width="4"/>`,
  arr:`<path d="M76 34 L86 52"/><path d="M78 46 L87 53 L88 43"/>`},

 hpress:{
  mus:`<ellipse cx="46" cy="62" rx="13" ry="7"/>`,
  ghost:`<line x1="16" y1="46" x2="80" y2="46" stroke-width="3.6"/>
    <path d="M36 62 L32 48 M60 62 L64 48"/>`,
  ink:`<line x1="10" y1="76" x2="88" y2="76" stroke-width="5" opacity=".65"/>
    <circle cx="20" cy="64" r="8" fill="#FFF"/><path d="M28 66 L74 66"/>
    <path d="M36 66 L34 34 M60 66 L62 34"/>
    <line x1="16" y1="30" x2="82" y2="30" stroke-width="4.4"/>
    <circle cx="14" cy="30" r="6" stroke="none" fill="#FFF"/><circle cx="84" cy="30" r="6" stroke="none" fill="#FFF"/>
    <path d="M74 66 L86 80"/>`,
  arr:`<path d="M50 56 L50 40"/><path d="M45 45 L50 39 L55 45"/>`},

 vpress:{
  mus:`<circle cx="36" cy="48" r="7"/><circle cx="64" cy="48" r="7"/>`,
  ghost:`<line x1="28" y1="48" x2="72" y2="48" stroke-width="3.6"/>
    <path d="M44 56 L40 48 M56 56 L60 48"/>`,
  ink:`<line x1="8" y1="94" x2="92" y2="94" stroke-width="2" opacity=".5"/>
    <circle cx="50" cy="46" r="8" fill="#FFF"/><path d="M50 54 L50 70"/>
    <path d="M50 70 L42 94 M50 70 L58 94"/>
    <path d="M44 56 L40 24 M56 56 L60 24"/>
    <line x1="26" y1="20" x2="74" y2="20" stroke-width="4.4"/>
    <circle cx="24" cy="20" r="6" stroke="none" fill="#FFF"/><circle cx="76" cy="20" r="6" stroke="none" fill="#FFF"/>`,
  arr:`<path d="M82 46 L82 28"/><path d="M77 33 L82 27 L87 33"/>`},

 hpull:{
  mus:`<ellipse cx="38" cy="44" rx="8" ry="12" transform="rotate(-14 38 44)"/>`,
  ghost:`<path d="M40 44 L72 52"/><line x1="74" y1="44" x2="74" y2="60" stroke-width="3.6"/>`,
  ink:`<line x1="8" y1="92" x2="92" y2="92" stroke-width="2" opacity=".5"/>
    <circle cx="28" cy="28" r="8" fill="#FFF"/><path d="M32 35 L44 48 L46 70 L40 90"/>
    <path d="M46 70 L58 90"/><path d="M38 42 L30 54"/>
    <line x1="26" y1="56" x2="26" y2="70" stroke-width="4.4"/>
    <path d="M46 52 L86 52" stroke-dasharray="4 4" opacity=".55"/>`,
  arr:`<path d="M66 70 L46 70"/><path d="M51 65 L45 70 L51 75"/>`},

 vpull:{
  mus:`<ellipse cx="38" cy="52" rx="7" ry="13" transform="rotate(10 38 52)"/><ellipse cx="62" cy="52" rx="7" ry="13" transform="rotate(-10 62 52)"/>`,
  ghost:`<line x1="22" y1="14" x2="78" y2="14" stroke-width="3.6"/>
    <path d="M44 40 L30 16 M56 40 L70 16"/>`,
  ink:`<line x1="20" y1="12" x2="80" y2="12" stroke-width="4.4"/>
    <path d="M50 12 L50 20" stroke-dasharray="3 3" opacity=".55"/>
    <circle cx="50" cy="44" r="8" fill="#FFF"/><path d="M50 52 L50 70"/>
    <path d="M50 70 L41 90 M50 70 L59 90"/>
    <path d="M43 44 L32 32 M57 44 L68 32"/>
    <line x1="28" y1="30" x2="72" y2="30" stroke-width="4"/>`,
  arr:`<path d="M84 24 L84 44"/><path d="M79 39 L84 45 L89 39"/>`},

 curl:{
  mus:`<ellipse cx="32" cy="46" rx="6" ry="9" transform="rotate(18 32 46)"/><ellipse cx="68" cy="46" rx="6" ry="9" transform="rotate(-18 68 46)"/>`,
  ghost:`<path d="M42 38 L38 62 M58 38 L62 62"/><line x1="34" y1="64" x2="66" y2="64" stroke-width="3.6"/>`,
  ink:`<line x1="8" y1="94" x2="92" y2="94" stroke-width="2" opacity=".5"/>
    <circle cx="50" cy="20" r="8" fill="#FFF"/><path d="M50 28 L50 60"/>
    <path d="M50 60 L43 94 M50 60 L57 94"/>
    <path d="M43 34 L34 48 L44 54 M57 34 L66 48 L56 54"/>
    <line x1="38" y1="52" x2="62" y2="52" stroke-width="4.4"/>
    <circle cx="36" cy="52" r="5.5" stroke="none" fill="#FFF"/><circle cx="64" cy="52" r="5.5" stroke="none" fill="#FFF"/>`,
  arr:`<path d="M80 64 Q86 54 80 44"/><path d="M75 48 L80 42 L85 49"/>`},

 tri:{
  mus:`<ellipse cx="42" cy="40" rx="5.5" ry="9" transform="rotate(-8 42 40)"/><ellipse cx="58" cy="40" rx="5.5" ry="9" transform="rotate(8 58 40)"/>`,
  ghost:`<path d="M44 34 L36 46 L46 50 M56 34 L64 46 L54 50"/><line x1="38" y1="50" x2="62" y2="50" stroke-width="3.4"/>`,
  ink:`<line x1="8" y1="94" x2="92" y2="94" stroke-width="2" opacity=".5"/>
    <circle cx="50" cy="24" r="8" fill="#FFF"/><path d="M50 32 L50 62"/>
    <path d="M50 62 L43 94 M50 62 L57 94"/>
    <path d="M44 36 L42 18 M56 36 L58 18"/>
    <line x1="36" y1="14" x2="64" y2="14" stroke-width="4.4"/>
    <circle cx="34" cy="14" r="5.5" stroke="none" fill="#FFF"/><circle cx="66" cy="14" r="5.5" stroke="none" fill="#FFF"/>`,
  arr:`<path d="M80 48 L80 28"/><path d="M75 33 L80 27 L85 33"/>`},

 lat:{
  mus:`<circle cx="30" cy="40" r="7"/><circle cx="70" cy="40" r="7"/>`,
  ghost:`<path d="M45 40 L43 62 M55 40 L57 62"/>`,
  ink:`<line x1="8" y1="94" x2="92" y2="94" stroke-width="2" opacity=".5"/>
    <circle cx="50" cy="24" r="8" fill="#FFF"/><path d="M50 32 L50 62"/>
    <path d="M50 62 L43 94 M50 62 L57 94"/>
    <path d="M44 38 L18 40 M56 38 L82 40"/>
    <circle cx="14" cy="40" r="5.5" stroke="none" fill="#FFF"/><circle cx="86" cy="40" r="5.5" stroke="none" fill="#FFF"/>`,
  arr:`<path d="M22 62 Q16 52 20 44"/><path d="M15 48 L19 42 L25 46"/>
    <path d="M78 62 Q84 52 80 44"/><path d="M85 48 L81 42 L75 46"/>`},

 calf:{
  mus:`<ellipse cx="42" cy="70" rx="6" ry="10"/><ellipse cx="58" cy="70" rx="6" ry="10"/>`,
  ghost:`<path d="M44 84 L40 90 M56 84 L60 90"/><line x1="34" y1="90" x2="66" y2="90" stroke-width="3.4"/>`,
  ink:`<line x1="8" y1="90" x2="92" y2="90" stroke-width="4" opacity=".65"/>
    <circle cx="50" cy="16" r="8" fill="#FFF"/><path d="M50 24 L50 50"/>
    <path d="M44 30 L38 54 M56 30 L62 54"/>
    <path d="M50 50 L44 72 L42 82 M50 50 L56 72 L58 82"/>
    <path d="M36 82 L46 82 M54 82 L64 82" stroke-width="4.4"/>
    <path d="M42 82 L40 90 M58 82 L60 90" opacity=".5"/>`,
  arr:`<path d="M80 74 L80 56"/><path d="M75 61 L80 55 L85 61"/>`},

 core:{
  mus:`<ellipse cx="50" cy="58" rx="13" ry="6.5"/>`,
  ghost:``,
  ink:`<line x1="8" y1="86" x2="92" y2="86" stroke-width="2" opacity=".5"/>
    <circle cx="20" cy="46" r="8" fill="#FFF"/><path d="M27 50 L78 62"/>
    <path d="M27 50 L24 84 M78 62 L82 84"/>
    <path d="M42 54 L40 84" stroke-dasharray="3 3" opacity=".55"/>`,
  arr:`<path d="M30 34 L70 34" stroke-dasharray="5 4"/><text x="50" y="28" text-anchor="middle" font-size="11" font-family="IBM Plex Mono" stroke="none">HOLD</text>`},

 lunge:{
  mus:`<ellipse cx="64" cy="72" rx="7" ry="11" transform="rotate(8 64 72)"/>`,
  ghost:`<circle cx="46" cy="16" r="7"/><path d="M46 24 L48 52"/><path d="M48 52 L48 88"/>`,
  ink:`<line x1="8" y1="92" x2="92" y2="92" stroke-width="2" opacity=".5"/>
    <circle cx="46" cy="20" r="8" fill="#FFF"/><path d="M46 28 L48 54"/>
    <path d="M40 32 L36 58 M54 32 L60 58"/>
    <circle cx="34" cy="60" r="5.5" stroke="none" fill="#FFF"/><circle cx="62" cy="60" r="5.5" stroke="none" fill="#FFF"/>
    <path d="M48 54 L70 66 L70 90"/><path d="M48 54 L30 72 L34 90"/>
    <line x1="62" y1="92" x2="80" y2="92" stroke-width="4"/>`,
  arr:`<path d="M78 42 L86 60"/><path d="M79 54 L87 61 L88 51"/>`},

 legpress:{
  mus:`<ellipse cx="56" cy="58" rx="11" ry="6.5" transform="rotate(-32 56 58)"/>`,
  ghost:`<path d="M46 66 L58 54 L70 60"/>`,
  ink:`<line x1="6" y1="80" x2="58" y2="80" stroke-width="4.4"/>
    <circle cx="16" cy="66" r="8" fill="#FFF"/><path d="M23 70 L46 66"/>
    <path d="M46 66 L66 46 L78 54"/><path d="M46 72 L64 56"/>
    <line x1="76" y1="18" x2="76" y2="80" stroke-width="5"/>
    <path d="M76 26 L94 26 M76 74 L94 74" stroke-width="4"/>`,
  arr:`<path d="M50 34 L68 34"/><path d="M63 29 L69 34 L63 39"/>`},

 face:{
  mus:`<circle cx="32" cy="34" r="6.5"/><circle cx="68" cy="34" r="6.5"/>`,
  ghost:`<path d="M44 40 L20 32 M56 40 L80 32"/>`,
  ink:`<line x1="8" y1="94" x2="92" y2="94" stroke-width="2" opacity=".5"/>
    <circle cx="50" cy="30" r="8" fill="#FFF"/><path d="M50 38 L50 66"/>
    <path d="M50 66 L43 94 M50 66 L57 94"/>
    <path d="M44 42 L32 26 M56 42 L68 26"/>
    <path d="M32 26 L16 20 M68 26 L84 20" stroke-dasharray="4 4" opacity=".55"/>`,
  arr:`<path d="M22 56 L38 48"/><path d="M28 45 L37 47 L33 55"/>
    <path d="M78 56 L62 48"/><path d="M72 45 L63 47 L67 55"/>`}
};
function fig(ic){
  const f=RAW[ic]||RAW.curl;
  const S='stroke-linecap="round" stroke-linejoin="round"';
  return `<svg viewBox="0 0 100 100">
    <circle cx="50" cy="52" r="44" fill="rgba(255,255,255,.10)"/>
    <g fill="rgba(255,255,255,.34)" stroke="none">${f.mus||""}</g>
    <g stroke="#FFFFFF" stroke-width="3" opacity=".26" fill="none" ${S}>${f.ghost||""}</g>
    <g stroke="#FFFFFF" stroke-width="3.4" fill="none" ${S}>${f.ink||""}</g>
    <g stroke="rgba(255,255,255,.9)" stroke-width="2.6" fill="none" ${S}>${f.arr||""}</g>
  </svg>`;
}

export { RAW, fig };
