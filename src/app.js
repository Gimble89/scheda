/* =============================================================================
   Scheda Full Body — nucleo applicativo
   I moduli dati (figure, cue, libreria, scheda di default) vivono in src/data:
   senza questi import l'app parte solo se trova dati salvati, e si presenta
   con le card di emergenza senza figure. Non rimuoverli.
   ============================================================================= */
import { RAW, fig } from "./data/figures.js";
import { CUE } from "./data/cues.js";
import { LIB, LIBN, GRPS, defaultsFor } from "./data/library.js";
import { mk, D } from "./data/default-plan.js";


/* ---------------- storage ---------------- */
const mem={};
/* ---- versione applicazione e schema dati ----
   APP_VERSION cambia a ogni rilascio: serve a scavalcare la cache del browser.
   SCHEMA_VERSION cambia solo quando cambia la FORMA dei dati salvati. */
const APP_VERSION="25.4";
const SCHEMA_VERSION=2;

/* Migrazione versionata. Prima di toccare qualunque cosa salva una copia
   integrale dello stato: e' la rete che sostituisce l'esportazione manuale. */
function migrate(st){
  const from=st.schema||1;
  if(from>=SCHEMA_VERSION){st.schema=SCHEMA_VERSION;return st}
  try{
    st._snap={v:from,ts:Date.now(),
      data:JSON.stringify({days:st.days,log:st.log,body:st.body,profile:st.profile})};
  }catch(e){}
  if(from<2){
    // l'onboarding era segnato sul dispositivo: ora appartiene al profilo
    if(st.onbDone===undefined)
      st.onbDone=(store.get("onb_done")==="1")||!!(st.log&&st.log.length);
    if(st.homeHint===undefined)st.homeHint=false;
    if(st.pendingOnb===undefined)st.pendingOnb=false;
  }
  st.schema=SCHEMA_VERSION;
  return st;
}

const store={
  get:k=>{try{return localStorage.getItem(k)}catch(e){return mem[k]??null}},
  set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){mem[k]=v}},
  del:k=>{try{localStorage.removeItem(k)}catch(e){delete mem[k]}}
};
/* hook di sincronizzazione cloud: viene rimpiazzato dal modulo Supabase in fondo al file.
   Dichiarato qui perche' save() lo richiama e deve esistere anche offline. */
let schedulePush=function(){};
/* Timestamp dei dati COME ERANO all'apertura, letto prima che qualunque
   salvataggio lo riscriva. safeStart() chiama save(), che timbra scheda_ts con
   l'ora corrente: confrontare il cloud con QUEL valore faceva sembrare piu'
   recente uno stato appena creato e vuoto, scartando i dati veri. */
const BOOT_TS=(function(){try{return parseInt(localStorage.getItem("scheda_ts")||"0",10)||0}catch(e){return 0}})();

/* ---------------- conferme custom ---------------- */
function ask(msg,ok="Conferma"){
  return new Promise(res=>{
    const m=document.getElementById("cmodal");
    document.getElementById("cmsg").innerHTML=msg;
    const bok=document.getElementById("cok"),bno=document.getElementById("cno");
    bok.textContent=ok;
    m.classList.add("on");
    const done=v=>{m.classList.remove("on");bok.onclick=bno.onclick=m.onclick=null;res(v)};
    bok.onclick=()=>done(true);
    bno.onclick=()=>done(false);
    m.onclick=ev=>{if(ev.target===m)done(false)};
  });
}


/* Solo https e data:image. Un URL arbitrario in src fa da beacon: rivela il tuo
   IP a chi ha fornito la scheda ogni volta che apri l'app. */
function safeImg(u){
  const v=String(u||"").trim();
  return /^(https:\/\/|data:image\/(png|jpe?g|gif|webp);base64,)/i.test(v)?v:"";
}
const media=e=>{const u=safeImg(e.img);return u?`<img src="${esc(u)}" alt="">`:fig(e.ic)};



/* ---------------- alternative ---------------- */
const ALT={
 "Perfect Squat":[["Hack squat",.9,"squat"],["Back squat bilanciere",.65,"squat"],["Front squat",.5,"squat"],["Goblet squat (manubrio)",.2,"squat"]],
 "Panca piana bilanciere":[["Panca piana manubri (per manubrio)",.38,"hpress"],["Chest press",.85,"hpress"],["Panca 45° multipower",.92,"hpress"],["Dip alle parallele",0,"hpress"]],
 "Seated row":[["Pulley presa larga",1,"hpull"],["Rematore bilanciere",.55,"hpull"],["Rematore manubrio (per manubrio)",.28,"hpull"]],
 "Military press bilanciere":[["Spinte manubri seduto",.27,"vpress"],["Arnold press (per manubrio)",.24,"vpress"],["Shoulder press machine",.9,"vpress"],["Landmine press",.5,"vpress"]],
 "Curl martello":[["Curl EZ",1.2,"curl"],["Curl bilanciere",1.5,"curl"],["Curl ai cavi",1.3,"curl"]],
 "Calf raise":[["Calf machine seduto",1.5,"calf"],["Calf alla leg press",4,"calf"]],
 "RDL bilanciere":[["Stacco da terra",1.2,"hinge"],["Good morning",.5,"hinge"],["RDL manubri (per manubrio)",.4,"hinge"],["Leg curl sdraiato",.35,"hinge"]],
 "Lat machine supina":[["Lat machine presa larga",.9,"vpull"],["Pulley presa larga",1,"hpull"],["Trazioni assistite",0,"vpull"]],
 "Panca 45° multipower":[["Panca inclinata bilanciere",.85,"hpress"],["Panca inclinata manubri (per manubrio)",.35,"hpress"],["Chest press inclinata",.9,"hpress"]],
 "Alzate laterali":[["Alzate ai cavi (per braccio)",.8,"lat"],["Lateral raise machine",2,"lat"],["Alzate frontali (per manubrio)",1,"lat"]],
 "French press EZ":[["Push down ai cavi",2.5,"tri"],["French press manubrio",.9,"tri"],["Estensioni overhead ai cavi",2,"tri"]],
 "Plank":[["Ab wheel",0,"core"],["Hollow hold",0,"core"],["Plank laterale",0,"core"]],
 "Leg press":[["Hack squat",.5,"squat"],["Perfect Squat",.65,"squat"],["Affondi bulgari (per manubrio)",.07,"lunge"]],
 "Rematore T-bar":[["Rematore bilanciere",.8,"hpull"],["Rematore manubrio (per manubrio)",.5,"hpull"],["Seated row",1.05,"hpull"]],
 "Spinte manubri seduto":[["Military press bilanciere",1.9,"vpress"],["Arnold press (per manubrio)",.9,"vpress"],["Shoulder press machine",3,"vpress"]],
 "Affondi in camminata":[["Affondi bulgari (per manubrio)",1,"lunge"],["Step-up (per manubrio)",1,"lunge"],["Back squat bilanciere",4,"squat"]],
 "Curl EZ":[["Curl manubri (per manubrio)",.45,"curl"],["Curl bilanciere",1.2,"curl"],["Curl panca inclinata (per manubrio)",.4,"curl"]],
 "Face pull":[["Reverse fly ai cavi (per braccio)",.6,"face"],["Reverse pec deck",1.5,"face"],["Alzate posteriori manubri (per manubrio)",.3,"face"]]
};



/* ---------------- VALIDAZIONE DEGLI IMPORT ----------------
   Un file di backup o una scheda dettata dall'AI arrivano da fuori: prima
   venivano scritti nello stato senza controlli di forma, e un JSON malformato
   poteva lasciare l'app in uno stato incoerente. normState() ripara, ma ripara
   dopo: questo controllo rifiuta prima. */
const MAX_DAYS=12, MAX_EX=40, MAX_SETS=20, MAX_TXT=120;
function cleanTxt(v,max){return String(v??"").slice(0,max||MAX_TXT)}
function cleanNum(v,min,max,dflt){
  const n=parseFloat(String(v).replace(",","."));
  return Number.isFinite(n)&&n>=min&&n<=max?n:dflt;
}
function validateDays(days){
  if(!Array.isArray(days)||!days.length)return{ok:false,err:"nessun giorno nel file"};
  if(days.length>MAX_DAYS)return{ok:false,err:`troppi giorni (${days.length}, massimo ${MAX_DAYS})`};
  const out=[];
  for(const d of days){
    if(!d||typeof d!=="object")return{ok:false,err:"un giorno non e' un oggetto valido"};
    const ex=Array.isArray(d.ex)?d.ex:[];
    if(ex.length>MAX_EX)return{ok:false,err:`giorno ${cleanTxt(d.id,4)}: troppi esercizi (${ex.length})`};
    out.push({
      id:cleanTxt(d.id,4)||"A",
      focus:cleanTxt(d.focus,80),
      warm:Array.isArray(d.warm)?d.warm.slice(0,20)
        .filter(w=>Array.isArray(w)&&w.length>=2)
        .map(w=>[cleanTxt(w[0],60),cleanTxt(w[1],60)]):[],
      ex:ex.map(e=>{
        const w=cleanNum(e&&e.w,0,1000,20);
        const nSet=Math.min(Math.max(parseInt(e&&(e.sets&&e.sets.length||e.sets))||3,1),MAX_SETS);
        return{
          n:cleanTxt(e&&e.n,60)||"Esercizio",
          ic:(RAW[cleanTxt(e&&e.ic,12)]?e.ic:"curl"),
          img:"",                               // mai fidarsi di un URL che arriva da fuori
          w, inc:cleanNum(e&&e.inc,0,50,2.5),
          rest:Math.round(cleanNum(e&&e.rest,0,900,90)),
          r:cleanTxt(e&&e.r,12)||"8",
          sets:Array.from({length:nSet},()=>({w,r:"",done:false,rir:null})),
          note:cleanTxt(e&&e.note,200), tag:cleanTxt(e&&e.tag,12),
          ss:e&&e.ss?1:0
        };
      })
    });
  }
  return{ok:true,days:out};
}

/* ---------------- MULTI-UTENTE ----------------
   MU = { users:[{id,state}], active:id }. La vecchia chiave scheda_v3
   (profilo singolo) viene migrata al primo utente, così non si perde nulla. */
function normState(st){
  if(!st.days||st.days.length<1)st=structuredClone(D);
  // se i 3 giorni esistono ma sono TUTTI senza esercizi (stato creato da un onboarding vuoto),
  // ripristina la scheda A/B/C completa senza toccare storico/misure/profilo.
  // ECCEZIONE: un account nuovo in attesa di onboarding DEVE restare vuoto,
  // altrimenti si ritroverebbe la scheda di un altro utente.
  const totEx=(st.days||[]).reduce((a,d)=>a+((d.ex&&d.ex.length)||0),0);
  if(totEx===0&&!st.pendingOnb){const keep={log:st.log,body:st.body,cfg:st.cfg,profile:st.profile,rnd:st.rnd,saved:st.saved};
    st=structuredClone(D);Object.keys(keep).forEach(k=>{if(keep[k]!==undefined)st[k]=keep[k]})}
  // garantisci campi minimi su ogni giorno/esercizio (evita crash da strutture parziali salvate)
  st.days.forEach((d,idx)=>{
    if(!d.id)d.id=String.fromCharCode(65+idx);
    if(typeof d.focus!=="string")d.focus=(D.days[idx]&&D.days[idx].focus)||"Allenamento";
    if(!Array.isArray(d.warm))d.warm=(D.days[idx]&&D.days[idx].warm)||[];
    if(!Array.isArray(d.ex))d.ex=[];
    d.ex.forEach(e=>{
      if(!Array.isArray(e.sets))e.sets=[{w:e.w||0,r:"",done:false}];
      if(e.r==null)e.r="10"; if(e.rest==null)e.rest=90; if(e.inc==null)e.inc=2.5;
      if(e.w==null)e.w=0; if(e.n==null)e.n="Esercizio"; if(e.ic==null)e.ic="curl";
    });
  });
  if(!st.body)st.body=[];
  if(!st.cfg)st.cfg={gap:2,target:65,notif:false};
  if(st.profile===undefined)st.profile=null;
  if(st.rnd===undefined)st.rnd=null;
  if(!st.saved)st.saved=[];
  return migrate(st);
}
/* Profilo vuoto per un account nuovo: struttura dei 3 giorni e mobilita',
   nessun esercizio. Li genera l'onboarding sulla base delle risposte. */
function freshEmpty(){
  const st=structuredClone(D);
  st.days.forEach(d=>{d.ex=[]});
  st.log=[];st.body=[];st.saved=[];st.rnd=null;
  st.profile=null;
  st.pendingOnb=true;st.onbDone=false;st.homeHint=false;
  st.schema=SCHEMA_VERSION;
  return st;
}
/* Profilo di partenza NEUTRO. La scheda di default non appartiene piu' a
   nessuno: chi arriva nuovo passa dall'onboarding, chi ha gia' un account
   riceve la propria scheda da Supabase. */
function freshProfile(){
  return {active:"u1",users:[{id:"u1",name:"",state:freshEmpty()}]};
}
function loadMU(){
  // forza il seed corretto una volta sola (ripara installazioni con dati vuoti salvati prima)
  const SEED="salv-v11";
  let mu=null;
  try{mu=JSON.parse(store.get("scheda_mu"))}catch(e){}
  const seeded=store.get("seed_done")===SEED;
  if(mu&&mu.users&&mu.users.length){
    // se lo stato salvato ha giorni vuoti E non è ancora stato riparato, sostituiscilo
    const tot=(mu.users||[]).reduce((a,u)=>a+((u.state&&u.state.days||[]).reduce((b,d)=>b+((d.ex&&d.ex.length)||0),0)),0);
    if(tot===0 && !seeded){ store.set("seed_done",SEED); return freshProfile(); }
    store.set("seed_done",SEED);
    return mu;
  }
  // migrazione dal profilo singolo esistente
  let old=null;
  try{old=JSON.parse(store.get("scheda_v3"))}catch(e){}
  store.set("seed_done",SEED);
  if(old){const st=normState(old);const nome=(st.profile&&st.profile.nome)||"Salvatore";
    return {active:"u1",users:[{id:"u1",name:nome,state:st}]};}
  return freshProfile();
}
let MU=loadMU();
const firstRun=false;
function activeUser(){return MU.users.find(u=>u.id===MU.active)||MU.users[0]}
let S=normState(activeUser().state);
let view=store.get("scheda_view")||"A";
const save=()=>{activeUser().state=S;store.set("scheda_mu",JSON.stringify(MU));store.set("scheda_ts",String(Date.now()));schedulePush()};
function switchUser(id){
  save();MU.active=id;store.set("scheda_mu",JSON.stringify(MU));
  S=normState(activeUser().state);view="A";store.set("scheda_view","A");
  sessStart=0;store.set("sess_start","0");render();updateBarInfo();
}
function newUser(name){
  const id="u"+Date.now().toString(36);
  const st=normState(structuredClone(D));st.profile={nome:name||"",cognome:"",peso:null,level:"i",refs:null};st.log=[];st.body=[];
  MU.users.push({id:id,name:name||("Profilo "+(MU.users.length+1)),state:st});
  save();switchUser(id);
  return id;
}
const fmt=n=>Number.isInteger(n)?n:(Math.round(n*10)/10).toString().replace(".",",");
const round=(v,st)=>st?Math.max(0,Math.round(v/st)*st):Math.round(v);
/* Escaping completo. La versione precedente neutralizzava solo le virgolette:
   bastava un tag senza apici (es. <img src=x onerror=...>) per iniettare codice
   tramite un nome esercizio arrivato da OCR, da un backup importato o da una
   risposta dell'AI. L'ordine conta: la & va sostituita per prima. */
const esc=s=>String(s??"")
  .replace(/&/g,"&amp;")
  .replace(/</g,"&lt;")
  .replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;")
  .replace(/'/g,"&#39;");
const main=document.getElementById("main"), nav=document.getElementById("nav"), who=document.getElementById("who");

/* ---------------- CALIBRAZIONE AUTOMATICA (auto-apprendente) ----------------
   I "riferimenti" (squat, panca, rematore, lento, RDL a ~8 rip) vengono stimati
   combinando: (a) i carichi attuali in scheda e (b) le performance REALI dello
   storico. Ogni serie registrata viene convertita in 1RM stimato (Epley) e
   riportata a un carico-equivalente per 8 rip. Più dati registri, più la stima
   è precisa: i campioni recenti pesano di più, e la confidenza cresce col numero
   di osservazioni. */
const FALLBACK_REFS={squat:77,bench:58,row:58,ohp:32,hinge:77};
const REPS_REF=8; // ripetizioni di riferimento per i "refs"
// Epley con RIR: se avevi X ripetizioni di riserva, la capacità reale equivale a (reps+RIR) rip.
function e1rm(w,reps,rir){ 
  reps=parseInt(reps)||0; if(!w||reps<1)return 0;
  const eff=reps+(rir!=null&&rir!==""&&!isNaN(parseFloat(rir))?Math.max(0,parseFloat(rir)):0);
  return eff===1?w:w*(1+eff/30);
}
function loadForReps(oneRM,reps){ return reps<=1?oneRM:oneRM/(1+reps/30) }
// 1RM da una serie di scheda (oggetto set con w,r,rir)
function setE1rm(s){const w=parseFloat(String(s.w).toString().replace(",","."))||0;const r=parseInt(s.r)||0;
  if(w<=0)return 0; return r>0?e1rm(w,r,s.rir):w;}

// raccoglie campioni {ref -> [{val, weight}]} da scheda + storico
function refSamples(){
  const acc={};
  const push=(ref,val,weight)=>{if(val>0&&isFinite(val)){(acc[ref]=acc[ref]||[]).push({val,weight})}};
  // (a) esercizi in scheda: usa il dato migliore per ogni esercizio (serie fatta > scritta > carico rif.)
  const sampleEx=(e,base)=>{
    const li=LIBN[e.n]; if(!li||li.k<=0)return;
    let bestDone=0, bestPlanned=0;
    (e.sets||[]).forEach(s=>{
      const one=setE1rm(s); if(one<=0)return;
      if(s.done){ if(one>bestDone)bestDone=one; } else { if(one>bestPlanned)bestPlanned=one; }
    });
    if(bestDone>0){ push(li.ref, loadForReps(bestDone,REPS_REF)/li.k, 1.4*base); }
    else if(bestPlanned>0){ push(li.ref, loadForReps(bestPlanned,REPS_REF)/li.k, 0.9*base); }
    else if(e.w>0){ push(li.ref, e.w/li.k, 0.8*base); }
  };
  S.days.forEach(d=>d.ex.forEach(e=>sampleEx(e,1)));
  if(S.rnd)S.rnd.ex.forEach(e=>sampleEx(e,0.6));
  // (b) storico reale — le stringhe serie possono includere il RIR come "80×8@2"
  const N=S.log.length;
  S.log.forEach((s,idx)=>{
    const recency=0.5+0.5*((idx+1)/Math.max(1,N));
    (s.ex||[]).forEach(x=>{
      const li=LIBN[x.n]; if(!li||li.k<=0)return;
      let best=0;
      String(x.sets).split(/\s+/).forEach(tok=>{
        const at=tok.split("@"); const rir=at[1]!=null?parseFloat(at[1]):null;
        const mm=at[0].split("×"); if(mm.length!==2)return;
        const w=parseFloat(String(mm[0]).replace(",","."))||0, r=parseInt(mm[1])||0;
        const one=e1rm(w,r,rir); if(one>best)best=one;
      });
      if(best>0){const eq8=loadForReps(best,REPS_REF); push(li.ref, eq8/li.k, 1.6*recency)}
    });
  });
  return acc;
}
// media pesata robusta (scarta outlier oltre 2.5x mediana)
function wmean(samples){
  if(!samples.length)return null;
  const vals=samples.map(s=>s.val).sort((a,b)=>a-b);
  const med=vals[Math.floor(vals.length/2)];
  let num=0,den=0;
  samples.forEach(s=>{if(s.val<=med*2.5&&s.val>=med*0.3){num+=s.val*s.weight;den+=s.weight}});
  return den?num/den:med;
}
function currentRefs(){
  const acc=refSamples();
  const fb=(S.profile&&S.profile.refs)||FALLBACK_REFS;
  const out={};
  Object.keys(FALLBACK_REFS).forEach(r=>{
    const m=acc[r]&&acc[r].length?wmean(acc[r]):null;
    out[r]=m!=null?Math.round(m*10)/10:(fb[r]||FALLBACK_REFS[r]);
  });
  return out;
}
// confidenza della stima per ogni ref: 0..1 in base al numero di campioni
function refConfidence(){
  const acc=refSamples();const out={};
  Object.keys(FALLBACK_REFS).forEach(r=>{const n=acc[r]?acc[r].length:0;out[r]=Math.min(1,n/8)});
  return out;
}
function genRefs(peso,level,ans){
  const mult={p:.65,i:1,a:1.3}[level]||1;
  const base={squat:1.0,bench:.75,row:.75,ohp:.42,hinge:1.0};
  const refs={};
  Object.keys(base).forEach(k=>refs[k]=ans[k]&&ans[k]>0?ans[k]:Math.round(base[k]*mult*peso));
  return refs;
}
function applyRefs(refs,force){
  // NON sovrascrive i carichi impostati a mano (e.man) salvo force=true
  let skipped=0;
  S.days.forEach(d=>d.ex.forEach(e=>{
    const li=LIBN[e.n];
    if(li&&li.k>0){
      if(e.man&&!force){skipped++;return}
      e.w=round(refs[li.ref]*li.k, li.st||2.5);
      if(li.st)e.inc=li.st;
      e.sets.forEach(s=>{s.w=e.w;s.done=false;s.r=""});
    }
  }));
  return skipped;
}
// stima carico per un singolo esercizio (usata da libreria/alternative/generatore)
function estimateFor(name){
  const li=LIBN[name]; if(!li||li.k<=0)return 0;
  const refs=currentRefs();
  return round(refs[li.ref]*li.k, li.st||2.5);
}

/* ---------------- audio ---------------- */
let AC=null;
function unlockAudio(){
  if(AC)return;
  try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}
  if(AC&&AC.state==="suspended")AC.resume();
}
document.addEventListener("touchstart",unlockAudio,{once:false});
document.addEventListener("click",unlockAudio,{once:false});
function beep(times=3){
  if(!AC)return;
  if(AC.state==="suspended")AC.resume();
  for(let i=0;i<times;i++){
    const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime+i*0.28;
    o.type="square";o.frequency.setValueAtTime(i===times-1?1320:880,t);
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(0.35,t+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,t+0.22);
    o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+0.24);
  }
}
function buzz(){ try{ if(navigator.vibrate) navigator.vibrate([300,120,300,120,500]); }catch(e){} }
function notify(title,body){
  try{
    if(S.cfg.notif && "Notification" in window && Notification.permission==="granted" && document.hidden)
      new Notification(title,{body:body});
  }catch(e){}
}

/* ---------------- progressive overload ---------------- */
function topReps(r){
  r=String(r||"");
  if(/sec|\+/.test(r))return null;
  const m=r.match(/(\d+)\s*-\s*(\d+)/);
  if(m)return parseInt(m[2]);
  const s=r.match(/^(\d+)$/);
  return s?parseInt(s[1]):null;
}
function overloadHint(dayId,e){
  const t=topReps(e.r); if(!t)return false;
  for(let i=S.log.length-1;i>=0;i--){
    const s=S.log[i]; if(s.d!==dayId)continue;
    const x=(s.ex||[]).find(o=>o.n===e.n); if(!x)return false;
    const reps=x.sets.split("  ").map(p=>parseInt((p.split("×")[1]||"").trim()));
    return reps.length>0 && reps.every(v=>!isNaN(v)&&v>=t);
  }
  return false;
}

/* ---------------- deload automatico ----------------
   Segnala di scaricare quando: (a) il giorno è stato allenato molte volte senza
   pause di recupero e (b) il trend delle ripetizioni sui fondamentali sta calando
   (segno di fatica accumulata), oppure sono passate ≥5 settimane dall'ultimo deload. */
function tonnellaggioTrendGiu(dayId){
  const sess=S.log.filter(s=>s.d===dayId).slice(-3);
  if(sess.length<3)return false;
  return sess[2].vol<sess[1].vol && sess[1].vol<=sess[0].vol; // due cali consecutivi
}
function deloadHint(dayId){
  const sess=S.log.filter(s=>s.d===dayId);
  if(sess.length<4)return null;
  // settimane dall'ultimo deload registrato (tag 'deload' nel log) o dall'inizio
  let lastDeIdx=-1;
  for(let i=S.log.length-1;i>=0;i--){if(S.log[i].deload){lastDeIdx=i;break}}
  const since=lastDeIdx>=0?S.log.slice(lastDeIdx+1).filter(s=>s.d===dayId).length:sess.length;
  const trendGiu=tonnellaggioTrendGiu(dayId);
  if(since>=6 || (since>=4 && trendGiu)){
    return {since, trendGiu};
  }
  return null;
}
function applyDeload(dayId){
  const d=S.days.find(x=>x.id===dayId); if(!d)return;
  d.ex.forEach(e=>{
    // -40% volume: togli 1 serie (min 2) e -10% carico
    if(e.sets.length>2)e.sets.pop();
    if(e.w>0){e.w=round(e.w*0.9, e.inc||2.5);}
    e.sets.forEach(s=>{s.w=e.w;s.done=false;s.r=""});
    e.note=(e.note?e.note+" · ":"")+"settimana di scarico";
  });
  save();
}

/* ---------------- promemoria ---------------- */
function lastSession(){for(let i=S.log.length-1;i>=0;i--){if(S.log[i].iso)return S.log[i]}return null}
/* la versione valida e' definita piu' avanti: gestisce schede da 2 a 5 giorni
   e non sposta chi ha una seduta gia' iniziata. Questa vecchia, limitata ad
   A/B/C fisso, e' stata rimossa per non lasciare due definizioni in conflitto. */
function reminderHTML(){
  const l=lastSession();
  if(!l)return "";
  const days=Math.floor((Date.now()-new Date(l.iso).getTime())/864e5);
  const nxt=nextDayId();
  if(days>S.cfg.gap)
    return `<div class="nextbox late">Ultima seduta: giorno ${l.d}, <b>${days} giorni fa</b> — oltre la cadenza di ${S.cfg.gap} gg. Prossima consigliata: <b>giorno ${nxt}</b>.</div>`;
  return `<div class="nextbox">Ultima seduta: giorno ${l.d} (${days===0?"oggi":days+" g fa"}). Prossima: <b>giorno ${nxt}</b>.</div>`;
}

/* ---------------- nav ---------------- */
function buildNav(){
  const nm=S.profile&&S.profile.nome?`${S.profile.nome} ${S.profile.cognome||""}`.trim():(activeUser().name||"Profilo");
  who.innerHTML=`${nm.toUpperCase()} ▾`;
  who.onclick=openUsers;
  nav.innerHTML="";
  S.days.forEach(d=>{
    const b=document.createElement("button");
    b.setAttribute("aria-selected",view===d.id);
    b.innerHTML=`${d.id}<span class="sub">${(d.focus||"").split(" / ")[0]}</span>`;
    b.onclick=()=>{view=d.id;store.set("scheda_view",view);render()};
    nav.appendChild(b);
  });
  [["RANDOM","al volo"],["CORPO","misure"],["LOG","storico"]].forEach(([id,sub])=>{
    const h=document.createElement("button");
    h.setAttribute("aria-selected",view===id);
    h.innerHTML=`${id}<span class="sub">${sub}</span>`;
    h.onclick=()=>{view=id;store.set("scheda_view",view);render()};
    nav.appendChild(h);
  });
  // tab impostazioni: solo icona, occupa poco
  const g=document.createElement("button");
  g.className="navgear";
  g.setAttribute("aria-selected",view==="SET");
  g.setAttribute("aria-label","Impostazioni");
  g.innerHTML=`<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
  g.onclick=()=>{view="SET";store.set("scheda_view",view);render()};
  nav.appendChild(g);
}

/* card esercizio riutilizzabile (giorni A/B/C e tab RANDOM) */
function exCard(e,i,d){
  const up=overloadHint(d.id,e);
  let vd=null; try{vd=loadVerdict(d.id,e)}catch(x){}
  const badges=(vd&&vd.t!=="sali"?`<span class="tag giu" title="${esc(vd.txt)}">▼ carico</span>`:"")+
    (up?`<span class="tag up">▲ +${fmt(e.inc||2.5)} kg</span>`:"")+
    (e.orig?`<span class="tag alt">ALT</span>`:"")+
    (!up&&!e.orig&&e.tag?`<span class="tag">${e.tag}</span>`:"");
  const c=document.createElement("div");
  c.className="ex"+(e.ss?" ss":"");
  c.innerHTML=`
   <details open>
     <summary>
       <div class="ex-top">
         <div class="fig">${media(e)}</div>
         <div class="ex-id">
           <span class="nmrow"><span class="nm">${e.n}</span>${badges}</span>
           <span class="sw">${e.sets.length}×${e.r} · tecnica, video, alternative</span>
         </div>
         <button class="kill">×</button>
       </div>
     </summary>
     <div class="stamp">
       <button class="minus">−</button>
       <div class="val"><input class="wt" inputmode="decimal" value="${fmt(e.w)}"><span class="unit">kg rif.</span></div>
       <span class="step">±${fmt(e.inc)}</span>
       <button class="plus">+</button>
     </div>
     <div class="sets"></div>
     <div class="setbar">
       <button class="apply">Applica ${fmt(e.w)} kg a tutte le serie</button>
       <button class="addset">+ serie</button>
     </div>
     <div class="restrow">
       <span class="lbl">Pausa</span>
       <input class="rin" inputmode="numeric" value="${e.rest}">
       <span class="lbl">sec</span>
       <button class="go">▶ Avvia pausa</button>
     </div>
     <input class="note" value="${esc(e.note)}" placeholder="nota…">
     ${(()=>{try{const t=ptLine(d.id,e,d);return t?`<div class="ptline"><span class="ptlab">PT</span>${esc(t)}</div>`:""}catch(x){return""}})()}
   </details>`;

  const setsBox=c.querySelector(".sets");
  const drawSets=()=>{
    setsBox.innerHTML="";
    e.sets.forEach((s,j)=>{
      const row=document.createElement("div");
      row.className="set"+(s.done?" done":"");
      row.innerHTML=`
        <span class="n">${j+1}</span>
        <span class="f"><input class="sw" inputmode="decimal" value="${fmt(s.w)}"></span>
        <span class="lbl">kg ×</span>
        <span class="f"><input class="sr" inputmode="numeric" value="${s.r||""}" placeholder="${e.r}"></span>
        <span class="lbl">rip</span>
        <span class="f rirwrap"><input class="srir" inputmode="numeric" value="${s.rir!=null?s.rir:""}" placeholder="RIR" title="Ripetizioni di riserva: quante ne avevi ancora"></span>
        <button class="tick">✓</button>`;
      row.querySelector(".sw").onchange=ev=>{s.w=parseFloat(ev.target.value.replace(",","."))||0;save();drawSets()};
      row.querySelector(".sr").onchange=ev=>{s.r=ev.target.value;save()};
      row.querySelector(".srir").onchange=ev=>{const v=ev.target.value.trim();s.rir=v===""?null:Math.max(0,parseFloat(v.replace(",","."))||0);save()};
      row.querySelector(".tick").onclick=()=>{
        unlockAudio();
        // spuntando senza aver scritto le ripetizioni, usa quelle previste dalla scheda
        if(!s.done && (s.r===""||s.r==null)){
          const sug=topReps(e.r)||parseInt(e.r)||0;
          if(sug>0)s.r=String(sug);
        }
        s.done=!s.done;save();drawSets();updateBarInfo();
        if(s.done){startSessionIfNeeded();if(e.rest>0)startTimer(e.rest)}
      };
      row.oncontextmenu=async ev=>{ev.preventDefault();
        if(e.sets.length>1&&await ask("Elimino la serie "+(j+1)+"?","Elimina")){e.sets.splice(j,1);save();render()}};
      setsBox.appendChild(row);
    });
  };
  drawSets();

  const wt=c.querySelector(".wt");
  const setRef=(v,manual)=>{e.w=Math.max(0,Math.round(v*10)/10);wt.value=fmt(e.w);
    if(manual)e.man=1; // carico deciso da te: le ricalibrazioni non lo sovrascrivono
    c.querySelector(".apply").textContent=`Applica ${fmt(e.w)} kg a tutte le serie`;save()};
  c.querySelector(".plus").onclick=()=>setRef(e.w+(e.inc||2.5),1);
  c.querySelector(".minus").onclick=()=>setRef(e.w-(e.inc||2.5),1);
  wt.onchange=async()=>{
    const old=e.w, nw=parseFloat(wt.value.replace(",","."))||0;
    setRef(nw,1);
    // ricalibrazione interattiva: se il nuovo carico è molto diverso dalla stima corrente, chiedi
    const li=LIBN[e.n];
    if(li&&li.k>0&&nw>0&&old>0){
      const est=estimateFor(e.n)||old;
      const diff=(nw-est)/est;
      if(Math.abs(diff)>=0.12){ // scostamento >12% dalla stima
        await calibrationAsk(e,li,nw,est,diff>0);
      }
    }
  };
  c.querySelector(".apply").onclick=()=>{e.sets.forEach(s=>s.w=e.w);save();drawSets();toast("Carico applicato a tutte le serie")};
  c.querySelector(".addset").onclick=()=>{e.sets.push({w:e.w,r:"",done:false});save();render()};
  c.querySelector(".rin").onchange=ev=>{e.rest=parseInt(ev.target.value)||0;save()};
  c.querySelector(".go").onclick=()=>{unlockAudio();startSessionIfNeeded();startTimer(parseInt(c.querySelector(".rin").value)||60)};
  const noteEl=c.querySelector(".note");
  const paintNoteFlag=()=>{
    let bar=c.querySelector(".noteflag");
    if(!e.note){if(bar)bar.remove();return}
    if(!bar){bar=document.createElement("div");bar.className="noteflag";noteEl.after(bar)}
    bar.innerHTML=`<button class="nf${e.noteTmp?"":" on"}" data-v="0">fissa</button>`+
                  `<button class="nf${e.noteTmp?" on":""}" data-v="1">solo oggi</button>`;
    bar.querySelectorAll(".nf").forEach(b=>b.onclick=()=>{e.noteTmp=b.dataset.v==="1";save();paintNoteFlag()});
  };
  noteEl.onchange=ev=>{e.note=ev.target.value;save();paintNoteFlag()};
  paintNoteFlag();
  c.querySelector(".kill").onclick=async()=>{if(await ask(`Elimino <b>${e.n}</b> dalla scheda?`,"Elimina")){d.ex.splice(i,1);save();render()}};
  
  // Gestione click: fig per toggle dropdown, ex-id per tecnica/alternative
  const details = c.querySelector("details");
  const fig = c.querySelector(".fig");
  const exId = c.querySelector(".ex-id");
  
  if(fig) {
    fig.style.cursor = "pointer";
    fig.onclick = (ev) => {
      ev.stopPropagation();
      details.open = !details.open;
    };
  }
  
  if(exId) {
    exId.style.cursor = "pointer";
    exId.onclick = (ev) => {
      ev.stopPropagation();
      openEx(e);
    };
  }
  
  return c;
}

/* ricalibrazione interattiva: l'utente ha messo un carico molto diverso dalla stima.
   Chiediamo il perché e agiamo sui riferimenti di conseguenza. */
function calibrationAsk(e,li,nw,est,isUp){
  return new Promise(resolve=>{
    const sheet=document.getElementById("sheet");
    const dir=isUp?"più alto":"più basso";
    sheet.innerHTML=`
      <h3>Aggiorno la stima?</h3>
      <div class="sub">Hai impostato <b>${fmt(nw)} kg</b> su ${e.n}, ${dir} della mia stima (~${fmt(est)} kg). Cosa è successo?</div>
      <button class="alt" id="ca_pr" style="width:100%"><span class="an">È la mia forza attuale${isUp?" — sono migliorato":""}</span><span class="aw"><em>ricalibra tutto</em></span></button>
      <button class="alt" id="ca_one" style="width:100%;margin-top:8px"><span class="an">Solo per oggi (test, scarico, giornata sì/no)</span><span class="aw"><em>non toccare la stima</em></span></button>
      <button class="alt" id="ca_var" style="width:100%;margin-top:8px"><span class="an">Ho cambiato attrezzo/esecuzione</span><span class="aw"><em>vale solo qui</em></span></button>
      <button class="closebtn" id="ca_close" style="margin-top:12px">Annulla</button>`;
    const done=(msg)=>{closeModal();if(msg)toast(msg);resolve()};
    // "ricalibra tutto": aggiorna il riferimento del profilo così TUTTE le stime si spostano
    sheet.querySelector("#ca_pr").onclick=()=>{
      const newRef=nw/li.k; // equivalente a 8 rip -> riferimento
      S.profile=S.profile||{refs:{...FALLBACK_REFS}}; S.profile.refs=S.profile.refs||{...FALLBACK_REFS};
      S.profile.refs[li.ref]=Math.round(newRef*10)/10;
      // porta anche gli altri esercizi che dipendono da quel ref verso la nuova stima (solo quelli non ancora personalizzati oggi)
      save();done("Stima aggiornata: ricalibro gli altri esercizi collegati");render();
    };
    sheet.querySelector("#ca_one").onclick=()=>{e.note=(e.note?e.note+" · ":"")+"carico una tantum";save();done("Ok, non tocco la stima")};
    sheet.querySelector("#ca_var").onclick=()=>{e.note=(e.note?e.note+" · ":"")+"variante";save();done("Ok, vale solo per questo esercizio")};
    sheet.querySelector("#ca_close").onclick=()=>done("");
    document.getElementById("modal").classList.add("on");
  });
}

/* disegna la lista esercizi di un giorno, raggruppando le superserie consecutive
   dentro un unico box con intestazione condivisa */
function drawExList(container,d){
  const safeCard=(e,i)=>{
    try{ return exCard(e,i,d); }
    catch(err){
      const fb=document.createElement("div");fb.className="ex";
      fb.innerHTML=`<div class="ex-top"><div class="ex-id"><span class="nm">${e.n||"Esercizio"}</span>
        <span class="sw">${(e.sets?e.sets.length:0)}×${e.r||""} · ${fmt(e.w||0)} kg</span></div></div>`;
      return fb;
    }
  };
  const list=d.ex||[];
  let i=0;
  while(i<list.length){
    if(list[i].ss){
      // raccoglie tutti gli esercizi consecutivi in superserie
      let j=i; while(j<list.length&&list[j].ss)j++;
      const run=list.slice(i,j);
      if(run.length>1){
        try{ container.appendChild(ssCard(run,d)); i=j; continue; }
        catch(err){ /* se qualcosa va storto si torna alla resa a blocchi */ }
        const box=document.createElement("div");box.className="ssgroup";
        const nGiri=Math.max(...run.map(e=>(e.sets||[]).length))||3;
        box.innerHTML=`<div class="sshead"><span class="badge">Superserie</span>
          <span>${run.length===2?"coppia":run.length+" esercizi"}</span>
          <small>${nGiri} giri · senza pausa tra gli esercizi</small></div>`;
        run.forEach((e,k)=>{
          if(k>0){const lk=document.createElement("div");lk.className="sslink";lk.textContent="poi subito";box.appendChild(lk)}
          box.appendChild(safeCard(e,i+k));
        });
        container.appendChild(box);
      } else {
        container.appendChild(safeCard(run[0],i));
      }
      i=j;
    } else {
      container.appendChild(safeCard(list[i],i));
      i++;
    }
  }
}

function render(){
  document.body.dataset.day=view;
  buildNav();
  document.getElementById("save").style.display=(view==="LOG"||view==="CORPO"||view==="RANDOM"||view==="SET")?"none":"block";
  main.innerHTML="";
  if(view==="LOG")return renderLog();
  if(view==="CORPO")return renderBody();
  if(view==="RANDOM")return renderRandom();
  if(view==="SET")return renderSettings();
  const d=S.days.find(x=>x.id===view);
  if(!d){view="A";return render()}
  setTimeout(()=>{
    try{paintTip(view)}catch(e){}
    wireDismiss();
  },0);

  main.insertAdjacentHTML("beforeend",`
   <div class="dayhead">
     <div class="eyebrow">Giorno ${d.id} · target ${S.cfg.target} min</div>
     <h2>${d.focus}</h2>
   </div>
   ${reminderHTML()}
   <div id="deloadBox"></div>
   ${firstWeekNotice(d.id)?`<div class="warnbox">${firstWeekNotice(d.id)}</div>`:""}
   ${dismissible(`<div class="wavebox">${waveLabel(d.id)}</div>`,"wave"+d.id)}
   <div id="aitip" class="aitip" style="display:none"></div>
   <div class="warmpanel" id="warmpanel"></div>`);
  mountWarmPanel(document.getElementById("warmpanel"),d);

  const dl=deloadHint(d.id);
  if(dl){
    const box=document.getElementById("deloadBox");
    box.innerHTML=`<div class="nextbox late" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span style="flex:1;min-width:180px">Hai fatto <b>${dl.since} sedute</b> di questo giorno${dl.trendGiu?" e il tonnellaggio sta calando":""}. Consiglio una <b>settimana di scarico</b> (−40% volume, −10% carico) per recuperare e ripartire più forte.</span>
      <button id="doDeload" style="border:0;background:var(--acc);color:#0C0F14;border-radius:8px;padding:9px 13px;font-family:'Anton',sans-serif;text-transform:uppercase;font-size:12px;cursor:pointer">Applica scarico</button></div>`;
    box.querySelector("#doDeload").onclick=async()=>{
      if(!await ask("Applico la settimana di scarico a <b>tutti gli esercizi</b> del giorno "+d.id+"?<br><small style='color:var(--soft)'>−1 serie e −10% carico. La prossima seduta registrata sarà marcata come scarico.</small>","Applica"))return;
      applyDeload(d.id);S._pendingDeload=d.id;render();toast("Scarico applicato al giorno "+d.id);
    };
  }

  // DISEGNA GLI ESERCIZI DEL GIORNO (superserie raggruppate in un unico box)
  drawExList(main,d);

  const add=document.createElement("button");
  add.className="addex";add.textContent="+ Aggiungi esercizio dalla libreria";
  add.onclick=()=>openPicker(d);
  main.appendChild(add);
  updateBarInfo();
}

/* ---------------- picker libreria esercizi ---------------- */
let pickGrp="Tutti",pickQ="";
function openPicker(d){
  const refs=currentRefs();
  const conf=refConfidence();
  const sheet=document.getElementById("sheet");
  const already=new Set(d.ex.map(e=>e.n));
  function listHTML(){
    const q=pickQ.toLowerCase();
    const items=LIB.filter(a=>(pickGrp==="Tutti"||a[5]===pickGrp)&&(!q||a[0].toLowerCase().includes(q)));
    if(!items.length)return `<div class="empty">Nessun esercizio trovato.</div>`;
    return items.map(a=>{
      const li=LIBN[a[0]];
      const est=li.k>0?round(refs[li.ref]*li.k,li.st||2.5):0;
      const cf=li.k>0?conf[li.ref]:1;
      const badge=li.k>0?(cf>=.75?"precisa":cf>=.35?"stima":"grezza"):"";
      const inList=already.has(li.n);
      return `<button class="alt pick" data-n="${esc(li.n)}" ${inList?'style="opacity:.45"':''}>
        <span class="an">${li.n}<small>${li.grp}${inList?" · già nel giorno "+d.id:""}</small></span>
        <span class="aw">${est?fmt(est)+" kg":"corpo libero"}<em>${badge||"stima"}</em></span></button>`;
    }).join("");
  }
  function draw(){
    sheet.innerHTML=`
      <h3>Libreria esercizi</h3>
      <div class="sub">${LIB.length} movimenti · carichi stimati sui tuoi riferimenti attuali — si ricalibrano da soli man mano che progredisci</div>
      <input class="searchin" id="pq" placeholder="Cerca esercizio…" value="${esc(pickQ)}">
      <div class="chips">${GRPS.map(g=>`<button class="chip${pickGrp===g?" on":""}" data-g="${g}">${g}</button>`).join("")}</div>
      <div id="plist">${listHTML()}</div>
      <button class="revert" id="pcustom">＋ Esercizio personalizzato vuoto</button>
      <button class="closebtn" id="mclose">Chiudi</button>`;
    const pq=sheet.querySelector("#pq");
    pq.oninput=()=>{pickQ=pq.value;sheet.querySelector("#plist").innerHTML=listHTML();wireItems()};
    sheet.querySelectorAll(".chip").forEach(ch=>ch.onclick=()=>{pickGrp=ch.dataset.g;draw();sheet.querySelector("#pq").focus()});
    sheet.querySelector("#pcustom").onclick=()=>{
      d.ex.push({n:"Nuovo esercizio",ic:"curl",img:"",w:20,inc:2.5,rest:90,r:"10",sets:mk(20,3),note:"",tag:""});
      save();closeModal();render();toast("Esercizio vuoto aggiunto in fondo");
    };
    sheet.querySelector("#mclose").onclick=closeModal;
    wireItems();
  }
  function wireItems(){
    sheet.querySelectorAll(".pick").forEach(b=>b.onclick=async()=>{
      const li=LIBN[b.dataset.n];if(!li)return;
      const est=li.k>0?round(refs[li.ref]*li.k,li.st||2.5):0;
      const df=defaultsFor(li);
      if(!await ask(`Aggiungo <b>${li.n}</b> al giorno ${d.id}?<br><small style="color:var(--soft)">3 serie × ${df.r} · ${est?fmt(est)+" kg (stima calibrata)":"corpo libero"} · pausa ${df.rest}s</small>`,"Aggiungi"))return;
      d.ex.push({n:li.n,ic:li.ic,img:"",w:est,inc:li.st||2.5,rest:df.rest,r:df.r,sets:mk(est,3),note:"",tag:"NUOVO"});
      save();closeModal();render();toast(`${li.n} aggiunto · ${est?fmt(est)+" kg":"corpo libero"}`);
    });
  }
  draw();
  document.getElementById("modal").classList.add("on");
}

/* calcolo dischi per lato dato un carico totale e il peso del bilanciere */
const PLATES=[25,20,15,10,5,2.5,1.25];
function platesPerSide(total,bar){
  let perSide=(total-bar)/2;
  if(perSide<=0)return null;
  const out=[];
  PLATES.forEach(p=>{ while(perSide>=p-1e-6){out.push(p);perSide=Math.round((perSide-p)*100)/100;} });
  const rest=Math.round(perSide*100)/100;
  return {plates:out, leftover:rest};
}
function plateHTML(e){
  const li=LIBN[e.n];
  // solo per esercizi con bilanciere (coeff. alto e non manubri/macchina/elastico)
  const isBar=/bilanciere|squat|stacco|rdl|panca (piana|inclinata)|military|rematore bilanciere|hip thrust/i.test(e.n)&&!/manubri|manubrio|multipower|machine|macchina|cavi|elasti/i.test(e.n);
  if(!isBar||!e.w)return "";
  const bar=20;
  const ps=platesPerSide(e.w,bar);
  if(!ps)return `<div class="lbl2">Dischi</div><div class="cues" style="padding:11px 13px">Carico ≤ bilanciere (${bar} kg): solo il bilanciere o meno.</div>`;
  const chips=ps.plates.map(p=>`<span class="plate">${fmt(p)}</span>`).join("");
  const warn=ps.leftover>0?` <span style="color:#FFD166">(+${fmt(ps.leftover)} kg non componibile)</span>`:"";
  return `<div class="lbl2">Dischi per lato — bilanciere ${bar} kg</div>
    <div class="plates">${chips||'<span style="color:var(--soft)">nessun disco</span>'}${warn}</div>`;
}
function predictBlock(e){
  const li=LIBN[e.n]; if(!li||li.k<=0)return "";
  const one=oneRMof(e.n); if(!one)return "";
  const combos=[[3,0],[5,1],[8,2],[10,2],[12,3]];
  const rows=combos.map(([r,rir])=>{
    const w=predictLoad(e.n,r,rir);
    return `<div class="predrow"><span>${r} rip · RIR ${rir}</span><b>${fmt(w)} kg</b></div>`;
  }).join("");
  const a=analyzeRef(li.ref);
  let trendLine="";
  if(a.fit&&a.n>=3){
    const arrow=a.trend==="progressione"?"▲":a.trend==="regressione"?"▼":"■";
    const col=a.trend==="progressione"?"var(--ok)":a.trend==="regressione"?"#F87171":"#FFD166";
    const per=a.slope>=0?"+":"";
    trendLine=`<div class="predrow" style="border-top:1px dashed var(--line);margin-top:4px;padding-top:8px">
      <span style="color:${col}">${arrow} ${a.trend} · ${per}${fmt(Math.round(a.slope*10)/10)} kg/sett</span>
      <b style="color:${col}">→ ${fmt(Math.round(a.proj4))} kg tra 4 sett</b></div>`;
  }
  return `<div class="lbl2">Previsione carichi · 1RM stimato ${one} kg</div>
    <div class="cues" style="padding:11px 13px">${rows}${trendLine}
    <div style="color:var(--soft);font-size:11px;margin-top:8px">Stime dal tuo storico calibrato. Più alleni e registri, più diventano precise.</div></div>`;
}

/* ---------------- scheda esercizio ---------------- */
function openEx(e){
  /* Alternative: prima la tabella curata, poi la libreria come rete.
     La tabella ALT copre solo gli esercizi della scheda originale: chi
     sostituisce (es. Perfect Squat -> Hack squat) restava senza proposte.
     Il fallback pesca dalla libreria gli esercizi con lo stesso schema
     motorio, con il carico stimato dal rapporto tra i coefficienti. */
  let list=ALT[e.n]||(e.orig&&ALT[e.orig.n])||[];
  if(!list.length){
    const cur=LIBN[e.n];
    if(cur){
      list=LIB.filter(a=>{
          const li=LIBN[a[0]];
          return li&&li.ic===cur.ic&&li.n!==e.n&&li.grp!=="Elastici";
        })
        .sort((a,b)=>(LIBN[b[0]].k||0)-(LIBN[a[0]].k||0))
        .slice(0,5)
        .map(a=>{
          const li=LIBN[a[0]];
          const ratio=(cur.k>0&&li.k>0)?Math.round(li.k/cur.k*100)/100:0;
          return [li.n,ratio,li.ic];
        });
    }
  }
  const cues=CUE[e.ic]||[];
  const yt="https://www.youtube.com/results?search_query="+encodeURIComponent(e.n+" esecuzione tecnica");
  const sheet=document.getElementById("sheet");
  sheet.innerHTML=`
    <h3>${e.n}</h3>
    <div class="sub">${e.sets.length}×${e.r} · riferimento <b>${fmt(e.w)} kg</b> · pausa ${e.rest}s${e.orig?` · sostituto di ${e.orig.n}`:""}</div>
    <div class="big">${media(e)}</div>
    ${cues.length?`<ol class="cues">${cues.map(c=>`<li>${c}</li>`).join("")}</ol>`:""}
    ${predictBlock(e)}
    ${plateHTML(e)}
    <a class="vid" href="${yt}" target="_blank" rel="noopener">▶ Guarda l'esecuzione su YouTube</a>
    ${e.orig?`<button class="revert" id="revbtn">↺ Torna a "${e.orig.n}" (${fmt(e.orig.w)} kg)</button>`:""}
    <div class="lbl2">Immagine o GIF personale (URL)</div>
    <input class="urlin" id="imgurl" placeholder="https://… lascia vuoto per la figura di default" value="${esc(e.img)}">
        ${gemKey()?`<div class="lbl2">Chiedi al preparatore AI</div>
      <button class="genbtn" id="ex_swap">Trovami un'alternativa</button>
      <button class="revert" id="ex_expl" style="margin-top:8px">Come si esegue?</button>
      <button class="revert" id="ex_mac" style="margin-top:8px">Ho davanti un macchinario nuovo</button>`:""}
    <div class="lbl2">Alternative — tocca per sostituire nella scheda</div>
    ${list.length?list.map((a,i)=>{
      const st=e.inc||2.5,sug=a[1]?round(e.w*a[1],st):0;
      return `<button class="alt" data-i="${i}"><span class="an">${a[0]}</span>
        <span class="aw">${sug?fmt(sug)+" kg":"corpo libero"}<em>stima</em></span></button>`;
    }).join(""):`<div class="empty">Nessuna alternativa in archivio.</div>`}
    <button class="revert" id="swapany" style="margin-top:4px">Sostituisci con un altro esercizio della libreria…</button>
    <button class="closebtn" id="mclose">Chiudi</button>`;
  const u=sheet.querySelector("#imgurl");
  u.onchange=()=>{e.img=u.value.trim();save();openEx(e);render()};
  const rv=sheet.querySelector("#revbtn");
  if(rv)rv.onclick=async()=>{
    if(!await ask(`Ripristino <b>${e.orig.n}</b> a ${fmt(e.orig.w)} kg?`,"Ripristina"))return;
    e.n=e.orig.n;e.ic=e.orig.ic;e.w=e.orig.w;e.img="";
    e.sets.forEach(s=>{s.w=e.orig.w;s.done=false;s.r=""});
    delete e.orig;
    save();closeModal();render();toast("Esercizio originale ripristinato");
  };
  sheet.querySelectorAll(".alt").forEach(b=>b.onclick=async()=>{
    const a=list[+b.dataset.i],st=e.inc||2.5,sug=a[1]?round(e.w*a[1],st):0;
    const okTxt=sug?`a <b>${fmt(sug)} kg</b> (stima)`:"a corpo libero";
    if(!await ask(`Sostituisco <b>${e.n}</b> con <b>${a[0]}</b> ${okTxt}?<br><small style="color:var(--soft)">Il log registrerà il nuovo esercizio. Potrai tornare all'originale in ogni momento.</small>`,"Sostituisci"))return;
    if(!e.orig)e.orig={n:e.n,ic:e.ic,w:e.w};
    e.n=a[0];e.w=sug;e.ic=a[2]||e.ic;e.img="";
    e.sets.forEach(s=>{s.w=sug;s.done=false;s.r=""});
    save();closeModal();render();toast(`Ora nella scheda: ${a[0]}`);
  });
  const sw=sheet.querySelector("#ex_swap");
  if(sw)sw.onclick=()=>aiSwapAsk(e,view);
  const xp=sheet.querySelector("#ex_expl");
  if(xp)xp.onclick=()=>aiExplainAsk(e);
  const xm=sheet.querySelector("#ex_mac");
  if(xm)xm.onclick=addMachineAsk;
  const sa=sheet.querySelector("#swapany");
  if(sa)sa.onclick=()=>swapFromLibraryAsk(e);
  sheet.querySelector("#mclose").onclick=closeModal;
  document.getElementById("modal").classList.add("on");
}

/* Sostituzione libera: qualunque esercizio della libreria, anche di un altro
   schema motorio. Prima la lista mostra i compatibili (stesso movimento),
   poi tutti gli altri: la scelta resta all'utente, con carico stimato. */
function swapFromLibraryAsk(e){
  const sheet=document.getElementById("sheet");
  let q="";
  const draw=()=>{
    const cur=LIBN[e.n];
    const ql=q.toLowerCase();
    const items=LIB.filter(a=>a[0]!==e.n&&(!ql||a[0].toLowerCase().includes(ql)));
    // compatibili (stesso movimento) prima, poi il resto
    items.sort((a,b)=>{
      const ca=cur&&LIBN[a[0]].ic===cur.ic?0:1, cb=cur&&LIBN[b[0]].ic===cur.ic?0:1;
      if(ca!==cb)return ca-cb;
      return (LIBN[b[0]].k||0)-(LIBN[a[0]].k||0);
    });
    sheet.innerHTML=`
      <h3>Sostituisci ${esc(e.n)}</h3>
      <div class="sub">Prima i movimenti compatibili, poi tutti gli altri. Il carico proposto e' stimato sui tuoi riferimenti.</div>
      <input class="searchin" id="sq" placeholder="Cerca…" value="${esc(q)}">
      <div id="slist">${items.slice(0,40).map(a=>{
        const li=LIBN[a[0]];
        const est=li.k>0?estimateFor(li.n):0;
        const comp=cur&&li.ic===cur.ic;
        return `<button class="alt spick" data-n="${esc(li.n)}">
          <span class="an">${esc(li.n)}<small>${esc(li.grp)}${comp?" · stesso movimento":" · movimento diverso"}</small></span>
          <span class="aw">${est?fmt(est)+" kg":"corpo libero"}<em>stima</em></span></button>`;
      }).join("")||`<div class="empty">Nessun esercizio trovato.</div>`}</div>
      <button class="closebtn" id="sclose">Annulla</button>`;
    const si=sheet.querySelector("#sq");
    si.oninput=()=>{q=si.value;draw();sheet.querySelector("#sq").focus()};
    sheet.querySelector("#sclose").onclick=()=>openEx(e);
    sheet.querySelectorAll(".spick").forEach(b=>b.onclick=async()=>{
      const li=LIBN[b.dataset.n];if(!li)return;
      const est=li.k>0?estimateFor(li.n):0;
      if(!await ask(`Sostituisco <b>${esc(e.n)}</b> con <b>${esc(li.n)}</b> ${est?"a <b>"+fmt(est)+" kg</b> (stima)":"a corpo libero"}?<br><small style="color:var(--soft)">Potrai tornare all'originale in ogni momento.</small>`,"Sostituisci"))return;
      if(!e.orig)e.orig={n:e.n,ic:e.ic,w:e.w};
      e.n=li.n;e.w=est;e.ic=li.ic;e.img="";
      if(li.st)e.inc=li.st;
      e.sets.forEach(s2=>{s2.w=est;s2.done=false;s2.r=""});
      save();closeModal();render();toast(`Ora nella scheda: ${li.n}`);
    });
  };
  draw();
}
function closeModal(){document.getElementById("modal").classList.remove("on")}
document.getElementById("modal").onclick=ev=>{if(ev.target.id==="modal")closeModal()};

/* ---------------- CORPO ---------------- */
const METRICS=[
  ["peso","Peso","kg",false],["bf","% grasso","%",false],["vita","Vita","cm",false],
  ["fianchi","Fianchi","cm",false],["torace","Torace","cm",true],["braccio","Braccio","cm",true],["coscia","Coscia","cm",true]
];
let bodyMetric=store.get("body_metric")||"peso";

function chartSVG(metric){
  const def=METRICS.find(m=>m[0]===metric);
  const data=S.body.filter(b=>b[metric]!=null&&b[metric]!=="").map(b=>({t:b.t,v:parseFloat(b[metric])}))
    .sort((a,b)=>a.t.localeCompare(b.t));
  if(data.length<2)return `<div class="empty">Servono almeno 2 misurazioni di ${def[1].toLowerCase()} per il grafico.</div>`;
  const W=680,H=230,P={l:48,r:16,t:18,b:28};
  const vs=data.map(p=>p.v);
  let mn=Math.min(...vs),mx=Math.max(...vs);
  if(mn===mx){mn-=1;mx+=1}
  const pad=(mx-mn)*.15;mn-=pad;mx+=pad;
  const X=i=>P.l+(W-P.l-P.r)*(data.length===1?0.5:i/(data.length-1));
  const Y=v=>P.t+(H-P.t-P.b)*(1-(v-mn)/(mx-mn));
  let grid="";
  for(let g=0;g<=3;g++){
    const v=mn+(mx-mn)*g/3, y=Y(v);
    grid+=`<line x1="${P.l}" y1="${y}" x2="${W-P.r}" y2="${y}" stroke="#232C3A" stroke-width="1"/>
      <text x="${P.l-7}" y="${y+4}" text-anchor="end" font-family="IBM Plex Mono" font-size="10" fill="#8B97A8">${(Math.round(v*10)/10).toString().replace(".",",")}</text>`;
  }
  const pts=data.map((p,i)=>`${X(i)},${Y(p.v)}`).join(" ");
  const area=`${P.l},${H-P.b} ${pts} ${X(data.length-1)},${H-P.b}`;
  const dots=data.map((p,i)=>`<circle cx="${X(i)}" cy="${Y(p.v)}" r="${i===data.length-1?5.5:3.6}" fill="${i===data.length-1?"var(--acc)":"#F2F5F9"}"/>`).join("");
  const dl=t=>{const d=new Date(t);return d.toLocaleDateString("it-IT",{day:"2-digit",month:"short"})};
  const last=data[data.length-1];
  const delta=Math.round((last.v-data[0].v)*10)/10;
  const goodDown=!def[3];
  const goodCls=delta===0?"":((delta<0)===goodDown?"good":"bad");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Andamento ${def[1]}">
    <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--acc)" stop-opacity=".28"/><stop offset="1" stop-color="var(--acc)" stop-opacity="0"/>
    </linearGradient></defs>
    ${grid}
    <polygon points="${area}" fill="url(#ag)"/>
    <polyline points="${pts}" fill="none" stroke="var(--acc)" stroke-width="2.6" stroke-linejoin="round"/>
    ${dots}
    <text x="${X(data.length-1)}" y="${Y(last.v)-11}" text-anchor="middle" font-family="IBM Plex Mono" font-weight="700" font-size="14" fill="var(--acc)">${fmt(last.v)}</text>
    <text x="${P.l}" y="${H-6}" font-family="IBM Plex Mono" font-size="10" fill="#8B97A8">${dl(data[0].t)}</text>
    <text x="${W-P.r}" y="${H-6}" text-anchor="end" font-family="IBM Plex Mono" font-size="10" fill="#8B97A8">${dl(last.t)}</text>
  </svg>
  <div class="delta ${goodCls}">Δ ${delta>0?"+":""}${fmt(delta)} ${def[2]} dall'inizio · ${data.length} misurazioni</div>`;
}

function renderBody(){
  const today=new Date().toISOString().slice(0,10);
  const p=S.profile||{};
  main.insertAdjacentHTML("beforeend",`
   <div class="dayhead"><div class="eyebrow">Parametri corporei</div><h2>Misure e trend</h2></div>

   <div class="card">
     <h4>Andamento</h4>
     <div class="chips">${METRICS.map(m=>`<button class="chip${bodyMetric===m[0]?" on":""}" data-m="${m[0]}">${m[1]}</button>`).join("")}</div>
     <div class="chartbox" id="chartbox">${chartSVG(bodyMetric)}</div>
   </div>

   <div class="card">
     <h4>Nuova misurazione</h4>
     <div class="bodyform" id="bform">
       <label class="wide"><span class="fl">Data</span><input type="date" id="b_t" value="${today}"></label>
       <label><span class="fl">Peso kg</span><input id="b_peso" inputmode="decimal" placeholder="77,0"></label>
       <label><span class="fl">Grasso %</span><input id="b_bf" inputmode="decimal" placeholder="15,0"></label>
       <label><span class="fl">Vita cm</span><input id="b_vita" inputmode="decimal"></label>
       <label><span class="fl">Fianchi cm</span><input id="b_fianchi" inputmode="decimal"></label>
       <label><span class="fl">Torace cm</span><input id="b_torace" inputmode="decimal"></label>
       <label><span class="fl">Braccio cm</span><input id="b_braccio" inputmode="decimal"></label>
       <label><span class="fl">Coscia cm</span><input id="b_coscia" inputmode="decimal"></label>
       <button class="savebody" id="baddbtn">Salva misurazione</button>
     </div>
   </div>

   <div class="card">
     <h4>Storico misurazioni</h4>
     <div id="blist"></div>
   </div>

`);

  main.querySelectorAll(".chip").forEach(ch=>ch.onclick=()=>{
    bodyMetric=ch.dataset.m;store.set("body_metric",bodyMetric);main.innerHTML="";renderBody();
  });

  document.getElementById("baddbtn").onclick=()=>{
    const num=id=>{const v=document.getElementById(id).value.replace(",",".").trim();return v===""?null:parseFloat(v)};
    const entry={t:document.getElementById("b_t").value||today,
      peso:num("b_peso"),bf:num("b_bf"),vita:num("b_vita"),fianchi:num("b_fianchi"),
      torace:num("b_torace"),braccio:num("b_braccio"),coscia:num("b_coscia")};
    if([entry.peso,entry.bf,entry.vita,entry.fianchi,entry.torace,entry.braccio,entry.coscia].every(v=>v==null)){
      toast("Inserisci almeno un valore");return;
    }
    S.body=S.body.filter(b=>b.t!==entry.t);
    S.body.push(entry);S.body.sort((a,b)=>a.t.localeCompare(b.t));
    save();main.innerHTML="";renderBody();toast("Misurazione salvata");
  };

  const bl=document.getElementById("blist");
  if(!S.body.length){
    bl.innerHTML=`<div class="empty">Nessuna misurazione. Pesati sempre nelle stesse condizioni (mattina, digiuno).</div>`;
  } else {
    S.body.slice().reverse().forEach(b=>{
      const parts=METRICS.filter(m=>b[m[0]]!=null).map(m=>`${m[1]} ${fmt(b[m[0]])}`).join(" · ");
      const row=document.createElement("div");row.className="brow";
      row.innerHTML=`<span class="bd">${new Date(b.t).toLocaleDateString("it-IT",{day:"2-digit",month:"short",year:"2-digit"})}</span>
        <span class="bv">${parts}</span><button class="bx">×</button>`;
      row.querySelector(".bx").onclick=async()=>{if(await ask("Elimino questa misurazione?","Elimina")){S.body=S.body.filter(x=>x!==b);save();main.innerHTML="";renderBody()}};
      bl.appendChild(row);
    });
  }

  main.insertAdjacentHTML("beforeend",`<div class="tools"><button id="bodyset">Profilo e impostazioni</button></div>`);
  const bs=document.getElementById("bodyset");if(bs)bs.onclick=()=>{view="SET";store.set("scheda_view",view);render()};
}


/* ---------------- TAB IMPOSTAZIONI ---------------- */

/* ---------------- IMPORT BACKUP (nuovo, da zero) ----------------
   Il vecchio pulsante non funzionava per un id duplicato nel markup
   (st_imp usato due volte): l'handler finiva sull'altro bottone.
   Questo usa un id unico e offre due strade: file oppure testo incollato. */
function importBackupAsk(){
  const sheet=document.getElementById("sheet");
  sheet.innerHTML=`
    <h3>Importa backup</h3>
    <div class="sub">Scegli il file esportato, oppure apri il file con un editor e incollane qui il contenuto.</div>
    <button class="genbtn" id="bk_file" style="margin-top:12px">Scegli il file .json</button>
    <div class="lbl2" style="margin-top:16px">Oppure incolla il contenuto</div>
    <textarea id="bk_txt" class="urlin" rows="6" style="resize:vertical;min-height:120px;font-family:'IBM Plex Mono',monospace;font-size:13px" placeholder='{"active":"u1","users":[...]}'></textarea>
    <button class="revert" id="bk_paste" style="margin-top:8px">Importa dal testo incollato</button>
    <div id="bk_out"></div>
    <button class="closebtn" id="bk_close" style="margin-top:10px">Annulla</button>`;
  const out=sheet.querySelector("#bk_out");
  const applica=(txt)=>{
    let o=null;
    try{o=JSON.parse(txt)}catch(x){out.innerHTML=`<div class="nextbox late" style="margin-top:10px">Il testo non e' JSON valido: ${esc(x.message)}</div>`;return}
    let mu=null;
    if(o&&o.users&&o.users.length)mu=o;
    else if(o&&o.days)mu={active:"u1",users:[{id:"u1",name:(o.profile&&o.profile.nome)||"Profilo",state:o}]};
    if(!mu){out.innerHTML=`<div class="nextbox late" style="margin-top:10px">Struttura non riconosciuta: serve un backup completo (users) o una scheda singola (days).</div>`;return}
    try{mu.users.forEach(u=>{u.state=normState(u.state||{})})}
    catch(x){out.innerHTML=`<div class="nextbox late" style="margin-top:10px">Dati non riparabili: ${esc(x.message)}</div>`;return}
    const nSess=mu.users.reduce((a,u)=>a+((u.state.log||[]).length),0);
    const nEx=mu.users.reduce((a,u)=>a+((u.state.days||[]).reduce((b,d)=>b+((d.ex||[]).length),0)),0);
    out.innerHTML=`
      <div class="nextbox" style="margin-top:12px">Trovati: <b>${mu.users.length}</b> profil${mu.users.length===1?"o":"i"}, <b>${nEx}</b> esercizi in scheda, <b>${nSess}</b> sedute di storico.</div>
      <button class="genbtn" id="bk_ok" style="margin-top:10px">Sostituisci i miei dati con questi</button>`;
    out.querySelector("#bk_ok").onclick=async()=>{
      if(!await ask("Sovrascrivo i dati attuali con quelli del backup?<br><small style='color:var(--soft)'>L'operazione non e' reversibile.</small>","Sovrascrivi"))return;
      MU=mu;save();S=normState(activeUser().state);view="A";
      closeModal();render();updateBarInfo();toast("Backup importato");
    };
  };
  sheet.querySelector("#bk_file").onclick=()=>{
    const i=document.createElement("input");i.type="file";i.accept=".json,application/json";
    i.onchange=()=>{
      const f=i.files[0];if(!f)return;
      const r=new FileReader();
      r.onload=()=>applica(String(r.result||""));
      r.onerror=()=>{out.innerHTML=`<div class="nextbox late" style="margin-top:10px">Lettura del file fallita.</div>`};
      r.readAsText(f);
    };
    i.click();
  };
  sheet.querySelector("#bk_paste").onclick=()=>{
    const t=(sheet.querySelector("#bk_txt").value||"").trim();
    if(!t){toast("Incolla prima il contenuto");return}
    applica(t);
  };
  sheet.querySelector("#bk_close").onclick=closeModal;
  document.getElementById("modal").classList.add("on");
}

function renderSettings(){
  const p=S.profile||{};
  const nSess=S.log.length, nSaved=(S.saved||[]).length;
  const lastExp=parseInt(store.get("last_export"))||0;
  const lastBkp=parseInt(store.get("last_backup"))||0;
  const ago=t=>{if(!t)return "mai";const g=Math.floor((Date.now()-t)/864e5);return g===0?"oggi":g===1?"ieri":g+" giorni fa"};
  main.insertAdjacentHTML("beforeend",`
    <div class="dayhead"><div class="eyebrow">Profilo, dati e strumenti</div><h2>Impostazioni</h2></div>

    <div class="card">
      <h4>Account cloud</h4>
      <div class="cfgrow"><span class="cl">Stato<small>${window.cloudEmail&&window.cloudEmail()
        ? "collegato · i dati si salvano online a ogni modifica"
        : "non collegato · i dati restano solo su questo dispositivo"}</small></span>
        <span class="lbl">${window.cloudEmail&&window.cloudEmail()?esc(window.cloudEmail()):"offline"}</span></div>
      <div class="cfgrow"><span class="cl">${window.cloudEmail&&window.cloudEmail()?"Esci dall'account":"Collega un account"}<small>i dati locali non vengono cancellati</small></span>
        <button id="st_logout">${window.cloudEmail&&window.cloudEmail()?"Esci":"Accedi"}</button></div>
    </div>

    <div class="card">
      <h4>Le mie schede</h4>
      <div class="cfgrow"><span class="cl">Cambia scheda di allenamento<small>${(S.days||[]).length} giorni in servizio · ${((S.saved||[]).filter(x=>x.kind==="ciclo")).length} in archivio. Lo storico resta unico</small></span>
        <button id="st_schede">Apri</button></div>
    </div>

    <div class="card">
      <h4>Analisi automatica</h4>
      <div class="cfgrow"><span class="cl">Valuta le sedute con l'AI<small>${gemKey()?"chiave attiva"+(SESSION?" · legata al tuo account":" su questo dispositivo"):"chiave non ancora configurata"}</small></span>
        <button id="st_ai">Analizza</button></div>
      <div class="cfgrow"><span class="cl">Chiave Google<small>configurazione guidata, prova del collegamento e sincronizzazione</small></span>
        <button id="st_gem">${gemKey()?"Gestisci":"Configura"}</button></div>
      <div class="cfgrow"><span class="cl">Chiedi al preparatore<small>${gemKey()?((S.chat||[]).length?((S.chat||[]).length+" messaggi in memoria"):"domande sull'allenamento, con la tua scheda sott'occhio"):"serve la chiave Google"}</small></span>
        <button id="st_chat" ${gemKey()?"":"disabled"}>Apri</button></div>
      <div class="cfgrow"><span class="cl">Fai rileggere la scheda<small>l'AI segnala squilibri di volume. I carichi restano quelli calcolati dall'app</small></span>
        <button id="st_rev" ${gemKey()?"":"disabled"}>Revisiona</button></div>
      <div class="cfgrow"><span class="cl">Importa scheda da foto o testo<small>${gemKey()?"l'AI la legge e la trascrive, con conferma prima di applicare":"serve la chiave Google"}</small></span>
        <button id="st_imp" ${gemKey()?"":"disabled"}>Importa</button></div>
      <div class="cfgrow"><span class="cl">Nomi dei giorni<small>${(S.days||[]).map(x=>x.id).join(" · ")} — la lettera resta, cambia la descrizione</small></span>
        <button id="st_nomi">Rinomina</button></div>
      ${isOwner()?`<div class="cfgrow"><span class="cl">Moderazione libreria<small>proposte degli utenti in attesa di approvazione</small></span>
        <button id="st_mod">Apri</button></div>`:""}
      <div class="cfgrow"><span class="cl">Aggiungi un macchinario<small>${gemKey()?"scrivi il nome, l'AI lo identifica e lo mette in libreria":"serve la chiave Google"}</small></span>
        <button id="st_mac" ${gemKey()?"":"disabled"}>Aggiungi</button></div>
      <div class="cfgrow"><span class="cl">Rivedi il tutorial<small>RIR, superserie, calibrazione, deload</small></span>
        <button id="st_tut">Apri</button></div>
      <div class="cfgrow"><span class="cl">Installa sulla schermata Home<small>${isStandalone()?"gia' installata":"si apre a schermo intero, senza barre"}</small></span>
        <button id="st_home" ${isStandalone()?"disabled":""}>Istruzioni</button></div>
      <div class="cfgrow"><span class="cl">Copia pre-aggiornamento<small>${S._snap?"salvata il "+new Date(S._snap.ts).toLocaleString("it-IT"):"nessuna copia: non hai ancora cambiato versione"}</small></span>
        <button id="st_snap" ${S._snap?"":"disabled"}>Ripristina</button></div>
      <div class="cfgrow"><span class="cl">Versione<small>schema dati ${SCHEMA_VERSION}</small></span>
        <span class="lbl">v${APP_VERSION}</span></div>
    </div>

    <div class="card">
      <h4>Profilo</h4>
      <div class="cfgrow"><span class="cl">Nome</span><input class="txt" id="st_nome" value="${esc(p.nome||"")}" placeholder="Nome"></div>
      <div class="cfgrow"><span class="cl">Cognome</span><input class="txt" id="st_cognome" value="${esc(p.cognome||"")}" placeholder="Cognome"></div>
      <div class="cfgrow"><span class="cl">Profili<small>${MU.users.length} profil${MU.users.length===1?"o":"i"} · ${nSess} sedute · ${nSaved} schede salvate</small></span>
        <button id="st_users">Gestisci</button></div>
      <div class="cfgrow"><span class="cl">Ricalibra i carichi<small>rifai le domande iniziali. I carichi che hai impostato a mano non vengono toccati</small></span>
        <button id="st_recal">Ricalibra</button></div>
    </div>

    <div class="card">
      <h4>Allenamento</h4>
      <div class="cfgrow"><span class="cl">Cadenza allenamenti<small>oltre questa soglia l'app te lo segnala</small></span>
        <input id="st_gap" inputmode="numeric" value="${S.cfg.gap}"><span class="lbl">gg</span></div>
      <div class="cfgrow"><span class="cl">Durata target seduta</span>
        <input id="st_target" inputmode="numeric" value="${S.cfg.target}"><span class="lbl">min</span></div>
      <div class="cfgrow"><span class="cl">Notifiche di fine recupero<small>avviso quando sei su un'altra app</small></span>
        <button id="st_notif" class="${S.cfg.notif?"on":""}">${S.cfg.notif?"Attive ✓":"Attiva"}</button></div>
    </div>

    <div class="card">
      <h4>Analisi con l'AI</h4>
      <div class="cfgrow"><span class="cl">Esporta sedute<small>ultima esportazione: ${ago(lastExp)}</small></span>
        <button id="st_export" class="on">Esporta</button></div>
      <div class="cfgrow"><span class="cl">Aggiorna la scheda<small>incolla le modifiche suggerite dall'AI, con anteprima</small></span>
        <button id="st_patch">Incolla modifiche</button></div>
    </div>

    <div class="card">
      <h4>Schede e dati</h4>
      <div class="cfgrow"><span class="cl">Importa una nuova scheda<small>sostituisce solo i giorni A/B/C — storico e misure restano</small></span>
        <button id="st_impsch">Importa scheda</button></div>
      <div class="cfgrow"><span class="cl">Ripristina la scheda di partenza<small>riporta i giorni ai valori iniziali</small></span>
        <button id="st_reset">Ripristina</button></div>
    </div>

    <div class="card">
      <h4>Backup completo</h4>
      <div class="sub" style="margin:0 0 8px">I dati vivono solo su questo dispositivo. Esporta ogni tanto: è la tua rete di sicurezza.</div>
      <div class="cfgrow"><span class="cl">Esporta backup<small>tutti i profili · ultimo: ${ago(lastBkp)}</small></span>
        <button id="st_exp">Esporta</button></div>
      <div class="cfgrow"><span class="cl">Importa backup<small>da file o incollando il testo</small></span>
        <button id="st_bkimp">Importa</button></div>
      <div class="cfgrow"><span class="cl">Svuota lo storico<small>cancella le sedute registrate</small></span>
        <button id="st_clr" class="danger">Svuota</button></div>
    </div>
    <div class="sub" style="text-align:center;padding:6px 0 2px">Scheda Full Body · v${APP_VERSION}</div>`);

  const g=id=>document.getElementById(id);
  g("st_nome").onchange=ev=>{S.profile=S.profile||{};S.profile.nome=ev.target.value.trim();save();buildNav()};
  g("st_cognome").onchange=ev=>{S.profile=S.profile||{};S.profile.cognome=ev.target.value.trim();save();buildNav()};
  g("st_schede").onclick=schedeAsk;
  g("st_ai").onclick=aiAnalysisAsk;
  g("st_gem").onclick=gemSetupAsk;
  g("st_tut").onclick=()=>tutorialAsk(true);
  const gn=g("st_nomi"); if(gn)gn.onclick=renameDaysAsk;
  const gm=g("st_mac");  if(gm)gm.onclick=addMachineAsk;
  const gmd=g("st_mod"); if(gmd)gmd.onclick=moderateAsk;
  const gc=g("st_chat"); if(gc)gc.onclick=aiChatAsk;
  const gr=g("st_rev");  if(gr)gr.onclick=aiReviewScheda;
  const gi=g("st_imp");  if(gi)gi.onclick=aiImportAsk;
  const bki=g("st_bkimp"); if(bki)bki.onclick=importBackupAsk;
  g("st_home").onclick=showHomeHint;
  g("st_snap").onclick=restoreSnapAsk;
  g("st_logout").onclick=async()=>{
    if(window.cloudEmail&&window.cloudEmail()){
      if(!await ask("Esco dall'account?<br><small style='color:var(--soft)'>I dati restano in cloud e li ritrovi al prossimo accesso.</small>","Esci"))return;
      /* Se il telefono e' condiviso, chi lo usa dopo non deve trovarsi davanti
         schede, misure e chiave API di qualcun altro. */
      const wipe=await ask("Cancello anche la copia locale su questo dispositivo?<br><small style='color:var(--soft)'>Scegli SI su un telefono condiviso o prestato. I dati restano comunque in cloud.</small>","Si, cancella");
      await window.logoutCloud(wipe);
      if(wipe){location.reload();return}
    }else{
      store.del("supa_offline");
      location.reload();
    }
  };
  g("st_users").onclick=openUsers;
  g("st_recal").onclick=()=>openOnb(true);
  g("st_gap").onchange=ev=>{S.cfg.gap=Math.max(1,parseInt(ev.target.value)||2);save()};
  g("st_target").onchange=ev=>{S.cfg.target=Math.max(10,parseInt(ev.target.value)||65);save()};
  g("st_notif").onclick=async()=>{
    if(!("Notification" in window)){toast("Notifiche non supportate qui");return}
    if(S.cfg.notif){S.cfg.notif=false;save();main.innerHTML="";renderSettings();return}
    const p2=await Notification.requestPermission();
    S.cfg.notif=(p2==="granted");save();main.innerHTML="";renderSettings();
    toast(S.cfg.notif?"Notifiche attive":"Permesso negato dal sistema");
  };
  g("st_export").onclick=()=>exportAsk(false);
  g("st_patch").onclick=importPatchAsk;
  g("st_impsch").onclick=importSchedaFromPhotoAsk;
  g("st_reset").onclick=async()=>{
    if(!await ask("Riporto i giorni A/B/C ai valori di partenza?<br><small style='color:var(--soft)'>Storico, misure e profilo restano.</small>","Ripristina"))return;
    const keep={log:S.log,body:S.body,cfg:S.cfg,profile:S.profile,rnd:S.rnd,saved:S.saved,customLib:S.customLib};
    S=normState(structuredClone(D));Object.keys(keep).forEach(k=>{if(keep[k]!==undefined)S[k]=keep[k]});
    save();render();toast("Scheda ripristinata");
  };
  g("st_exp").onclick=()=>{
    /* La chiave Google viene tolta dalla copia esportata: il file gira via mail,
       cloud e chat, e chi lo apre potrebbe altrimenti consumare la tua quota. */
    const dump=JSON.parse(JSON.stringify(MU));
    (dump.users||[]).forEach(u=>{if(u&&u.state&&u.state.ai)delete u.state.ai.key});
    const b=new Blob([JSON.stringify(dump,null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(b);
    a.download=`scheda-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();
    store.set("last_backup",String(Date.now()));toast("Backup completo scaricato");
    setTimeout(()=>{main.innerHTML="";renderSettings()},400);
  };
  g("st_clr").onclick=async()=>{
    if(await ask("Cancello tutte le sedute registrate?<br><small style='color:var(--soft)'>Le schede e le misure restano.</small>","Cancella")){S.log=[];save();render();toast("Storico svuotato")}
  };
}

/* ---------------- TAB RANDOM: scheda al volo ---------------- */
/* mappa i distretti del RANDOM sui gruppi della libreria, per il freno */
const DIST2GRP={petto:"Petto",schiena:"Schiena",spalle:"Spalle",braccia:"Braccia",bicipiti:"Braccia",
                tricipiti:"Braccia",gambe:"Gambe",core:"Core",addome:"Core",quad:"Gambe",
                quadricipiti:"Gambe",femorali:"Gambe",glutei:"Gambe",polpacci:"Gambe",dorso:"Schiena"};
function paintRandomWarn(){
  const box=document.getElementById("rwarn"); if(!box)return;
  // colora i chip secondo lo stato di recupero
  document.querySelectorAll("#rdist .gdist").forEach(b=>{
    const g=DIST2GRP[String(b.dataset.d).toLowerCase()]||"";
    const st=g?grpState(g):"pronto";
    b.classList.toggle("fresco",st==="fresco");
    b.classList.toggle("quasi",st==="quasi");
  });
  const att=Object.keys(genCfg.dist||{}).filter(k=>genCfg.dist[k]);
  const freschi=[...new Set(att.map(k=>DIST2GRP[String(k).toLowerCase()]).filter(g=>g&&grpState(g)==="fresco"))];
  box.innerHTML=freschi.length
    ? `<div class="sub" style="margin:8px 0;color:var(--hot)">${freschi.join(" e ")} ${freschi.length===1?"l'hai allenato":"li hai allenati"} da poco: scelta tua.</div>`
    : "";
}
/* stato di recupero di un gruppo: pronto / quasi / fresco */
function grpState(g){
  const r=recentGroups(72)[g];
  if(!r)return "pronto";
  const soglia=["Gambe","Petto","Schiena"].includes(g)?48:36;
  if(r.ore<soglia*0.75)return "fresco";
  if(r.ore<soglia)return "quasi";
  return "pronto";
}
function randomAdvice(minuti){
  const tutti=["Gambe","Petto","Schiena","Spalle","Braccia","Core"];
  const pronti=tutti.filter(g=>grpState(g)==="pronto");
  const freschi=tutti.filter(g=>grpState(g)==="fresco");
  const n=(minuti||45)<=30?2:((minuti||45)<=45?3:4);
  if(!pronti.length)
    return `<div class="aitip" style="display:block"><span class="tiplab">Oggi</span>
      Ti sei allenato da poco su quasi tutto: punterei su core e mobilità, o una seduta leggera.</div>`;
  const scelti=pronti.slice(0,n).join(", ");
  const nota=freschi.length?` ${freschi.join(", ").replace(/, ([^,]*)$/," e $1")} ${freschi.length===1?"l'hai fatto":"li hai fatti"} da poco.`:"";
  return `<div class="aitip" style="display:block"><span class="tiplab">Oggi conviene</span>
    <b>${scelti}</b>.${nota}
    ${gemKey()?`<button class="revert" id="rai" style="margin-top:8px;padding:8px">Chiedi all'AI cosa allenare</button>`:""}</div>`;
}
function renderRandom(){
  const dh=`<div class="dayhead"><div class="eyebrow">Scheda al volo · i tuoi giorni A/B/C restano intatti</div><h2>Random</h2></div>`;
  main.insertAdjacentHTML("beforeend",dh);

  // configuratore inline (le domande da PT)
  const cfgCard=document.createElement("div");
  cfgCard.className="card";
  const dsel=GEN.districts.map(d=>`<button class="chip gdist${genCfg.dist[d[0]]?" on":""}" data-d="${d[0]}">${d[1]}</button>`).join("");
  cfgCard.innerHTML=`
    <h4>Cosa alleni oggi</h4>
    ${(()=>{try{return randomAdvice(genCfg.min)}catch(x){return""}})()}
    <div class="lbl2">Distretti</div>
    <div class="chips" id="rdist">${dsel}</div>
    <div id="rwarn"></div>
    <div class="lbl2">Esercizi per distretto</div>
    <div class="chips" id="rpd">${[1,2,3,4].map(v=>`<button class="chip${genCfg.perDist===v?" on":""}" data-v="${v}">${v}</button>`).join("")}</div>
    <div class="lbl2">Quanto tempo hai</div>
    <div class="chips" id="rmin">${[20,30,45,60,90].map(v=>`<button class="chip${genCfg.min===v?" on":""}" data-v="${v}">${v} min</button>`).join("")}</div>
    <div class="lbl2">Attrezzatura</div>
    <div class="chips" id="rband">
      <button class="chip${!genCfg.band?" on":""}" data-b="0">Palestra</button>
      <button class="chip${genCfg.band?" on":""}" data-b="1">Solo elastici</button>
    </div>
    <button class="genbtn" id="rGo" style="margin-top:16px">${S.rnd?"↻ Rigenera al volo":"⚡ Genera scheda al volo"}</button>`;
  main.appendChild(cfgCard);

  const bind=(sel,key)=>cfgCard.querySelectorAll(sel+" .chip").forEach(b=>b.onclick=()=>{
    genCfg[key]=Number(b.dataset.v);
    cfgCard.querySelectorAll(sel+" .chip").forEach(x=>x.classList.remove("on"));b.classList.add("on");
  });
  bind("#rpd","perDist");bind("#rmin","min");
  cfgCard.querySelectorAll("#rband .chip").forEach(b=>b.onclick=()=>{
    genCfg.band=b.dataset.b==="1";
    cfgCard.querySelectorAll("#rband .chip").forEach(x=>x.classList.remove("on"));b.classList.add("on");
  });
  cfgCard.querySelectorAll("#rdist .chip").forEach(b=>b.onclick=()=>{
    const d=b.dataset.d;genCfg.dist[d]=genCfg.dist[d]?0:1;b.classList.toggle("on");
    try{paintRandomWarn()}catch(e){}
  });
  setTimeout(()=>{try{paintRandomWarn()}catch(e){}},0);
  cfgCard.querySelector("#rGo").onclick=async()=>{
    const days=buildProgram();
    if(!days){toast("Seleziona almeno un distretto");return}
    if(S.rnd && (S.rnd.ex||[]).some(e=>e.sets.some(s=>s.done)) &&
       !await ask("Rigenero? Perdi le serie già spuntate in questa scheda al volo.","Rigenera"))return;
    const d0=days[0];
    S.rnd={focus:d0.focus,warm:d0.warm,ex:d0.ex,cfg:{min:genCfg.min,perDist:genCfg.perDist,band:genCfg.band}};
    save();render();toast("Scheda al volo pronta");
  };

  if(!S.rnd){
    main.insertAdjacentHTML("beforeend",`<div class="empty" style="margin-top:6px">Imposta i parametri e genera. La scheda comparirà qui sotto, allenabile come le altre — con timer, serie e salvataggio nello storico.</div>`);
    renderSavedList();
    return;
  }

  // scheda random allenabile
  const r=S.rnd;
  const estMin=r.ex.reduce((s,e)=>s+e.sets.length*(1+(e.rest||60)/60)+1,4);
  main.insertAdjacentHTML("beforeend",`
    <div class="dayhead" style="margin-top:14px"><div class="eyebrow">${r.focus} · ~${Math.round(estMin)}′ · ${r.cfg.band?"elastici":"palestra"}</div><h2>Seduta di oggi</h2></div>
    <div class="warmpanel" id="warmpanelR"></div>`);

  const dR={id:"R",focus:r.focus,warm:r.warm,ex:r.ex};
  mountWarmPanel(document.getElementById("warmpanelR"),dR,()=>editWarmAsk(dR));
  drawExList(main,dR);

  const add=document.createElement("button");
  add.className="addex";add.textContent="+ Aggiungi esercizio dalla libreria";
  add.onclick=()=>openPicker(dR);
  main.appendChild(add);

  const reg=document.createElement("button");
  reg.className="genbtn";reg.style.marginTop="10px";reg.textContent="Registra questa seduta";
  reg.onclick=()=>{
    let vol=0;
    const ex=r.ex.map(e=>{const done=e.sets.filter(s=>s.done);const use=done.length?done:e.sets;
      use.forEach(s=>{vol+=s.w*(parseInt(s.r)||0)});
      return {n:e.n,sets:use.map(s=>`${fmt(s.w)}×${s.r||"–"}${s.rir!=null?"@"+s.rir:""}`).join("  ")};});
    const min=sessStart?Math.max(1,sessMinutes()):null;
    S.log.push({d:"R",iso:new Date().toISOString(),date:new Date().toLocaleDateString("it-IT",{day:"2-digit",month:"short",year:"2-digit"}),ex,vol:Math.round(vol),min});
    r.ex.forEach(e=>e.sets.forEach(s=>s.done=false));
    sessStart=0;store.set("sess_start","0");save();
    toast(`Seduta al volo salvata · ${Math.round(vol)} kg`);
    updateBarInfo();
  };
  main.appendChild(reg);

  const savBtn=document.createElement("button");
  savBtn.className="revert";savBtn.style.marginTop="8px";savBtn.textContent="★ Salva questa scheda tra le mie";
  savBtn.onclick=async()=>{
    const name=await prompt2("Nome della scheda da salvare:", r.focus+" "+r.cfg.min+"min");
    if(name===null)return;
    S.saved.push({id:"s"+Date.now().toString(36),name:name.trim()||r.focus,focus:r.focus,warm:r.warm,
      ex:structuredClone(r.ex).map(e=>{e.sets.forEach(s=>{s.done=false;s.r=""});return e}),cfg:r.cfg,ts:Date.now()});
    save();render();toast("Scheda salvata nella tua libreria");
  };
  main.appendChild(savBtn);

  main.insertAdjacentHTML("beforeend",`<div class="tools"><button id="rclear" class="danger">Scarta scheda al volo</button></div>`);
  document.getElementById("rclear").onclick=async()=>{
    if(await ask("Scarto la scheda al volo attuale?","Scarta")){S.rnd=null;save();render()}
  };
  renderSavedList();
  updateBarInfo();
}

/* libreria schede salvate dal profilo */
function renderSavedList(){
  const solo=(S.saved||[]).filter(x=>x.kind!=="ciclo");   // i cicli hanno la loro schermata
  if(!solo.length)return;
  const wrap=document.createElement("div");wrap.className="card";
  wrap.innerHTML=`<h4>Le mie schede salvate</h4><div id="savedList"></div>`;
  main.appendChild(wrap);
  const list=wrap.querySelector("#savedList");
  solo.slice().reverse().forEach(sc=>{
    const row=document.createElement("button");row.className="alt";row.style.width="100%";
    row.innerHTML=`<span class="an">${sc.name}<small>${sc.ex.length} esercizi · ${sc.cfg?sc.cfg.min+"min":""}</small></span>
      <span class="aw" style="display:flex;gap:8px;align-items:center"><em style="color:var(--acc)">carica</em>
      <span class="sdel" data-id="${sc.id}" style="color:#F87171;padding:0 4px">×</span></span>`;
    row.onclick=async ev=>{
      if(ev.target.classList.contains("sdel"))return;
      const choice=await ask(`Carico <b>${sc.name}</b> nel tab RANDOM per allenarla ora?`,"Carica");
      if(!choice)return;
      S.rnd={focus:sc.focus,warm:sc.warm,ex:structuredClone(sc.ex),cfg:sc.cfg};
      save();render();toast("Scheda caricata");
    };
    row.querySelector(".sdel").onclick=async ev=>{
      ev.stopPropagation();
      if(await ask(`Elimino la scheda salvata <b>${sc.name}</b>?`,"Elimina")){S.saved=S.saved.filter(x=>x.id!==sc.id);save();render()}
    };
    list.appendChild(row);
  });
}

/* ---------------- log ---------------- */
function volChart(){
  const data=S.log.slice(-12);
  if(data.length<2)return "";
  const W=680,H=130,P={l:8,r:8,t:14,b:22};
  const mx=Math.max(...data.map(s=>s.vol||0))||1;
  const bw=(W-P.l-P.r)/data.length;
  const col={A:"#FF6B2C",B:"#38CFFF",C:"#B78BFF",R:"#FF4D8D"};
  const bars=data.map((s,i)=>{
    const h=Math.max(3,(H-P.t-P.b)*(s.vol||0)/mx);
    const x=P.l+i*bw+bw*0.15;
    const de=s.deload?`<text x="${x+bw*0.35}" y="${H-P.b-h-4}" text-anchor="middle" font-family="IBM Plex Mono" font-size="9" fill="#FFD166">↓</text>`:"";
    return `<rect x="${x}" y="${H-P.b-h}" width="${bw*0.7}" height="${h}" rx="3" fill="${col[s.d]||"#8B97A8"}"/>${de}
      <text x="${x+bw*0.35}" y="${H-8}" text-anchor="middle" font-family="IBM Plex Mono" font-size="10" fill="#8B97A8">${s.d}</text>`;
  }).join("");
  return `<div class="card"><h4>Tonnellaggio ultime ${data.length} sedute</h4>
    <div class="chartbox"><svg viewBox="0 0 ${W} ${H}">${bars}</svg></div></div>`;
}

/* serie storiche di forza per un esercizio: [{t, best1rm, topWeight}] */
function strengthSeries(name){
  const out=[];
  S.log.forEach(s=>{
    const x=(s.ex||[]).find(o=>o.n===name); if(!x)return;
    let best=0,topW=0;
    String(x.sets).split(/\s+/).forEach(tok=>{
      const at=tok.split("@"); const rir=at[1]!=null?parseFloat(at[1]):null;
      const mm=at[0].split("×"); if(mm.length!==2)return;
      const w=parseFloat(String(mm[0]).replace(",","."))||0, r=parseInt(mm[1])||0;
      const one=e1rm(w,r,rir); if(one>best)best=one; if(w>topW)topW=w;
    });
    if(best>0)out.push({t:s.iso||s.date,ts:s.iso?new Date(s.iso).getTime():0,best:Math.round(best*10)/10,topW});
  });
  return out;
}

/* ===================== MOTORE DI PREVISIONE / ANALISI ANDAMENTO =====================
   Regressione lineare pesata sui 1RM stimati nel tempo -> pendenza (kg/settimana),
   proiezione a 4 settimane, rilevamento progressione/stallo/regressione.
   Più punti = stima più affidabile (r² e numero campioni). */
function linfit(points){ // points: [{x, y}] con x in settimane
  const n=points.length; if(n<2)return null;
  let sx=0,sy=0,sxx=0,sxy=0,syy=0;
  points.forEach(p=>{sx+=p.x;sy+=p.y;sxx+=p.x*p.x;sxy+=p.x*p.y;syy+=p.y*p.y});
  const d=n*sxx-sx*sx; if(Math.abs(d)<1e-9)return null;
  const slope=(n*sxy-sx*sy)/d, icpt=(sy-slope*sx)/n;
  const num=n*sxy-sx*sy, den=Math.sqrt((n*sxx-sx*sx)*(n*syy-sy*sy));
  const r2=den?Math.pow(num/den,2):0;
  return {slope,intercept:icpt,r2,n};
}
// analisi di un riferimento (squat/bench/row/ohp/hinge): usa lo storico di TUTTI gli esercizi che lo alimentano
function analyzeRef(ref){
  const pts=[];
  const names=LIB.filter(a=>LIBN[a[0]].ref===ref&&LIBN[a[0]].k>0).map(a=>a[0]);
  const nameSet=new Set(names);
  S.log.forEach(s=>{
    if(!s.iso)return; const ts=new Date(s.iso).getTime();
    (s.ex||[]).forEach(x=>{
      if(!nameSet.has(x.n))return; const li=LIBN[x.n];
      let best=0;
      String(x.sets).split(/\s+/).forEach(tok=>{
        const at=tok.split("@"); const rir=at[1]!=null?parseFloat(at[1]):null;
        const mm=at[0].split("×"); if(mm.length!==2)return;
        const w=parseFloat(String(mm[0]).replace(",","."))||0, r=parseInt(mm[1])||0;
        const one=e1rm(w,r,rir); if(one>best)best=one;
      });
      if(best>0){const eq=loadForReps(best,REPS_REF)/li.k; pts.push({ts,y:eq})}
    });
  });
  if(pts.length<2)return {ref,n:pts.length,fit:null};
  const t0=Math.min(...pts.map(p=>p.ts));
  const P=pts.map(p=>({x:(p.ts-t0)/(7*864e5), y:p.y})).sort((a,b)=>a.x-b.x);
  const fit=linfit(P);
  const lastX=P[P.length-1].x;
  const cur=fit?fit.intercept+fit.slope*lastX:P[P.length-1].y;
  const proj4=fit?cur+fit.slope*4:cur;
  let trend="stabile";
  if(fit){ const perWeekPct=fit.slope/Math.max(1,cur)*100;
    if(perWeekPct>0.6)trend="progressione"; else if(perWeekPct<-0.6)trend="regressione"; else trend="stallo"; }
  return {ref,n:pts.length,fit,current:cur,proj4,trend,slope:fit?fit.slope:0,r2:fit?fit.r2:0};
}
function analyzeAll(){const o={};Object.keys(FALLBACK_REFS).forEach(r=>o[r]=analyzeRef(r));return o;}

// previsione carico di lavoro per un esercizio a un dato numero di ripetizioni e RIR target
function predictLoad(name,reps,rirTarget){
  const li=LIBN[name]; if(!li||li.k<=0)return 0;
  const refs=currentRefs();               // riferimento a 8 rip (già calibrato)
  const oneRM=e1rm(refs[li.ref]*li.k,REPS_REF,0); // 1RM stimato dell'esercizio
  // carico per (reps + rirTarget) ripetizioni teoriche
  const eff=reps+(rirTarget||0);
  const load=eff<=1?oneRM:oneRM/(1+eff/30);
  return round(load, li.st||2.5);
}
function oneRMof(name){
  const li=LIBN[name]; if(!li||li.k<=0)return 0;
  const refs=currentRefs();
  return Math.round(e1rm(refs[li.ref]*li.k,REPS_REF,0));
}
// tutti i nomi esercizio che compaiono nello storico con carico
function loggedExerciseNames(){
  const set=new Set();
  S.log.forEach(s=>(s.ex||[]).forEach(x=>{if(/×\d/.test(String(x.sets))&&!/×–/.test(x.sets))set.add(x.n)}));
  return [...set];
}
let strengthPick=store.get("strength_pick")||"";
function strengthChart(){
  const names=loggedExerciseNames();
  if(!names.length)return `<div class="card"><h4>Forza per esercizio</h4><div class="empty">Registra qualche seduta con carichi per vedere l'andamento della forza.</div></div>`;
  if(!strengthPick||!names.includes(strengthPick))strengthPick=names.find(n=>LIBN[n]&&LIBN[n].k>=.8)||names[0];
  const data=strengthSeries(strengthPick);
  const opts=names.map(n=>`<button class="chip${n===strengthPick?" on":""}" data-s="${esc(n)}">${n}</button>`).join("");
  let chart;
  if(data.length<2){chart=`<div class="empty">Servono almeno 2 sedute con "${strengthPick}" per il grafico.</div>`}
  else{
    const W=680,H=200,P={l:44,r:16,t:18,b:26};
    const vs=data.map(p=>p.best);
    let mn=Math.min(...vs),mx=Math.max(...vs); if(mn===mx){mn-=2;mx+=2}
    const pad=(mx-mn)*.15;mn-=pad;mx+=pad;
    const X=i=>P.l+(W-P.l-P.r)*(data.length===1?.5:i/(data.length-1));
    const Y=v=>P.t+(H-P.t-P.b)*(1-(v-mn)/(mx-mn));
    let grid="";for(let g=0;g<=3;g++){const v=mn+(mx-mn)*g/3,y=Y(v);
      grid+=`<line x1="${P.l}" y1="${y}" x2="${W-P.r}" y2="${y}" stroke="#232C3A"/><text x="${P.l-6}" y="${y+4}" text-anchor="end" font-family="IBM Plex Mono" font-size="10" fill="#8B97A8">${Math.round(v)}</text>`;}
    const pts=data.map((p,i)=>`${X(i)},${Y(p.best)}`).join(" ");
    const area=`${P.l},${H-P.b} ${pts} ${X(data.length-1)},${H-P.b}`;
    const dots=data.map((p,i)=>`<circle cx="${X(i)}" cy="${Y(p.best)}" r="${i===data.length-1?5:3.4}" fill="${i===data.length-1?"var(--acc)":"#F2F5F9"}"/>`).join("");
    const last=data[data.length-1],delta=Math.round((last.best-data[0].best)*10)/10;
    chart=`<svg viewBox="0 0 ${W} ${H}"><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".28"/><stop offset="1" stop-color="var(--acc)" stop-opacity="0"/></linearGradient></defs>
      ${grid}<polygon points="${area}" fill="url(#sg)"/><polyline points="${pts}" fill="none" stroke="var(--acc)" stroke-width="2.6" stroke-linejoin="round"/>${dots}
      <text x="${X(data.length-1)}" y="${Y(last.best)-10}" text-anchor="middle" font-family="IBM Plex Mono" font-weight="700" font-size="13" fill="var(--acc)">${fmt(last.best)}</text></svg>
      <div class="delta ${delta>=0?"good":"bad"}">1RM stimato: <b style="color:var(--text)">${fmt(last.best)} kg</b> · Δ ${delta>0?"+":""}${fmt(delta)} kg dall'inizio · ${data.length} sedute</div>`;
  }
  return `<div class="card"><h4>Forza per esercizio · 1RM stimato</h4>
    <div class="chips">${opts}</div><div class="chartbox">${chart}</div></div>`;
}

/* volume settimanale per gruppo muscolare (serie/settimana ultime 7 gg su schede attive) */
function weeklyVolume(){
  const since=Date.now()-7*864e5;
  const grp={};
  S.log.forEach(s=>{
    const t=s.iso?new Date(s.iso).getTime():0; if(t<since)return;
    (s.ex||[]).forEach(x=>{
      const li=LIBN[x.n]; const g=li?li.grp:"Altro";
      const nsets=String(x.sets).split(/\s+/).filter(tok=>tok.includes("×")).length||1;
      grp[g]=(grp[g]||0)+nsets;
    });
  });
  return grp;
}
function volumeCard(){
  const grp=weeklyVolume();
  const keys=Object.keys(grp).filter(g=>g!=="Elastici"||grp[g]>0);
  if(!keys.length)return "";
  const order=["Gambe","Petto","Schiena","Spalle","Braccia","Core","Elastici","Altro"];
  keys.sort((a,b)=>order.indexOf(a)-order.indexOf(b));
  // range indicativi serie/settimana per ipertrofia
  const target={Gambe:[10,20],Petto:[10,20],Schiena:[10,20],Spalle:[8,16],Braccia:[6,16],Core:[6,16]};
  const rows=keys.map(g=>{
    const v=grp[g],tg=target[g];
    const status=tg?(v<tg[0]?"basso":v>tg[1]?"alto":"ok"):"";
    const col=status==="ok"?"var(--ok)":status==="basso"?"#FFD166":status==="alto"?"#F87171":"var(--soft)";
    return `<div class="cfgrow" style="border-top:1px solid #1A212C"><span class="cl">${g}${tg?`<small>range ${tg[0]}–${tg[1]} serie/sett</small>`:""}</span>
      <b style="font-family:'IBM Plex Mono',monospace;color:${col}">${v} serie${status?` · ${status}`:""}</b></div>`;
  }).join("");
  return `<div class="card"><h4>Volume settimanale (ultimi 7 giorni)</h4>${rows}</div>`;
}

/* pannello "coach": valutazioni in linguaggio naturale su andamento forza + peso */
function coachPanel(){
  const A=analyzeAll();
  const named={squat:"Gambe (squat)",bench:"Spinta (panca)",row:"Tirata (rematore)",ohp:"Spalle (lento)",hinge:"Cerniera (stacco/RDL)"};
  const rows=Object.keys(named).filter(r=>A[r]&&A[r].n>=2).map(r=>{
    const a=A[r];
    const arrow=a.trend==="progressione"?"▲":a.trend==="regressione"?"▼":a.trend==="stallo"?"■":"·";
    const col=a.trend==="progressione"?"var(--ok)":a.trend==="regressione"?"#F87171":a.trend==="stallo"?"#FFD166":"var(--soft)";
    const per=a.slope>=0?"+":"";
    const proj=a.fit&&a.n>=3?` · proiezione ${fmt(Math.round(a.proj4))} kg tra 4 sett`:"";
    return `<div class="predrow"><span style="color:${col}">${arrow} ${named[r]} — ${a.trend}</span>
      <b style="color:${col}">${per}${fmt(Math.round(a.slope*10)/10)} kg/sett${proj}</b></div>`;
  }).join("");
  if(!rows)return "";
  // incrocio con peso corporeo
  let bodyLine="";
  const bw=S.body.filter(b=>b.peso!=null).map(b=>({t:b.t,v:parseFloat(b.peso)})).sort((a,b)=>a.t.localeCompare(b.t));
  if(bw.length>=2){
    const dW=Math.round((bw[bw.length-1].v-bw[0].v)*10)/10;
    // media pendenza forza
    const slopes=Object.keys(named).map(r=>A[r]).filter(a=>a&&a.fit&&a.n>=3).map(a=>a.slope/Math.max(1,a.current));
    const avg=slopes.length?slopes.reduce((x,y)=>x+y,0)/slopes.length:0;
    const forzaSu=avg>0.003, forzaGiu=avg<-0.003;
    let verdict;
    if(dW<-0.3&&(forzaSu||!forzaGiu))verdict="Ricomposizione in corso: peso in calo e forza mantenuta o in crescita. Continua così.";
    else if(dW<-0.3&&forzaGiu)verdict="Stai perdendo peso ma anche forza: valuta di aumentare le proteine e ridurre il deficit.";
    else if(dW>0.3&&forzaSu)verdict="Massa e forza in aumento: fase di crescita. Tieni d'occhio la vita se vuoi restare asciutto.";
    else if(Math.abs(dW)<=0.3&&forzaSu)verdict="Peso stabile e forza in salita: ricomposizione ideale.";
    else verdict="Andamento stabile. Se l'obiettivo è ricomposizione, punta a forza in salita con peso fermo o in leggero calo.";
    bodyLine=`<div class="predrow" style="border-top:1px dashed var(--line);margin-top:6px;padding-top:10px;color:var(--soft)">
      <span>Peso corporeo: ${dW>0?"+":""}${fmt(dW)} kg dall'inizio</span></div>
      <div style="color:var(--text);font-size:13px;margin-top:4px">${verdict}</div>`;
  }
  return `<div class="card"><h4>Analisi andamento</h4>
    <div class="cues" style="padding:11px 13px">${rows}${bodyLine}
    <div style="color:var(--soft);font-size:11px;margin-top:8px">Valutazioni basate sul tuo storico. Diventano più affidabili con più sedute registrate.</div></div></div>`;
}

function renderLog(){
  main.insertAdjacentHTML("beforeend",`<div class="dayhead">
    <div class="eyebrow">${S.log.length} sedute registrate</div><h2>Storico e progressi</h2></div>`);
  main.insertAdjacentHTML("beforeend",coachPanel());
  main.insertAdjacentHTML("beforeend",volChart());
  main.insertAdjacentHTML("beforeend",strengthChart());
  main.querySelectorAll(".card .chip[data-s]").forEach(b=>b.onclick=()=>{
    strengthPick=b.dataset.s;store.set("strength_pick",strengthPick);main.innerHTML="";renderLog();
  });
  main.insertAdjacentHTML("beforeend",volumeCard());
  if(!S.log.length){
    main.insertAdjacentHTML("beforeend",`<div class="empty">Nessuna seduta. Chiudi un allenamento con "Registra seduta".</div>`);
  } else {
    S.log.slice().reverse().forEach(s=>{
      main.insertAdjacentHTML("beforeend",`<div class="sess">
        <h3>GIORNO ${s.d}${s.deload?' <span style="color:#FFD166">· scarico</span>':''} <span>${s.date}${s.min?` · ${s.min} min`:""}</span></h3>
        <ul>${s.ex.map(x=>`<li><span>${x.n}</span><b>${x.sets}</b></li>`).join("")}</ul>
        <div class="tot">Tonnellaggio: ${s.vol} kg</div></div>`);
    });
  }
  main.insertAdjacentHTML("beforeend",`<div class="tools">
    <button id="logexp" style="border-color:var(--accLine);color:var(--acc)">Esporta sedute per l'AI</button>
    <button id="logset">Impostazioni</button></div>`);
  const le=document.getElementById("logexp");if(le)le.onclick=()=>exportAsk(false);
  const ls=document.getElementById("logset");if(ls)ls.onclick=()=>{view="SET";store.set("scheda_view",view);render()};
}

/* ================= ESPORTAZIONE SEDUTE / IMPORT SCHEDA / IMPORT PATCH ================= */

function periodStart(kind){
  const now=Date.now();
  if(kind==="all")return 0;
  if(kind==="30")return now-30*864e5;
  if(kind==="90")return now-90*864e5;
  if(kind==="last"){const t=parseInt(store.get("last_export"))||0;return t||0}
  return 0;
}
function sessionsIn(kind){
  const from=periodStart(kind);
  return S.log.filter(s=>{const t=s.iso?new Date(s.iso).getTime():0;return t>=from});
}

/* dati in markdown, leggibili da te e da un'AI */
function buildDataMd(kind){
  const p=S.profile||{};
  const sess=sessionsIn(kind);
  const L=[];
  L.push(`# Diario di allenamento — ${p.nome||"Atleta"}`);
  L.push("");
  L.push(`- Data di esportazione: ${new Date().toLocaleDateString("it-IT")}`);
  if(p.peso)L.push(`- Peso corporeo dichiarato: ${p.peso} kg`);
  if(p.level)L.push(`- Esperienza: ${({p:"meno di 1 anno",i:"1-3 anni",a:"oltre 3 anni"})[p.level]||p.level}`);
  L.push(`- Sedute nel periodo: ${sess.length}`);
  L.push(`- Cadenza impostata: ogni ${S.cfg.gap} giorni · durata target ${S.cfg.target} min`);
  L.push("");

  // riferimenti e 1RM stimati
  const refs=currentRefs(), conf=refConfidence();
  L.push("## Riferimenti di forza stimati (carico per ~8 ripetizioni)");
  const rn={squat:"Squat",bench:"Panca",row:"Rematore",ohp:"Lento avanti",hinge:"Stacco/RDL"};
  Object.keys(rn).forEach(r=>{
    const c=conf[r]>=.75?"precisa":conf[r]>=.35?"media":"grezza";
    L.push(`- ${rn[r]}: ${fmt(refs[r])} kg (affidabilità stima: ${c})`);
  });
  L.push("");

  // trend
  const A=analyzeAll();
  const trendRows=Object.keys(rn).filter(r=>A[r]&&A[r].n>=2);
  if(trendRows.length){
    L.push("## Andamento (regressione sui dati registrati)");
    trendRows.forEach(r=>{
      const a=A[r];
      L.push(`- ${rn[r]}: ${a.trend}, ${a.slope>=0?"+":""}${fmt(Math.round(a.slope*10)/10)} kg/settimana${a.n>=3?` · proiezione a 4 settimane ${fmt(Math.round(a.proj4))} kg`:""} (${a.n} osservazioni)`);
    });
    L.push("");
  }

  // volume settimanale
  const grp=weeklyVolume();
  if(Object.keys(grp).length){
    L.push("## Volume ultimi 7 giorni (serie per gruppo)");
    Object.keys(grp).forEach(g=>L.push(`- ${g}: ${grp[g]} serie`));
    L.push("");
  }

  // misure corporee
  if(S.body.length){
    L.push("## Misurazioni corporee");
    S.body.slice(-8).forEach(b=>{
      const parts=[];
      [["peso","kg"],["bf","%"],["vita","cm"],["fianchi","cm"],["torace","cm"],["braccio","cm"],["coscia","cm"]]
        .forEach(([k,u])=>{if(b[k]!=null&&b[k]!=="")parts.push(`${k} ${b[k]}${u}`)});
      L.push(`- ${b.t}: ${parts.join(", ")}`);
    });
    L.push("");
  }

  // schede attuali
  L.push("## Schede attuali");
  S.days.forEach(d=>{
    L.push(`### Giorno ${d.id} — ${d.focus||""}`);
    d.ex.forEach(e=>{
      const li=LIBN[e.n];
      const one=li&&li.k>0?oneRMof(e.n):0;
      L.push(`- ${e.n}: ${e.sets.length}×${e.r} @ ${fmt(e.w)} kg${one?` (1RM stimato ${one} kg)`:""}${e.ss?" [superserie]":""}${e.man?" [carico impostato a mano]":""}${e.note?` — nota: ${e.note}`:""}`);
    });
    L.push("");
  });

  // sedute
  L.push("## Sedute registrate");
  if(!sess.length){L.push("_Nessuna seduta nel periodo selezionato._")}
  sess.slice().reverse().forEach(s=>{
    L.push(`### ${s.date} — Giorno ${s.d}${s.deload?" (settimana di scarico)":""}`);
    L.push(`Durata: ${s.min?s.min+" min":"n.d."} · Tonnellaggio: ${s.vol} kg`);
    if(s.tags&&s.tags.length)L.push(`Tag: ${s.tags.join(", ")}`);
    if(s.note)L.push(`Note: ${s.note}`);

    if(s.qa&&s.qa.length)s.qa.forEach(x=>L.push("  · "+x.q+" → "+x.a));
    s.ex.forEach(x=>{
      // accanto alle ripetizioni fatte va sempre il bersaglio previsto,
      // altrimenti chi legge non sa se 6 ripetizioni sono un successo o un crollo
      const cur=(S.days||[]).flatMap(dd=>dd.ex||[]).find(e=>e.n===x.n);
      const prev=cur?cur.r:null;
      L.push(`- ${x.n}: ${x.sets}${prev?`   (previste ${prev} rip)`:""}`);
    });
    // rilievi calcolati dall'app, cosi' non vanno dedotti
    (s.ex||[]).forEach(x=>{
      const cur=(S.days||[]).flatMap(dd=>dd.ex||[]).find(e=>e.n===x.n);
      if(!cur)return;
      let v=null; try{v=loadVerdict(s.d,cur)}catch(e){}
      if(v&&v.t!=="sali")L.push(`  ⚠ ${x.n}: ${v.txt}`);
    });
    if(s.closing)L.push(`  Chiusura: ${s.closing.replace(/\n+/g," ")}`);
    L.push("");
  });
  L.push("_Formato serie: peso×ripetizioni. Se presente @N indica le ripetizioni di riserva (RIR): quante ne restavano prima del cedimento._");
  return L.join("\n");
}

/* prompt da personal trainer + richiesta di patch */
/* mode: "patch" solo modifiche | "breve" sintetica motivata | "full" approfondita */
function buildPromptMd(kind,mode){
  mode=mode||store.get("ai_mode")||"breve";
  const names=LIB.map(a=>a[0]);
  const P=[];
  P.push("Agisci come il mio personal trainer, esperto di ipertrofia, forza e ricomposizione corporea.");
  P.push("");
  if(mode==="patch"){
    P.push("RISPOSTA MOLTO BREVE. Non scrivere analisi discorsive, non fare premesse, non elencare cosa hai osservato.");
    P.push("");
    P.push("Analizza i dati e rispondi SOLO con:");
    P.push("");
    P.push("1. Una riga per ogni modifica proposta, nel formato: `Esercizio — cosa cambia — motivo in massimo 8 parole`.");
    P.push("2. Il blocco PATCH SCHEDA descritto sotto.");
    P.push("");
    P.push("Niente altro. Se non serve cambiare nulla, scrivi una sola riga: `Nessuna modifica necessaria` seguita dal motivo in una frase.");
    P.push("");
  } else if(mode==="full"){
    P.push("Analizza i dati che seguono e dammi una valutazione tecnica approfondita, senza premesse di sicurezza e senza giri di parole. Spiega il ragionamento dietro ogni conclusione, non limitarti al verdetto. In particolare:");
    P.push("");
    P.push("1. Progressione dei carichi, esercizio per esercizio e nel complesso, con i numeri a supporto.");
    P.push("2. Stalli, cali o fatica accumulata, e a cosa li attribuisci: volume, intensità, recuperi, deficit calorico.");
    P.push("3. Volume per gruppo muscolare: se è equilibrato, se qualche distretto è scoperto o sovraccaricato, e quante serie settimanali servirebbero.");
    P.push("4. NOTE e TAG delle sedute: spesso spiegano i numeri meglio dei numeri stessi. Citali esplicitamente.");
    P.push("5. Peso corporeo insieme alla forza: ricomposizione, crescita o perdita, con il ragionamento.");
    P.push("6. Cosa cambieresti nella scheda e perché, spiegando il meccanismo fisiologico dietro ogni scelta.");
    P.push("7. Segnala esplicitamente cosa NON è valutabile con i dati che hai, e quali dati ti servirebbero.");
    P.push("");
  } else {
    P.push("Analizza i dati che seguono. Risposta ASCIUTTA: massimo 250 parole prima del blocco finale. Niente premesse, niente riassunti di cosa ti ho mandato, niente elenchi di cortesia.");
    P.push("");
    P.push("Per ogni punto scrivi il verdetto e UNA riga di motivazione:");
    P.push("");
    P.push("1. Progressione dei carichi: sale, stabile o cala.");
    P.push("2. Stalli o fatica accumulata: presenti o no, e a cosa li attribuisci.");
    P.push("3. Volume per gruppo muscolare: quale distretto è scoperto, se ce n'è uno.");
    P.push("4. Peso corporeo e forza insieme: ricomposizione, crescita o perdita.");
    P.push("5. Cosa cambiare, e perché in una frase.");
    P.push("");
    P.push("Tieni conto delle NOTE delle sedute: spesso spiegano i numeri meglio dei numeri stessi.");
    P.push("");
  }
  P.push("## Regole per le eventuali modifiche");
  P.push("");
  P.push("Proponi modifiche SOLO se i dati o le note le giustificano. Se non serve cambiare nulla, dillo esplicitamente: non inventare aggiustamenti per riempire la risposta.");
  P.push("");
  P.push("Se invece servono modifiche, chiudi la risposta con un blocco di testo che io possa incollare nella mia app per aggiornare la scheda. Il blocco deve rispettare ESATTAMENTE questo formato:");
  P.push("");
  P.push("```");
  P.push("PATCH SCHEDA");
  P.push("GIORNO A");
  P.push("Panca piana bilanciere: carico 62.5");
  P.push("Seated row: serie 4");
  P.push("Curl martello: ripetizioni 8-10");
  P.push("+ Croci ai cavi: 3x12");
  P.push("- Calf raise");
  P.push("GIORNO B");
  P.push("RDL bilanciere: carico 80");
  P.push("```");
  P.push("");
  P.push("Regole del formato:");
  P.push("- `NomeEsercizio: carico N` cambia il peso di riferimento in kg.");
  P.push("- `NomeEsercizio: serie N` cambia il numero di serie.");
  P.push("- `NomeEsercizio: ripetizioni X` cambia il range (es. 8, 6-8, 12).");
  P.push("- `NomeEsercizio: pausa N` cambia il recupero in secondi.");
  P.push("- `NomeEsercizio: nota TESTO` scrive una nota sull'esercizio.");
  P.push("- `+ NomeEsercizio: SERIExRIPETIZIONI` aggiunge un esercizio al giorno.");
  P.push("- `- NomeEsercizio` rimuove un esercizio dal giorno.");
  P.push("- Una riga per modifica. Nessun commento dentro il blocco.");
  P.push("");
  P.push("### Nomi degli esercizi");
  P.push("");
  P.push("Usa preferibilmente i nomi già presenti nella mia libreria (elenco in fondo). Se serve un esercizio che non c'è, puoi aggiungerlo dichiarandone le caratteristiche su una riga sola con questo formato:");
  P.push("");
  P.push("```");
  P.push("+ NUOVO Croci su panca piana | movimento: hpress | gruppo: Petto | incremento: 2 | coefficiente: 0.35 su bench");
  P.push("```");
  P.push("");
  P.push("dove `movimento` è uno tra: squat, hinge, hpress (spinta orizzontale), vpress (spinta verticale), hpull (tirata orizzontale), vpull (tirata verticale), curl, tri, lat (alzate laterali), calf, core, lunge, legpress, face; `gruppo` è uno tra Gambe, Petto, Schiena, Spalle, Braccia, Core; `incremento` è il salto minimo di carico in kg; `coefficiente` è il rapporto stimato rispetto a uno dei miei riferimenti (squat, bench, row, ohp, hinge) — per esempio 0.35 su bench significa che ci si lavora con circa il 35% del carico della panca. Se non sai stimarlo, scrivi `coefficiente: 0`.");
  P.push("");
  P.push("### Riferimenti di forza");
  P.push("");
  P.push("I miei riferimenti globali (squat, bench, row, ohp, hinge) sono calcolati automaticamente dallo storico. Non modificarli di default. Se ritieni che uno sia palesemente sbagliato, proponilo a parte con questo formato e una motivazione:");
  P.push("");
  P.push("```");
  P.push("REVISIONE RIFERIMENTI");
  P.push("bench: 63 — motivo: le ultime tre sedute chiudono 8 ripetizioni a RIR 2");
  P.push("```");
  P.push("");
  P.push("---");
  P.push("");
  P.push(buildDataMd(kind));
  P.push("");
  P.push("---");
  P.push("");
  P.push("### Esercizi disponibili nella mia libreria");
  P.push("");
  P.push(names.join(" · "));
  return P.join("\n");
}

function dlText(txt,filename){
  try{
    const b=new Blob([txt],{type:"text/markdown;charset=utf-8"});
    const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=filename;a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),2000);
    return true;
  }catch(e){return false}
}
function copyText(txt){
  return new Promise(res=>{
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt).then(()=>res(true)).catch(()=>res(false));
    } else {
      try{
        const ta=document.createElement("textarea");ta.value=txt;ta.style.position="fixed";ta.style.opacity="0";
        document.body.appendChild(ta);ta.focus();ta.select();
        const ok=document.execCommand("copy");document.body.removeChild(ta);res(ok);
      }catch(e){res(false)}
    }
  });
}

/* pannello di esportazione */
function exportAsk(afterSession){
  const sheet=document.getElementById("sheet");
  let kind=store.get("exp_period")||"last";
  const periods=[["last","dall'ultima esportazione"],["30","ultimi 30 giorni"],["90","ultimi 90 giorni"],["all","tutto lo storico"]];
  const draw=()=>{
    const n=sessionsIn(kind).length;
    sheet.innerHTML=`
      <h3>Esporta le sedute</h3>
      <div class="sub">${afterSession?"Seduta salvata. ":""}Da incollare in un'AI per l'analisi, oppure da tenere per te.</div>
      <div class="lbl2">Periodo</div>
      <div class="chips" id="eper">${periods.map(([k,l])=>`<button class="chip${kind===k?" on":""}" data-k="${k}">${l}</button>`).join("")}</div>
      <div class="sub" style="margin:8px 0 4px">${n} sedut${n===1?"a":"e"} nel periodo selezionato.</div>
      ${gemKey()?`<button class="genbtn" id="e_ai" style="margin-bottom:12px">⚡ Analizza subito con l'AI</button>`:
        `<button class="alt" id="e_setup" style="width:100%;flex-direction:column;align-items:flex-start;gap:5px;margin-bottom:12px;border-color:var(--acc)">
          <span class="an">Attiva l'analisi automatica</span>
          <small style="color:var(--soft);font-family:inherit">Con una chiave Google gratuita l'app analizza le sedute da sola, senza copiare e incollare.</small></button>`}
      <button class="alt" id="e_prompt" style="width:100%;flex-direction:column;align-items:flex-start;gap:5px">
        <span class="an">Copia con prompt da personal trainer</span>
        <small style="color:var(--soft);font-family:inherit">Include le istruzioni per analizzare i dati e restituirti le modifiche da reimportare nella scheda.</small></button>
      <button class="alt" id="e_raw" style="width:100%;flex-direction:column;align-items:flex-start;gap:5px;margin-top:8px">
        <span class="an">Copia solo i dati</span>
        <small style="color:var(--soft);font-family:inherit">Sedute, note, carichi, misure e trend, senza istruzioni.</small></button>
      <div class="lbl2">Oppure scarica come file</div>
      <div class="chips">
        <button class="chip" id="e_dl_prompt">File con prompt</button>
        <button class="chip" id="e_dl_raw">File solo dati</button>
      </div>
      <button class="closebtn" id="e_close" style="margin-top:12px">${afterSession?"Non ora":"Chiudi"}</button>`;
    sheet.querySelectorAll("#eper .chip").forEach(b=>b.onclick=()=>{kind=b.dataset.k;store.set("exp_period",kind);draw()});
    const stamp=()=>store.set("last_export",String(Date.now()));
    const dstr=new Date().toISOString().slice(0,10);
    sheet.querySelector("#e_prompt").onclick=async()=>{
      const ok=await copyText(buildPromptMd(kind));stamp();closeModal();
      toast(ok?"Copiato: incollalo nell'AI":"Copia non riuscita, usa il file");
    };
    sheet.querySelector("#e_raw").onclick=async()=>{
      const ok=await copyText(buildDataMd(kind));stamp();closeModal();
      toast(ok?"Dati copiati":"Copia non riuscita, usa il file");
    };
    sheet.querySelector("#e_dl_prompt").onclick=()=>{dlText(buildPromptMd(kind),`allenamenti-prompt-${dstr}.md`);stamp();closeModal();toast("File scaricato")};
    sheet.querySelector("#e_dl_raw").onclick=()=>{dlText(buildDataMd(kind),`allenamenti-${dstr}.md`);stamp();closeModal();toast("File scaricato")};
    sheet.querySelector("#e_close").onclick=closeModal;
    const eai=sheet.querySelector("#e_ai");
    if(eai)eai.onclick=()=>{store.set("exp_period",kind);aiAnalysisAsk()};
    const est=sheet.querySelector("#e_setup");
    if(est)est.onclick=()=>gemSetupAsk();
  };
  draw();
  document.getElementById("modal").classList.add("on");
}

/* ---------------- IMPORT PATCH ---------------- */
const IC_LIST=["squat","hinge","hpress","vpress","hpull","vpull","curl","tri","lat","calf","core","lunge","legpress","face"];
const GRP_LIST=["Gambe","Petto","Schiena","Spalle","Braccia","Core"];

function normName(s){return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function findExercise(name){
  const n=normName(name);
  if(!n)return null;
  // esatto
  for(const k in LIBN){if(normName(k)===n)return LIBN[k]}
  // contiene / contenuto
  let best=null,bestScore=0;
  for(const k in LIBN){
    const kn=normName(k);
    let sc=0;
    if(kn.includes(n)||n.includes(kn)){
      const ratio=Math.min(kn.length,n.length)/Math.max(kn.length,n.length);
      // se il testo più corto ha almeno 2 parole ed è contenuto nell'altro, è un match affidabile
      const shortWords=Math.min(n.split(" ").length,kn.split(" ").length);
      sc=shortWords>=2?Math.max(.75,ratio):ratio;
    }
    else{
      const a=new Set(n.split(" ")),b=new Set(kn.split(" "));
      let inter=0;a.forEach(w=>{if(b.has(w))inter++});
      sc=inter/Math.max(a.size,b.size);
    }
    if(sc>bestScore){bestScore=sc;best=LIBN[k]}
  }
  return bestScore>=0.6?best:null;
}

function parsePatch(txt){
  const res={ops:[],refs:[],newEx:[],errors:[]};
  const lines=String(txt).split(/\r?\n/).map(l=>l.trim()).filter(l=>l&&!l.startsWith("```"));
  let day=null,mode="ops";
  lines.forEach(raw=>{
    const line=raw.replace(/^[-*]\s+(?=[A-Za-zÀ-ÿ].*:)/,""); // evita di confondere "- nome:" con rimozione
    if(/^patch\s+scheda/i.test(line)){mode="ops";return}
    if(/^revisione\s+riferimenti/i.test(line)){mode="refs";return}
    const dm=line.match(/^giorno\s+([A-Za-z])\b/i);
    if(dm){day=dm[1].toUpperCase();return}
    if(mode==="refs"){
      const m=line.match(/^(squat|bench|row|ohp|hinge)\s*:\s*([\d.,]+)\s*(?:—|-|–)?\s*(?:motivo\s*:)?\s*(.*)$/i);
      if(m)res.refs.push({ref:m[1].toLowerCase(),val:parseFloat(m[2].replace(",",".")),why:(m[3]||"").trim()});
      else res.errors.push("Riga riferimenti non compresa: "+line);
      return;
    }
    // nuovo esercizio con caratteristiche
    const nm=line.match(/^\+\s*NUOVO\s+(.+)$/i);
    if(nm){
      const parts=nm[1].split("|").map(x=>x.trim());
      const name=parts[0];
      const get=(k)=>{const p=parts.find(x=>new RegExp("^"+k+"\\s*:","i").test(x));return p?p.split(":").slice(1).join(":").trim():""};
      const ic=(get("movimento")||"").toLowerCase();
      const grp=get("gruppo");
      const inc=parseFloat((get("incremento")||"2.5").replace(",","."))||2.5;
      const coefRaw=get("coefficiente")||"0";
      const cm=coefRaw.match(/([\d.,]+)\s*(?:su\s*(squat|bench|row|ohp|hinge))?/i);
      const k=cm?parseFloat(cm[1].replace(",","."))||0:0;
      const ref=cm&&cm[2]?cm[2].toLowerCase():"bench";
      if(!name){res.errors.push("Nuovo esercizio senza nome: "+line);return}
      res.newEx.push({n:name,ic:IC_LIST.includes(ic)?ic:"curl",grp:GRP_LIST.includes(grp)?grp:"Braccia",st:inc,k:k>0?k:0,ref,day});
      return;
    }
    // aggiunta esercizio
    const am=line.match(/^\+\s*(.+?)\s*:\s*(\d+)\s*[x×]\s*([\d\-+ ]+)$/i);
    if(am){res.ops.push({type:"add",day,name:am[1].trim(),sets:parseInt(am[2]),reps:am[3].trim()});return}
    const am2=line.match(/^\+\s*(.+)$/);
    if(am2&&!line.includes(":")){res.ops.push({type:"add",day,name:am2[1].trim(),sets:3,reps:"10"});return}
    // rimozione
    const rm=line.match(/^[-−]\s*(.+)$/);
    if(rm&&!line.includes(":")){res.ops.push({type:"del",day,name:rm[1].trim()});return}
    // modifica proprietà
    const pm=line.match(/^(.+?)\s*:\s*(carico|peso|serie|ripetizioni|reps|pausa|recupero|nota)\s+(.+)$/i);
    if(pm){
      const name=pm[1].trim(), prop=pm[2].toLowerCase(), val=pm[3].trim();
      let type=null,value=val;
      if(/carico|peso/.test(prop)){type="w";value=parseFloat(val.replace(",","."))}
      else if(/serie/.test(prop)){type="sets";value=parseInt(val)}
      else if(/ripetizioni|reps/.test(prop)){type="r";value=val}
      else if(/pausa|recupero/.test(prop)){type="rest";value=parseInt(val)}
      else if(/nota/.test(prop)){type="note";value=val}
      if(type&&!(typeof value==="number"&&isNaN(value)))res.ops.push({type:"set",day,name,prop:type,value});
      else res.errors.push("Valore non valido: "+line);
      return;
    }
    res.errors.push("Riga non riconosciuta: "+line);
  });
  return res;
}

function resolvePatch(pt){
  const plan=[];
  pt.newEx.forEach(nx=>{
    plan.push({ok:true,kind:"new",label:`Nuovo esercizio in libreria: ${nx.n}`,
      detail:`${nx.grp} · ${nx.ic}${nx.k>0?` · stima ${nx.k}× ${nx.ref}`:" · senza stima carico"}`,data:nx});
  });
  pt.ops.forEach(op=>{
    const d=S.days.find(x=>x.id===op.day)||S.days[0];
    if(!d){plan.push({ok:false,label:"Giorno non trovato",detail:op.day||"?"});return}
    if(op.type==="add"){
      const li=findExercise(op.name)||LIBN[op.name];
      const isNew=pt.newEx.find(n=>normName(n.n)===normName(op.name));
      if(!li&&!isNew){plan.push({ok:false,label:`Aggiungere "${op.name}" al giorno ${d.id}`,detail:"esercizio non riconosciuto"});return}
      plan.push({ok:true,kind:"add",label:`Aggiungi ${li?li.n:op.name} al giorno ${d.id}`,
        detail:`${op.sets}×${op.reps}`,data:{day:d.id,li,name:op.name,sets:op.sets,reps:op.reps}});
      return;
    }
    const ex=d.ex.find(e=>normName(e.n)===normName(op.name))||
             d.ex.find(e=>normName(e.n).includes(normName(op.name))||normName(op.name).includes(normName(e.n)));
    if(!ex){plan.push({ok:false,label:`${op.name} (giorno ${d.id})`,detail:"non presente in quel giorno"});return}
    if(op.type==="del"){plan.push({ok:true,kind:"del",label:`Rimuovi ${ex.n} dal giorno ${d.id}`,detail:"",data:{day:d.id,ex}});return}
    const labels={w:"carico",sets:"serie",r:"ripetizioni",rest:"pausa",note:"nota"};
    const cur=op.prop==="sets"?ex.sets.length:ex[op.prop];
    plan.push({ok:true,kind:"set",label:`${ex.n} (giorno ${d.id}) · ${labels[op.prop]}`,
      detail:`${cur!==undefined&&cur!==""?cur:"—"} → ${op.value}`,data:{ex,prop:op.prop,value:op.value}});
  });
  return plan;
}

function applyPatchPlan(plan,refOps){
  let n=0;
  plan.forEach(p=>{
    if(!p.ok||p.skip)return;
    if(p.kind==="new"){
      const nx=p.data;
      if(!LIBN[nx.n]){
        LIB.push([nx.n,nx.ic,nx.ref,nx.k,nx.st,nx.grp]);
        LIBN[nx.n]={n:nx.n,ic:nx.ic,ref:nx.ref,k:nx.k,st:nx.st,grp:nx.grp,band:false};
        S.customLib=S.customLib||[];
        S.customLib.push([nx.n,nx.ic,nx.ref,nx.k,nx.st,nx.grp]);
      }
      if(nx.day){
        const d=S.days.find(x=>x.id===nx.day);
        if(d&&!d.ex.find(e=>e.n===nx.n)){
          const est=nx.k>0?round(currentRefs()[nx.ref]*nx.k,nx.st):0;
          d.ex.push({n:nx.n,ic:nx.ic,img:"",w:est,inc:nx.st,rest:90,r:"10",sets:mk(est,3),note:"",tag:est?"NUOVO":"da tarare"});
        }
      }
      n++;return;
    }
    if(p.kind==="add"){
      const d=S.days.find(x=>x.id===p.data.day);if(!d)return;
      const li=p.data.li||LIBN[p.data.name];
      const nm=li?li.n:p.data.name;
      if(d.ex.find(e=>normName(e.n)===normName(nm)))return;
      const est=li&&li.k>0?round(currentRefs()[li.ref]*li.k,li.st||2.5):0;
      d.ex.push({n:nm,ic:li?li.ic:"curl",img:"",w:est,inc:li?(li.st||2.5):2.5,rest:90,
        r:p.data.reps,sets:mk(est,p.data.sets||3),note:"",tag:est?"NUOVO":"da tarare"});
      n++;return;
    }
    if(p.kind==="del"){
      const d=S.days.find(x=>x.id===p.data.day);if(!d)return;
      const i=d.ex.indexOf(p.data.ex); if(i>=0){d.ex.splice(i,1);n++}
      return;
    }
    if(p.kind==="set"){
      const {ex,prop,value}=p.data;
      if(prop==="sets"){
        const target=Math.max(1,parseInt(value)||ex.sets.length);
        while(ex.sets.length>target)ex.sets.pop();
        while(ex.sets.length<target)ex.sets.push({w:ex.w,r:"",done:false});
      } else if(prop==="w"){
        ex.w=value; ex.man=1; ex.sets.forEach(s=>{s.w=value;s.done=false});
      } else if(prop==="rest"){ ex.rest=value }
      else if(prop==="r"){ ex.r=String(value) }
      else if(prop==="note"){ ex.note=String(value) }
      n++;return;
    }
  });
  (refOps||[]).forEach(r=>{
    if(r.skip)return;
    S.profile=S.profile||{}; S.profile.refs=S.profile.refs||{...FALLBACK_REFS};
    S.profile.refs[r.ref]=r.val; n++;
  });
  save();
  return n;
}

function importPatchAsk(){
  const sheet=document.getElementById("sheet");
  sheet.innerHTML=`
    <h3>Aggiorna la scheda</h3>
    <div class="sub">Incolla il blocco di modifiche che ti ha dato l'AI. Vedrai un'anteprima prima di applicare: nulla viene cambiato senza la tua conferma.</div>
    <textarea id="patchin" class="urlin" rows="8" placeholder="PATCH SCHEDA&#10;GIORNO A&#10;Panca piana bilanciere: carico 62.5&#10;..." style="resize:vertical;min-height:150px;font-family:'IBM Plex Mono',monospace;font-size:16px"></textarea>
    <button class="genbtn" id="pgo" style="margin-top:12px">Analizza le modifiche</button>
    <button class="closebtn" id="pclose" style="margin-top:8px">Annulla</button>`;
  sheet.querySelector("#pclose").onclick=closeModal;
  sheet.querySelector("#pgo").onclick=()=>{
    const txt=sheet.querySelector("#patchin").value;
    if(!txt.trim()){toast("Incolla prima il testo");return}
    const pt=parsePatch(txt);
    const plan=resolvePatch(pt);
    if(!plan.length&&!pt.refs.length){toast("Nessuna modifica riconosciuta");return}
    previewPatch(plan,pt);
  };
  document.getElementById("modal").classList.add("on");
}

function previewPatch(plan,pt){
  const sheet=document.getElementById("sheet");
  const okItems=plan.filter(p=>p.ok), badItems=plan.filter(p=>!p.ok);
  const row=(p,i)=>`<label class="alt" style="width:100%;cursor:pointer;align-items:flex-start">
      <span class="an">${esc(p.label)}<small>${esc(p.detail||"")}</small></span>
      <span class="aw"><input type="checkbox" class="pchk" data-i="${i}" checked style="width:20px;height:20px"></span></label>`;
  sheet.innerHTML=`
    <h3>Anteprima modifiche</h3>
    <div class="sub">Deseleziona quelle che non vuoi. Storico, misure e profilo non vengono toccati.</div>
    ${okItems.length?`<div class="lbl2">Modifiche alla scheda (${okItems.length})</div>${okItems.map((p,i)=>row(p,plan.indexOf(p))).join("")}`:`<div class="empty">Nessuna modifica applicabile.</div>`}
    ${pt.refs.length?`<div class="lbl2">Revisione dei riferimenti di forza — valutala a parte</div>
      ${pt.refs.map((r,i)=>`<label class="alt" style="width:100%;cursor:pointer;align-items:flex-start;border-color:#FFD166">
        <span class="an">Riferimento ${esc(r.ref)}: ${fmt(currentRefs()[r.ref])} → ${fmt(r.val)} kg<small>${esc(r.why||"nessuna motivazione fornita")}</small></span>
        <span class="aw"><input type="checkbox" class="rchk" data-i="${i}" style="width:20px;height:20px"></span></label>`).join("")}`:""}
    ${badItems.length?`<div class="lbl2">Righe non applicate (${badItems.length})</div>
      <div class="cues" style="padding:11px 13px;font-size:12px">${badItems.map(p=>`<div style="color:#F87171">${esc(p.label)} — ${esc(p.detail)}</div>`).join("")}</div>`:""}
    ${pt.errors.length?`<div class="lbl2">Righe non comprese</div>
      <div class="cues" style="padding:11px 13px;font-size:12px;color:var(--soft)">${pt.errors.map(e=>`<div>${esc(e)}</div>`).join("")}</div>`:""}
    <button class="genbtn" id="papply" style="margin-top:14px">Applica le modifiche selezionate</button>
    <button class="closebtn" id="pcancel" style="margin-top:8px">Annulla</button>`;
  sheet.querySelector("#pcancel").onclick=closeModal;
  sheet.querySelector("#papply").onclick=()=>{
    sheet.querySelectorAll(".pchk").forEach(chk=>{if(!chk.checked)plan[+chk.dataset.i].skip=true});
    const refOps=pt.refs.map((r,i)=>({...r,skip:!(sheet.querySelector(`.rchk[data-i="${i}"]`)||{}).checked}));
    const n=applyPatchPlan(plan,refOps);
    closeModal();render();
    toast(n?`${n} modific${n>1?"he":"a"} applicat${n>1?"e":"a"}`:"Nessuna modifica applicata");
  };
  document.getElementById("modal").classList.add("on");
}

/* ---------------- IMPORT NUOVA SCHEDA (mantiene lo storico) ---------------- */
/* Compressione immagine per Gemini */
async function compressImageForGemini(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=ev=>{
      const img=new Image();
      img.onload=()=>{
        const canvas=document.createElement("canvas");
        let w=img.width,h=img.height;
        const maxSide=1200;
        if(w>maxSide||h>maxSide){
          const ratio=Math.min(maxSide/w,maxSide/h);
          w*=ratio;h*=ratio;
        }
        canvas.width=w;canvas.height=h;
        const ctx=canvas.getContext("2d");
        ctx.drawImage(img,0,0,w,h);
        canvas.toBlob(blob=>{
          const r2=new FileReader();
          r2.onload=()=>resolve(r2.result.split(",")[1]);
          r2.onerror=()=>reject(new Error("Compression failed"));
          r2.readAsDataURL(blob);
        },"image/jpeg",0.75);
      };
      img.onerror=()=>reject(new Error("Invalid image"));
      img.src=ev.target.result;
    };
    reader.onerror=()=>reject(new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

/* Invia foto a Gemini per l'analisi della scheda */
async function analyzeWorkoutPhotoWithGemini(base64Image){
  if(!gemKey()){toast("Serve la chiave Google Gemini");return null}
  const prompt=`Analizza questa foto di una scheda di allenamento e restituisci SOLO un oggetto JSON con questa struttura esatta:
{
  "days": [
    {
      "id": "A",
      "focus": "Descrizione del giorno (es: Squat / Spinta)",
      "ex": [
        {
          "n": "Nome esercizio",
          "ic": "tipo",
          "w": numero,
          "r": "reps es 8 o 8-10",
          "sets": numero,
          "inc": 2.5,
          "rest": 90
        }
      ]
    }
  ]
}

Regole:
- Estrai tutti i giorni della scheda
- Per ogni giorno, estrai tutti gli esercizi
- Il carico "w" deve essere il numero riferimento dell'esercizio
- "r" è il range di ripetizioni (es "8-10" oppure "8")
- "sets" è il numero di serie
- "ic" può essere: squat, hinge, hpress, vpress, hpull, vpull, curl, tri, lat, calf, core, lunge, legpress, face
- Se non riesci a determinare un valore, usa un valore di default ragionevole

Restituisci SOLO il JSON, nulla altro.`;
  
  try{
    const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",{
      method:"POST",
      headers:{"Content-Type":"application/json","x-goog-api-key":gemKey()},
      body:JSON.stringify({
        contents:[{
          parts:[
            {text:prompt},
            {inlineData:{mimeType:"image/jpeg",data:base64Image}}
          ]
        }]
      })
    });
    const data=await response.json();
    if(!data.candidates||!data.candidates[0]){toast("Errore Gemini: risposta vuota");return null}
    const text=(data.candidates[0].content.parts[0].text||"").trim();
    const json=JSON.parse(text.replace(/```json|```/g,"").trim());
    return json.days||null;
  }catch(e){
    toast("Errore nell'analisi: "+e.message);
    return null;
  }
}

function importSchedaFromPhotoAsk(){
  const sheet=document.getElementById("sheet");
  sheet.innerHTML=`
    <h3>Importa scheda da foto</h3>
    <div class="sub">Scatta una foto della tua scheda stampata o importane una dai file.</div>
    <div style="margin-top:14px;display:flex;gap:8px">
      <button id="btn_camera" style="flex:1;background:var(--acc);color:#000;border:0;padding:12px;border-radius:var(--r);font-weight:700;cursor:pointer">📷 Scatta foto</button>
      <button id="btn_file" style="flex:1;background:var(--acc);color:#000;border:0;padding:12px;border-radius:var(--r);font-weight:700;cursor:pointer">📁 Libreria foto/file</button>
    </div>
    <button class="closebtn" id="mclose" style="margin-top:14px">Annulla</button>`;
  
  sheet.querySelector("#mclose").onclick=closeModal;
  
  sheet.querySelector("#btn_file").onclick=()=>{
    const i=document.createElement("input");
    i.type="file";
    i.accept="image/*,.json,.md,.txt";
    i.onchange=async()=>{
      const f=i.files[0];if(!f)return;
      if(f.type.startsWith("image/")){
        toast("Analizzando foto...");
        try{
          const base64=await compressImageForGemini(f);
          const days=await analyzeWorkoutPhotoWithGemini(base64);
          if(!days||days.length===0){toast("Non sono riuscito a interpretare la scheda");return}
          previewAndImportDays(days);
        }catch(e){toast("Errore: "+e.message)}
      }else{
        const r=new FileReader();
        r.onload=async()=>{
          let days=null;
          try{
            const o=JSON.parse(r.result);
            if(o&&Array.isArray(o.days))days=o.days;
            else if(o&&o.users&&o.users[0]&&o.users[0].state&&Array.isArray(o.users[0].state.days))days=o.users[0].state.days;
          }catch(e){}
          if(!days){toast("File non valido");return}
          previewAndImportDays(days);
        };
        r.readAsText(f);
      }
    };
    i.click();
  };
  
  sheet.querySelector("#btn_camera").onclick=()=>{
    const i=document.createElement("input");
    i.type="file";
    i.accept="image/*";
    i.capture="environment";
    i.onchange=async()=>{
      const f=i.files[0];if(!f)return;
      toast("Analizzando foto...");
      try{
        const base64=await compressImageForGemini(f);
        const days=await analyzeWorkoutPhotoWithGemini(base64);
        if(!days||days.length===0){toast("Non sono riuscito a interpretare la scheda");return}
        previewAndImportDays(days);
      }catch(e){toast("Errore: "+e.message)}
    };
    i.click();
  };
  
  document.getElementById("modal").classList.add("on");
}

function previewAndImportDays(rawDays){
  const chk=validateDays(rawDays);
  if(!chk.ok){toast("Scheda non valida: "+chk.err);return}
  const days=chk.days;
  const sheet=document.getElementById("sheet");
  sheet.innerHTML=`
    <h3>Anteprima scheda</h3>
    <div class="sub">Controlla che sia corretta prima di importare.</div>
    <div style="max-height:60vh;overflow-y:auto;margin:12px 0">${days.map((d,i)=>`
      <div style="background:var(--card2);border:1px solid var(--line);border-radius:var(--r);padding:12px;margin-bottom:8px">
        <div style="font-weight:700;color:var(--acc)">Giorno ${d.id}</div>
        <div style="color:var(--soft);font-size:13px;margin:4px 0 8px">${d.focus||"Nessuna descrizione"}</div>
        <div style="font-size:13px;color:var(--text)">${(d.ex||[]).length} esercizi</div>
      </div>
    `).join("")}</div>
    <button id="btn_import" style="width:100%;background:var(--ok);color:#000;border:0;padding:12px;border-radius:var(--r);font-weight:700;cursor:pointer;margin-bottom:8px">✓ Importa</button>
    <button class="closebtn" id="mclose">Annulla</button>`;
  
  sheet.querySelector("#mclose").onclick=closeModal;
  sheet.querySelector("#btn_import").onclick=async()=>{
    if(!await ask(`Sostituisco le schede con quelle da foto?<br><small style="color:var(--soft)">${days.length} giorni.</small>`,"Sostituisci"))return;
    const keep=normState(JSON.parse(JSON.stringify(S)));
    keep.days=days;   // gia' validati e normalizzati da validateDays()
    S=normState(keep);
    save();render();closeModal();toast("Scheda importata da foto");
  };
}

function importSchedaAsk(){
  const i=document.createElement("input");i.type="file";i.accept=".json,.md,.txt";
  i.onchange=()=>{
    const f=i.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=async()=>{
      let days=null;
      try{
        const o=JSON.parse(r.result);
        if(o&&Array.isArray(o.days))days=o.days;
        else if(o&&o.users&&o.users[0]&&o.users[0].state&&Array.isArray(o.users[0].state.days))days=o.users[0].state.days;
      }catch(e){}
      if(!days){toast("File non valido: serve un backup o una scheda in JSON");return}
      if(!await ask(`Sostituisco le schede con quelle del file?<br><small style="color:var(--soft)">${days.length} giorni. <b>Storico, misure, profilo e schede salvate restano intatti.</b></small>`,"Sostituisci"))return;
      const keep=normState(JSON.parse(JSON.stringify(S)));
      const chk=validateDays(days);
      if(!chk.ok){toast("File non valido: "+chk.err);return}
      keep.days=chk.days;
      S=normState(keep);
      save();render();toast("Schede sostituite · storico mantenuto");
    };
    r.readAsText(f);
  };
  i.click();
}


function wireTools(){
  const e1=document.getElementById("exp");
  if(e1)e1.onclick=()=>{
    /* La chiave Google viene tolta dalla copia esportata: il file gira via mail,
       cloud e chat, e chi lo apre potrebbe altrimenti consumare la tua quota. */
    const dump=JSON.parse(JSON.stringify(MU));
    (dump.users||[]).forEach(u=>{if(u&&u.state&&u.state.ai)delete u.state.ai.key});
    const b=new Blob([JSON.stringify(dump,null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(b);
    a.download=`scheda-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();
    store.set("last_backup",String(Date.now()));toast("Backup completo scaricato");
  };
  const e2=document.getElementById("imp");
  if(e2)e2.onclick=()=>{
    const i=document.createElement("input");i.type="file";i.accept=".json";
    i.onchange=()=>{const f=i.files[0];if(!f)return;const r=new FileReader();
      r.onload=()=>{try{const o=JSON.parse(r.result);
        if(o&&o.users&&o.users.length){ // backup multi-utente completo
          o.users.forEach(u=>u.state=normState(u.state));MU=o;save();S=normState(activeUser().state);render();toast("Backup completo caricato");return;
        }
        if(o&&o.days){ // backup singolo profilo: carica nel profilo attivo
          S=normState(o);save();render();toast("Scheda caricata nel profilo attivo");return;
        }
        throw 0;
      }catch(x){toast("File non valido")}};
      r.readAsText(f)};
    i.click();
  };
  const e3=document.getElementById("rst");
  if(e3)e3.onclick=async()=>{if(await ask("Riporto la scheda ai valori di partenza? Storico, misure e profilo restano.","Ripristina"))
    {const l=S.log,bd=S.body,cf=S.cfg,pf=S.profile;S=structuredClone(D);S.log=l;S.body=bd;S.cfg=cf;S.profile=pf;save();render();toast("Scheda ripristinata")}};
}

/* ---------------- timer recupero ---------------- */
let tId=null,endAt=0;
const clock=document.getElementById("clock"),bar=document.getElementById("bar");
function paint(sec){
  clock.innerHTML=`${String(Math.floor(sec/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}<small>RECUPERO</small>`;
}
function startTimer(sec){
  unlockAudio();
  clearInterval(tId);
  endAt=Date.now()+sec*1000;
  bar.classList.add("run");bar.classList.remove("fire");
  paint(sec);
  tId=setInterval(()=>{
    const left=Math.ceil((endAt-Date.now())/1000);
    if(left>0){paint(left);return}
    clearInterval(tId);
    bar.classList.add("fire");
    clock.innerHTML=`GO!<small>SERIE SUCCESSIVA</small>`;
    beep(3);buzz();notify("Recupero finito","GO — serie successiva");
    setTimeout(stopTimer,5000);
  },200);
}
function stopTimer(){clearInterval(tId);bar.classList.remove("run","fire");clock.innerHTML=`--:--<small>RECUPERO</small>`}
document.getElementById("stop").onclick=stopTimer;
document.addEventListener("visibilitychange",()=>{
  if(!document.hidden&&bar.classList.contains("run")){
    const left=Math.ceil((endAt-Date.now())/1000);
    if(left>0)paint(left);
  }
});

/* ---------------- timer totale seduta ---------------- */
let sessStart=parseInt(store.get("sess_start"))||0;
const sclock=document.getElementById("sclock");
function startSessionIfNeeded(){
  if(sessStart)return;
  sessStart=Date.now();store.set("sess_start",String(sessStart));
  toast("Timer seduta avviato");
}
function sessMinutes(){return sessStart?Math.floor((Date.now()-sessStart)/60000):0}
function updateBarInfo(){
  let d=S.days.find(x=>x.id===view);
  if(view==="RANDOM"&&S.rnd)d={ex:S.rnd.ex};
  let done=0,tot=0;
  if(d)d.ex.forEach(e=>e.sets.forEach(s=>{tot++;if(s.done)done++}));
  if(sclock){
    const m=sessMinutes(),sec=sessStart?Math.floor((Date.now()-sessStart)/1000)%60:0;
    const over=sessStart&&m>=S.cfg.target;
    sclock.innerHTML=`SEDUTA <b style="${over?"color:#F87171":""}">${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}</b><br><span id="prog">${d?`${done}/${tot} serie`:""}</span>`;
  }
}
setInterval(updateBarInfo,1000);
sclock.onclick=async()=>{
  if(!sessStart){startSessionIfNeeded();updateBarInfo();return}
  if(await ask("Azzero il timer della seduta?","Azzera")){sessStart=0;store.set("sess_start","0");updateBarInfo()}
};

/* ---------------- registra seduta ---------------- */
const sv=document.getElementById("save");
sv.onclick=async()=>{
  const d=S.days.find(x=>x.id===view);if(!d)return;
  // 1) note di seduta (salvate NELLA seduta, non nelle note permanenti dell'esercizio)
  const meta=await sessionNotesAsk(d);
  if(meta===null)return; // annullato
  let vol=0;
  const ex=d.ex.map(e=>{
    const done=e.sets.filter(s=>s.done);
    const use=done.length?done:e.sets;
    use.forEach(s=>{vol+=s.w*(parseInt(s.r)||0)});
    return {n:e.n,sets:use.map(s=>`${fmt(s.w)}×${s.r||"–"}${s.rir!=null?"@"+s.rir:""}`).join("  ")};
  });
  const min=sessStart?Math.max(1,sessMinutes()):null;
  const isDeload=S._pendingDeload===d.id;
  S.log.push({d:d.id,iso:new Date().toISOString(),
    date:new Date().toLocaleDateString("it-IT",{day:"2-digit",month:"short",year:"2-digit"}),
    ex,vol:Math.round(vol),min,deload:isDeload||undefined,
    note:meta.note||undefined,tags:meta.tags&&meta.tags.length?meta.tags:undefined});
  if(isDeload)delete S._pendingDeload;
  const entry=S.log[S.log.length-1];
  const rip=restoreTempSwaps(d);          // gli scambi "solo per oggi" tornano indietro
  const ripW=(typeof restoreBreakCut==="function")?restoreBreakCut(d):0;
  if(S._wdone&&S._wdone[d.id])delete S._wdone[d.id];
  // le note marcate "solo oggi" passano nella seduta e lasciano pulita la scheda
  const noteOggi=[];
  (d.ex||[]).forEach(e=>{if(e.noteTmp&&e.note){noteOggi.push({q:e.n,a:e.note});e.note="";delete e.noteTmp}});  // e i carichi ridotti per il rientro
  d.ex.forEach(e=>e.sets.forEach(s=>{s.done=false}));
  sessStart=0;store.set("sess_start","0");
  save();
  // 2) proponi aggiornamento dei carichi di riferimento dove hai fatto di più
  await refUpdateAsk(d);
  sv.classList.add("done");sv.textContent="Registrata ✓";
  const durTxt=min?` · ${min} min (target ${S.cfg.target})`:"";
  toast(`Giorno ${d.id} salvato · ${Math.round(vol)} kg${durTxt}`);
  if(rip)toast(`Ripristinat${rip===1?"o":"i"} ${rip} esercizio${rip===1?"":"i"} sostituit${rip===1?"o":"i"} solo per oggi`);
  render();
  setTimeout(()=>{sv.classList.remove("done");sv.textContent="Registra seduta"},1600);
  // 3) due domande sulla seduta, poi l'esportazione (entrambe saltabili)
  if(noteOggi.length){entry.qa=(entry.qa||[]).concat(noteOggi);save()}
  if(ripW)toast(`Carichi di riferimento ripristinati su ${ripW} esercizi`);
  setTimeout(async()=>{
    await postSessionAsk(entry,d.id);
    if(gemKey())await sessionClosing(entry,d.id);
    if(typeof maybeNotifPitch==="function"&&!S.notifAsked&&notifState()==="default"){
      maybeNotifPitch();return;
    }
    setTimeout(()=>exportAsk(true),400);
  },700);
};

/* --- note di seduta: campo libero + tag rapidi --- */
const SESS_TAGS=["Energia alta","Energia bassa","Dormito poco","Dolori/fastidi","Carichi facili","Carichi pesanti","Poco tempo"];
function sessionNotesAsk(d){
  return new Promise(resolve=>{
    const sheet=document.getElementById("sheet");
    const picked=new Set();
    sheet.innerHTML=`
      <h3>Com'è andata?</h3>
      <div class="sub">Giorno ${d.id} · due parole ti serviranno per capire i progressi. Puoi saltare.</div>
      <div class="lbl2">Tag rapidi</div>
      <div class="chips" id="stags">${SESS_TAGS.map(t=>`<button class="chip" data-t="${t}">${t}</button>`).join("")}</div>
      <div class="lbl2">Nota libera</div>
      <textarea id="snote" class="urlin" rows="3" placeholder="es. spalla ok, squat solido, ultimo giro tirato…" style="resize:vertical;min-height:74px"></textarea>
      <button class="genbtn" id="sok" style="margin-top:14px">Salva la seduta</button>
      <button class="skipbtn" id="sskip">Salva senza note</button>`;
    sheet.querySelectorAll("#stags .chip").forEach(b=>b.onclick=()=>{
      const t=b.dataset.t;
      if(picked.has(t)){picked.delete(t);b.classList.remove("on")}else{picked.add(t);b.classList.add("on")}
    });
    const finish=(withNotes)=>{
      const note=withNotes?(sheet.querySelector("#snote").value||"").trim():"";
      closeModal();resolve({note,tags:withNotes?[...picked]:[]});
    };
    sheet.querySelector("#sok").onclick=()=>finish(true);
    sheet.querySelector("#sskip").onclick=()=>finish(false);
    document.getElementById("modal").classList.add("on");
  });
}

/* --- proposta di aggiornamento carico di riferimento --- */
function refUpdateAsk(d){
  return new Promise(resolve=>{
    // esercizi dove il peso usato nelle serie supera il carico di riferimento
    const cand=[];
    d.ex.forEach(e=>{
      const ws=(e.sets||[]).map(s=>parseFloat(String(s.w).toString().replace(",","."))||0).filter(w=>w>0);
      if(!ws.length)return;
      const top=Math.max(...ws);
      if(top>e.w+0.01)cand.push({e,top});
    });
    if(!cand.length){resolve();return}
    const sheet=document.getElementById("sheet");
    sheet.innerHTML=`
      <h3>Aggiorno i carichi?</h3>
      <div class="sub">Hai lavorato più pesante di quanto indicato in scheda. Aggiorno il riferimento per la prossima volta?</div>
      ${cand.map((c,i)=>`<label class="alt" style="width:100%;cursor:pointer">
        <span class="an">${c.e.n}<small>da ${fmt(c.e.w)} kg → ${fmt(c.top)} kg</small></span>
        <span class="aw"><input type="checkbox" class="refchk" data-i="${i}" checked style="width:20px;height:20px"></span></label>`).join("")}
      <button class="genbtn" id="rok" style="margin-top:14px">Aggiorna selezionati</button>
      <button class="skipbtn" id="rskip">Lascia com'è</button>`;
    sheet.querySelector("#rok").onclick=()=>{
      let n=0;
      sheet.querySelectorAll(".refchk").forEach(chk=>{
        if(!chk.checked)return;
        const c=cand[+chk.dataset.i];
        c.e.w=c.top; c.e.man=1; c.e.sets.forEach(s=>{if(!s.w)s.w=c.top});
        n++;
      });
      save();closeModal();if(n)toast(n+" carico"+(n>1?"i":"")+" aggiornato"+(n>1?"i":""));resolve();
    };
    sheet.querySelector("#rskip").onclick=()=>{closeModal();resolve()};
    document.getElementById("modal").classList.add("on");
  });
}
let tt;
function toast(m){const el=document.getElementById("toast");el.textContent=m;el.classList.add("on");
  clearTimeout(tt);tt=setTimeout(()=>el.classList.remove("on"),2200)}

/* ---------------- MENU UTENTI ---------------- */
function openUsers(){
  const sheet=document.getElementById("sheet");
  sheet.innerHTML=`
    <h3>Profili</h3>
    <div class="sub">Ogni profilo ha scheda, storico e misure separati. La tua scheda attuale è qui, intatta.</div>
    <div id="ulist"></div>
    <button class="revert" id="unew">＋ Nuovo profilo</button>
    <button class="closebtn" id="mclose">Chiudi</button>`;
  const ul=sheet.querySelector("#ulist");
  MU.users.forEach(u=>{
    const act=u.id===MU.active;
    const st=u.state||{};
    const nsav=(st.saved||[]).length;
    const sub=`${(st.log||[]).length} sedute · ${(st.days||[]).length} giorni${nsav?` · ${nsav} schede salvate`:""}`;
    const row=document.createElement("button");
    row.className="alt";row.style.cssText="width:100%";
    row.innerHTML=`<span class="an">${act?"● ":""}${u.name||"Profilo"}<small>${sub}</small></span>
      <span class="aw" style="display:flex;gap:6px;align-items:center">
        ${act?'<em style="color:var(--acc)">attivo</em>':'<em>apri</em>'}
        <span class="udup" data-id="${u.id}" style="color:var(--soft);padding:0 4px" title="duplica">⧉</span>
        <span class="urename" data-id="${u.id}" style="color:var(--soft);padding:0 4px">✎</span>
        ${MU.users.length>1?`<span class="udel" data-id="${u.id}" style="color:#F87171;padding:0 4px">×</span>`:""}
      </span>`;
    row.onclick=ev=>{
      if(["udel","urename","udup"].some(c=>ev.target.classList.contains(c)))return;
      if(!act)switchUser(u.id);
      closeModal();
    };
    ul.appendChild(row);
  });
  ul.querySelectorAll(".udup").forEach(b=>b.onclick=async ev=>{
    ev.stopPropagation();
    const u=MU.users.find(x=>x.id===b.dataset.id);
    const name=await prompt2("Nome del profilo duplicato:", (u.name||"Profilo")+" (copia)");
    if(name===null)return;
    const st=normState(structuredClone(u.state));st.log=[];  // copia scheda/misure/profilo, storico pulito
    const id="u"+Date.now().toString(36);
    MU.users.push({id,name:name.trim()||"Copia",state:st});
    store.set("scheda_mu",JSON.stringify(MU));openUsers();toast("Profilo duplicato (senza storico)");
  });
  ul.querySelectorAll(".urename").forEach(b=>b.onclick=async ev=>{
    ev.stopPropagation();
    const u=MU.users.find(x=>x.id===b.dataset.id);
    const name=await prompt2("Nome del profilo:",u.name||"");
    if(name){u.name=name.trim();if(u.state.profile)u.state.profile.nome=name.trim().split(" ")[0];save();openUsers();buildNav()}
  });
  ul.querySelectorAll(".udel").forEach(b=>b.onclick=async ev=>{
    ev.stopPropagation();
    const u=MU.users.find(x=>x.id===b.dataset.id);
    if(!await ask(`Elimino il profilo <b>${u.name}</b> con tutti i suoi dati? Non è reversibile.`,"Elimina"))return;
    MU.users=MU.users.filter(x=>x.id!==u.id);
    if(MU.active===u.id){MU.active=MU.users[0].id;S=normState(activeUser().state);view="A"}
    store.set("scheda_mu",JSON.stringify(MU));render();openUsers();
  });
  sheet.querySelector("#unew").onclick=async()=>{
    const name=await prompt2("Nome del nuovo profilo:","");
    if(name===null)return;
    closeModal();
    const id=newUser(name.trim());
    // avvia onboarding per il nuovo profilo
    openOnb(false,true);
  };
  sheet.querySelector("#mclose").onclick=closeModal;
  document.getElementById("modal").classList.add("on");
}

/* prompt custom (niente prompt di sistema) */
function prompt2(msg,val=""){
  return new Promise(res=>{
    const m=document.getElementById("cmodal");
    document.getElementById("cmsg").innerHTML=`${msg}<br><input id="pin2" value="${esc(val)}" style="width:100%;margin-top:10px;border:1px solid var(--line);border-radius:8px;background:var(--card2);padding:11px;color:var(--text);font:inherit">`;
    const bok=document.getElementById("cok"),bno=document.getElementById("cno");
    bok.textContent="OK";
    m.classList.add("on");
    const inp=document.getElementById("pin2");setTimeout(()=>inp.focus(),50);
    const done=v=>{m.classList.remove("on");bok.onclick=bno.onclick=m.onclick=null;res(v)};
    bok.onclick=()=>done(inp.value);
    bno.onclick=()=>done(null);
    m.onclick=ev=>{if(ev.target===m)done(null)};
  });
}

/* ---------------- GENERATORE DI SCHEDE ----------------
   Sceglie esercizi coerenti per pattern funzionale in base a distretti,
   minuti, numero esercizi e giorni. Distribuisce i pattern sui giorni
   in modo bilanciato (full-body funzionale). */
const GEN={
  districts:[
    ["gambe","Gambe",["squat","hinge","lunge","legpress","calf"]],
    ["petto","Petto",["hpress"]],
    ["schiena","Schiena",["hpull","vpull"]],
    ["spalle","Spalle",["vpress","lat","face"]],
    ["braccia","Braccia",["curl","tri"]],
    ["core","Core",["core"]]
  ],
  // pattern funzionali prioritari: multiarticolari prima
  patternPriority:["squat","hinge","hpress","hpull","vpress","vpull","lunge","legpress","curl","tri","lat","face","calf","core"]
};
let genCfg={min:60,perDist:2,days:3,dist:{gambe:1,petto:1,schiena:1,spalle:1,braccia:1,core:1},band:false,mode:null};

function openGen(){
  genCfg.mode=null;
  const sheet=document.getElementById("sheet");
  const dsel=GEN.districts.map(d=>`<button class="chip gdist${genCfg.dist[d[0]]?" on":""}" data-d="${d[0]}">${d[1]}</button>`).join("");
  sheet.innerHTML=`
    <h3>Genera scheda</h3>
    <div class="sub">Rispondi come faresti col tuo PT. Ogni volta che generi (o tocchi "rigenera") pesco esercizi diversi, restando coerente col funzionale.</div>

    <div class="lbl2">1 · Che distretti vuoi allenare?</div>
    <div class="chips" id="gdistw">${dsel}</div>

    <div class="lbl2">2 · Quanti esercizi per ogni distretto?</div>
    <div class="chips" id="gpd">${[1,2,3,4].map(v=>`<button class="chip${genCfg.perDist===v?" on":""}" data-v="${v}">${v}</button>`).join("")}</div>

    <div class="lbl2">3 · Quanto tempo hai?</div>
    <div class="chips" id="gmin">${[20,30,45,60,90].map(v=>`<button class="chip${genCfg.min===v?" on":""}" data-v="${v}">${v} min</button>`).join("")}</div>

    <div class="lbl2">Giorni a settimana</div>
    <div class="chips" id="gdays">${[1,2,3,4,5].map(v=>`<button class="chip${genCfg.days===v?" on":""}" data-v="${v}">${v}</button>`).join("")}</div>

    <div class="lbl2">Attrezzatura</div>
    <div class="chips" id="gband">
      <button class="chip${!genCfg.band?" on":""}" data-b="0">Palestra completa</button>
      <button class="chip${genCfg.band?" on":""}" data-b="1">Solo elastici</button>
    </div>

    <button class="genbtn" id="gGo" style="margin-top:18px">Genera scheda</button>
    <div id="gPrev"></div>
    <button class="closebtn" id="mclose">Chiudi</button>`;

  const bind=(sel,key,parse=Number)=>sheet.querySelectorAll(sel+" .chip").forEach(b=>b.onclick=()=>{
    genCfg[key]=parse(b.dataset.v);
    sheet.querySelectorAll(sel+" .chip").forEach(x=>x.classList.remove("on"));b.classList.add("on");
  });
  bind("#gmin","min");bind("#gpd","perDist");bind("#gdays","days");
  sheet.querySelectorAll("#gband .chip").forEach(b=>b.onclick=()=>{
    genCfg.band=b.dataset.b==="1";
    sheet.querySelectorAll("#gband .chip").forEach(x=>x.classList.remove("on"));b.classList.add("on");
  });
  sheet.querySelectorAll("#gdistw .chip").forEach(b=>b.onclick=()=>{
    const d=b.dataset.d;genCfg.dist[d]=genCfg.dist[d]?0:1;b.classList.toggle("on");
  });
  sheet.querySelector("#gGo").onclick=()=>previewGen(sheet);
  sheet.querySelector("#mclose").onclick=closeModal;
  document.getElementById("modal").classList.add("on");
}

function buildProgram(){
  const refs=currentRefs();
  const active=GEN.districts.filter(d=>genCfg.dist[d[0]]);
  if(!active.length)return null;

  const timeCap=Math.max(3,Math.floor((genCfg.min-5)/8));
  const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};

  // pattern "primari" (multiarticolari) per distretto. Shrug/calf ecc. restano accessori.
  const PRIM_PAT={gambe:["squat","hinge","legpress","lunge"],petto:["hpress"],schiena:["hpull","vpull"],spalle:["vpress"],braccia:[],core:[]};
  function poolFor(distId){
    const pats=GEN.districts.find(d=>d[0]===distId)[2];
    const all=LIB.filter(a=>{const li=LIBN[a[0]];
      return pats.includes(li.ic) && (genCfg.band?li.grp==="Elastici":li.grp!=="Elastici");
    }).map(a=>a[0]);
    const primPats=PRIM_PAT[distId]||[];
    const prim=all.filter(n=>primPats.includes(LIBN[n].ic));
    const acc=all.filter(n=>!primPats.includes(LIBN[n].ic));
    prim.sort((x,y)=>(LIBN[y].k||0)-(LIBN[x].k||0));
    return {prim, acc};
  }
  function mkEx(name){
    const li=LIBN[name];const df=defaultsFor(li);
    const est=li.k>0?round(refs[li.ref]*li.k,li.st||2.5):0;
    return {n:li.n,ic:li.ic,img:"",w:est,inc:li.st||2.5,rest:df.rest,r:df.r,sets:mk(est,li.k>=.8?4:3),note:"",tag:"GEN"};
  }

  const prevDayNames=new Set(); // per variare tra giorni consecutivi
  const days=[];
  for(let di=0;di<genCfg.days;di++){
    const used=new Set();       // no doppioni nello stesso giorno
    const icCount={};           // no accumulo dello stesso movimento nel giorno
    let ex=[];
    const order=shuffle(active.map(d=>d[0]));

    // quote per distretto rispettando il tetto tempo
    let budget=Math.min(timeCap, genCfg.perDist*active.length);
    const quota={};order.forEach(d=>quota[d]=0);
    for(const d of order){if(budget<=0)break;quota[d]=1;budget--}
    let go=true;while(budget>0&&go){go=false;for(const d of order){if(budget<=0)break;if(quota[d]<genCfg.perDist){quota[d]++;budget--;go=true}}}

    // penalizza chi era già ieri: preferisci nomi non usati nel giorno precedente
    const rank=arr=>shuffle(arr).sort((a,b)=>(prevDayNames.has(a)?1:0)-(prevDayNames.has(b)?1:0));

    for(const d of order){
      const need=quota[d];if(!need)continue;
      const pool=poolFor(d);
      const chosen=[];
      // 1° del distretto: un primario, variando tra i top e rispetto a ieri
      const primAvail=rank(pool.prim.filter(n=>!used.has(n)));
      if(primAvail.length){
        // scegli tra i 2 con carico più alto ma non ripetuti da ieri, altrimenti il primo
        const top=pool.prim.filter(n=>!used.has(n)).slice(0,3);
        const fresh=top.filter(n=>!prevDayNames.has(n));
        const candTop=(fresh.length?fresh:top);
        chosen.push(candTop[Math.floor(Math.random()*candTop.length)]);
      }
      // accessori: casuali, ma evita di accumulare lo stesso movimento (ic) nel distretto
      const accPool=rank(pool.acc.filter(n=>!used.has(n)));
      const morePrim=primAvail.filter(n=>!chosen.includes(n));
      const restPool=accPool.concat(morePrim);
      for(const n of restPool){
        if(chosen.length>=need)break;
        if(chosen.includes(n))continue;
        const ic=LIBN[n].ic;
        // dentro lo stesso distretto, max 1 esercizio per ic finché ci sono ic diversi
        const icInDist=chosen.filter(c=>LIBN[c].ic===ic).length;
        const otherIcLeft=restPool.some(x=>!chosen.includes(x)&&LIBN[x].ic!==ic);
        if(icInDist>=1 && otherIcLeft)continue;
        chosen.push(n);
      }
      chosen.forEach(n=>{used.add(n);const ic=LIBN[n].ic;icCount[ic]=(icCount[ic]||0)+1;ex.push(mkEx(n))});
    }

    // completa se sotto il tetto (librerie piccole)
    const cap=Math.min(timeCap,genCfg.perDist*active.length);
    if(ex.length<cap){
      const extra=rank(active.flatMap(dd=>poolFor(dd[0]).acc)).filter(n=>!used.has(n));
      for(const n of extra){if(ex.length>=cap)break;used.add(n);ex.push(mkEx(n))}
    }

    // ordina: multiarticolari prima, core in fondo
    ex.sort((a,b)=>{
      const ca=a.ic==="core"?1:0, cb=b.ic==="core"?1:0;
      if(ca!==cb)return ca-cb;
      return (LIBN[b.n]?LIBN[b.n].k:0)-(LIBN[a.n]?LIBN[a.n].k:0);
    });

    prevDayNames.clear();ex.forEach(e=>prevDayNames.add(e.n));
    const foc=[...new Set(ex.map(e=>LIBN[e.n]?LIBN[e.n].grp:"Misto"))].slice(0,2).join(" / ")||"Full body";
    days.push({id:String.fromCharCode(65+di),focus:foc,warm:genWarm(ex),ex:ex});
  }
  return days;
}

function genWarm(ex){
  const has=p=>ex.some(e=>LIBN[e.n]&&LIBN[e.n].ic===p||e.ic===p);
  const w=[["Attivazione generale","3-4 min mobilità articolare a corpo libero"]];
  if(has("squat")||has("legpress")||has("lunge"))w.push(["Anca 90/90","6 per lato"],["Caviglia al muro","2×10 per lato"]);
  if(has("hinge"))w.push(["Hip hinge con bastone","10 rip"]);
  if(has("hpress")||has("vpress")||has("lat"))w.push(["Dislocazioni con bastone","2×10"],["Extrarotazione spalla","2×12 per lato"]);
  if(has("hpull")||has("vpull"))w.push(["Scapular pull-up / band pull-apart","2×12"]);
  w.push(["Serie di avvicinamento","primo esercizio: vuoto → 50% → 75%"]);
  return w;
}

function previewGen(sheet){
  const days=buildProgram();
  const box=sheet.querySelector("#gPrev");
  if(!days){box.innerHTML=`<div class="empty">Seleziona almeno un distretto.</div>`;return}
  const estMin=d=>Math.round(d.ex.reduce((s,e)=>s+e.sets.length*(1+(e.rest||60)/60)+1,4));
  box.innerHTML=`<div class="lbl2">Scheda generata — ${days.length} giorni · ~${genCfg.perDist} es./distretto</div>`+
    days.map(d=>`<div class="card" style="margin-bottom:8px"><h4>Giorno ${d.id} · ${d.focus} <span style="float:right;color:var(--soft);font-family:'IBM Plex Mono',monospace;font-size:11px">~${estMin(d)}′</span></h4>
      <ul style="list-style:none;font-size:13px;color:var(--soft)">${d.ex.map(e=>`<li style="padding:3px 0;display:flex;justify-content:space-between;gap:8px"><span>${e.n}</span><b style="font-family:'IBM Plex Mono',monospace;color:var(--text)">${e.sets.length}×${e.r}${e.w?` · ${fmt(e.w)}kg`:""}</b></li>`).join("")}</ul></div>`).join("")+
    `<button class="genbtn" id="gRe" style="margin-top:6px;background:var(--card2);color:var(--acc);border:1px solid var(--accLine)">↻ Rigenera (altra combinazione)</button>
     <button class="genbtn" id="gApplyNew" style="margin-top:10px">Salva come NUOVO profilo</button>
     <button class="revert" id="gApplyHere" style="margin-top:8px">Sostituisci i giorni di questo profilo</button>`;
  box.querySelector("#gRe").onclick=()=>previewGen(sheet);
  box.querySelector("#gApplyNew").onclick=async()=>{
    const name=await prompt2("Nome del nuovo profilo con questa scheda:", "Scheda "+genCfg.min+"min");
    if(name===null)return;
    const st=normState(structuredClone(D));
    st.days=days;st.log=[];st.body=[];st.profile={nome:name.trim(),cognome:"",peso:S.profile&&S.profile.peso,level:S.profile&&S.profile.level,refs:S.profile&&S.profile.refs};
    const id="u"+Date.now().toString(36);
    MU.users.push({id:id,name:name.trim()||"Scheda generata",state:st});
    save();closeModal();switchUser(id);
    toast("Nuova scheda generata e salvata come profilo");
  };
  box.querySelector("#gApplyHere").onclick=async()=>{
    if(!await ask("Sostituisco i giorni della scheda di <b>questo profilo</b> con quella generata?<br><small style='color:var(--soft)'>Storico e misure restano. La scheda precedente viene rimpiazzata.</small>","Sostituisci"))return;
    S.days=days;view="A";save();closeModal();render();toast("Scheda generata applicata");
  };
}

/* ---------------- ONBOARDING / RICALIBRAZIONE ---------------- */
const onb=document.getElementById("onb");
let onbLevel="i",onbRecal=false;
/* openOnb e' definita piu' avanti dal wizard a passi */
document.querySelectorAll("#ob_lvl button").forEach(b=>b.onclick=()=>{
  onbLevel=b.dataset.l;
  document.querySelectorAll("#ob_lvl button").forEach(x=>x.classList.toggle("on",x===b));
});
/* riempie i 3 giorni con la struttura standard: esercizi, serie, ripetizioni e
   recuperi. I CARICHI vengono poi riscritti da applyRefs() sui riferimenti
   ricavati dalle risposte, quindi nessuno eredita i pesi di un altro. */
function seedSchedaTemplate(){
  const tpl=structuredClone(D);
  S.days.forEach((d,i)=>{if(tpl.days[i]){d.ex=tpl.days[i].ex;d.warm=tpl.days[i].warm;d.focus=tpl.days[i].focus}});
}

/* ---------------- installazione su schermata Home (una volta sola) ----------------
   Non compare se l'app gira gia' come applicazione installata. */
function isStandalone(){
  return window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;
}
function maybeHomeHint(){
  if(!S||S.homeHint||isStandalone())return;
  setTimeout(showHomeHint,900);
}
function showHomeHint(){
  const ua=navigator.userAgent||"";
  const ios=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const steps=ios
    ? ["Tocca <b>Condividi</b> nella barra di Safari (il quadrato con la freccia verso l'alto).",
       "Scorri e scegli <b>Aggiungi a Home</b>.",
       "Conferma con <b>Aggiungi</b> in alto a destra."]
    : ["Apri il <b>menu</b> del browser (i tre puntini in alto a destra).",
       "Scegli <b>Installa app</b> oppure <b>Aggiungi a schermata Home</b>.",
       "Conferma."];
  const sheet=document.getElementById("sheet");
  sheet.innerHTML=`
    <h3>Tienila a portata di pollice</h3>
    <div class="sub">Aggiungila alla schermata Home: si apre a schermo intero, senza barre del browser, e funziona anche senza rete. Ti serve dieci secondi, una volta sola.</div>
    <ol class="cues" style="margin-top:12px">${steps.map(s=>`<li>${s}</li>`).join("")}</ol>
    <div class="sub" style="margin-top:10px">${ios?"Su iPhone deve essere <b>Safari</b>: da Chrome la voce non compare.":"Se non vedi la voce, ricarica la pagina e riprova."}</div>
    <button class="closebtn" id="hh_ok" style="margin-top:14px">Fatto, non mostrarlo piu'</button>
    <button class="revert" id="hh_later" style="margin-top:8px">Ricordamelo dopo</button>`;
  sheet.querySelector("#hh_ok").onclick=()=>{S.homeHint=true;save();closeModal()};
  sheet.querySelector("#hh_later").onclick=closeModal;
  document.getElementById("modal").classList.add("on");
}

/* promemoria all'avvio */
(function bootReminder(){
  const l=lastSession();if(!l)return;
  const days=Math.floor((Date.now()-new Date(l.iso).getTime())/864e5);
  const key="rem_"+new Date().toISOString().slice(0,10);
  if(days>S.cfg.gap&&!store.get(key)){
    store.set(key,"1");
    setTimeout(()=>toast(`${days} giorni dall'ultima seduta — oggi tocca al giorno ${nextDayId()}`),600);
  }
})();
(function backupReminder(){
  const nSess=MU.users.reduce((a,u)=>a+((u.state.log||[]).length),0);
  if(nSess<3)return; // solo se c'è qualcosa da perdere
  const last=parseInt(store.get("last_backup"))||0;
  const daysSince=last?Math.floor((Date.now()-last)/864e5):999;
  const key="bkp_"+new Date().toISOString().slice(0,10);
  if(daysSince>=10&&!store.get(key)){
    store.set(key,"1");
    setTimeout(()=>toast("Consiglio: esporta un backup (i dati stanno solo su questo dispositivo)"),3200);
  }
})();

function safeStart(){
  try{
    save();
    render();
    updateBarInfo();
  }catch(err){
    // RETE DI SICUREZZA: qualunque errore all'avvio -> ripristina lo stato pulito e riprova
    try{
      MU=freshProfile();
      store.set("scheda_mu",JSON.stringify(MU));
      store.set("scheda_view","A");
      S=normState(activeUser().state);
      view="A";
      render();
      updateBarInfo();
      setTimeout(()=>{try{toast("Scheda ripristinata")}catch(e){}},400);
    }catch(err2){
      // se anche il ripristino fallisce, mostra un messaggio con reset manuale
      var m=document.getElementById("main");
      if(m)m.innerHTML='<div style="padding:30px 16px;color:#F2F5F9;font-family:sans-serif">'+
        '<h2 style="font-family:sans-serif">Ripristino in corso…</h2>'+
        '<p style="color:#8B97A8;margin:10px 0 18px">Tocca il pulsante per ricaricare la scheda pulita.</p>'+
        '<button id="hardReset" style="background:#FF6B2C;color:#0C0F14;border:0;border-radius:10px;padding:14px 20px;font-size:15px;font-weight:700;cursor:pointer">Ricarica la mia scheda</button></div>';
      var b=document.getElementById("hardReset");
      if(b)b.onclick=function(){try{localStorage.clear()}catch(e){}location.reload()};
    }
  }
}
/* ================= SUPABASE: ACCESSO E SINCRONIZZAZIONE =================
   Architettura offline-first:
   - localStorage resta il negozio primario, l'app funziona anche senza rete
   - Supabase e' uno specchio: si scrive in cloud dopo ogni modifica (con debounce)
   - al login si tira giu' lo stato remoto e lo si adotta solo se piu' recente
   ======================================================================== */
const SUPA_URL="https://gnksbatouzwdneixvpmn.supabase.co";
const SUPA_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdua3NiYXRvdXp3ZG5laXh2cG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNzc5NTAsImV4cCI6MjA5OTk1Mzk1MH0.S4_FyxVHhekj7Zha0BwXJwZSqkiYTHV4YqEIrahRGY0";

let SESSION=null, CLOUD_USER=null, syncReady=false, pushTimer=null;

const authScreen=document.getElementById("authScreen");
const authMsg=document.getElementById("authMsg");
const authBtn=document.getElementById("authBtn");
const authTgl=document.getElementById("authToggle");
const authTag=document.getElementById("authTag");
const emailIn=document.getElementById("authEmail");
const pwIn=document.getElementById("authPw");
const dot=document.getElementById("syncDot");
let signUpMode=false;

function showDot(txt,err){
  if(!dot)return;
  dot.textContent=txt; dot.classList.toggle("err",!!err); dot.classList.add("show");
  clearTimeout(dot._t); dot._t=setTimeout(()=>dot.classList.remove("show"),err?4000:1400);
}
function msg(t,ok){authMsg.textContent=t||"";authMsg.classList.toggle("ok",!!ok)}

/* ---- chiamate REST diritte: niente CDN, niente dipendenze ---- */
async function supaAuth(path,body){
  const r=await fetch(`${SUPA_URL}/auth/v1/${path}`,{
    method:"POST",
    headers:{"Content-Type":"application/json","apikey":SUPA_KEY},
    body:JSON.stringify(body)
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.msg||j.error_description||j.error||j.message||"Errore di rete");
  return j;
}
async function fetchUser(token){
  const r=await fetch(`${SUPA_URL}/auth/v1/user`,{headers:{"Authorization":"Bearer "+token,"apikey":SUPA_KEY}});
  if(!r.ok)return null;
  return r.json();
}
async function refreshSession(rt){
  return supaAuth("token?grant_type=refresh_token",{refresh_token:rt});
}

/* ---- lettura e scrittura dello stato ---- */
async function pullAndMerge(){
  if(!SESSION||!CLOUD_USER)return;
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/schede?user_id=eq.${CLOUD_USER.id}&select=stato`,{
      headers:{"Authorization":"Bearer "+SESSION.access_token,"apikey":SUPA_KEY}
    });
    if(!r.ok)throw new Error("lettura fallita");
    const rows=await r.json();
    const remote=rows&&rows[0]&&rows[0].stato;
    const localTs=BOOT_TS;
    // secondo sbarramento: se in locale non c'e' NULLA (niente sedute, nessun
    // esercizio) il remoto vince sempre, qualunque cosa dicano i timestamp
    const localVuoto=!(S.log&&S.log.length)&&
      (S.days||[]).reduce((a,d)=>a+((d.ex&&d.ex.length)||0),0)===0;

    if(remote&&remote.mu&&remote.mu.users&&remote.mu.users.length){
      const remoteTs=parseInt(remote.ts||0,10);
      // adotta il remoto solo se e' sensibilmente piu' recente (margine 2s contro il jitter di orologio)
      if(localVuoto||remoteTs>localTs+2000){
        MU=remote.mu;
        store.set("scheda_mu",JSON.stringify(MU));
        store.set("scheda_ts",String(remoteTs));
        S=normState(activeUser().state);
        showDot("dati dal cloud");
      }else{
        showDot("locale piu' recente");
      }
    }
    syncReady=true;
    // se il cloud e' vuoto o piu' vecchio, allinealo subito
    schedulePush();
  }catch(e){
    syncReady=true;              // non bloccare l'app: si lavora offline
    showDot("offline",true);
  }
}

async function pushNow(){
  if(!syncReady||!SESSION||!CLOUD_USER)return;
  const payload={mu:MU,ts:parseInt(store.get("scheda_ts")||String(Date.now()),10)};
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/schede?on_conflict=user_id`,{
      method:"POST",
      headers:{
        "Authorization":"Bearer "+SESSION.access_token,
        "apikey":SUPA_KEY,
        "Content-Type":"application/json",
        "Prefer":"resolution=merge-duplicates,return=minimal"
      },
      body:JSON.stringify({user_id:CLOUD_USER.id,stato:payload,aggiornato:new Date().toISOString()})
    });
    if(r.status===401){                       // token scaduto: rinnova e riprova una volta
      const ns=await refreshSession(SESSION.refresh_token);
      SESSION=ns; store.set("supa_session",JSON.stringify(ns));
      return pushNow();
    }
    if(!r.ok)throw new Error("scrittura fallita");
    showDot("salvato");
  }catch(e){
    showDot("salvato solo qui",true);         // resta in localStorage, ripartira' al prossimo salvataggio
  }
}

/* sostituisce l'hook dichiarato in cima: accorpa le scritture ravvicinate */
schedulePush=function(){
  if(!syncReady)return;
  clearTimeout(pushTimer);
  pushTimer=setTimeout(pushNow,1200);
};

/* ---- interfaccia di accesso ---- */
function drawAuthMode(){
  authTgl.innerHTML=signUpMode
    ? 'Hai gia\' un account? <b>Accedi</b>'
    : 'Non hai un account? <b>Registrati</b>';
  authBtn.textContent=signUpMode?"Crea account":"Accedi";
  authTag.textContent=signUpMode
    ? "Crea un account: i carichi ti seguono su telefono e computer."
    : "Accedi per ritrovare i tuoi carichi su qualsiasi dispositivo.";
  pwIn.autocomplete=signUpMode?"new-password":"current-password";
  msg("");
}
authTgl.onclick=()=>{signUpMode=!signUpMode;drawAuthMode()};

authBtn.onclick=async()=>{
  const em=emailIn.value.trim(), pw=pwIn.value;
  if(!em||!pw){msg("Inserisci email e password.");return}
  if(pw.length<6){msg("La password deve avere almeno 6 caratteri.");return}
  authBtn.disabled=true; msg(signUpMode?"Creo l'account…":"Accesso in corso…");
  try{
    if(signUpMode){
      await supaAuth("signup",{email:em,password:pw});
      signUpMode=false; drawAuthMode();
      msg("Account creato. Ora accedi.",true);
    }else{
      const s=await supaAuth("token?grant_type=password",{email:em,password:pw});
      await enterApp(s);
    }
  }catch(e){
    const t=String(e.message||"");
    if(/Invalid login/i.test(t))          msg("Email o password non corretti.");
    else if(/already registered/i.test(t))msg("Questa email ha gia' un account. Accedi.");
    else if(/Email not confirmed/i.test(t))msg("Devi confermare l'email: controlla la posta.");
    else                                   msg(t);
  }finally{authBtn.disabled=false}
};

document.getElementById("authOffline").onclick=()=>{
  store.set("supa_offline","1");
  authScreen.classList.remove("show");
  syncReady=false;
  safeStart();
  afterLoginFlow();
};

/* Dopo il login: se il profilo e' nuovo parte l'onboarding, se e' gia' avviato
   si offre solo l'installazione. Va chiamato DOPO pullAndMerge, altrimenti si
   rischia di far rifare le domande a chi ha gia' i dati in cloud. */
function afterLoginFlow(){
  try{mergeUserLib()}catch(e){}
  try{loadSharedLib()}catch(e){}
  if(S.pendingOnb||!S.onbDone){openOnb(false,true);return}
  // apre sul giorno che tocca oggi, senza spostare chi e' a meta' seduta
  try{
    const t=nextDayId();
    if(t&&S.days.some(x=>x.id===t)){view=t;store.set("scheda_view",t);render();updateBarInfo()}
  }catch(e){}
  firstRunFlow();
}

/* ================= ANALISI AUTOMATICA CON GEMINI =================
   La chiave API resta SOLO su questo dispositivo (localStorage) e non viene
   mai sincronizzata in cloud: e' un segreto dell'utente, non un dato di
   allenamento. Ogni utente usa la propria, quindi nessun costo condiviso. */
/* La serie 2.5 non e' piu' disponibile ai nuovi utenti: Google indica come
   sostituti gemini-3.5-flash e gemini-3.1-flash-lite. */
const AI_MODES=[["patch","Solo modifiche","Le correzioni alla scheda e basta, una riga per motivo."],
                ["breve","Sintetica","Verdetti netti, una riga di motivazione ciascuno. Max 250 parole."],
                ["full","Approfondita","Spiega il ragionamento e il meccanismo dietro ogni scelta."]];
const aiMode=()=>store.get("ai_mode")||"breve";
const GEM_MODELS=[["gemini-3.5-flash","Flash — piu' capace"],["gemini-3.1-flash-lite","Flash-Lite — piu' veloce"]];
const GEM_DEFAULT="gemini-3.5-flash";
const gemKey=()=>store.get("gem_key")||"";
const anyAIKey=()=>!!(gemKey()||store.get("groq_key")||store.get("mistral_key"));
function gemModel(){
  const m=store.get("gem_model");
  // chi aveva gia' scelto un modello ritirato viene spostato in automatico
  if(!m||/^gemini-(1|2)\./.test(m)||!GEM_MODELS.some(x=>x[0]===m)){
    store.set("gem_model",GEM_DEFAULT);
    return GEM_DEFAULT;
  }
  return m;
}


/* ============ PROVIDER DI RISERVA: GROQ E MISTRAL ============
   Quando Gemini esaurisce la quota giornaliera, la richiesta passa in
   automatico al primo provider di riserva configurato. Le chiavi restano
   SOLO su questo dispositivo (localStorage), non vengono mai sincronizzate
   in cloud ne' incluse nei backup. La foto della scheda resta su Gemini:
   e' l'unico dei tre con la visione affidabile. */

/* ============ CHIAVI AI LEGATE ALL'ACCOUNT ============
   Le chiavi (Gemini, Groq, Mistral) e la preferenza di provider vivono nella
   tabella user_ai_keys su Supabase, una riga per utente, protetta da RLS:
   solo il proprietario puo' leggerla e scriverla. localStorage resta la copia
   di lavoro (offline-first); il cloud e' lo specchio che le porta sugli altri
   dispositivi al login. Al logout con pulizia si svuota SOLO il locale: la
   copia in cloud resta per il prossimo accesso. */
async function pullAIKeys(){
  if(!SESSION||!CLOUD_USER)return;
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/user_ai_keys?user_id=eq.${CLOUD_USER.id}&select=*`,{
      headers:{"Authorization":"Bearer "+SESSION.access_token,"apikey":SUPA_KEY}});
    if(!r.ok)return;
    const rows=await r.json().catch(()=>[]);
    const k=rows&&rows[0]; if(!k)return;
    /* il locale vince se presente: e' l'ultima volonta' espressa su QUESTO device */
    if(k.gemini_key&&!store.get("gem_key"))store.set("gem_key",k.gemini_key);
    if(k.groq_key&&!store.get("groq_key"))store.set("groq_key",k.groq_key);
    if(k.mistral_key&&!store.get("mistral_key"))store.set("mistral_key",k.mistral_key);
    if(k.ai_provider&&!store.get("ai_provider"))store.set("ai_provider",k.ai_provider);
  }catch(e){}
}
async function pushAIKeys(){
  if(!SESSION||!CLOUD_USER)return;
  try{
    await fetch(`${SUPA_URL}/rest/v1/user_ai_keys?on_conflict=user_id`,{
      method:"POST",
      headers:{"Authorization":"Bearer "+SESSION.access_token,"apikey":SUPA_KEY,
               "Content-Type":"application/json","Prefer":"resolution=merge-duplicates,return=minimal"},
      body:JSON.stringify({user_id:CLOUD_USER.id,
        gemini_key:gemKey()||null,groq_key:groqKey()||null,mistral_key:mistralKey()||null,
        ai_provider:aiProvider(),aggiornato:new Date().toISOString()})});
  }catch(e){}
}

const groqKey=()=>store.get("groq_key")||"";
const mistralKey=()=>store.get("mistral_key")||"";
const aiProvider=()=>store.get("ai_provider")||"auto";   // auto | gemini | groq | mistral
const isLimitError=e=>/limite|quota|429|rate/i.test(String(e&&e.message||e||""));

async function askOpenAIStyle(url,key,model,prompt){
  const r=await fetch(url,{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},
    body:JSON.stringify({model:model,messages:[{role:"user",content:prompt}]})
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok){
    const m=(j.error&&(j.error.message||j.error))||"";
    if(r.status===429)throw new Error("Limite raggiunto anche su questo provider.");
    if(r.status===401)throw new Error("Chiave non valida per questo provider.");
    throw new Error(String(m)||"Errore "+r.status);
  }
  const txt=j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;
  if(!txt)throw new Error("Risposta vuota dal provider.");
  return txt;
}
const askGroq=p=>askOpenAIStyle("https://api.groq.com/openai/v1/chat/completions",groqKey(),"llama-3.3-70b-versatile",p);
const askMistral=p=>askOpenAIStyle("https://api.mistral.ai/v1/chat/completions",mistralKey(),"mistral-small-latest",p);

/* punto unico di ingresso testuale: rispetta la preferenza, altrimenti
   Gemini -> Groq -> Mistral, passando alla riserva solo su errori di quota */
async function askAI(prompt){
  const pref=aiProvider();
  if(pref==="groq"){if(!groqKey())throw new Error("Chiave Groq non impostata.");return askGroq(prompt)}
  if(pref==="mistral"){if(!mistralKey())throw new Error("Chiave Mistral non impostata.");return askMistral(prompt)}
  if(pref==="gemini"||!groqKey()&&!mistralKey())return askGeminiRaw(prompt);
  try{return await askGeminiRaw(prompt)}
  catch(e){
    if(!isLimitError(e))throw e;
    if(groqKey()){try{const t=await askGroq(prompt);showDot&&showDot("riserva: Groq");return t}catch(e2){if(!isLimitError(e2))throw e2}}
    if(mistralKey()){const t=await askMistral(prompt);showDot&&showDot("riserva: Mistral");return t}
    throw e;
  }
}

async function askGeminiRaw(promptText){
  const key=gemKey();
  if(!key)throw new Error("Nessuna chiave impostata.");
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${gemModel()}:generateContent`,{
    method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},
    body:JSON.stringify({contents:[{parts:[{text:promptText}]}]})
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok){
    const m=(j.error&&j.error.message)||"";
    if(r.status===400&&/API key/i.test(m))throw new Error("Chiave non valida. Ricontrollala su Google AI Studio.");
    if(r.status===429)throw new Error("Limite giornaliero gratuito raggiunto. Riprova domani.");
    if(r.status===403)throw new Error("Chiave senza permessi, o API non abilitata sul progetto.");
    if(r.status===404||/no longer available|not found|is not supported/i.test(m))
      throw new Error("Modello non piu' disponibile. Scegli l'altro modello qui sopra: Google ne ritira di vecchi periodicamente.");
    throw new Error(m||"Errore "+r.status);
  }
  const c=j.candidates&&j.candidates[0];
  const txt=c&&c.content&&c.content.parts?c.content.parts.map(p=>p.text||"").join(""):"";
  if(!txt)throw new Error("Risposta vuota dal modello.");
  return txt;
}

/* estrae il blocco PATCH SCHEDA dalla risposta, cosi' si applica in un tocco */
function extractPatch(txt){
  const m=txt.match(/PATCH SCHEDA[\s\S]*?(?=\n\s*```|\n#{1,3}\s|$)/i);
  return m?m[0].replace(/```/g,"").trim():"";
}

function aiAnalysisAsk(){
  const sheet=document.getElementById("sheet");
  let kind=store.get("exp_period")||"all";
  const periods=[["last","dall'ultima esportazione"],["30","ultimi 30 giorni"],["90","ultimi 90 giorni"],["all","tutto lo storico"]];
  const draw=()=>{
    const n=sessionsIn(kind).length;
    sheet.innerHTML=`
      <h3>Analisi automatica</h3>
      <div class="sub">Manda le tue sedute a Gemini e ricevi la valutazione da personal trainer, senza copiare e incollare nulla.</div>
      <div class="lbl2">Periodo</div>
      <div class="chips" id="aper">${periods.map(([k,l])=>`<button class="chip${kind===k?" on":""}" data-k="${k}">${l}</button>`).join("")}</div>
      <div class="sub" style="margin:8px 0 4px">${n} sedut${n===1?"a":"e"} nel periodo selezionato.</div>
      <div class="lbl2">Che tipo di risposta vuoi</div>
      ${AI_MODES.map(m=>`<button class="alt aimode" data-v="${m[0]}" style="width:100%;flex-direction:column;align-items:flex-start;gap:3px;margin-bottom:6px;${aiMode()===m[0]?"border-color:var(--acc)":""}">
        <span class="an">${m[1]}</span><small style="color:var(--soft);font-family:inherit">${m[2]}</small></button>`).join("")}
      ${gemKey()?"":`<div class="nextbox late" style="margin:10px 0">Prima serve una chiave gratuita di Google AI Studio. Impostala qui sotto: resta su questo dispositivo.</div>`}
      <div class="lbl2">Chiave API Google AI Studio</div>
      <input class="urlin" id="gk" type="password" placeholder="AIza…" value="${esc(gemKey())}">
      <div class="sub" style="margin:-6px 0 10px;font-size:12px">Si ottiene gratis su <b>aistudio.google.com/apikey</b>, senza carta di credito.</div>
      <div class="lbl2">Modello</div>
      <div class="chips" id="amod">${GEM_MODELS.map(([k,l])=>`<button class="chip${gemModel()===k?" on":""}" data-m="${k}">${l}</button>`).join("")}</div>
      <button class="genbtn" id="ago" style="margin-top:14px">Analizza le mie sedute</button>
      <div id="aout"></div>
      <button class="closebtn" id="aclose" style="margin-top:8px">Chiudi</button>`;
    sheet.querySelectorAll("#aper .chip").forEach(b=>b.onclick=()=>{kind=b.dataset.k;store.set("exp_period",kind);draw()});
    sheet.querySelectorAll("#amod .chip").forEach(b=>b.onclick=()=>{store.set("gem_model",b.dataset.m);draw()});
    sheet.querySelectorAll(".aimode").forEach(b=>b.onclick=()=>{store.set("ai_mode",b.dataset.v);draw()});
    sheet.querySelector("#gk").onchange=e=>{setGemKey(e.target.value);toast(SESSION?"Chiave salvata sul tuo account":"Chiave salvata su questo dispositivo")};
    sheet.querySelector("#aclose").onclick=closeModal;
    sheet.querySelector("#ago").onclick=async()=>{
      const k=sheet.querySelector("#gk").value.trim();
      if(k)setGemKey(k);
      if(!gemKey()){toast("Inserisci prima la chiave");return}
      if(!sessionsIn(kind).length){toast("Nessuna seduta nel periodo");return}
      const out=sheet.querySelector("#aout");
      const btn=sheet.querySelector("#ago");
      btn.disabled=true;btn.textContent="Analisi in corso…";
      out.innerHTML=`<div class="sub" style="margin-top:12px">Sto mandando i dati e aspettando la risposta. Di solito 10–30 secondi.</div>`;
      try{
        const txt=await askAI(buildPromptMd(kind,aiMode()));
        const patch=extractPatch(txt);
        out.innerHTML=`
          <div class="lbl2" style="margin-top:16px">Valutazione</div>
          <div class="cues" style="white-space:pre-wrap;padding:12px;font-size:14px;line-height:1.5">${esc(txt)}</div>
          ${patch?`<button class="genbtn" id="apply" style="margin-top:10px">Applica le modifiche proposte</button>`:
                  `<div class="sub" style="margin-top:8px">Nessun blocco di modifiche nella risposta: non c'e' nulla da applicare.</div>`}
          <button class="revert" id="acopy" style="margin-top:8px">Copia il testo</button>`;
        store.set("last_ai",String(Date.now()));
        const ap=out.querySelector("#apply");
        if(ap)ap.onclick=()=>{
          const pt=parsePatch(patch), plan=resolvePatch(pt);
          if(!plan.length&&!pt.refs.length){toast("Nessuna modifica riconosciuta");return}
          previewPatch(plan,pt);
        };
        out.querySelector("#acopy").onclick=()=>{
          try{navigator.clipboard.writeText(txt);toast("Testo copiato")}catch(e){toast("Copia non riuscita")}
        };
      }catch(e){
        out.innerHTML=`<div class="nextbox late" style="margin-top:12px">${esc(e.message||"Errore")}</div>`;
      }finally{btn.disabled=false;btn.textContent="Analizza le mie sedute"}
    };
  };
  draw();
  document.getElementById("modal").classList.add("on");
}

/* ---- ripristino della copia salvata prima di un aggiornamento ---- */
function restoreSnapAsk(){
  if(!S._snap){toast("Nessuna copia disponibile");return}
  const d=new Date(S._snap.ts).toLocaleString("it-IT");
  ask(`Ripristino la copia salvata prima dell'aggiornamento?<br><small style="color:var(--soft)">Copia del ${d}. Scheda, storico e misure tornano a com'erano.</small>`,"Ripristina")
    .then(ok=>{
      if(!ok)return;
      try{
        const o=JSON.parse(S._snap.data);
        if(o.days)S.days=o.days;
        if(o.log)S.log=o.log;
        if(o.body)S.body=o.body;
        if(o.profile)S.profile=o.profile;
        save();render();toast("Copia ripristinata");
      }catch(e){toast("Copia illeggibile")}
    });
}

async function enterApp(session){
  const u=await fetchUser(session.access_token);
  if(!u)throw new Error("Sessione non valida.");
  SESSION=session; CLOUD_USER=u;
  store.set("supa_session",JSON.stringify(session));
  store.del("supa_offline");
  authScreen.classList.remove("show");
  emailIn.value=""; pwIn.value="";
  // Reset SOLO se su questo dispositivo era gia' entrato un account DIVERSO.
  // Al primo avvio della v16 "supa_uid" non esiste ancora: in quel caso non si
  // tocca nulla, altrimenti si cancellerebbero i dati di chi aggiorna.
  const prevUid=store.get("supa_uid");
  if(prevUid&&prevUid!==u.id){
    MU={active:"u1",users:[{id:"u1",name:u.email||"Profilo",state:freshEmpty()}]};
    store.set("scheda_mu",JSON.stringify(MU));
    store.set("scheda_ts","0");
    store.del("onb_done");
    S=normState(activeUser().state); view="A";
  }
  store.set("supa_uid",u.id);
  refreshOwnerRole();          // il ruolo moderatore arriva dal database, non dal sorgente
  safeStart();                 // disegna subito dai dati locali: nessuna attesa
  await pullAndMerge();        // poi allinea col cloud
  await pullAIKeys();          // e recupera le chiavi AI legate all'account
  render(); updateBarInfo();
  afterLoginFlow();
}

async function logoutCloud(wipeLocal){
  try{
    if(SESSION)await fetch(`${SUPA_URL}/auth/v1/logout`,{
      method:"POST",headers:{"Authorization":"Bearer "+SESSION.access_token,"apikey":SUPA_KEY}});
  }catch(e){}
  SESSION=null; CLOUD_USER=null; syncReady=false; IS_OWNER=false;
  store.del("supa_session");
  /* Prima restavano su questo dispositivo schede, misure e chiave API: chi
     apriva l'app dopo di te se li ritrovava davanti. */
  if(wipeLocal){
    store.del("scheda_mu"); store.del("scheda_v3"); store.del("scheda_ts");
    store.del("gem_key");   store.del("supa_uid");
    store.del("groq_key");  store.del("mistral_key");
  }
  authScreen.classList.add("show");
  signUpMode=false; drawAuthMode();
}
window.logoutCloud=logoutCloud;
window.cloudEmail=()=>CLOUD_USER?CLOUD_USER.email:null;

/* ---- avvio ---- */

/* ==================== ONBOARDING GUIDATO E GENERATORE DI SCHEDE ====================
   Due rami:
   1. "Ho gia' una scheda"  -> la si inserisce, anche incollandola come testo
   2. "Creala tu per me"    -> domande da personal trainer -> scheda generata
   La generazione non e' deterministica: a parita' di risposte cambia la scelta
   degli esercizi, ma non lo schema di serie/ripetizioni, che dipende dall'obiettivo.
   ================================================================================= */

const GOALS=[
  ["ipertrofia","Ipertrofia","Massa muscolare. Volume alto, ripetizioni medie."],
  ["forza","Forza","Carichi alti, poche ripetizioni, recuperi lunghi."],
  ["ricomp","Ricomposizione","Dimagrire mantenendo il muscolo. Il compromesso."],
  ["dimagrimento","Dimagrimento","Densita' alta, superserie, recuperi corti."],
  ["agilita","Agilita' e condizionamento","Esplosivita', core, poco tempo morto."],
  ["ricond","Ricondizionamento","Rientro graduale dopo una pausa lunga."]
];
const EQUIPS=[
  ["palestra","Palestra attrezzata","Bilancieri, macchine, cavi."],
  ["casa","Manubri e panca","Home gym essenziale, corpo libero."],
  ["bande","Elastici e corpo libero","Nessun carico pesante."]
];
const LIMITS=[["nessuna","Nessuna"],["spalla","Spalla"],["lombare","Zona lombare"],["ginocchio","Ginocchio"]];
/* Accessori per chi si allena a casa: filtrano la libreria molto piu' finemente
   della sola voce "manubri e panca". Il corpo libero e' sempre disponibile. */
const ACCS=[["manubri","Manubri"],["bilanciere","Bilanciere"],["panca","Panca"],
            ["elastici","Elastici"],["kettlebell","Kettlebell"],["sbarra","Sbarra trazioni"]];
const ACC_RX={
  manubri:/manubri|manubrio|goblet|kickback|concentrato|arnold/i,
  bilanciere:/bilanciere|\bez\b|stacco da terra|good morning|hip thrust|shrug bilanciere/i,
  panca:/panca|croci|pullover|preacher/i,
  elastici:/^band /i,
  kettlebell:/goblet|swing|kettlebell/i,
  sbarra:/trazioni|dead hang|leg raise alla sbarra|scapular pull/i
};
const BODYWEIGHT=/push-?up|plank|hollow|crunch|russian|ab wheel|hyperextension|affondi in camminata|affondi bulgari|step-up|squat a corpo|dip/i;
function homeAllowed(name,acc){
  if(BODYWEIGHT.test(name))return true;
  return (acc||[]).some(a=>ACC_RX[a]&&ACC_RX[a].test(name));
}

/* schemi serie/ripetizioni/recupero per obiettivo */
const SCHEME={
  forza:       {comp:{s:5,r:"5",rest:180}, sec:{s:4,r:"6-8",rest:150}, iso:{s:3,r:"10",rest:90},  ss:false},
  ipertrofia:  {comp:{s:4,r:"6-8",rest:150},sec:{s:4,r:"8-12",rest:105},iso:{s:3,r:"12-15",rest:75}, ss:true},
  ricomp:      {comp:{s:4,r:"8",rest:120}, sec:{s:3,r:"10-12",rest:90},iso:{s:3,r:"12-15",rest:60}, ss:true},
  dimagrimento:{comp:{s:3,r:"12",rest:75}, sec:{s:3,r:"12-15",rest:60},iso:{s:3,r:"15",rest:45},   ss:true},
  agilita:     {comp:{s:4,r:"6",rest:120}, sec:{s:3,r:"10",rest:75},  iso:{s:3,r:"12",rest:45},   ss:true},
  ricond:      {comp:{s:3,r:"10-12",rest:120},sec:{s:3,r:"12",rest:90},iso:{s:2,r:"15",rest:60},  ss:false}
};
const COMP_PAT=["squat","hinge","hpress","vpull","legpress"];
const SEC_PAT =["hpull","vpress","lunge"];

/* struttura dei giorni per frequenza settimanale */
const SPLITS={
 2:[{focus:"Full body — spinta",   pat:["squat","hpress","hpull","vpress","curl","core"]},
    {focus:"Full body — tirata",   pat:["hinge","vpull","hpress","lat","tri","calf"]}],
 3:[{focus:"Ginocchia / Spinta orizzontale",   pat:["squat","hpress","hpull","vpress","curl","calf"]},
    {focus:"Cerniera d'anca / Tirata verticale",pat:["hinge","vpull","hpress","lat","tri","core"]},
    {focus:"Quadricipiti / Tirata orizzontale", pat:["legpress","hpull","vpress","lunge","curl","face"]}],
 4:[{focus:"Parte alta — spinta",  pat:["hpress","vpress","hpress","lat","tri","core"]},
    {focus:"Parte bassa — ginocchia",pat:["squat","legpress","lunge","calf","core","hinge"]},
    {focus:"Parte alta — tirata",  pat:["vpull","hpull","face","lat","curl","core"]},
    {focus:"Parte bassa — anche",  pat:["hinge","legpress","lunge","calf","core","squat"]}],
 5:[{focus:"Spinta",        pat:["hpress","vpress","hpress","lat","tri","tri"]},
    {focus:"Tirata",        pat:["vpull","hpull","hpull","face","curl","curl"]},
    {focus:"Gambe",         pat:["squat","hinge","legpress","lunge","calf","core"]},
    {focus:"Parte alta",    pat:["hpress","vpull","vpress","hpull","lat","core"]},
    {focus:"Gambe e core",  pat:["legpress","hinge","lunge","calf","core","core"]}]
};

/* mobilita' propedeutica in base al movimento principale del giorno */
const WARMBANK={
 squat:[["Caviglia al muro","2×10 per lato"],["Anca 90/90","6 rotazioni per lato"],["Adduttori rocking","10 oscillazioni"],["Squat a corpo libero","10 lenti"]],
 hinge:[["Cat-camel","10 cicli"],["Hip hinge con bastone","10 rip, 3 punti di contatto"],["Hamstring swing","10 per gamba"],["Ponte glutei","12"]],
 hpress:[["Toracica open book","8 per lato"],["Dislocazioni con bastone","2×10"],["Scapular push-up","2×10"],["Push-up lenti","8"]],
 vpress:[["Wall slide","10"],["Dislocazioni con bastone","2×10"],["Extrarotazione spalla","2×12 per lato"],["Scapular push-up","2×10"]],
 vpull:[["Dead hang","2×20 sec"],["Scapular pull-up","2×8"],["Band pull apart","2×15"],["Toracica open book","8 per lato"]],
 hpull:[["Band pull apart","2×15"],["Scapular row a vuoto","2×10"],["Toracica open book","8 per lato"],["Extrarotazione spalla","2×12 per lato"]],
 legpress:[["Anca 90/90","6 per lato"],["Caviglia al muro","2×10 per lato"],["Ponte glutei","12"],["Adduttori rocking","10 oscillazioni"]],
 lunge:[["Anca 90/90","6 per lato"],["World's greatest stretch","5 per lato"],["Caviglia al muro","2×10 per lato"]]
};

/* esercizi da escludere in presenza di limitazioni articolari */
const BLACKLIST={
 spalla:    [/dip alle parallele/i,/military press/i,/arnold/i,/panca presa stretta/i,/alzate frontali/i,/overhead/i,/french press/i,/shoulder press/i,/spinte manubri/i,/landmine press/i,/alzate laterali/i],
 lombare:   [/stacco da terra/i,/good morning/i,/rematore bilanciere/i,/back squat/i,/front squat/i,/hyperextension/i,/russian twist/i],
 ginocchio: [/affondi/i,/hack squat/i,/step-up/i,/front squat/i,/back squat/i,/leg extension/i]
};

/* Esercizi che NON possono occupare uno slot da fondamentale o complementare:
   macchine di isolamento e corpo libero leggero. Senza questo filtro il
   generatore poteva proporre "Abductor machine 5x5", che non ha senso. */
const ISO_ONLY=/abductor|adductor|leg curl|leg extension|shrug|hyperextension|calf|kickback|concentrato|pull-?apart|monster walk|alzate|croci|fly|pec deck|reverse|face pull|push down|band external/i;

/* Se una limitazione svuota un pattern, si passa al pattern sostitutivo
   invece di ripescare proprio gli esercizi che andavano evitati. */
const SUBST={vpress:"hpress",hinge:"legpress",squat:"legpress",legpress:"squat",
             vpull:"hpull",hpull:"vpull",lunge:"legpress",hpress:"vpress",tri:"curl",curl:"tri",lat:"face",face:"lat",calf:"core",core:"calf"};

/* attrezzatura minima riconosciuta per l'home gym */
const HOME_OK=/manubri|manubrio|goblet|push-?up|plank|hollow|trazioni|affondi|step-up|hyperextension|ab wheel|russian|dip |crunch|leg raise|kickback|concentrato|panca piana manubri|band /i;

function shuffled(a){const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}

/* fattore di carico rispetto al riferimento, che vale per ~8 ripetizioni */
function repFactor(r){
  const n=parseInt(String(r).split(/[-–]/)[0],10)||8;
  return (1+8/30)/(1+n/30);
}

function poolFor(pat,equip,limit,role){
  let list=LIB.filter(a=>a[1]===pat);
  if(equip==="bande")      list=list.filter(a=>a[5]==="Elastici");
  else if(equip==="casa"){
    const acc=(WZ&&WZ.acc&&WZ.acc.length)?WZ.acc:null;
    list=acc? list.filter(a=>homeAllowed(a[0],acc))
            : list.filter(a=>a[5]!=="Elastici"&&HOME_OK.test(a[0]));
  }
  else                     list=list.filter(a=>a[5]!=="Elastici");
  // uno slot da fondamentale o complementare non puo' essere riempito da un isolamento
  if(role!=="iso"){
    const heavy=list.filter(a=>!ISO_ONLY.test(a[0]));
    if(heavy.length)list=heavy;
  }
  const bl=BLACKLIST[limit]||[];
  const ok=list.filter(a=>!bl.some(rx=>rx.test(a[0])));
  return ok;                       // puo' tornare vuoto: se ne occupa chi chiama
}
/* pool con sostituzione del pattern quando le limitazioni lo azzerano */
function poolResolved(pat,equip,limit,role){
  let p=poolFor(pat,equip,limit,role);
  if(p.length)return {pool:p,pat:pat};
  const alt=SUBST[pat];
  if(alt){p=poolFor(alt,equip,limit,role);if(p.length)return {pool:p,pat:alt}}
  p=poolFor(pat,equip,"nessuna",role);        // ultima rete: ignora la limitazione
  return {pool:p.length?p:LIB.filter(a=>a[1]===pat),pat:pat};
}

function generateScheda(o){
  const tpl=SPLITS[o.days]||SPLITS[3];
  const sc=SCHEME[o.goal]||SCHEME.ipertrofia;
  const nEx=o.dur<=40?4:(o.dur>=75?7:6);
  const used=new Set();
  return tpl.map((d,i)=>{
    const ex=[];
    d.pat.slice(0,nEx).forEach(p=>{
      const cls=COMP_PAT.includes(p)?"comp":(SEC_PAT.includes(p)?"sec":"iso");
      const r=poolResolved(p,o.equip,o.limit,cls);
      const fresh=shuffled(r.pool).filter(a=>!used.has(a[0]));
      const pick=fresh[0]||shuffled(r.pool)[0];
      if(!pick)return;
      used.add(pick[0]);
      const k=sc[cls];
      const step=pick[4]||2.5;
      const w=pick[3]>0?round((o.refs[pick[2]]||0)*pick[3]*repFactor(k.r),step):0;
      ex.push({n:pick[0],ic:pick[1],img:"",w:w,inc:step,rest:k.rest,r:k.r,
               sets:mk(w,k.s),note:"",tag:"NUOVO"});
    });
    // superserie sugli ultimi due isolamenti quando l'obiettivo premia la densita'
    if(sc.ss&&ex.length>=2){
      ex[ex.length-2].ss=1; ex[ex.length-1].ss=1; ex[ex.length-2].rest=0;
      ex[ex.length-2].note="superserie con "+ex[ex.length-1].n;
      ex[ex.length-1].note="superserie con "+ex[ex.length-2].n;
    }
    return {id:String.fromCharCode(65+i),focus:d.focus,warm:buildWarm(ex,o.dur),ex:ex};
  });
}

/* ---- lettura di una scheda incollata come testo ---- */
function parseSchedaText(txt){
  const days=[];let cur=null;
  String(txt||"").split(/\r?\n/).forEach(raw=>{
    const L=raw.trim(); if(!L)return;
    const dm=L.match(/^(?:giorno|day|scheda)\s*([A-E1-5])\b\s*[)\-:.\u2014]?\s*(.*)$/i);
    if(dm){
      let id=dm[1].toUpperCase();
      if(/[1-5]/.test(id))id=String.fromCharCode(64+parseInt(id,10));
      cur={id:id,focus:(dm[2]||"").trim(),ex:[]};days.push(cur);return;
    }
    const em=L.match(/^[-•*\u2013\s\d.)]*(.+?)[\s:]+(\d+)\s*[x×]\s*([\d]+(?:\s*[-–]\s*\d+)?)(?:\s*(?:@|a|con|kg|—|-)?\s*([\d]+(?:[.,]\d+)?)\s*(?:kg)?)?\s*$/i);
    if(em){
      if(!cur){cur={id:"A",focus:"",ex:[]};days.push(cur)}
      cur.ex.push({raw:em[1].trim(),sets:parseInt(em[2],10)||3,
                   reps:em[3].replace(/\s+/g,""),w:em[4]?parseFloat(em[4].replace(",",".")):null});
    }
  });
  return days.filter(d=>d.ex.length);
}

function buildDaysFromParsed(parsed,refs){
  return parsed.map((d,i)=>{
    const ex=d.ex.map(e=>{
      const li=findExercise(e.raw);
      const ic=li?li.ic:"curl";
      const step=li?(li.st||2.5):2.5;
      let w=e.w;
      if(w==null)w=li&&li.k>0?round((refs[li.ref]||0)*li.k*repFactor(e.reps),step):0;
      return {n:li?li.n:e.raw,ic:ic,img:"",w:w,inc:step,rest:90,r:e.reps,
              sets:mk(w,e.sets),note:li?"":"nome non trovato in libreria",tag:""};
    });
    const warm=(WARMBANK[ex[0]?ex[0].ic:"squat"]||WARMBANK.squat).slice();
    warm.push(["Serie di avvicinamento",(ex[0]?ex[0].n:"primo esercizio")+": vuoto → 50% → 75%"]);
    return {id:d.id||String.fromCharCode(65+i),focus:d.focus||"Allenamento",warm:warm,ex:ex};
  });
}

/* ================= INTERFACCIA A PASSI ================= */
let WZ=null;
function openOnb(recal,isNew,branch){
  WZ={step:0,recal:!!recal,branch:branch||null,
      nome:(S.profile&&S.profile.nome)||"",cognome:(S.profile&&S.profile.cognome)||"",
      peso:(S.profile&&S.profile.peso)||"",level:(S.profile&&S.profile.level)||"i",
      goal:"ricomp",days:3,dur:60,equip:"palestra",limit:"nessuna",acc:["manubri","panca","elastici"],fromSchede:!!branch,
      refs:Object.assign({squat:"",bench:"",row:"",ohp:"",hinge:""},(S.profile&&S.profile.refs)||{}),
      testo:"",parsed:null};
  if(branch==="have"){WZ.branch="have";WZ.step=1}
  else if(branch==="crea"||recal){WZ.branch="crea";WZ.step=2}
  drawWZ();
  document.getElementById("onb").classList.add("on");
}

function wzChips(id,list,sel,cb){
  return `<div class="chips" data-wz="${id}">${list.map(o=>
    `<button class="chip${String(sel)===String(o[0])?" on":""}" data-v="${o[0]}">${o[1]}</button>`).join("")}</div>`;
}

function drawWZ(){
  const box=document.querySelector("#onb .in");
  const S1=WZ.step;
  let h="";

  if(S1===0){
    h=`<h2>Costruiamo la <em>tua</em> scheda</h2>
      <p class="lead">Due strade. Nessuna delle due ti lega le mani: qualunque cosa scegli, dopo puoi modificare ogni esercizio, carico e ripetizione.</p>
      <div class="lbl2">Chi sei</div>
      <div class="grid2">
        <input id="wz_nome" placeholder="Nome" value="${esc(WZ.nome)}" autocomplete="given-name">
        <input id="wz_cognome" placeholder="Cognome" value="${esc(WZ.cognome)}" autocomplete="family-name">
      </div>
      <div class="lbl2">Peso corporeo (kg)</div>
      <input id="wz_peso" class="mono" inputmode="decimal" placeholder="es. 77" value="${esc(WZ.peso)}">
      <div class="lbl2">Da quanto ti alleni con i pesi</div>
      ${wzChips("level",[["p","Meno di 1 anno"],["i","1–3 anni"],["a","Oltre 3 anni"]],WZ.level)}
      <div class="lbl2">Come procediamo</div>
      <button class="alt" id="wz_have" style="width:100%;flex-direction:column;align-items:flex-start;gap:4px">
        <span class="an">Ho gia' una scheda</span>
        <small style="color:var(--soft);font-family:inherit">La inserisci tu: puoi anche incollarla come testo e la riconosco.</small></button>
      <button class="alt" id="wz_make" style="width:100%;flex-direction:column;align-items:flex-start;gap:4px;margin-top:8px">
        <span class="an">Creala tu per me</span>
        <small style="color:var(--soft);font-family:inherit">Poche domande su obiettivo, giorni e attrezzatura. La costruisco su misura.</small></button>`;
  }

  if(S1===1){ // ramo "ho gia' una scheda"
    h=`<h2>La <em>tua</em> scheda</h2>
      <p class="lead">Incollala qui sotto come ce l'hai scritta. Riconosco righe tipo <b>Panca piana 4x8 60kg</b>, raggruppate sotto <b>GIORNO A</b>. Se preferisci, salta e aggiungi gli esercizi a mano dalla libreria.</p>
      <textarea id="wz_txt" class="urlin" rows="10" style="resize:vertical;min-height:190px;font-family:'IBM Plex Mono',monospace;font-size:15px" placeholder="GIORNO A&#10;Squat 4x8 100kg&#10;Panca piana 4x8 60kg&#10;Seated row 3x10 54&#10;&#10;GIORNO B&#10;RDL 4x8 75kg&#10;Lat machine 4x10 54">${esc(WZ.testo)}</textarea>
      <button class="genbtn" id="wz_parse" style="margin-top:12px">Leggi la scheda</button>
      <div id="wz_prev"></div>
      <button class="skipbtn" id="wz_manual">Non ce l'ho scritta: creo i giorni vuoti e aggiungo dalla libreria</button>
      <button class="skipbtn" id="wz_back">Indietro</button>`;
  }

  if(S1===2){ // obiettivo
    h=`<h2>Qual e' l'<em>obiettivo</em></h2>
      <p class="lead">Questo decide serie, ripetizioni e recuperi. E' la scelta che cambia di piu' l'allenamento.</p>
      ${GOALS.map(g=>`<button class="alt wzgoal${WZ.goal===g[0]?" on":""}" data-v="${g[0]}" style="width:100%;flex-direction:column;align-items:flex-start;gap:3px;margin-bottom:7px;${WZ.goal===g[0]?"border-color:var(--acc)":""}">
        <span class="an">${g[1]}</span><small style="color:var(--soft);font-family:inherit">${g[2]}</small></button>`).join("")}
      <button class="genbtn" id="wz_n2">Avanti</button>
      <button class="skipbtn" id="wz_back">Indietro</button>`;
  }

  if(S1===3){ // frequenza e durata
    const split={2:"Full body ×2",3:"Full body A/B/C",4:"Alto/Basso ×2",5:"Spinta · Tirata · Gambe · Alto · Basso"}[WZ.days];
    h=`<h2>Quanto <em>tempo</em> hai</h2>
      <p class="lead">Frequenza e durata decidono la struttura dei giorni e quanti esercizi entrano in ognuno.</p>
      <div class="lbl2">Allenamenti a settimana</div>
      ${wzChips("days",[[2,"2"],[3,"3"],[4,"4"],[5,"5"]],WZ.days)}
      <div class="sub" style="margin:8px 0 0">Struttura: <b>${split}</b></div>
      <div class="lbl2">Durata di una seduta</div>
      ${wzChips("dur",[[40,"40 min"],[60,"60 min"],[75,"75 min"]],WZ.dur)}
      <div class="sub" style="margin:8px 0 0">${WZ.dur<=40?"4":WZ.dur>=75?"7":"6"} esercizi per seduta.</div>
      <button class="genbtn" id="wz_n3">Avanti</button>
      <button class="skipbtn" id="wz_back">Indietro</button>`;
  }

  if(S1===4){ // attrezzatura e limitazioni
    h=`<h2>Con cosa ti <em>alleni</em></h2>
      <p class="lead">Scelgo solo esercizi che puoi davvero eseguire.</p>
      <div class="lbl2">Attrezzatura</div>
      ${EQUIPS.map(e=>`<button class="alt wzeq${WZ.equip===e[0]?" on":""}" data-v="${e[0]}" style="width:100%;flex-direction:column;align-items:flex-start;gap:3px;margin-bottom:7px;${WZ.equip===e[0]?"border-color:var(--acc)":""}">
        <span class="an">${e[1]}</span><small style="color:var(--soft);font-family:inherit">${e[2]}</small></button>`).join("")}
      ${WZ.equip==="casa"?`<div class="lbl2">Cosa hai in casa</div>
        <div class="chips" id="wzacc">${ACCS.map(a=>
          `<button class="chip${(WZ.acc||[]).includes(a[0])?" on":""}" data-a="${a[0]}">${a[1]}</button>`).join("")}</div>
        <div class="sub" style="margin:8px 0 0">${(WZ.acc||[]).length?"Uso solo esercizi eseguibili con questi attrezzi, più il corpo libero.":"Nessun attrezzo selezionato: userò solo corpo libero."}</div>`:""}
      <div class="lbl2">Zone da risparmiare</div>
      ${wzChips("limit",LIMITS,WZ.limit)}
      <div class="sub" style="margin:8px 0 0">Escludo i movimenti che caricano quell'articolazione e li sostituisco.</div>
      <button class="genbtn" id="wz_n4">Avanti</button>
      <button class="skipbtn" id="wz_back">Indietro</button>`;
  }

  if(S1===5){ // carichi
    h=`<h2>I tuoi <em>carichi</em></h2>
      <p class="lead">Kg per circa 8 ripetizioni. Lascia vuoto quello che non sai: lo stimo da peso ed esperienza, e si ricalibra da solo dalle prime sedute.</p>
      <div class="card" style="padding:6px 14px">
        <div class="liftrow"><span class="ln">Squat<small>base gambe</small></span><input class="mono" id="wz_squat" inputmode="decimal" placeholder="?" value="${esc(WZ.refs.squat||"")}"></div>
        <div class="liftrow"><span class="ln">Panca piana<small>spinta orizzontale</small></span><input class="mono" id="wz_bench" inputmode="decimal" placeholder="?" value="${esc(WZ.refs.bench||"")}"></div>
        <div class="liftrow"><span class="ln">Rematore<small>tirata orizzontale</small></span><input class="mono" id="wz_row" inputmode="decimal" placeholder="?" value="${esc(WZ.refs.row||"")}"></div>
        <div class="liftrow"><span class="ln">Lento avanti<small>spinta verticale</small></span><input class="mono" id="wz_ohp" inputmode="decimal" placeholder="?" value="${esc(WZ.refs.ohp||"")}"></div>
        <div class="liftrow"><span class="ln">Stacco rumeno<small>cerniera d'anca</small></span><input class="mono" id="wz_hinge" inputmode="decimal" placeholder="?" value="${esc(WZ.refs.hinge||"")}"></div>
      </div>
      <button class="genbtn" id="wz_go">${WZ.recal?"Rigenera la scheda":"Genera la mia scheda"}</button>
      <button class="skipbtn" id="wz_back">Indietro</button>`;
  }

  box.innerHTML=h;
  wireWZ();
  box.parentElement.scrollTop=0;
}

function wireWZ(){
  const box=document.querySelector("#onb .in");
  const val=id=>{const e=document.getElementById(id);return e?e.value.trim():""};
  const num=id=>{const v=val(id).replace(",",".");return v===""?null:parseFloat(v)};

  box.querySelectorAll(".chips[data-wz]").forEach(c=>{
    const key=c.dataset.wz;
    c.querySelectorAll(".chip").forEach(b=>b.onclick=()=>{
      let v=b.dataset.v;
      if(key==="days"||key==="dur")v=parseInt(v,10);
      WZ[key]=v;
      if(key==="days"||key==="dur")drawWZ();
      else c.querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x===b));
    });
  });
  box.querySelectorAll(".wzgoal").forEach(b=>b.onclick=()=>{WZ.goal=b.dataset.v;drawWZ()});
  box.querySelectorAll(".wzeq").forEach(b=>b.onclick=()=>{WZ.equip=b.dataset.v;drawWZ()});
  const accBox=box.querySelector("#wzacc");
  if(accBox)accBox.querySelectorAll(".chip").forEach(b=>b.onclick=()=>{
    if(!WZ.acc)WZ.acc=[];
    const a=b.dataset.a;
    WZ.acc=WZ.acc.includes(a)?WZ.acc.filter(x=>x!==a):WZ.acc.concat([a]);
    drawWZ();
  });

  const grab0=()=>{WZ.nome=val("wz_nome");WZ.cognome=val("wz_cognome");WZ.peso=val("wz_peso")};
  const back=box.querySelector("#wz_back");
  if(back)back.onclick=()=>{WZ.step=WZ.step<=2?0:WZ.step-1;if(WZ.step===1&&WZ.branch==="crea")WZ.step=0;drawWZ()};

  const have=box.querySelector("#wz_have");
  if(have)have.onclick=()=>{grab0();WZ.branch="have";WZ.step=1;drawWZ()};
  const make=box.querySelector("#wz_make");
  if(make)make.onclick=()=>{grab0();WZ.branch="crea";WZ.step=2;drawWZ()};

  const n2=box.querySelector("#wz_n2"); if(n2)n2.onclick=()=>{WZ.step=3;drawWZ()};
  const n3=box.querySelector("#wz_n3"); if(n3)n3.onclick=()=>{WZ.step=4;drawWZ()};
  const n4=box.querySelector("#wz_n4"); if(n4)n4.onclick=()=>{WZ.step=5;drawWZ()};

  /* --- ramo "ho gia' una scheda" --- */
  const pz=box.querySelector("#wz_parse");
  if(pz)pz.onclick=()=>{
    WZ.testo=val("wz_txt");
    const parsed=parseSchedaText(WZ.testo);
    const prev=box.querySelector("#wz_prev");
    if(!parsed.length){prev.innerHTML=`<div class="nextbox late" style="margin:12px 0">Non ho riconosciuto nessun esercizio. Servono righe con serie e ripetizioni, tipo <b>Panca piana 4x8 60kg</b>.</div>`;return}
    WZ.parsed=parsed;
    const tot=parsed.reduce((a,d)=>a+d.ex.length,0);
    let noti=0;parsed.forEach(d=>d.ex.forEach(e=>{if(findExercise(e.raw))noti++}));
    prev.innerHTML=`<div class="lbl2" style="margin-top:16px">Anteprima — ${parsed.length} giorni, ${tot} esercizi</div>
      <div class="card" style="padding:10px 13px">${parsed.map(d=>
        `<div style="margin-bottom:8px"><b style="font-family:'Anton',sans-serif;text-transform:uppercase;color:var(--acc)">Giorno ${d.id}</b>
         ${d.ex.map(e=>{const li=findExercise(e.raw);
           return `<div class="sub" style="margin:2px 0">${li?"":"⚠ "}${esc(li?li.n:e.raw)} — ${e.sets}×${esc(e.reps)}${e.w!=null?" @ "+fmt(e.w)+" kg":""}</div>`}).join("")}</div>`).join("")}
      </div>
      <div class="sub" style="margin:8px 0 0">${noti} su ${tot} riconosciuti in libreria${noti<tot?": quelli con ⚠ entrano comunque, col nome che hai scritto.":"."}</div>
      <button class="genbtn" id="wz_useparsed" style="margin-top:12px">Usa questa scheda</button>`;
    prev.querySelector("#wz_useparsed").onclick=()=>finishWZ("parsed");
  };
  const man=box.querySelector("#wz_manual");
  if(man)man.onclick=()=>finishWZ("manual");

  const go=box.querySelector("#wz_go");
  if(go)go.onclick=async()=>{
    WZ.refs={squat:num("wz_squat"),bench:num("wz_bench"),row:num("wz_row"),ohp:num("wz_ohp"),hinge:num("wz_hinge")};
    if(WZ.recal&&!WZ.fromSchede&&
       !await ask("Rigenero la scheda con queste risposte?<br><small style='color:var(--soft)'>Storico e misure restano intatti.</small>","Rigenera"))return;
    finishWZ("gen");
  };
}

async function finishWZ(mode){
  const peso=parseFloat(String(WZ.peso).replace(",","."))||75;
  const refs=genRefs(peso,WZ.level,WZ.refs||{});
  S.profile={nome:WZ.nome,cognome:WZ.cognome,peso:peso,level:WZ.level,refs:refs,
             goal:(mode==="gen"?WZ.goal:(S.profile&&S.profile.goal)||"")};

  if(mode==="gen"){
    S.days=generateScheda({days:WZ.days,goal:WZ.goal,equip:WZ.equip,limit:WZ.limit,dur:WZ.dur,refs:refs});
    S.setup={equip:WZ.equip,acc:(WZ.acc||[]).slice(),limit:WZ.limit,dur:WZ.dur,days:WZ.days};
    try{
      rebalanceVolume(S.days,WZ.equip,WZ.limit,WZ.acc||[],refs);
      S.days=orderByRecovery(S.days,WZ.days>=4?1:2);
    }catch(err){}
    S.cfg.target=WZ.dur;
    S.cfg.gap=WZ.days>=4?1:2;
  } else if(mode==="parsed"){
    S.days=buildDaysFromParsed(WZ.parsed,refs);
  } else {                           // giorni vuoti, li riempie dalla libreria
    S.days=[0,1,2].map(i=>({id:String.fromCharCode(65+i),focus:"Allenamento "+String.fromCharCode(65+i),
                            warm:(WARMBANK.squat||[]).slice(),ex:[]}));
  }
  S.pendingOnb=false; S.onbDone=true;
  if(!S.body.some(b=>b.t===new Date().toISOString().slice(0,10)))
    S.body.push({t:new Date().toISOString().slice(0,10),peso:peso,bf:null,vita:null,fianchi:null,torace:null,braccio:null,coscia:null});
  store.set("onb_done","1");
  save();
  document.getElementById("onb").classList.remove("on");
  view="A"; render(); updateBarInfo();
  const n=S.days.reduce((a,d)=>a+d.ex.length,0);
  toast(mode==="manual"?"Giorni creati — aggiungi gli esercizi dalla libreria"
        :`Scheda pronta — ${S.days.length} giorni, ${n} esercizi`);
  setTimeout(firstRunFlow,900);
}



/* ==================== ARCHIVIO DEI CICLI DI ALLENAMENTO ====================
   Un "ciclo" e' la scheda multi-giorno intera (A/B/C...), non la singola
   giornata. Vive dentro S.saved insieme alle schede al volo del tab RANDOM,
   distinto dal campo kind:"ciclo". Lo storico delle sedute NON viene mai
   toccato: resta unico e continuo, cosi' i grafici di forza attraversano i
   cicli senza interruzioni.
   ========================================================================= */

function cycleList(){return (S.saved||[]).filter(x=>x.kind==="ciclo").sort((a,b)=>b.ts-a.ts)}
function dayCardList(){return (S.saved||[]).filter(x=>x.kind!=="ciclo")}

const GOAL_LABEL=o=>((GOALS.find(g=>g[0]===o)||[])[1]||"");

function cycleStats(days){
  const ex=days.reduce((a,d)=>a+((d.ex&&d.ex.length)||0),0);
  const serie=days.reduce((a,d)=>a+(d.ex||[]).reduce((b,e)=>b+((e.sets&&e.sets.length)||0),0),0);
  return {giorni:days.length,esercizi:ex,serie:serie};
}

/* copia la scheda attuale nell'archivio. Le serie vengono azzerate: si archivia
   la struttura, non l'esecuzione, che sta gia' nello storico. */
function archiveCurrent(name){
  if(!S.days||!cycleStats(S.days).esercizi)return null;
  const days=structuredClone(S.days);
  days.forEach(d=>(d.ex||[]).forEach(e=>(e.sets||[]).forEach(s=>{s.done=false;s.r="";delete s.rir})));
  const c={id:"c"+Date.now().toString(36),kind:"ciclo",ts:Date.now(),
    name:(name||"").trim()||("Ciclo del "+new Date().toLocaleDateString("it-IT",{day:"2-digit",month:"short",year:"2-digit"})),
    goal:(S.profile&&S.profile.goal)||"",
    stats:cycleStats(S.days),days:days};
  if(!S.saved)S.saved=[];
  S.saved.push(c);save();
  return c;
}

/* mette in servizio un ciclo archiviato, offrendo di salvare quello corrente */
async function useCycle(id){
  const c=cycleList().find(x=>x.id===id);if(!c)return;
  const cur=cycleStats(S.days||[]);
  if(cur.esercizi){
    const gia=cycleList().some(x=>x.id!==c.id&&JSON.stringify(x.days)===JSON.stringify(S.days));
    if(!gia){
      const salva=await ask(`Prima archivio la scheda che stai usando?<br><small style="color:var(--soft)">${cur.giorni} giorni, ${cur.esercizi} esercizi. Cosi' puoi tornarci quando vuoi.</small>`,"Archivia");
      if(salva)archiveCurrent("");
    }
  }
  S.days=structuredClone(c.days);
  S.days.forEach(d=>(d.ex||[]).forEach(e=>(e.sets||[]).forEach(s=>{s.done=false;s.r=""})));
  save();view="A";store.set("scheda_view","A");
  closeModal();render();updateBarInfo();
  toast(`In servizio: ${c.name}`);
}

/* ---------------- schermata "Le mie schede" ---------------- */
function schedeAsk(){
  const sheet=document.getElementById("sheet");
  const draw=()=>{
    const cur=cycleStats(S.days||[]);
    const cicli=cycleList();
    const giornate=dayCardList();
    sheet.innerHTML=`
      <h3>Le mie schede</h3>
      <div class="sub">Cambia allenamento quando vuoi. Lo storico delle sedute resta sempre uno solo: qualunque scheda usi, i progressi continuano sulla stessa linea.</div>

      <div class="lbl2">In servizio adesso</div>
      <div class="card" style="padding:11px 13px">
        <div style="font-weight:600;font-size:15px">${esc((S.profile&&S.profile.nome)?("Scheda di "+S.profile.nome):"Scheda attuale")}</div>
        <div class="sub" style="margin-top:2px">${cur.giorni} giorni · ${cur.esercizi} esercizi · ${cur.serie} serie${(S.profile&&S.profile.goal)?" · "+esc(GOAL_LABEL(S.profile.goal)):""}</div>
      </div>
      <button class="revert" id="sc_arch" style="margin-top:8px" ${cur.esercizi?"":"disabled"}>★ Archivia questa scheda</button>

      <div class="lbl2" style="margin-top:18px">Cambia scheda</div>
      <button class="alt" id="sc_new" style="width:100%;flex-direction:column;align-items:flex-start;gap:4px">
        <span class="an">Generane una nuova</span>
        <small style="color:var(--soft);font-family:inherit">Rispondi alle domande su obiettivo, giorni e attrezzatura. Archivio prima quella attuale.</small></button>
      <button class="alt" id="sc_have" style="width:100%;flex-direction:column;align-items:flex-start;gap:4px;margin-top:7px">
        <span class="an">Inseriscine una che hai gia'</span>
        <small style="color:var(--soft);font-family:inherit">La incolli come testo e la riconosco.</small></button>

      <div class="lbl2" style="margin-top:18px">Archivio${cicli.length?" — "+cicli.length:""}</div>
      ${cicli.length?cicli.map(c=>`
        <button class="alt sc_row" data-id="${c.id}" style="width:100%">
          <span class="an">${esc(c.name)}<small>${c.stats.giorni} giorni · ${c.stats.esercizi} esercizi${c.goal?" · "+esc(GOAL_LABEL(c.goal)):""} · ${new Date(c.ts).toLocaleDateString("it-IT",{day:"2-digit",month:"short",year:"2-digit"})}</small></span>
          <span class="aw" style="display:flex;gap:10px;align-items:center">
            <em style="color:var(--acc);font-size:12px">usa</em>
            <span class="sc_del" data-id="${c.id}" style="color:#F87171;padding:0 4px">×</span></span>
        </button>`).join(""):
        `<div class="empty">Nessuna scheda archiviata. Archivia quella attuale prima di cambiarla: ci torni quando vuoi.</div>`}

      ${giornate.length?`<div class="lbl2" style="margin-top:18px">Allenamenti singoli — tab RANDOM</div>
        <div class="sub">${giornate.length} salvat${giornate.length===1?"o":"i"}. Li carichi dal tab RANDOM.</div>`:""}

      <button class="closebtn" id="sc_close" style="margin-top:16px">Chiudi</button>`;

    sheet.querySelector("#sc_close").onclick=closeModal;

    sheet.querySelector("#sc_arch").onclick=async()=>{
      const n=await prompt2("Nome di questa scheda:","Ciclo del "+new Date().toLocaleDateString("it-IT",{day:"2-digit",month:"short",year:"2-digit"}));
      if(n===null)return;
      archiveCurrent(n);draw();toast("Scheda archiviata");
    };
    sheet.querySelector("#sc_new").onclick=async()=>{
      if(cycleStats(S.days||[]).esercizi){
        const s=await ask("Archivio la scheda attuale prima di generarne una nuova?<br><small style=\"color:var(--soft)\">Consigliato: cosi' puoi rimetterla in servizio in un tocco.</small>","Archivia");
        if(s)archiveCurrent("");
      }
      closeModal();openOnb(true,false,"crea");
    };
    sheet.querySelector("#sc_have").onclick=async()=>{
      if(cycleStats(S.days||[]).esercizi){
        const s=await ask("Archivio la scheda attuale prima di inserirne un'altra?","Archivia");
        if(s)archiveCurrent("");
      }
      closeModal();openOnb(true,false,"have");
    };
    sheet.querySelectorAll(".sc_row").forEach(b=>b.onclick=ev=>{
      if(ev.target.classList.contains("sc_del"))return;
      useCycle(b.dataset.id);
    });
    sheet.querySelectorAll(".sc_del").forEach(x=>x.onclick=async ev=>{
      ev.stopPropagation();
      const c=cycleList().find(y=>y.id===x.dataset.id);if(!c)return;
      if(await ask(`Elimino <b>${esc(c.name)}</b> dall'archivio?<br><small style="color:var(--soft)">Le sedute gia' registrate con questa scheda restano nello storico.</small>`,"Elimina")){
        S.saved=S.saved.filter(y=>y.id!==c.id);save();draw();toast("Scheda eliminata");
      }
    });
  };
  draw();
  document.getElementById("modal").classList.add("on");
}



/* ============ CHIAVE GOOGLE: SETUP GUIDATO E SINCRONIZZAZIONE ============
   La chiave e' un segreto dell'utente. Di default resta su questo dispositivo.
   Con l'interruttore acceso viene scritta anche nella riga Supabase dell'utente,
   protetta dalle regole RLS, cosi' lo segue su telefono e computer. */


function setGemKey(k){
  k=(k||"").trim();
  store.set("gem_key",k);
  /* la chiave non entra piu' nello stato S (e quindi nei backup): la
     sincronizzazione passa dalla tabella dedicata, legata all'account */
  if(S.ai&&S.ai.key){delete S.ai.key;save()}
  pushAIKeys();
}
/* all'avvio: se la chiave arriva dal cloud e qui non c'e', la si adotta */
function adoptCloudKey(){
  /* migrazione dal vecchio meccanismo (chiave dentro lo stato): la si adotta
     una volta, la si spinge nella tabella dedicata e si ripulisce lo stato */
  if(S&&S.ai&&S.ai.key){
    if(!store.get("gem_key"))store.set("gem_key",S.ai.key);
    delete S.ai.key;save();pushAIKeys();
  }
}

function gemSetupAsk(){
  const sheet=document.getElementById("sheet");
  const draw=()=>{
    const has=!!gemKey();
    sheet.innerHTML=`
      <h3>Analisi automatica</h3>
      <div class="sub">Collegando una chiave Google gratuita, l'app manda da sola le tue sedute all'AI e ti riporta la valutazione da personal trainer. Niente copia e incolla, nessun costo, nessuna carta di credito.</div>

      <div class="nextbox" style="margin:14px 0">
        <b>Cosa ci guadagni</b><br>
        Valutazione dei carichi e del volume dopo ogni ciclo, con le modifiche alla scheda pronte da applicare in un tocco.
      </div>

      <div class="lbl2">Come ottenerla — due minuti</div>
      <ol class="cues" style="padding-left:26px">
        <li>Apri <b>aistudio.google.com/apikey</b> e accedi col tuo account Google.</li>
        <li>Premi <b>Create API key</b> e conferma. Se ti chiede un progetto, accetta quello proposto.</li>
        <li>Copia la chiave: inizia con <b>AIza</b>.</li>
        <li>Torna qui e incollala nel campo sotto.</li>
      </ol>
      <button class="genbtn" id="gs_open" style="margin-bottom:14px">Apri Google AI Studio</button>

      <div class="lbl2">La tua chiave</div>
      <input class="urlin" id="gs_key" type="password" placeholder="AIza…" value="${esc(gemKey())}">
      <div class="cfgrow" style="padding:10px 0">
        <span class="cl">Legata al tuo account<small>${SESSION?"le chiavi ti seguono su ogni dispositivo dove accedi":"offline: restano su questo dispositivo finche' non accedi"}</small></span>
        <span class="lbl">${SESSION?"sincronizzata":"solo locale"}</span>
      </div>

      <div class="lbl2" style="margin-top:16px">Provider di riserva — se Gemini esaurisce la quota</div>
      <div class="sub" style="font-size:12px;margin-bottom:8px">Facoltativi e gratuiti. Il passaggio e' automatico quando Gemini risponde "limite raggiunto". Le chiavi restano solo su questo dispositivo.</div>
      <div class="lbl2">Chiave Groq — console.groq.com</div>
      <input class="urlin" id="gs_groq" type="password" placeholder="gsk_…" value="${esc(groqKey())}">
      <div class="lbl2">Chiave Mistral — console.mistral.ai</div>
      <input class="urlin" id="gs_mistral" type="password" placeholder="…" value="${esc(mistralKey())}">
      <div class="lbl2">Quale usare</div>
      <div class="chips" id="gs_prov">
        ${[["auto","Automatico"],["gemini","Solo Gemini"],["groq","Solo Groq"],["mistral","Solo Mistral"]].map(([k,l])=>
          `<button class="chip${aiProvider()===k?" on":""}" data-p="${k}">${l}</button>`).join("")}
      </div>
      <div class="sub" style="font-size:12px;margin-bottom:12px">Se attivi la sincronizzazione, la chiave viene salvata nella tua riga su Supabase, leggibile solo dal tuo account. Se preferisci non scriverla in cloud, lasciala spenta e reinseriscila sull'altro dispositivo.</div>

      <button class="genbtn" id="gs_save">${has?"Aggiorna la chiave":"Salva e attiva"}</button>
      ${has?`<button class="revert" id="gs_test" style="margin-top:8px">Prova il collegamento</button>
             <button class="revert" id="gs_del" style="margin-top:8px">Rimuovi la chiave</button>`:""}
      <div id="gs_out"></div>
      <button class="closebtn" id="gs_close" style="margin-top:10px">Chiudi</button>`;

    sheet.querySelector("#gs_close").onclick=closeModal;
    sheet.querySelector("#gs_open").onclick=()=>{
      try{window.open("https://aistudio.google.com/apikey","_blank","noopener")}catch(e){}
    };
    sheet.querySelector("#gs_groq").onchange=ev=>{store.set("groq_key",ev.target.value.trim());pushAIKeys();toast(SESSION?"Chiave Groq salvata sul tuo account":"Chiave Groq salvata su questo dispositivo")};
    sheet.querySelector("#gs_mistral").onchange=ev=>{store.set("mistral_key",ev.target.value.trim());pushAIKeys();toast(SESSION?"Chiave Mistral salvata sul tuo account":"Chiave Mistral salvata su questo dispositivo")};
    sheet.querySelectorAll("#gs_prov .chip").forEach(b=>b.onclick=()=>{store.set("ai_provider",b.dataset.p);pushAIKeys();draw()});

    sheet.querySelector("#gs_save").onclick=async()=>{
      const k=sheet.querySelector("#gs_key").value.trim();
      if(!k){toast("Incolla prima la chiave");return}
      if(!/^AIza/.test(k)&&!await ask("Questa chiave non inizia con <b>AIza</b>: di solito e' un errore di copia.<br><small style='color:var(--soft)'>La salvo lo stesso?</small>","Salva"))return;
      setGemKey(k);
      S.ai.setupDone=true;save();
      toast(SESSION?"Chiave salvata sul tuo account":"Chiave salvata su questo dispositivo");
      draw();
    };
    const t=sheet.querySelector("#gs_test");
    if(t)t.onclick=async()=>{
      const out=sheet.querySelector("#gs_out");
      out.innerHTML=`<div class="sub" style="margin-top:12px">Provo il collegamento…</div>`;
      try{
        const r=await askAI("Rispondi con una sola parola: pronto");
        out.innerHTML=`<div class="nextbox" style="margin-top:12px">Collegamento riuscito. Risposta del modello: <b>${esc(r.trim().slice(0,40))}</b></div>`;
      }catch(e){
        out.innerHTML=`<div class="nextbox late" style="margin-top:12px">${esc(e.message||"Errore")}</div>`;
      }
    };
    const d=sheet.querySelector("#gs_del");
    if(d)d.onclick=async()=>{
      if(!await ask("Rimuovo la chiave da questo dispositivo?","Rimuovi"))return;
      store.del("gem_key");
      if(S.ai){delete S.ai.key;save()}
      draw();toast("Chiave rimossa");
    };
  };
  draw();
  document.getElementById("modal").classList.add("on");
}

/* ==================== MINI TUTORIAL AL PRIMO AVVIO ==================== */
const TUTORIAL=[
 {t:"Come funziona questa app",
  b:"Segna quello che fai in palestra, e l'app fa il resto: calcola i carichi, riconosce gli stalli e ti dice quando salire. Ci vuole un minuto per capirla."},
 {t:"Le serie si spuntano",
  b:"Ogni esercizio ha le sue righe: peso, ripetizioni e il segno di spunta. Appena spunti una serie parte da solo il timer del recupero, con avviso sonoro quando è ora di ripartire."},
 {t:"Il RIR è il dato più importante",
  b:"RIR significa <b>ripetizioni di riserva</b>: quante ne avresti ancora fatte prima di fermarti. RIR 2 vuol dire che ne avevi altre due in canna.<br><br>Serve perché 10 ripetizioni tirate al limite e 10 comode sono due allenamenti diversi, anche se il peso è identico. Senza RIR l'app non distingue un progresso da uno sforzo maggiore.<br><br>Per l'ipertrofia stai tra <b>RIR 1 e 3</b>."},
 {t:"I carichi si tarano da soli",
  b:"L'app stima il tuo massimale da peso, ripetizioni e RIR con la formula di Epley pesata sulle sedute recenti. Più sedute registri, più le stime diventano precise — e con loro i carichi suggeriti sugli esercizi nuovi."},
 {t:"Le superserie",
  b:"Due esercizi marcati con la barra laterale si fanno <b>di fila, senza recupero in mezzo</b>. Il recupero arriva solo dopo il secondo. Servono a risparmiare tempo sull'isolamento."},
 {t:"Il deload",
  b:"Se l'app vede carichi fermi e volume alto per settimane, ti propone una <b>settimana di scarico</b>: stessi esercizi, carichi ridotti. Non è tempo perso — è quando il corpo incassa il lavoro fatto."},
 {t:"Registra sempre a fine seduta",
  b:"Il tasto <b>Registra seduta</b> chiude l'allenamento e lo archivia nello storico. È quello che alimenta grafici, trend e analisi.<br><br>Se non registri, per l'app quella seduta non è mai esistita."}
];
function tutorialAsk(from){
  let i=0;
  const sheet=document.getElementById("sheet");
  const draw=()=>{
    const p=TUTORIAL[i], last=i===TUTORIAL.length-1;
    sheet.innerHTML=`
      <div class="sub" style="font-family:'IBM Plex Mono',monospace;letter-spacing:.1em">${i+1} / ${TUTORIAL.length}</div>
      <h3>${p.t}</h3>
      <div class="cues" style="padding:14px;font-size:15px;line-height:1.55;margin-top:10px">${p.b}</div>
      <button class="genbtn" id="tu_next" style="margin-top:14px">${last?"Ho capito, iniziamo":"Avanti"}</button>
      ${i>0?`<button class="revert" id="tu_prev" style="margin-top:8px">Indietro</button>`:""}
      ${!last?`<button class="skipbtn" id="tu_skip">Salta il tutorial</button>`:""}`;
    sheet.querySelector("#tu_next").onclick=()=>{
      if(last){S.tutDone=true;save();closeModal();if(!from)maybeKeyPitch()}
      else{i++;draw()}
    };
    const pv=sheet.querySelector("#tu_prev"); if(pv)pv.onclick=()=>{i--;draw()};
    const sk=sheet.querySelector("#tu_skip");
    if(sk)sk.onclick=()=>{S.tutDone=true;save();closeModal();if(!from)maybeKeyPitch()};
  };
  draw();
  document.getElementById("modal").classList.add("on");
}

/* proposta della chiave AI, una volta sola e solo se non e' gia' configurata */
function maybeKeyPitch(){
  if(gemKey()||(S.ai&&S.ai.pitchDone))return;
  setTimeout(()=>{
    const sheet=document.getElementById("sheet");
    sheet.innerHTML=`
      <h3>Un'ultima cosa</h3>
      <div class="sub">Importando una chiave Google gratuita puoi accedere alle valutazioni AI sempre aggiornate: l'app analizza da sola le tue sedute e ti propone le modifiche alla scheda, pronte da applicare.</div>
      <div class="sub" style="margin-top:10px">Serve due minuti, non chiede la carta di credito, e puoi farlo anche più avanti da <b>Impostazioni</b>.</div>
      <button class="genbtn" id="kp_go" style="margin-top:14px">Configura ora</button>
      <button class="skipbtn" id="kp_no">Più tardi</button>`;
    sheet.querySelector("#kp_go").onclick=()=>{if(!S.ai)S.ai={};S.ai.pitchDone=true;save();gemSetupAsk()};
    sheet.querySelector("#kp_no").onclick=()=>{if(!S.ai)S.ai={};S.ai.pitchDone=true;save();closeModal()};
    document.getElementById("modal").classList.add("on");
  },600);
}

/* punto unico di ingresso dopo il login: tutorial -> chiave -> installazione */
function firstRunFlow(){
  adoptCloudKey();
  if(!S.tutDone){tutorialAsk(false);return}
  if(!gemKey()&&!(S.ai&&S.ai.pitchDone)){maybeKeyPitch();return}
  if(typeof maybeBreakAsk==="function"){
    const g=daysSinceLast();
    if(g!=null&&breakPlan(g)){maybeBreakAsk();return}
  }
  maybeHomeHint();
}



/* ======================= MOTORE AI CONDIVISO =======================
   Un solo punto di contatto con Gemini. Tutte le funzioni qui sotto
   costruiscono un contesto compatto (scheda, obiettivo, storico recente)
   e chiedono risposte in JSON, cosi' l'app puo' importarle senza che
   l'utente copi e incolli nulla.
   =================================================================== */

/* estrae JSON anche se il modello lo incarta nei backtick */
function parseJSONLoose(t){
  let x=String(t||"").trim();
  x=x.replace(/^```(?:json)?/i,"").replace(/```$/,"").trim();
  const a=x.indexOf("{"), b=x.lastIndexOf("}");
  const c=x.indexOf("["), d=x.lastIndexOf("]");
  let cand=x;
  if(a>=0&&b>a&&(c<0||a<c))cand=x.slice(a,b+1);
  else if(c>=0&&d>c)cand=x.slice(c,d+1);
  return JSON.parse(cand);
}
async function askGeminiJSON(prompt){
  const t=await askAI(prompt+"\n\nRispondi ESCLUSIVAMENTE con JSON valido, senza backtick, senza testo prima o dopo.");
  try{return parseJSONLoose(t)}catch(e){throw new Error("Risposta non interpretabile. Riprova.")}
}

const GOALTXT=()=>{
  const g=(S.profile&&S.profile.goal)||"";
  return (GOALS.find(x=>x[0]===g)||[])[1]||"ricomposizione corporea";
};

/* posizione esatta nell'allenamento: giorno, esercizio in corso, avanzamento */
function ctxPosition(dayId){
  const d=dayId==="RND"&&S.rnd?{id:"RANDOM",focus:S.rnd.focus,ex:S.rnd.ex}:(S.days||[]).find(x=>x.id===dayId);
  if(!d)return "POSIZIONE: fuori dalla scheda (tab "+dayId+").";
  let tot=0,fatte=0,inCorso=null;
  (d.ex||[]).forEach(e=>{
    const dn=(e.sets||[]).filter(x=>x.done).length, t=(e.sets||[]).length;
    tot+=t;fatte+=dn;
    if(!inCorso&&dn>0&&dn<t)inCorso=e.n+" (serie "+(dn+1)+" di "+t+")";
    if(!inCorso&&dn===0&&fatte>0)inCorso=e.n+" (prossimo)";
  });
  const L=["POSIZIONE ATTUALE: giorno "+d.id+" — "+(d.focus||"")+".",
    "Avanzamento: "+fatte+"/"+tot+" serie completate"+(sessStart?", "+sessMinutes()+" minuti di seduta":", seduta non ancora avviata")+".",
    inCorso?"Esercizio in corso: "+inCorso+".":(fatte===0?"Nessuna serie ancora spuntata.":"")];
  return L.filter(Boolean).join("\n");
}
/* contesto COMPATTO per i turni successivi della chat: la posizione e i numeri
   chiave, senza rimandare ogni volta scheda intera e storico. Il contesto
   completo viaggia solo col primo messaggio: i successivi costerebbero il
   triplo per ripetere cose che il modello ha gia' nella conversazione. */
function ctxCompact(dayId){
  const r=currentRefs();
  return [ctxPosition(dayId),
    "RIFERIMENTI: squat "+r.squat+", panca "+r.bench+", rematore "+r.row+", lento "+r.ohp+", cerniera "+r.hinge+" kg (per ~8 rip).",
    "OBIETTIVO: "+GOALTXT()+"."].join("\n");
}

/* fotografia sintetica della situazione: e' il contesto che accompagna
   ogni richiesta, cosi' l'AI non risponde nel vuoto */
function ctxForAI(dayId){
  // nel tab RANDOM il contesto e' l'allenamento al volo, non la scheda fissa
  if(dayId==="RND"&&S.rnd){
    const L=[];
    L.push("PROFILO: "+((S.profile&&S.profile.nome)||"atleta")+", "+((S.profile&&S.profile.peso)||"?")+" kg.");
    L.push("OBIETTIVO: "+GOALTXT()+".");
    L.push("");
    L.push("ALLENAMENTO AL VOLO DI OGGI (fuori dalla scheda fissa"+(S.rnd.cfg?", "+S.rnd.cfg.min+" minuti":"")+"):");
    (S.rnd.ex||[]).forEach(e=>{
      const fatte=(e.sets||[]).filter(x=>x.done).length, tot=(e.sets||[]).length;
      L.push("- "+e.n+" "+tot+"×"+e.r+" @ "+fmt(e.w)+" kg"+(fatte?"  [FATTO: "+fatte+"/"+tot+"]":"  [DA FARE]"));
    });
    const ult=(S.log||[]).slice(-3).map(x=>x.date+" giorno "+x.d+" — "+(x.ex||[]).map(e=>e.n).join(", ")).join("\n");
    if(ult)L.push("\nULTIME SEDUTE:\n"+ult);
    return L.join("\n");
  }
  const d=(S.days||[]).find(x=>x.id===dayId)||(S.days||[])[0];
  const L=[];
  L.push("PROFILO: "+((S.profile&&S.profile.nome)||"atleta")+
         ", "+((S.profile&&S.profile.peso)||"?")+" kg, esperienza "+
         ({p:"meno di 1 anno",i:"1-3 anni",a:"oltre 3 anni"}[(S.profile&&S.profile.level)]||"?")+".");
  L.push("OBIETTIVO: "+GOALTXT()+".");
  L.push(ctxPosition(dayId));
  const r=currentRefs();
  L.push("RIFERIMENTI DI FORZA (carico per ~8 ripetizioni): squat "+r.squat+" kg, panca "+r.bench+
         " kg, rematore "+r.row+" kg, lento avanti "+r.ohp+" kg, cerniera "+r.hinge+" kg.");
  if(d){
    L.push("");
    L.push("GIORNO "+d.id+" — "+d.focus);
    (d.ex||[]).forEach(e=>{
      const fatte=(e.sets||[]).filter(s=>s.done).length, tot=(e.sets||[]).length;
      L.push("- "+e.n+" "+tot+"×"+e.r+" @ "+fmt(e.w)+" kg"+
             (fatte?"  [FATTO: "+fatte+"/"+tot+" serie]":"  [DA FARE]")+
             (e.note?"  nota: "+e.note:""));
    });
  }
  const alt=(S.days||[]).filter(x=>!d||x.id!==d.id)
    .map(x=>"GIORNO "+x.id+": "+(x.ex||[]).map(e=>e.n).join(", ")).join(" | ");
  if(alt)L.push("\nALTRI GIORNI (per non duplicare): "+alt);
  const ult=(S.log||[]).slice(-3).map(s=>s.date+" giorno "+s.d+" — "+
    (s.ex||[]).map(e=>e.n+" "+e.sets).join("; ")).join("\n");
  if(ult)L.push("\nULTIME SEDUTE:\n"+ult);
  return L.join("\n");
}

/* =============== 10. ALTERNATIVA ESERCIZIO IN PALESTRA =============== */
function aiSwapAsk(ex,dayId){
  const sheet=document.getElementById("sheet");
  let mode="trova", busy=false;
  const draw=(out)=>{
    sheet.innerHTML=`
      <h3>Cambia esercizio</h3>
      <div class="sub">${esc(ex.n)} — ${ex.sets.length}×${esc(ex.r)} @ ${fmt(ex.w)} kg</div>
      <div class="lbl2">Cosa ti serve</div>
      <div class="chips" id="sw_mode">
        <button class="chip${mode==="trova"?" on":""}" data-m="trova">Trovami un'alternativa</button>
        <button class="chip${mode==="valuta"?" on":""}" data-m="valuta">Ho in mente questo</button>
      </div>
      <div class="lbl2">${mode==="trova"?"Perché lo cambi":"Che esercizio vorresti fare"}</div>
      <input class="urlin" id="sw_txt" placeholder="${mode==="trova"
        ?"es. il rack è occupato, oppure mi dà fastidio la spalla"
        :"es. pressa orizzontale, oppure croci ai cavi"}">
      <button class="genbtn" id="sw_go">${mode==="trova"?"Chiedi un'alternativa":"Chiedi se va bene"}</button>
      <div id="sw_out">${out||""}</div>
      <button class="closebtn" id="sw_close" style="margin-top:10px">Chiudi</button>`;
    sheet.querySelectorAll("#sw_mode .chip").forEach(b=>b.onclick=()=>{mode=b.dataset.m;draw()});
    sheet.querySelector("#sw_close").onclick=closeModal;
    sheet.querySelector("#sw_go").onclick=()=>run();
  };

  async function run(){
    if(busy)return;
    const txt=(sheet.querySelector("#sw_txt").value||"").trim();
    if(mode==="valuta"&&!txt){toast("Scrivi che esercizio hai in mente");return}
    busy=true;
    const out=sheet.querySelector("#sw_out");
    out.innerHTML=`<div class="sub" style="margin-top:12px">Sto valutando…</div>`;
    const lib=LIB.map(a=>a[0]).join(" · ");
    const P=[
      "Sei un personal trainer. Rispondi in italiano, brevissimo, niente premesse.",
      "",
      ctxForAI(dayId),
      "",
      "ESERCIZIO DA SOSTITUIRE: "+ex.n+" ("+ex.sets.length+"×"+ex.r+" @ "+fmt(ex.w)+" kg, recupero "+ex.rest+"s)",
      mode==="trova"
        ? "MOTIVO DEL CAMBIO: "+(txt||"non specificato")
        : "L'ATLETA PROPONE: "+txt,
      "",
      mode==="valuta"
        ? "Valuta se la proposta dell'atleta è coerente con l'obiettivo e con il resto del giorno. Poi dai comunque 3 opzioni: la sua proposta (se accettabile) più altre 2, oppure 3 alternative se la sua non va bene."
        : "Proponi 3 alternative che alleninano lo stesso schema motorio, coerenti con l'obiettivo, che NON siano già presenti negli altri giorni e che risolvano il motivo indicato.",
      "",
      "Per ognuna indica serie, ripetizioni, carico in kg e recupero in secondi, coerenti con l'obiettivo e scalati dai riferimenti di forza sopra.",
      "Preferisci nomi presenti in questa libreria: "+lib,
      "",
      'Formato: {"verdetto":"max 20 parole","opzioni":[{"nome":"","serie":3,"ripetizioni":"8-10","peso":40,"recupero":90,"perche":"max 12 parole"}]}'
    ].join("\n");
    try{
      const j=await askGeminiJSON(P);
      const ops=(j.opzioni||[]).slice(0,3);
      if(!ops.length)throw new Error("Nessuna proposta ricevuta.");
      out.innerHTML=`
        ${j.verdetto?`<div class="nextbox" style="margin-top:14px">${esc(j.verdetto)}</div>`:""}
        <div class="lbl2">Scegli</div>
        ${ops.map((o,i)=>`<button class="alt swopt" data-i="${i}" style="width:100%;flex-direction:column;align-items:flex-start;gap:4px;margin-bottom:7px">
          <span class="an">${esc(o.nome)}</span>
          <small style="color:var(--soft);font-family:inherit">${o.serie}×${esc(o.ripetizioni)} @ ${esc(String(o.peso))} kg · rec ${o.recupero}s — ${esc(o.perche||"")}</small>
        </button>`).join("")}`;
      out.querySelectorAll(".swopt").forEach(b=>b.onclick=()=>applySwap(ops[+b.dataset.i]));
    }catch(e){
      out.innerHTML=`<div class="nextbox late" style="margin-top:12px">${esc(e.message||"Errore")}</div>`;
    }finally{busy=false}
  }

  async function applySwap(o){
    const li=findExercise(o.nome);
    const permanente=await ask(
      `Metto <b>${esc(o.nome)}</b> al posto di ${esc(ex.n)}.<br><br>Lo tengo nella scheda anche per le prossime volte, o vale solo per oggi?`,
      "Tienilo sempre","Solo oggi");
    if(!ex.orig)ex.orig={n:ex.n,ic:ex.ic,w:ex.w,r:ex.r,rest:ex.rest,inc:ex.inc,note:ex.note};
    ex.n=o.nome;
    ex.ic=li?li.ic:ex.ic;
    ex.inc=li?(li.st||ex.inc):ex.inc;
    ex.w=parseFloat(String(o.peso).replace(",","."))||ex.w;
    ex.r=String(o.ripetizioni||ex.r);
    ex.rest=parseInt(o.recupero,10)||ex.rest;
    ex.img="";
    ex.note=(o.perche||"")+(permanente?"":" · sostituzione solo per oggi");
    const n=Math.max(1,parseInt(o.serie,10)||ex.sets.length);
    ex.sets=Array.from({length:n},()=>({w:ex.w,r:"",done:false}));
    ex._temp=!permanente;
    if(permanente)delete ex.orig;
    save();closeModal();render();
    toast(permanente?"Esercizio sostituito":"Sostituito solo per oggi");
  }
  draw();
  document.getElementById("modal").classList.add("on");
}

/* ripristina gli esercizi marcati "solo per oggi" quando si chiude la seduta */
function restoreTempSwaps(d){
  if(!d)return 0;
  let n=0;
  (d.ex||[]).forEach(e=>{
    if(e._temp&&e.orig){
      Object.assign(e,e.orig);
      e.sets=Array.from({length:e.sets.length},()=>({w:e.w,r:"",done:false}));
      delete e._temp;delete e.orig;n++;
    }
  });
  return n;
}

/* =============== 4. VALUTAZIONE POST-SEDUTA: DUE DOMANDE =============== */
async function postSessionAsk(entry,dayId){
  const sheet=document.getElementById("sheet");
  const base=[
    {q:"Come è andata rispetto all'ultima volta?",o:["Meglio","Uguale","Peggio"]},
    {q:"Qualcosa non ha funzionato?",o:["Tutto liscio","Un esercizio storto","Ero senza energie"]}
  ];
  let dom=base, ans={}, extra="";
  document.getElementById("modal").classList.add("on");
  sheet.innerHTML=`<h3>Com'è andata?</h3><div class="sub">Due domande, dieci secondi. Servono a spiegare i numeri.</div>
    <div class="sub" style="margin-top:14px">Preparo le domande…</div>`;

  if(gemKey()){
    try{
      const P=["Sei un personal trainer. Guarda la seduta appena conclusa e formula ESATTAMENTE 2 domande brevi, specifiche e a risposta chiusa, per capire cosa c'è dietro i numeri.",
        "Niente domande generiche se i dati suggeriscono qualcosa di preciso (un carico fermo, una serie non completata, un esercizio nuovo).",
        "","CONTESTO:",ctxForAI(dayId),
        "","SEDUTA APPENA REGISTRATA:",
        (entry.ex||[]).map(e=>"- "+e.n+": "+e.sets).join("\n"),
        "Durata "+(entry.min||"?")+" min, tonnellaggio "+entry.vol+" kg.",
        "",'Formato: {"domande":[{"q":"max 12 parole","o":["opzione1","opzione2","opzione3"]}]}'].join("\n");
      const j=await askGeminiJSON(P);
      if(j.domande&&j.domande.length)dom=j.domande.slice(0,2)
        .map(x=>({q:String(x.q||""),o:(x.o||[]).slice(0,3).map(String)}))
        .filter(x=>x.q&&x.o.length);
      if(!dom.length)dom=base;
    }catch(e){dom=base}
  }

  const draw=()=>{
    sheet.innerHTML=`
      <h3>Com'è andata?</h3>
      <div class="sub">Due domande, dieci secondi. Sono le note che spiegano i numeri quando riguardi lo storico.</div>
      ${dom.map((d,i)=>`
        <div class="lbl2">${esc(d.q)}</div>
        <div class="chips psq" data-i="${i}">${d.o.map(o=>
          `<button class="chip${ans[i]===o?" on":""}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>`).join("")}
      <div class="lbl2">Vuoi aggiungere altro (facoltativo)</div>
      <input class="urlin" id="ps_extra" placeholder="es. dolore al ginocchio nell'ultima serie" value="${esc(extra)}">
      <button class="genbtn" id="ps_ok">Salva e chiudi</button>
      <button class="skipbtn" id="ps_skip">Salta</button>`;
    sheet.querySelectorAll(".psq").forEach(c=>c.querySelectorAll(".chip").forEach(b=>b.onclick=()=>{
      ans[+c.dataset.i]=b.dataset.v;draw();
    }));
    sheet.querySelector("#ps_ok").onclick=()=>{
      extra=sheet.querySelector("#ps_extra").value.trim();
      const qa=dom.map((d,i)=>({q:d.q,a:ans[i]||"—"})).filter(x=>x.a!=="—");
      if(extra)qa.push({q:"Note",a:extra});
      if(qa.length){entry.qa=qa;save()}
      closeModal();
      if(qa.length)toast("Note salvate con la seduta");
    };
    sheet.querySelector("#ps_skip").onclick=closeModal;
  };
  draw();
}

/* =============== 12. CHAT CON IL PERSONAL TRAINER =============== */
const CHAT_MAX=40;      // turni conservati; il prompt ne manda gli ultimi 12
function aiChatAsk(){
  if(!S.chat)S.chat=[];
  const sheet=document.getElementById("sheet");
  let busy=false;
  const draw=()=>{
    sheet.innerHTML=`
      <h3>Chiedi al preparatore</h3>
      <div class="sub">Conosce la tua scheda, i carichi e le ultime sedute. Ricorda le conversazioni anche se chiudi l'app.</div>
      <div id="ch_log" style="max-height:46vh;overflow:auto;margin:14px 0">
        ${S.chat.length?S.chat.map(m=>`
          <div style="margin-bottom:10px;text-align:${m.r==="u"?"right":"left"}">
            <div style="display:inline-block;max-width:88%;text-align:left;padding:9px 12px;border-radius:12px;font-size:14px;line-height:1.5;
              background:${m.r==="u"?"var(--acc)":"var(--card2)"};color:${m.r==="u"?"#0C0F14":"var(--text)"};white-space:pre-wrap">${esc(m.t)}</div>
            ${m.r==="a"?chatPatchButton(m.t):""}
          </div>`).join(""):`<div class="empty">Nessuna domanda ancora. Prova con "perché sono fermo sulla panca?" oppure "posso allenarmi due giorni di fila?"</div>`}
      </div>
      <input class="urlin" id="ch_in" placeholder="Scrivi la tua domanda…">
      <button class="genbtn" id="ch_go">Invia</button>
      ${S.chat.length?`<button class="revert" id="ch_clr" style="margin-top:8px">Svuota la conversazione</button>`:""}
      <button class="closebtn" id="ch_close" style="margin-top:8px">Chiudi</button>`;
    const log=sheet.querySelector("#ch_log");if(log)log.scrollTop=log.scrollHeight;
    sheet.querySelector("#ch_close").onclick=closeModal;
    const c=sheet.querySelector("#ch_clr");
    if(c)c.onclick=async()=>{if(await ask("Svuoto la conversazione?","Svuota")){S.chat=[];save();draw()}};
    sheet.querySelectorAll(".chpatch").forEach(b=>b.onclick=async()=>{
      const sempre=await ask("Applico la modifica alla scheda?<br><small style='color:var(--soft)'>Vedrai l'anteprima prima di confermare.</small>","Tienila sempre","Solo oggi");
      applyChatPatch(b.dataset.p,!sempre);
    });
    sheet.querySelector("#ch_go").onclick=send;
    sheet.querySelector("#ch_in").onkeydown=e=>{if(e.key==="Enter")send()};
  };
  async function send(){
    if(busy)return;
    const inp=sheet.querySelector("#ch_in");
    const q=(inp.value||"").trim(); if(!q)return;
    busy=true;
    S.chat.push({r:"u",t:q});save();draw();
    const log=sheet.querySelector("#ch_log");
    log.insertAdjacentHTML("beforeend",`<div class="sub" id="ch_wait">sto pensando…</div>`);
    log.scrollTop=log.scrollHeight;
    const storia=S.chat.slice(-12).map(m=>(m.r==="u"?"ATLETA: ":"TU: ")+m.t).join("\n");
    /* il contesto completo (scheda, storico, altri giorni) viaggia solo col
       primo messaggio della conversazione; dopo basta posizione e numeri:
       il resto e' gia' nella storia che il modello riceve comunque */
    const primoTurno=S.chat.filter(m=>m.r==="u").length<=1;
    const contesto=primoTurno?ctxForAI(view):ctxCompact(view);
    const P=["Sei il personal trainer di questo atleta: esperto di forza, ipertrofia e ricomposizione.",
      "Rispondi in italiano, diretto e tecnico, senza premesse di sicurezza e senza giri di parole.",
      "MASSIMO 120 parole. Vai al punto. Se i dati non bastano per rispondere, dillo e chiedi cosa ti serve.",
      "Se proponi una modifica concreta alla scheda, chiudi con un blocco applicabile:",
      "PATCH SCHEDA / GIORNO X / NomeEsercizio: carico N  (oppure serie N, ripetizioni X, pausa N)",
      "Una riga per modifica. Se non proponi modifiche, non scrivere il blocco.",
      "","CONTESTO AGGIORNATO:",contesto,
      "","CONVERSAZIONE FINORA:",storia,
      "","Rispondi solo all'ultima domanda dell'atleta."].join("\n");
    try{
      const t=await askAI(P);
      S.chat.push({r:"a",t:t.trim()});
      if(S.chat.length>CHAT_MAX)S.chat=S.chat.slice(-CHAT_MAX);
      save();
    }catch(e){
      S.chat.push({r:"a",t:"⚠ "+(e.message||"Errore di collegamento")});
    }finally{busy=false;draw()}
  }
  draw();
  document.getElementById("modal").classList.add("on");
}

/* =============== 13. SPIEGAZIONE ESERCIZIO E FONTI =============== */
async function aiExplainAsk(ex){
  const sheet=document.getElementById("sheet");
  document.getElementById("modal").classList.add("on");
  sheet.innerHTML=`<h3>${esc(ex.n)}</h3><div class="sub" style="margin-top:12px">Preparo la spiegazione…</div>`;
  try{
    const P=["Sei un personal trainer. Spiega l'esecuzione di questo esercizio a un atleta con esperienza "+
      ({p:"meno di 1 anno",i:"1-3 anni",a:"oltre 3 anni"}[(S.profile&&S.profile.level)]||"media")+".",
      "Italiano, asciutto, niente premesse.","","ESERCIZIO: "+ex.n,
      "OBIETTIVO DELL'ATLETA: "+GOALTXT(),
      "",'Formato: {"setup":"","esecuzione":"","errore":"","tut":"es. 3-0-1","cerca":"la frase esatta da cercare su YouTube per vedere il movimento"}',
      "Ogni campo massimo 25 parole."].join("\n");
    const j=await askGeminiJSON(P);
    const q=encodeURIComponent(j.cerca||(ex.n+" tecnica esecuzione"));
    sheet.innerHTML=`
      <h3>${esc(ex.n)}</h3>
      <ol class="cues" style="margin-top:12px">
        <li><b>Set-up:</b> ${esc(j.setup||"")}</li>
        <li><b>Esecuzione:</b> ${esc(j.esecuzione||"")}</li>
        <li><b>Errore tipico:</b> ${esc(j.errore||"")}</li>
        ${j.tut?`<li><b>Tempi (TUT):</b> ${esc(j.tut)}</li>`:""}
      </ol>
      <div class="sub" style="margin-top:10px">Per vedere il movimento serve un video girato da un professionista: le immagini generate dall'AI sbagliano gli angoli articolari e insegnerebbero male.</div>
      <button class="genbtn" id="ax_yt" style="margin-top:12px">Cerca il video su YouTube</button>
      <div class="lbl2">Oppure incolla una GIF o immagine tua</div>
      <input class="urlin" id="ax_img" placeholder="https://…" value="${esc(ex.img||"")}">
      <button class="closebtn" id="ax_close">Chiudi</button>`;
    sheet.querySelector("#ax_yt").onclick=()=>{
      try{window.open("https://www.youtube.com/results?search_query="+q,"_blank","noopener")}catch(e){}
    };
    sheet.querySelector("#ax_img").onchange=e=>{ex.img=e.target.value.trim();save();render();toast("Immagine aggiornata")};
    sheet.querySelector("#ax_close").onclick=closeModal;
  }catch(e){
    sheet.innerHTML=`<h3>${esc(ex.n)}</h3><div class="nextbox late" style="margin-top:12px">${esc(e.message||"Errore")}</div>
      <button class="closebtn" id="ax_close">Chiudi</button>`;
    sheet.querySelector("#ax_close").onclick=closeModal;
  }
}

/* =============== 7. RILETTURA DELLA SCHEDA (commento, non calcolo) =============== */
async function aiReviewScheda(){
  const sheet=document.getElementById("sheet");
  document.getElementById("modal").classList.add("on");
  sheet.innerHTML=`<h3>Revisione della scheda</h3>
    <div class="sub">I carichi restano quelli calcolati dall'app sui tuoi dati. L'AI qui non ricalcola nulla: rilegge la struttura e segnala eventuali squilibri.</div>
    <div class="sub" style="margin-top:14px">Analisi in corso…</div>`;
  try{
    const tutto=(S.days||[]).map(d=>"GIORNO "+d.id+" — "+d.focus+"\n"+
      (d.ex||[]).map(e=>"- "+e.n+" "+e.sets.length+"×"+e.r+" @ "+fmt(e.w)+" kg, rec "+e.rest+"s").join("\n")).join("\n\n");
    const P=["Sei un personal trainer. Rileggi questa scheda e segnala SOLO problemi reali.",
      "NON ricalcolare i carichi: sono derivati dai massimali misurati dell'atleta e non sono in discussione.",
      "Concentrati su: volume settimanale per gruppo muscolare, distretti scoperti o sovraccaricati, schemi motori mancanti, ordine degli esercizi, coerenza con l'obiettivo.",
      "Italiano, asciutto. Se la scheda è equilibrata, dillo e basta: non inventare rilievi.",
      "","OBIETTIVO: "+GOALTXT(),
      "PROFILO: "+((S.profile&&S.profile.peso)||"?")+" kg, esperienza "+
        ({p:"meno di 1 anno",i:"1-3 anni",a:"oltre 3 anni"}[(S.profile&&S.profile.level)]||"?"),
      "","SCHEDA:",tutto,
      "",'Formato: {"verdetto":"max 25 parole","rilievi":[{"cosa":"max 15 parole","perche":"max 20 parole","gravita":"alta|media|bassa"}]}'].join("\n");
    const j=await askGeminiJSON(P);
    const r=(j.rilievi||[]);
    sheet.innerHTML=`
      <h3>Revisione della scheda</h3>
      <div class="nextbox" style="margin:12px 0">${esc(j.verdetto||"")}</div>
      ${r.length?r.map(x=>`<div class="card" style="padding:11px 13px;margin-bottom:7px">
          <div style="font-weight:600">${esc(x.cosa)}</div>
          <div class="sub" style="margin-top:3px">${esc(x.perche)}</div>
          <div class="lbl2" style="margin:6px 0 0;color:${x.gravita==="alta"?"var(--hot)":x.gravita==="media"?"var(--acc)":"var(--soft)"}">rilevanza ${esc(x.gravita||"bassa")}</div>
        </div>`).join(""):`<div class="empty">Nessun rilievo: struttura equilibrata.</div>`}
      <div class="sub" style="margin-top:10px">Sono osservazioni, non modifiche automatiche. Applica quello che condividi da <b>Le mie schede</b> o a mano.</div>
      <button class="closebtn" id="rv_close" style="margin-top:12px">Chiudi</button>`;
    sheet.querySelector("#rv_close").onclick=closeModal;
  }catch(e){
    sheet.innerHTML=`<h3>Revisione della scheda</h3><div class="nextbox late" style="margin-top:12px">${esc(e.message||"Errore")}</div>
      <button class="closebtn" id="rv_close">Chiudi</button>`;
    sheet.querySelector("#rv_close").onclick=closeModal;
  }
}

/* =============== 2. IMPORTA SCHEDA DA FOTO O TESTO, VIA AI =============== */
function aiImportAsk(){
  const sheet=document.getElementById("sheet");
  let img=null, imgName="";
  const draw=(out)=>{
    sheet.innerHTML=`
      <h3>Importa la tua scheda</h3>
      <div class="sub">Fotografa il foglio della palestra o incolla il testo: l'AI lo trasforma in scheda. Prima di applicare vedi l'anteprima e confermi voce per voce.</div>
      <div class="lbl2">Foto della scheda</div>
      <input type="file" accept="image/*" capture="environment" id="im_cam" style="display:none">
      <input type="file" accept="image/*" id="im_file" style="display:none">
      ${imgName?`<div class="nextbox" style="margin-bottom:8px">Foto pronta: ${esc(imgName)}</div>`:""}
      <div style="display:flex;gap:8px">
        <button class="revert" id="im_shot" style="flex:1">📷 Scatta</button>
        <button class="revert" id="im_pick" style="flex:1">🖼 Dalla galleria</button>
      </div>
      <div class="lbl2" style="margin-top:14px">Oppure scrivila / incollala</div>
      <textarea id="im_txt" class="urlin" rows="7" style="resize:vertical;min-height:130px;font-family:'IBM Plex Mono',monospace"
        placeholder="GIORNO A&#10;Squat 4x8 100kg&#10;Panca 4x8 60kg"></textarea>
      <button class="genbtn" id="im_go" style="margin-top:10px">Leggi con l'AI</button>
      <div id="im_out">${out||""}</div>
      <button class="closebtn" id="im_close" style="margin-top:10px">Chiudi</button>`;
    sheet.querySelector("#im_close").onclick=closeModal;
    sheet.querySelector("#im_pick").onclick=()=>sheet.querySelector("#im_file").click();
    sheet.querySelector("#im_shot").onclick=()=>sheet.querySelector("#im_cam").click();
    /* ridimensiona e converte in JPEG: gli scatti iPhone arrivano in HEIC da
       diversi MB, cosi' scendono sotto il mega e Gemini li legge senza problemi */
    const prendi=e=>{
      const f=e.target.files&&e.target.files[0]; if(!f)return;
      const url=URL.createObjectURL(f);
      const im=new Image();
      im.onload=()=>{
        const MAX=1600, sc=Math.min(1,MAX/Math.max(im.width,im.height));
        const cv=document.createElement("canvas");
        cv.width=Math.round(im.width*sc); cv.height=Math.round(im.height*sc);
        cv.getContext("2d").drawImage(im,0,0,cv.width,cv.height);
        const dataUrl=cv.toDataURL("image/jpeg",0.85);
        img={mime:"image/jpeg",b64:dataUrl.split(",")[1]};
        imgName=(f.name||"foto")+" · "+Math.round(dataUrl.length*0.75/1024)+" KB";
        URL.revokeObjectURL(url);draw();
      };
      im.onerror=()=>{URL.revokeObjectURL(url);toast("Immagine non leggibile")};
      im.src=url;
    };
    sheet.querySelector("#im_file").onchange=prendi;
    sheet.querySelector("#im_cam").onchange=prendi;
    sheet.querySelector("#im_go").onclick=run;
  };
  async function run(){
    const txt=(sheet.querySelector("#im_txt").value||"").trim();
    if(!img&&!txt){toast("Serve una foto o del testo");return}
    const out=sheet.querySelector("#im_out");
    out.innerHTML=`<div class="sub" style="margin-top:12px">Lettura in corso… con una foto può volerci mezzo minuto.</div>`;
    const P=["Leggi questa scheda di allenamento e trascrivila in JSON, fedelmente.",
      "Non inventare esercizi, serie, ripetizioni o carichi che non vedi. Se un dato manca, metti null.",
      "Correggi solo i nomi degli esercizi portandoli, quando riconoscibili, a quelli di questa libreria:",
      LIB.map(a=>a[0]).join(" · "),
      "","Se il carico è per manubrio, riportalo come scritto.",
      txt?("TESTO DELLA SCHEDA:\n"+txt):"La scheda è nell'immagine allegata.",
      "",'Formato: {"giorni":[{"id":"A","focus":"","esercizi":[{"nome":"","serie":4,"ripetizioni":"8","peso":60,"sicuro":true}]}]}',
      '"sicuro" false se non sei certo di aver letto bene quella riga.'].join("\n");
    try{
      const raw=img?await askGeminiVision(P,img):await askGeminiJSON(P);
      const j=img?parseJSONLoose(raw):raw;
      const gg=(j.giorni||[]).filter(d=>d.esercizi&&d.esercizi.length);
      if(!gg.length)throw new Error("Non ho riconosciuto nessun esercizio.");
      preview(gg);
    }catch(e){
      out.innerHTML=`<div class="nextbox late" style="margin-top:12px">${esc(e.message||"Errore")}</div>`;
    }
  }
  function preview(gg){
    const out=sheet.querySelector("#im_out");
    const tot=gg.reduce((a,d)=>a+d.esercizi.length,0);
    const dubbi=gg.reduce((a,d)=>a+d.esercizi.filter(e=>e.sicuro===false).length,0);
    out.innerHTML=`
      <div class="lbl2" style="margin-top:16px">Conferma — ${gg.length} giorni, ${tot} esercizi</div>
      ${dubbi?`<div class="nextbox late" style="margin-bottom:10px">${dubbi} rig${dubbi===1?"a":"he"} incerte, marcate con ⚠. Controllale prima di applicare.</div>`:""}
      <div class="card" style="padding:11px 13px">
        ${gg.map(d=>`<div style="margin-bottom:10px">
          <b style="font-family:'Anton',sans-serif;text-transform:uppercase;color:var(--acc)">Giorno ${esc(d.id||"?")}</b>
          ${d.esercizi.map(e=>`<div class="sub" style="margin:3px 0">${e.sicuro===false?"⚠ ":""}${esc(e.nome)} — ${e.serie||3}×${esc(String(e.ripetizioni||"10"))}${e.peso!=null?" @ "+esc(String(e.peso))+" kg":" (carico da definire)"}</div>`).join("")}
        </div>`).join("")}
      </div>
      <button class="genbtn" id="im_ok" style="margin-top:12px">Applica questa scheda</button>`;
    out.querySelector("#im_ok").onclick=async()=>{
      if(!await ask("Sostituisco la scheda attuale?<br><small style='color:var(--soft)'>Storico e misure restano. Se vuoi conservare quella di adesso, archiviala prima da Le mie schede.</small>","Applica"))return;
      const refs=currentRefs();
      S.days=gg.map((d,i)=>{
        const ex=d.esercizi.map(e=>{
          const li=findExercise(e.nome);
          const step=li?(li.st||2.5):2.5;
          let w=e.peso!=null?parseFloat(String(e.peso).replace(",",".")):null;
          if(w==null||isNaN(w))w=li&&li.k>0?round((refs[li.ref]||0)*li.k*repFactor(e.ripetizioni||"10"),step):0;
          const ns=Math.max(1,parseInt(e.serie,10)||3);
          return {n:li?li.n:String(e.nome),ic:li?li.ic:"curl",img:"",w:w,inc:step,rest:90,
                  r:String(e.ripetizioni||"10"),sets:mk(w,ns),
                  note:e.sicuro===false?"letta con incertezza: verifica":"",tag:""};
        });
        const warm=(WARMBANK[ex[0]?ex[0].ic:"squat"]||WARMBANK.squat).slice();
        warm.push(["Serie di avvicinamento",(ex[0]?ex[0].n:"primo esercizio")+": vuoto → 50% → 75%"]);
        return {id:String(d.id||String.fromCharCode(65+i)).toUpperCase().slice(0,1),
                focus:String(d.focus||"Allenamento"),warm:warm,ex:ex};
      });
      S.pendingOnb=false;S.onbDone=true;save();
      closeModal();view="A";render();updateBarInfo();
      toast(`Scheda importata — ${S.days.length} giorni`);
    };
  }
  draw();
  document.getElementById("modal").classList.add("on");
}

/* chiamata multimodale: la foto viaggia in base64 dentro la richiesta */
async function askGeminiVision(prompt,img){
  const key=gemKey();
  if(!key)throw new Error("Nessuna chiave impostata.");
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${gemModel()}:generateContent`,{
    method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},
    body:JSON.stringify({contents:[{parts:[
      {inline_data:{mime_type:img.mime,data:img.b64}},
      {text:prompt+"\n\nRispondi ESCLUSIVAMENTE con JSON valido, senza backtick."}
    ]}]})
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error((j.error&&j.error.message)||"Errore "+r.status);
  const c=j.candidates&&j.candidates[0];
  const txt=c&&c.content&&c.content.parts?c.content.parts.map(p=>p.text||"").join(""):"";
  if(!txt)throw new Error("Nessun testo riconosciuto nella foto.");
  return txt;
}



/* ============ SUPERSERIE A GIRI ============
   Invece di impilare tutte le serie del primo esercizio e poi quelle del
   secondo, si alternano come si eseguono davvero: giro 1 = A poi subito B,
   giro 2 = A poi subito B. Il recupero parte solo alla fine del giro. */
function ssCard(run,d){
  const box=document.createElement("div");
  box.className="ssgroup";
  const nGiri=Math.max(...run.map(e=>(e.sets||[]).length))||3;
  const rest=run[run.length-1].rest||60;

  const head=run.map((e,k)=>`
    <div class="sshx" data-k="${k}">
      <span class="ssnum">${k+1}</span>
      <div class="ssnm" data-act="open" data-k="${k}">
        <span class="nm">${esc(e.n)}</span>
        <span class="sw">${(e.sets||[]).length}×${esc(e.r)} · tocca per tecnica</span>
      </div>
      <div class="sswt">
        <button class="ssminus" data-k="${k}">−</button>
        <input class="sswin" data-k="${k}" inputmode="decimal" value="${fmt(e.w)}">
        <button class="ssplus" data-k="${k}">+</button>
      </div>
    </div>
    <input class="note ssnote" data-k="${k}" value="${esc(e.note)}" placeholder="nota su ${esc(e.n)}…">
    ${k<run.length-1?`<div class="ssarrow">↓ &nbsp;subito, senza pausa</div>`:""}`).join("");

  box.innerHTML=`
    <details open>
      <summary>
        <div class="sshead">
          <span class="badge">Superserie</span>
          <span>${nGiri} giri</span>
          <small>recupero ${rest}s solo a fine giro</small>
        </div>
      </summary>
      <div class="ssex">${head}</div>
      <div class="ssrounds"></div>
      <div class="setbar">
        <button class="ssaddg">+ giro</button>
        <button class="ssgo">▶ Avvia recupero</button>
      </div>
    </details>`;

  const rounds=box.querySelector(".ssrounds");

  const draw=()=>{
    rounds.innerHTML="";
    const n=Math.max(...run.map(e=>(e.sets||[]).length));
    for(let g=0;g<n;g++){
      const blocco=document.createElement("div");
      const fatto=run.every(e=>e.sets[g]&&e.sets[g].done);
      blocco.className="ssround"+(fatto?" done":"");
      blocco.innerHTML=`<div class="ssrlab">Giro ${g+1}</div>`;
      run.forEach((e,k)=>{
        const s=e.sets[g];
        if(!s)return;
        const row=document.createElement("div");
        row.className="set ssrow"+(s.done?" done":"");
        row.innerHTML=`
          <span class="n mini">${k+1}</span>
          <span class="f"><input class="sw" inputmode="decimal" value="${fmt(s.w)}"></span>
          <span class="lbl">kg ×</span>
          <span class="f"><input class="sr" inputmode="numeric" value="${s.r||""}" placeholder="${esc(e.r)}"></span>
          <span class="lbl">rip</span>
          <span class="f rirwrap"><input class="srir" inputmode="numeric" value="${s.rir!=null?s.rir:""}" placeholder="RIR"></span>
          <button class="tick">✓</button>`;
        row.querySelector(".sw").onchange=ev=>{s.w=parseFloat(ev.target.value.replace(",","."))||0;save();draw()};
        row.querySelector(".sr").onchange=ev=>{s.r=ev.target.value;save()};
        row.querySelector(".srir").onchange=ev=>{const v=ev.target.value.trim();
          s.rir=v===""?null:Math.max(0,parseFloat(v.replace(",","."))||0);save()};
        row.querySelector(".tick").onclick=()=>{
          unlockAudio();
          if(!s.done&&(s.r===""||s.r==null)){
            const sug=topReps(e.r)||parseInt(e.r)||0;
            if(sug>0)s.r=String(sug);
          }
          s.done=!s.done;save();draw();updateBarInfo();
          if(s.done){
            startSessionIfNeeded();
            // il recupero parte solo quando il giro e' completo su TUTTI gli esercizi
            const giroChiuso=run.every(x=>x.sets[g]&&x.sets[g].done);
            if(giroChiuso&&rest>0)startTimer(rest);
          }
        };
        blocco.appendChild(row);
      });
      rounds.appendChild(blocco);
    }
  };
  draw();

  box.querySelectorAll(".ssnm").forEach(el=>el.onclick=()=>openEx(run[+el.dataset.k]));
  box.querySelectorAll(".ssnote").forEach(inp=>inp.onchange=()=>{run[+inp.dataset.k].note=inp.value;save()});
  const setW=(k,v)=>{
    const e=run[k];
    e.w=Math.max(0,Math.round(v*10)/10);e.man=1;
    (e.sets||[]).forEach(s=>{if(!s.done)s.w=e.w});
    save();
    const inp=box.querySelector('.sswin[data-k="'+k+'"]');if(inp)inp.value=fmt(e.w);
    draw();
  };
  box.querySelectorAll(".ssplus").forEach(b=>b.onclick=()=>setW(+b.dataset.k,run[+b.dataset.k].w+(run[+b.dataset.k].inc||2.5)));
  box.querySelectorAll(".ssminus").forEach(b=>b.onclick=()=>setW(+b.dataset.k,run[+b.dataset.k].w-(run[+b.dataset.k].inc||2.5)));
  box.querySelectorAll(".sswin").forEach(inp=>inp.onchange=()=>setW(+inp.dataset.k,parseFloat(inp.value.replace(",","."))||0));
  box.querySelector(".ssaddg").onclick=()=>{run.forEach(e=>e.sets.push({w:e.w,r:"",done:false}));save();draw()};
  box.querySelector(".ssgo").onclick=()=>{unlockAudio();startTimer(rest)};
  return box;
}

/* ============ RIENTRO DOPO UNA PAUSA ============
   Nessuna dipendenza dall'AI: e' aritmetica, e deve valere per tutti.
   Fino a 13 giorni non si riduce nulla: la forza non cala in una settimana. */
function daysSinceLast(){
  const l=(S.log||[]);
  if(!l.length)return null;
  const last=l[l.length-1];
  const t=last.iso?new Date(last.iso).getTime():null;
  if(!t||isNaN(t))return null;
  return Math.floor((Date.now()-t)/86400000);
}
function breakPlan(g){
  if(g<7)  return null;
  if(g<14) return {cut:0,  tit:"Una settimana di stop",
                   msg:"La forza non cala in sette giorni. Vai con i carichi di sempre, ma allunga il riscaldamento e fermati un paio di ripetizioni prima del limite nella prima serie."};
  if(g<28) return {cut:10, tit:"Due settimane di stop",
                   msg:"Prima seduta di rientro al 90% dei carichi. Riprendi pieno dalla prossima."};
  if(g<60) return {cut:20, tit:"Oltre un mese di stop",
                   msg:"Carichi all'80% e ripetizioni più alte per un paio di sedute. Il tessuto connettivo si riadatta più lentamente del muscolo."};
  return     {cut:30, tit:"Stop lungo", recal:true,
              msg:"Più di due mesi: i riferimenti di forza non sono più attendibili. Meglio ritararli."};
}
function applyBreakCut(d,cut){
  let n=0;
  (d.ex||[]).forEach(e=>{
    if(!e.w)return;
    if(!e._pre)e._pre=e.w;
    const st=e.inc||2.5;
    e.w=Math.max(st,round(e._pre*(1-cut/100),st));
    (e.sets||[]).forEach(s=>{s.w=e.w;s.done=false;s.r=""});
    e._temp=e._temp||false;n++;
  });
  save();return n;
}
function restoreBreakCut(d){
  let n=0;
  (d.ex||[]).forEach(e=>{if(e._pre){e.w=e._pre;(e.sets||[]).forEach(s=>{s.w=e.w});delete e._pre;n++}});
  save();return n;
}
async function maybeBreakAsk(){
  const g=daysSinceLast();
  if(g==null)return;
  if(store.get("break_ack")===String(new Date().toDateString()))return;
  const p=breakPlan(g);
  if(!p)return;
  store.set("break_ack",String(new Date().toDateString()));
  const d=S.days.find(x=>x.id===view)||S.days[0];
  const sheet=document.getElementById("sheet");
  sheet.innerHTML=`
    <h3>${p.tit}</h3>
    <div class="sub">L'ultima seduta registrata è di <b>${g} giorni</b> fa. Oggi ti toccherebbe il <b>Giorno ${d.id}</b>.</div>
    <div class="cues" style="margin-top:12px;padding:13px">${p.msg}</div>
    ${p.cut?`<button class="genbtn" id="bk_cut" style="margin-top:14px">Riduci i carichi del ${p.cut}% per oggi</button>`:""}
    ${p.recal?`<button class="genbtn" id="bk_recal" style="margin-top:${p.cut?"8":"14"}px">Ritara i carichi con le domande</button>`:""}
    ${gemKey()?`<button class="revert" id="bk_ai" style="margin-top:8px">Parlane col preparatore AI</button>`:""}
    <button class="skipbtn" id="bk_no">Vado con i carichi normali</button>`;
  document.getElementById("modal").classList.add("on");
  const cut=sheet.querySelector("#bk_cut");
  if(cut)cut.onclick=()=>{
    const n=applyBreakCut(d,p.cut);
    closeModal();render();
    toast(`${n} carichi ridotti del ${p.cut}% · si ripristinano da soli a fine seduta`);
  };
  const rc=sheet.querySelector("#bk_recal");
  if(rc)rc.onclick=()=>{closeModal();openOnb(true,false,"crea")};
  const ai=sheet.querySelector("#bk_ai");
  if(ai)ai.onclick=()=>{
    if(!S.chat)S.chat=[];
    S.chat.push({r:"u",t:`Non mi alleno da ${g} giorni. Oggi mi tocca il Giorno ${d.id}. Come rientro?`});
    save();closeModal();aiChatAsk();
  };
  sheet.querySelector("#bk_no").onclick=closeModal;
}

/* ============ GIORNO PROPOSTO ALL'APERTURA ============
   Se ci sono serie gia' spuntate oggi si resta lì: non si sposta nessuno
   a metà allenamento. Altrimenti si propone il giorno successivo nel ciclo. */
function dayInProgress(){
  const d=(S.days||[]).find(x=>(x.ex||[]).some(e=>(e.sets||[]).some(s=>s.done)));
  return d?d.id:null;
}
function nextDayId(){
  const inProg=dayInProgress();
  if(inProg)return inProg;
  const ids=(S.days||[]).map(x=>x.id);
  if(!ids.length)return "A";
  const l=(S.log||[]);
  if(!l.length)return ids[0];
  const last=l[l.length-1].d;
  const i=ids.indexOf(last);
  return i<0?ids[0]:ids[(i+1)%ids.length];
}

/* ============ NOTIFICHE: SI CHIEDONO AL MOMENTO GIUSTO ============
   Non all'avvio. Un rifiuto e' definitivo e il browser non permette di
   richiedere: si chiede dopo la prima seduta registrata, quando l'utente
   ha capito a cosa servono. */
function notifState(){
  try{return (typeof Notification!=="undefined")?Notification.permission:"unsupported"}
  catch(e){return "unsupported"}
}
async function askNotifPermission(){
  if(notifState()==="unsupported"){toast("Il browser non supporta le notifiche");return false}
  if(notifState()==="granted")return true;
  if(notifState()==="denied"){
    toast("Notifiche bloccate: sbloccale dalle impostazioni del browser");return false;
  }
  try{const r=await Notification.requestPermission();return r==="granted"}
  catch(e){return false}
}
function maybeNotifPitch(){
  if(S.notifAsked||notifState()!=="default")return;
  if(!(S.log||[]).length)return;
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent||"");
  if(ios&&!isStandalone())return;      // su iPhone funzionano solo da app installata
  setTimeout(()=>{
    const sheet=document.getElementById("sheet");
    sheet.innerHTML=`
      <h3>Ti avviso io</h3>
      <div class="sub">Prima seduta registrata. Vuoi che ti ricordi quando tocca allenarti, secondo la cadenza che hai impostato (ogni ${S.cfg.gap} giorn${S.cfg.gap===1?"o":"i"})?</div>
      <div class="sub" style="margin-top:10px">Niente pubblicità, nessun altro tipo di avviso. Puoi spegnerle quando vuoi dalle impostazioni.</div>
      <button class="genbtn" id="nt_yes" style="margin-top:14px">Sì, avvisami</button>
      <button class="skipbtn" id="nt_no">No grazie</button>`;
    sheet.querySelector("#nt_yes").onclick=async()=>{
      S.notifAsked=true;
      const ok=await askNotifPermission();
      S.cfg.notif=ok;save();closeModal();
      toast(ok?"Promemoria attivi":"Permesso non concesso");
    };
    sheet.querySelector("#nt_no").onclick=()=>{S.notifAsked=true;save();closeModal()};
    document.getElementById("modal").classList.add("on");
  },900);
}



/* ================= MOTORE DI ALLENAMENTO DETERMINISTICO =================
   Tutto quello che qui sotto e' calcolabile senza AI viene calcolato senza AI:
   volume, bilanciamento, recupero, progressione. Il modello linguistico riceve
   questi risultati gia' pronti e al massimo li mette in parole.
   ======================================================================= */

const GRP_MIN={Gambe:10,Petto:10,Schiena:10,Spalle:8,Braccia:6,Core:3};
const PUSH_PAT=["hpress","vpress","tri","lat"];
const PULL_PAT=["hpull","vpull","curl","face"];

function grpOf(nome){const li=LIBN[nome];return li?li.grp:null}
function patOf(nome){const li=LIBN[nome];return li?li.ic:null}

/* ---- 12. volume settimanale per gruppo ---- */
function volumeAudit(days){
  const v={};
  (days||[]).forEach(d=>(d.ex||[]).forEach(e=>{
    const g=grpOf(e.n); if(!g||g==="Elastici")return;
    v[g]=(v[g]||0)+((e.sets||[]).length||0);
  }));
  const scoperti=Object.keys(GRP_MIN)
    .filter(g=>(v[g]||0)<GRP_MIN[g])
    .map(g=>({grp:g,ha:v[g]||0,serve:GRP_MIN[g]}))
    .sort((a,b)=>(a.ha-a.serve)-(b.ha-b.serve));
  return {vol:v,scoperti:scoperti};
}

/* ---- 13. rapporto spinta / tirata ---- */
function pushPull(days){
  let push=0,pull=0;
  (days||[]).forEach(d=>(d.ex||[]).forEach(e=>{
    const p=patOf(e.n), n=(e.sets||[]).length||0;
    if(PUSH_PAT.includes(p))push+=n;
    else if(PULL_PAT.includes(p))pull+=n;
  }));
  const r=pull>0?push/pull:(push>0?99:1);
  return {push:push,pull:pull,ratio:r,
          squilibrio:(push+pull>=6)&&(r>1.35||r<0.65),
          verso:r>1.35?"spinta":(r<0.65?"tirata":null)};
}

/* rimpiazza l'isolamento meno utile con uno che copre il gruppo scoperto */
function rebalanceVolume(days,equip,limit,acc,refs){
  const cambi=[];
  for(let giro=0;giro<6;giro++){
    const {scoperti}=volumeAudit(days);
    if(!scoperti.length)break;
    const target=scoperti[0];
    // candidati per il gruppo scoperto, non gia' presenti
    const usati=new Set();
    days.forEach(d=>(d.ex||[]).forEach(e=>usati.add(e.n)));
    let pool=LIB.filter(a=>a[5]===target.grp&&!usati.has(a[0]));
    if(equip==="bande")pool=pool.filter(a=>a[5]==="Elastici");
    else if(equip==="casa")pool=pool.filter(a=>homeAllowed(a[0],acc||[]));
    else pool=pool.filter(a=>a[5]!=="Elastici");
    const bl=BLACKLIST[limit]||[];
    pool=pool.filter(a=>!bl.some(rx=>rx.test(a[0])));
    if(!pool.length)break;
    // il giorno con meno serie di quel gruppo riceve l'aggiunta
    const dOrd=days.slice().sort((a,b)=>
      (a.ex||[]).filter(e=>grpOf(e.n)===target.grp).length -
      (b.ex||[]).filter(e=>grpOf(e.n)===target.grp).length);
    const d=dOrd[0]; if(!d)break;
    const pick=shuffled(pool)[0];
    const step=pick[4]||2.5;
    const r=(SCHEME[(S.profile&&S.profile.goal)||"ricomp"]||SCHEME.ricomp).iso;
    const w=pick[3]>0?round((refs[pick[2]]||0)*pick[3]*repFactor(r.r),step):0;
    d.ex.push({n:pick[0],ic:pick[1],img:"",w:w,inc:step,rest:r.rest,r:r.r,
               sets:mk(w,r.s),note:"aggiunto per coprire "+target.grp.toLowerCase(),tag:"NUOVO"});
    cambi.push({grp:target.grp,ex:pick[0],giorno:d.id});
  }
  return cambi;
}

/* ---- 14. ordine dei giorni consapevole del recupero ----
   Con cadenza di 1 giorno non si mettono di fila due giornate che condividono
   piu' della meta' del volume sugli stessi gruppi. */
function grpSet(d){
  const s={};
  (d.ex||[]).forEach(e=>{const g=grpOf(e.n);if(g)s[g]=(s[g]||0)+((e.sets||[]).length||0)});
  return s;
}
function overlap(a,b){
  const x=grpSet(a),y=grpSet(b);
  let com=0,tot=0;
  Object.keys(x).forEach(g=>{tot+=x[g];if(y[g])com+=Math.min(x[g],y[g])});
  Object.keys(y).forEach(g=>{tot+=y[g]});
  return tot?(2*com)/tot:0;
}
function orderByRecovery(days,gap){
  if((gap||2)>=2||days.length<3)return days;      // con un giorno di stacco non serve
  const rest=days.slice(1), out=[days[0]];
  while(rest.length){
    let best=0,bestV=9;
    rest.forEach((d,i)=>{const v=overlap(out[out.length-1],d);if(v<bestV){bestV=v;best=i}});
    out.push(rest.splice(best,1)[0]);
  }
  out.forEach((d,i)=>d.id=String.fromCharCode(65+i));
  return out;
}

/* ---- 6 + 15. lettura della prestazione e doppia progressione ---- */
function rangeOf(r){
  const m=String(r||"").match(/(\d+)\s*[-–]\s*(\d+)/);
  if(m)return{lo:+m[1],hi:+m[2]};
  const n=parseInt(r,10);
  return isNaN(n)?null:{lo:n,hi:n};
}
/* legge l'ultima esecuzione di un esercizio e la confronta col bersaglio */
function lastPerf(dayId,nome){
  for(let i=S.log.length-1;i>=0;i--){
    const s=S.log[i]; if(s.d!==dayId)continue;
    const x=(s.ex||[]).find(o=>o.n===nome); if(!x)return null;
    const reps=String(x.sets).split(/\s{2,}/).map(p=>parseInt((p.split("×")[1]||"").trim(),10))
      .filter(v=>!isNaN(v));
    if(!reps.length)return null;
    return {reps:reps,min:Math.min(...reps),max:Math.max(...reps),
            media:reps.reduce((a,b)=>a+b,0)/reps.length,date:s.date};
  }
  return null;
}
/* verdetto sul carico: troppo pesante, pronto a salire, o va bene */
function loadVerdict(dayId,e){
  const R=rangeOf(e.r); if(!R)return null;
  const p=lastPerf(dayId,e.n); if(!p)return null;
  const q=p.media/R.lo;                        // rispetto al minimo del range
  const crollo=p.reps.length>=3 && (p.reps[p.reps.length-1] <= p.reps[0]*0.55);
  if(q<0.5)  return {t:"troppo",grave:true, txt:`Ultima volta ${p.min}-${p.max} ripetizioni contro ${R.lo} previste: carico nettamente fuori taratura.`,cut:15};
  if(q<0.75) return {t:"troppo",grave:false,txt:`Ultima volta sotto il minimo previsto (${Math.round(p.media)} contro ${R.lo}): probabilmente troppo pesante.`,cut:7.5};
  if(crollo) return {t:"crollo",grave:false,txt:`Ultima volta le ripetizioni sono crollate da ${p.reps[0]} a ${p.reps[p.reps.length-1]}: troppo volume o carico alto.`,cut:5};
  if(p.min>=R.hi) return {t:"sali",txt:`Ultima volta hai chiuso tutte le serie al tetto del range: è ora di salire.`};
  return null;
}
/* onda sulle ripetizioni: guidata dalle sedute fatte, non dal calendario */
function repWave(dayId){
  const n=(S.log||[]).filter(s=>s.d===dayId).length;
  return n%4;                       // 0,1,2 = spinta crescente · 3 = scarico
}
function waveLabel(dayId){
  const w=repWave(dayId);
  return ["Settimana 1 del ciclo: resta in fondo al range, tecnica pulita.",
          "Settimana 2: punta alla parte alta del range.",
          "Settimana 3: chiudi al tetto del range, è la seduta in cui si spinge.",
          "Settimana 4: scarico. Stessi esercizi, carichi ridotti, niente cedimento."][w];
}

/* ---- 7. l'avviso della prima settimana non e' piu' perenne ---- */
function firstWeekNotice(dayId){
  const n=(S.log||[]).filter(s=>s.d===dayId).length;
  if(n===0)return "Prima volta su questo giorno: parti con carichi conservativi e fermati 1–2 ripetizioni dal cedimento. L'app tara i pesi dalle tue prime serie.";
  if(n===1)return "Seconda seduta: se la prima è filata liscia, riporta i carichi al riferimento pieno.";
  return "";
}


/* 2. il tondo compare appena l'intestazione esce dallo schermo, e sparisce
   quando il timer di recupero occupa la barra in basso a tutta larghezza */


/* ================= STRATO AI E INTERFACCIA — BLOCCO FINALE ================= */

/* ---- 1. applicare dalla chat le modifiche proposte ----
   Si riusa il meccanismo PATCH SCHEDA con anteprima, gia' collaudato. */
function chatPatchButton(txt){
  const p=extractPatch(txt);
  if(!p)return "";
  return `<button class="genbtn chpatch" data-p="${encodeURIComponent(p)}" style="margin:6px 0 2px">Applica la modifica</button>`;
}
async function applyChatPatch(enc,soloOggi){
  const patch=decodeURIComponent(enc);
  const pt=parsePatch(patch), plan=resolvePatch(pt);
  if(!plan.length&&!pt.refs.length){toast("Nessuna modifica riconosciuta");return}
  if(soloOggi){
    // marca gli esercizi toccati cosi' tornano com'erano a fine seduta
    plan.forEach(x=>{const e=x.ex;
      if(e&&!e.orig){e.orig={n:e.n,ic:e.ic,w:e.w,r:e.r,rest:e.rest,inc:e.inc,note:e.note};e._temp=true}});
  }
  previewPatch(plan,pt);
}

/* ---- 3. chiusura della giornata: unisce numeri e risposte ---- */
async function sessionClosing(entry,dayId){
  if(!gemKey())return;
  const sheet=document.getElementById("sheet");
  document.getElementById("modal").classList.add("on");
  sheet.innerHTML=`<h3>Chiusura della giornata</h3><div class="sub" style="margin-top:12px">Rileggo la seduta…</div>`;
  try{
    const prec=(S.log||[]).filter(s=>s.d===dayId).slice(-4,-1)
      .map(s=>s.date+": "+(s.ex||[]).map(e=>e.n+" "+e.sets).join("; ")+
        (s.qa&&s.qa.length?"  [note: "+s.qa.map(q=>q.a).join(", ")+"]":"")).join("\n");
    const verdetti=(S.days.find(d=>d.id===dayId)||{ex:[]}).ex
      .map(e=>{const v=loadVerdict(dayId,e);return v?("- "+e.n+": "+v.txt):null})
      .filter(Boolean).join("\n");
    const P=["Sei il personal trainer di questo atleta. Chiudi la giornata di allenamento in 4-5 righe.",
      "Italiano, diretto, niente premesse e niente complimenti di cortesia.",
      "NON prescrivere carichi in kg: quelli li calcola l'app dai massimali misurati.",
      "Dì: com'è andata rispetto alle volte precedenti, cosa ha funzionato, cosa tenere d'occhio la prossima volta.",
      "","OBIETTIVO: "+GOALTXT(),
      "","SEDUTA DI OGGI (giorno "+dayId+", "+(entry.min||"?")+" min, "+entry.vol+" kg di tonnellaggio):",
      (entry.ex||[]).map(e=>"- "+e.n+": "+e.sets).join("\n"),
      entry.qa&&entry.qa.length?("\nRISPOSTE DELL'ATLETA:\n"+entry.qa.map(q=>"- "+q.q+" → "+q.a).join("\n")):"",
      verdetti?("\nRILIEVI CALCOLATI DALL'APP (fidati di questi):\n"+verdetti):"",
      prec?("\nSTESSO GIORNO, VOLTE PRECEDENTI:\n"+prec):"",
      "","Testo semplice, niente elenchi puntati, niente titoli."].join("\n");
    const t=await askAI(P);
    entry.closing=t.trim();save();
    sheet.innerHTML=`
      <h3>Chiusura della giornata</h3>
      <div class="cues" style="padding:14px;font-size:15px;line-height:1.55;white-space:pre-wrap;margin-top:12px">${esc(entry.closing)}</div>
      <div class="sub" style="margin-top:10px">Salvata con la seduta. Il preparatore la rilegge la prossima volta che gli scrivi.</div>
      <button class="closebtn" id="cl_ok" style="margin-top:12px">Chiudi</button>`;
    sheet.querySelector("#cl_ok").onclick=closeModal;
  }catch(e){closeModal()}
}

/* ---- 9. suggerimento in cima: solo se c'e' qualcosa di vero da dire ---- */
function signalsFor(dayId){
  const out=[];
  const d=S.days.find(x=>x.id===dayId); if(!d)return out;
  (d.ex||[]).forEach(e=>{const v=loadVerdict(dayId,e);
    if(v)out.push((v.t==="sali"?"PRONTO A SALIRE":"CARICO DA RIVEDERE")+" — "+e.n+": "+v.txt)});
  const g=daysSinceLast(); if(g!=null&&g>=7)out.push("STOP: non si allena da "+g+" giorni.");
  if(typeof deloadHint==="function"&&deloadHint(dayId))out.push("DELOAD: l'app segnala che è ora di scaricare.");
  const a=volumeAudit(S.days); if(a.scoperti.length)
    out.push("VOLUME: "+a.scoperti.map(x=>x.grp+" a "+x.ha+" serie su "+x.serve).join(", ")+".");
  const pp=pushPull(S.days); if(pp.squilibrio)
    out.push("SQUILIBRIO: più volume di "+pp.verso+" ("+pp.push+" contro "+pp.pull+").");
  const last=(S.log||[]).filter(s=>s.d===dayId).slice(-1)[0];
  if(last&&last.qa&&last.qa.length)out.push("ULTIMA VOLTA HA RISPOSTO: "+last.qa.map(q=>q.a).join(", ")+".");
  return out;
}
async function loadTipFor(dayId){
  const key="tip_"+dayId+"_"+new Date().toDateString();
  const cached=store.get(key);
  if(cached!=null)return cached;
  const sig=signalsFor(dayId);
  if(!sig.length||!gemKey()){store.set(key,"");return ""}
  try{
    const P=["Sei un personal trainer. Ecco i segnali che l'app ha calcolato prima dell'allenamento di oggi.",
      "Scegli il PIÙ rilevante e scrivilo in UNA riga, massimo 22 parole, in italiano, diretto.",
      "Se nessuno merita di essere detto, rispondi con la sola parola: NIENTE.",
      "Non inventare nulla che non sia nell'elenco.","","SEGNALI:",sig.map(x=>"- "+x).join("\n")].join("\n");
    let t=(await askAI(P)).trim().replace(/^["'\u2022\-\s]+/,"");
    if(/^niente/i.test(t))t="";
    store.set(key,t);return t;
  }catch(e){store.set(key,"");return ""}
}
function paintTip(dayId){
  const box=document.getElementById("aitip"); if(!box)return;
  loadTipFor(dayId).then(t=>{
    const b=document.getElementById("aitip"); if(!b)return;
    if(!t||store.get("dis_tip_"+new Date().toDateString())==="1"){b.style.display="none";b.innerHTML="";return}
    b.style.display="block";
    b.innerHTML=`<span class="tiplab">Oggi</span> ${esc(t)}<button class="disx" data-k="dis_tip_${new Date().toDateString()}">×</button>`;
    wireDismiss();
  });
}

/* ---- 10. aggiungi un macchinario che hai visto in palestra ---- */
function addMachineAsk(){
  const sheet=document.getElementById("sheet");
  const draw=(out)=>{
    sheet.innerHTML=`
      <h3>Aggiungi un macchinario</h3>
      <div class="sub">Hai visto un attrezzo che non è in libreria? Scrivi il nome come è scritto sulla macchina: lo identifico e lo aggiungo alla tua libreria personale.</div>
      <div class="lbl2">Nome del macchinario</div>
      <input class="urlin" id="am_n" placeholder="es. Pendulum squat, Hammer Strength row">
      <div class="lbl2">Note utili (facoltativo)</div>
      <input class="urlin" id="am_d" placeholder="es. seduto, si spinge in avanti, carico a dischi">
      <button class="genbtn" id="am_go">Identificalo</button>
      <div id="am_out">${out||""}</div>
      <button class="closebtn" id="am_close" style="margin-top:10px">Chiudi</button>`;
    sheet.querySelector("#am_close").onclick=closeModal;
    sheet.querySelector("#am_go").onclick=run;
  };
  async function run(){
    const n=(sheet.querySelector("#am_n").value||"").trim();
    if(!n){toast("Scrivi il nome");return}
    const d=(sheet.querySelector("#am_d").value||"").trim();
    const out=sheet.querySelector("#am_out");
    // duplicati prima di scomodare l'AI
    const gia=findExercise(n);
    if(gia){
      out.innerHTML=`<div class="nextbox" style="margin-top:12px">In libreria c'è già <b>${esc(gia.n)}</b>, molto simile. Usa quello.</div>`;
      return;
    }
    out.innerHTML=`<div class="sub" style="margin-top:12px">Identificazione in corso…</div>`;
    try{
      const P=["Identifica questo attrezzo o esercizio da palestra e classificalo.",
        "Se il nome è ambiguo o commerciale e non sei ragionevolmente sicuro, metti \"sicuro\": false e spiega cosa ti servirebbe sapere.",
        "","NOME: "+n, d?("DESCRIZIONE: "+d):"",
        "","movimento è UNO tra: squat, hinge, hpress, vpress, hpull, vpull, curl, tri, lat, calf, core, lunge, legpress, face",
        "gruppo è UNO tra: Gambe, Petto, Schiena, Spalle, Braccia, Core",
        "riferimento è UNO tra: squat, bench, row, ohp, hinge",
        "coefficiente = rapporto stimato col riferimento (es. 0.35 significa il 35% del carico di panca). Se non sai stimarlo metti 0.",
        "incremento = salto minimo di carico in kg (2.5 di norma, 5 per macchine a piastre grandi, 1 per pacchi fini).",
        "","Formato: {\"nome\":\"nome pulito e leggibile\",\"movimento\":\"\",\"gruppo\":\"\",\"riferimento\":\"\",\"coefficiente\":0.4,\"incremento\":2.5,\"sicuro\":true,\"nota\":\"max 15 parole\"}"].join("\n");
      const j=await askGeminiJSON(P);
      const PATS=["squat","hinge","hpress","vpress","hpull","vpull","curl","tri","lat","calf","core","lunge","legpress","face"];
      const GRP=["Gambe","Petto","Schiena","Spalle","Braccia","Core"];
      const REF=["squat","bench","row","ohp","hinge"];
      if(!PATS.includes(j.movimento))j.movimento="hpress";
      if(!GRP.includes(j.gruppo))j.gruppo="Petto";
      if(!REF.includes(j.riferimento))j.riferimento="bench";
      const k=Math.max(0,Math.min(3,parseFloat(j.coefficiente)||0));
      const st=[1,2,2.5,5].includes(+j.incremento)?+j.incremento:2.5;
      out.innerHTML=`
        <div class="lbl2" style="margin-top:16px">Conferma</div>
        <div class="card" style="padding:12px 13px">
          <div style="font-weight:600;font-size:16px">${esc(j.nome||n)}</div>
          <div class="sub" style="margin-top:4px">Movimento <b>${esc(j.movimento)}</b> · gruppo <b>${esc(j.gruppo)}</b> · incremento ${st} kg</div>
          <div class="sub">Carico stimato: ${k?Math.round((currentRefs()[j.riferimento]||0)*k)+" kg (stima grezza, si tara dalle tue serie)":"da impostare a mano"}</div>
          ${j.nota?`<div class="sub" style="margin-top:6px">${esc(j.nota)}</div>`:""}
        </div>
        ${j.sicuro===false?`<div class="nextbox late" style="margin-top:10px">Identificazione incerta. Controlla movimento e gruppo prima di confermare: se sbagliati, l'esercizio finirebbe nel giorno sbagliato.</div>`:""}
        <button class="genbtn" id="am_ok" style="margin-top:12px">Aggiungi alla mia libreria</button>
        ${SESSION?`<label class="cfgrow" style="padding:10px 0"><span class="cl">Proponilo anche agli altri utenti<small>entra in una coda di approvazione, non compare subito a tutti</small></span>
          <input type="checkbox" id="am_share" style="width:20px;height:20px"></label>`:""}`;
      out.querySelector("#am_ok").onclick=()=>{
        const rec=[String(j.nome||n),j.movimento,j.riferimento,k,st,j.gruppo];
        if(!S.lib)S.lib=[];
        if(S.lib.some(x=>x[0].toLowerCase()===rec[0].toLowerCase())){toast("Già presente");return}
        S.lib.push(rec);
        LIB.push(rec);LIBN[rec[0]]={n:rec[0],ic:rec[1],ref:rec[2],k:rec[3],st:rec[4],grp:rec[5]};
        const sh=out.querySelector("#am_share");
        if(sh&&sh.checked)proposeShared(rec).then(ok=>toast(ok?"Proposta inviata per l'approvazione":"Proposta non inviata: riprova online"));
        save();closeModal();
        toast(`${rec[0]} aggiunto alla libreria`);
      };
    }catch(e){
      out.innerHTML=`<div class="nextbox late" style="margin-top:12px">${esc(e.message||"Errore")}</div>`;
    }
  }
  draw();
  document.getElementById("modal").classList.add("on");
}
/* la libreria personale va rimessa dentro LIB a ogni avvio */
function mergeUserLib(){
  (S.lib||[]).forEach(r=>{
    if(!LIBN[r[0]]){LIB.push(r);LIBN[r[0]]={n:r[0],ic:r[1],ref:r[2],k:r[3],st:r[4],grp:r[5]}}
  });
}

/* ---- 11. RANDOM: distretti proposti e freno sui gruppi freschi ---- */
function recentGroups(h){
  const lim=Date.now()-h*3600000, out={};
  (S.log||[]).forEach(s=>{
    const t=s.iso?new Date(s.iso).getTime():0;
    if(!t||t<lim)return;
    (s.ex||[]).forEach(e=>{const g=grpOf(e.n);if(!g)return;
      const serie=String(e.sets).split(/\s{2,}/).filter(Boolean).length;
      out[g]=out[g]||{serie:0,ore:999};
      out[g].serie+=serie;
      out[g].ore=Math.min(out[g].ore,Math.round((Date.now()-t)/3600000));
    });
  });
  return out;
}
function groupWarning(g){
  const r=recentGroups(72)[g];
  if(!r)return null;
  const soglia=["Gambe","Petto","Schiena"].includes(g)?48:36;
  if(r.ore>=soglia)return null;
  return `${g}: allenato ${r.ore} ore fa con ${r.serie} serie. Il muscolo sta ancora riparando e ci alleneresti sopra un tessuto affaticato.`;
}
function suggestGroups(minuti){
  const rec=recentGroups(72);
  const tutti=["Gambe","Petto","Schiena","Spalle","Braccia","Core"];
  const ord=tutti.slice().sort((a,b)=>((rec[b]&&rec[b].ore)||999)-((rec[a]&&rec[a].ore)||999));
  const n=minuti<=30?2:(minuti<=45?3:4);
  return {scelti:ord.slice(0,n),recenti:rec};
}


/* ============ LIBRERIA CONDIVISA SU SUPABASE ============
   Tabella esercizi_comuni: chi e' autenticato propone, tutti leggono solo le
   voci approvate, l'approvazione spetta al proprietario dell'app.
   L'SQL della tabella viene fornito a parte e va eseguito una volta. */
/* Il ruolo di moderatore non sta piu' nel sorgente: l'email personale finiva
   pubblica su GitHub. Ora la verita' e' la tabella owner_roles su Supabase, che
   e' anche cio' che applicano le policy RLS. Qui dentro serve solo a decidere
   se mostrare la coda di moderazione: chi bypassa questo controllo viene
   comunque respinto dal database. */
let IS_OWNER=false;
function isOwner(){return IS_OWNER}
async function refreshOwnerRole(){
  IS_OWNER=false;
  if(!SESSION||!CLOUD_USER)return false;
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/owner_roles?select=ruolo&email=eq.${encodeURIComponent(CLOUD_USER.email)}`,
      {headers:{"Authorization":"Bearer "+SESSION.access_token,"apikey":SUPA_KEY}});
    if(!r.ok)return false;
    const rows=await r.json().catch(()=>[]);
    IS_OWNER=Array.isArray(rows)&&rows.some(x=>x&&x.ruolo==="owner");
  }catch(e){IS_OWNER=false}
  return IS_OWNER;
}

async function supaRest(path,opt){
  if(!SESSION)throw new Error("Serve l'accesso.");
  const r=await fetch(`${SUPA_URL}/rest/v1/${path}`,Object.assign({
    headers:{"Authorization":"Bearer "+SESSION.access_token,"apikey":SUPA_KEY,
             "Content-Type":"application/json","Prefer":"return=minimal"}},opt||{}));
  if(r.status===401&&SESSION.refresh_token){
    const ns=await refreshSession(SESSION.refresh_token);
    SESSION=ns;store.set("supa_session",JSON.stringify(ns));
    return supaRest(path,opt);
  }
  return r;
}
async function proposeShared(rec){
  try{
    const r=await supaRest("esercizi_comuni",{method:"POST",
      body:JSON.stringify({nome:rec[0],movimento:rec[1],riferimento:rec[2],
        coefficiente:rec[3],incremento:rec[4],gruppo:rec[5],
        proposto_da:CLOUD_USER?CLOUD_USER.email:"",approvato:false})});
    return r.ok||r.status===409;
  }catch(e){return false}
}
async function loadSharedLib(){
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/esercizi_comuni?approvato=eq.true&select=nome,movimento,riferimento,coefficiente,incremento,gruppo`,
      {headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+(SESSION?SESSION.access_token:SUPA_KEY)}});
    if(!r.ok)return;
    const rows=await r.json();
    rows.forEach(x=>{
      if(!LIBN[x.nome]){
        const rec=[x.nome,x.movimento,x.riferimento,+x.coefficiente||0,+x.incremento||2.5,x.gruppo];
        LIB.push(rec);LIBN[x.nome]={n:x.nome,ic:rec[1],ref:rec[2],k:rec[3],st:rec[4],grp:rec[5]};
      }
    });
  }catch(e){}
}
async function moderateAsk(){
  const sheet=document.getElementById("sheet");
  document.getElementById("modal").classList.add("on");
  sheet.innerHTML=`<h3>Proposte in attesa</h3><div class="sub" style="margin-top:12px">Carico…</div>`;
  try{
    const r=await supaRest("esercizi_comuni?approvato=eq.false&select=*",{method:"GET",
      headers:{"Authorization":"Bearer "+SESSION.access_token,"apikey":SUPA_KEY}});
    const rows=await r.json();
    const draw=(list)=>{
      sheet.innerHTML=`<h3>Proposte in attesa</h3>
        <div class="sub">Approvate, entrano nella libreria di tutti. Scartate, spariscono.</div>
        ${list.length?list.map((x,i)=>{
          const simile=findExercise(x.nome);
          return `<div class="card" style="padding:11px 13px;margin-top:8px">
            <div style="font-weight:600">${esc(x.nome)}</div>
            <div class="sub">${esc(x.movimento)} · ${esc(x.gruppo)} · coeff ${x.coefficiente} su ${esc(x.riferimento)} · da ${esc(x.proposto_da||"?")}</div>
            ${simile?`<div class="sub" style="color:var(--acc)">Simile a: ${esc(simile.n)}</div>`:""}
            <div style="display:flex;gap:8px;margin-top:8px">
              <button class="genbtn mok" data-i="${i}" style="flex:1;padding:9px">Approva</button>
              <button class="revert mno" data-i="${i}" style="flex:1">Scarta</button>
            </div></div>`;
        }).join(""):`<div class="empty" style="margin-top:12px">Nessuna proposta in attesa.</div>`}
        <button class="closebtn" id="md_close" style="margin-top:12px">Chiudi</button>`;
      sheet.querySelector("#md_close").onclick=closeModal;
      sheet.querySelectorAll(".mok").forEach(b=>b.onclick=async()=>{
        const x=list[+b.dataset.i];
        await supaRest("esercizi_comuni?id=eq."+x.id,{method:"PATCH",body:JSON.stringify({approvato:true})});
        list.splice(+b.dataset.i,1);draw(list);toast("Approvato");
      });
      sheet.querySelectorAll(".mno").forEach(b=>b.onclick=async()=>{
        const x=list[+b.dataset.i];
        await supaRest("esercizi_comuni?id=eq."+x.id,{method:"DELETE"});
        list.splice(+b.dataset.i,1);draw(list);toast("Scartato");
      });
    };
    draw(rows||[]);
  }catch(e){
    sheet.innerHTML=`<h3>Proposte in attesa</h3><div class="nextbox late" style="margin-top:12px">${esc(e.message||"Errore")}</div>
      <button class="closebtn" id="md_close">Chiudi</button>`;
    sheet.querySelector("#md_close").onclick=closeModal;
  }
}


/* riquadri informativi chiudibili: la chiusura vale per oggi, non per sempre */
function dismissible(html,chiave){
  const k="dis_"+chiave+"_"+new Date().toDateString();
  if(store.get(k)==="1")return "";
  return html.replace(/^<div /,'<div data-dis="'+k+'" ').replace(/<\/div>$/,
    '<button class="disx" data-k="'+k+'">×</button></div>');
}
function wireDismiss(){
  document.querySelectorAll(".disx").forEach(b=>b.onclick=ev=>{
    ev.stopPropagation();
    store.set(b.dataset.k,"1");
    const box=b.closest("[data-dis]"); if(box)box.remove();
  });
}


/* ============ LIBRERIA DI MOBILITA' ============
   Ogni voce: nome, dose, articolazioni preparate, come si esegue, a cosa serve. */
const MOBLIB=[
 ["Caviglia al muro","2×10 per lato",["caviglia"],"Punta del piede a 10 cm dal muro, spingi il ginocchio oltre la punta senza sollevare il tallone.","Profondità dello squat senza compensi."],
 ["Anca 90/90","6 rotazioni per lato",["anca"],"Seduto, gambe a 90° davanti e dietro. Ruota da un lato all'altro tenendo il busto alto.","Rotazione d'anca per squat, affondi e stacchi."],
 ["Adduttori rocking","10 oscillazioni",["anca"],"In quadrupedia con una gamba tesa di lato, spingi il bacino indietro.","Allunga gli adduttori: ginocchia fuori nello squat."],
 ["Ponte glutei","12 ripetizioni",["anca"],"Supino, piedi a terra, spingi il bacino in alto strizzando i glutei, 1 sec in cima.","Attiva i glutei prima di squat e stacchi."],
 ["Squat a corpo libero","10 lenti",["caviglia","anca","ginocchio"],"Scendi in 3 secondi fino in fondo, risali. Braccia avanti per bilanciare.","Prova generale del movimento a carico zero."],
 ["Cat-camel","10 cicli",["colonna"],"In quadrupedia, alterna schiena inarcata e schiena spinta in alto, lentamente.","Mobilizza la colonna prima delle cerniere d'anca."],
 ["Hip hinge con bastone","10 ripetizioni",["anca","colonna"],"Bastone a contatto con testa, dorso e sacro. Anca indietro senza perdere i 3 contatti.","Insegna la cerniera d'anca: schiena neutra su RDL e stacco."],
 ["Hamstring swing","10 per gamba",["anca"],"Oscilla la gamba tesa avanti e indietro tenendoti a un appoggio.","Scalda i femorali prima delle cerniere."],
 ["Toracica open book","8 per lato",["colonna","spalla"],"Sdraiato di fianco, ginocchia a 90°, apri il braccio superiore ruotando il torace.","Estensione toracica: arco in panca e spalle sane."],
 ["Dislocazioni con bastone","2×10",["spalla"],"Impugna largo un bastone, portalo da davanti a dietro a braccia tese.","Apre le spalle per panca e spinte sopra la testa."],
 ["Wall slide","10 ripetizioni",["spalla","scapole"],"Schiena al muro, avambracci a contatto, scorri le braccia su e giù senza staccarli.","Controllo scapolare per le spinte verticali."],
 ["Extrarotazione spalla","2×12 per lato",["spalla"],"Gomito al fianco a 90°, ruota l'avambraccio verso l'esterno, con elastico o manubrio leggero.","Scalda la cuffia dei rotatori."],
 ["Scapular push-up","2×10",["scapole"],"In plank a braccia tese, avvicina e allontana le scapole senza piegare i gomiti.","Attiva il dentato: stabilità in ogni spinta."],
 ["Scapular pull-up","2×8",["scapole","spalla"],"Appeso alla sbarra a braccia tese, deprimi le scapole sollevandoti di pochi cm.","Prepara dorsali e scapole alle trazioni."],
 ["Dead hang","2×20 sec",["spalla","scapole"],"Resta appeso alla sbarra, spalle attive, respira.","Decomprime e prepara la presa per le tirate."],
 ["Band pull apart","2×15",["scapole","spalla"],"Elastico teso davanti a te, aprilo portando le mani ai lati, scapole strette.","Sveglia il deltoide posteriore e i romboidi."],
 ["World's greatest stretch","5 per lato",["anca","colonna","caviglia"],"Affondo profondo, mano a terra, ruota il busto aprendo il braccio verso l'alto.","Tutto insieme: anca, torace e caviglia."],
 ["Rotazioni del polso","10 per verso",["polso"],"Mani giunte, ruota i polsi in entrambi i sensi.","Prepara i polsi a curl e spinte."]
];
const MOBN={};MOBLIB.forEach(m=>MOBN[m[0]]={n:m[0],dose:m[1],art:m[2],come:m[3],perche:m[4]});

/* articolazioni richieste da ogni schema motorio */
const PAT_ART={
 squat:["caviglia","anca","ginocchio"], legpress:["anca","ginocchio","caviglia"],
 lunge:["anca","ginocchio","caviglia"], hinge:["anca","colonna"],
 hpress:["spalla","colonna","scapole"], vpress:["spalla","scapole","colonna"],
 hpull:["scapole","spalla"], vpull:["scapole","spalla"],
 curl:["polso"], tri:["spalla","polso"], lat:["spalla"], face:["scapole","spalla"],
 calf:["caviglia"], core:["colonna"]
};

/* costruisce il riscaldamento dall'UNIONE delle articolazioni del giorno,
   con precedenza a quelle usate da piu' esercizi, e dose adattata al tempo */
function buildWarm(exList,minuti){
  const conta={};
  (exList||[]).forEach(e=>{
    const p=LIBN[e.n]?LIBN[e.n].ic:null;
    (PAT_ART[p]||[]).forEach(a=>conta[a]=(conta[a]||0)+1);
  });
  const ordinate=Object.keys(conta).sort((a,b)=>conta[b]-conta[a]);
  const max=(minuti||60)<=40?4:6;
  const out=[],usate=new Set();
  ordinate.forEach(art=>{
    if(out.length>=max)return;
    const cand=MOBLIB.filter(m=>m[2].includes(art)&&!usate.has(m[0]))
      .sort((a,b)=>b[2].filter(x=>ordinate.includes(x)).length - a[2].filter(x=>ordinate.includes(x)).length);
    if(cand[0]){usate.add(cand[0][0]);out.push([cand[0][0],cand[0][1]])}
  });
  const primo=(exList&&exList[0])?exList[0].n:"primo esercizio";
  out.push(["Serie di avvicinamento",primo+": vuoto → 50% → 75%"]);
  return out;
}
function warmSummary(w,exList){
  const arts=new Set();
  (w||[]).forEach(x=>{const m=MOBN[x[0]];if(m)m.art.forEach(a=>arts.add(a))});
  const n=(w||[]).length;
  const mins=Math.max(3,Math.round(n*0.8));
  return `${n} eserciz${n===1?"io":"i"} — ${[...arts].slice(0,3).join(", ")||"generale"} · ~${mins} min`;
}
/* pannello di dettaglio di una voce di mobilita' */
function openMob(nome){
  const m=MOBN[nome];if(!m)return;
  const sheet=document.getElementById("sheet");
  sheet.innerHTML=`
    <h3>${esc(m.n)}</h3>
    <div class="sub">${esc(m.dose)} · prepara: ${m.art.join(", ")}</div>
    <ol class="cues" style="margin-top:12px">
      <li><b>Come:</b> ${esc(m.come)}</li>
      <li><b>Perché:</b> ${esc(m.perche)}</li>
    </ol>
    <button class="closebtn" id="mb_close" style="margin-top:12px">Chiudi</button>`;
  sheet.querySelector("#mb_close").onclick=closeModal;
  document.getElementById("modal").classList.add("on");
}
/* gestione della lista: aggiungi e togli, con proposte filtrate sulle articolazioni del giorno */
function editWarmAsk(d){
  const sheet=document.getElementById("sheet");
  const draw=()=>{
    const artGiorno=new Set();
    (d.ex||[]).forEach(e=>{const p=LIBN[e.n]?LIBN[e.n].ic:null;(PAT_ART[p]||[]).forEach(a=>artGiorno.add(a))});
    const presenti=new Set((d.warm||[]).map(w=>w[0]));
    const proposte=MOBLIB.filter(m=>!presenti.has(m[0]))
      .sort((a,b)=>b[2].filter(x=>artGiorno.has(x)).length - a[2].filter(x=>artGiorno.has(x)).length)
      .slice(0,8);
    sheet.innerHTML=`
      <h3>Mobilità del giorno ${esc(d.id)}</h3>
      <div class="sub">Oggi servono: <b>${[...artGiorno].join(", ")||"—"}</b></div>
      <div class="lbl2">Nella tua sequenza</div>
      ${(d.warm||[]).map((w,i)=>`
        <div class="cfgrow" style="padding:8px 0">
          <span class="cl" data-mob="${esc(w[0])}" style="cursor:pointer">${esc(w[0])}<small>${esc(w[1])}</small></span>
          ${w[0]==="Serie di avvicinamento"?"":`<button class="revert wdel" data-i="${i}" style="padding:6px 12px">togli</button>`}
        </div>`).join("")}
      <div class="lbl2" style="margin-top:14px">Da aggiungere — ordinate per quello che serve oggi</div>
      ${proposte.map(m=>`
        <div class="cfgrow" style="padding:8px 0">
          <span class="cl" data-mob="${esc(m[0])}" style="cursor:pointer">${esc(m[0])}<small>${m[2].join(", ")}</small></span>
          <button class="genbtn wadd" data-n="${esc(m[0])}" style="padding:6px 14px">+</button>
        </div>`).join("")}
      ${gemKey()?`<div class="lbl2" style="margin-top:14px">Chiedi al preparatore</div>
        <input class="urlin" id="wq" placeholder="es. ho la spalla rigida, cosa aggiungo?">
        <button class="revert" id="wgo">Chiedi</button><div id="wout"></div>`:""}
      <button class="revert" id="wreset" style="margin-top:14px">Rigenera dagli esercizi del giorno</button>
      <button class="closebtn" id="w_close" style="margin-top:8px">Chiudi</button>`;
    sheet.querySelectorAll("[data-mob]").forEach(el=>el.onclick=()=>openMob(el.dataset.mob));
    sheet.querySelectorAll(".wdel").forEach(b=>b.onclick=()=>{d.warm.splice(+b.dataset.i,1);save();draw()});
    sheet.querySelectorAll(".wadd").forEach(b=>b.onclick=()=>{
      const m=MOBN[b.dataset.n];if(!m)return;
      d.warm.splice(Math.max(0,d.warm.length-1),0,[m.n,m.dose]);save();draw();
    });
    sheet.querySelector("#w_close").onclick=()=>{closeModal();render()};
    sheet.querySelector("#wreset").onclick=()=>{
      d.warm=buildWarm(d.ex,(S.cfg&&S.cfg.target)||60);save();draw();toast("Mobilità ricostruita sugli esercizi del giorno");
    };
    const wg=sheet.querySelector("#wgo");
    if(wg)wg.onclick=async()=>{
      const q=(sheet.querySelector("#wq").value||"").trim();if(!q)return;
      const out=sheet.querySelector("#wout");
      out.innerHTML=`<div class="sub" style="margin-top:8px">Un attimo…</div>`;
      try{
        const P=["Sei un preparatore. L'atleta chiede un consiglio sulla mobilità pre-allenamento.",
          "Rispondi in massimo 60 parole. Se suggerisci esercizi, scegli SOLO tra questi:",
          MOBLIB.map(m=>m[0]).join(" · "),
          "","OGGI ALLENA: "+(d.ex||[]).map(e=>e.n).join(", "),
          "DOMANDA: "+q].join("\n");
        const t=await askAI(P);
        out.innerHTML=`<div class="cues" style="padding:11px;margin-top:8px;font-size:13px">${esc(t.trim())}</div>`;
      }catch(e){out.innerHTML=`<div class="nextbox late" style="margin-top:8px">${esc(e.message)}</div>`}
    };
  };
  draw();
  document.getElementById("modal").classList.add("on");
}


/* Pannello mobilità: resta aperto/chiuso secondo lo stato salvato (non quello
   di default del browser), e la spunta aggiorna solo se stessa, mai l'intero
   giorno. Un solo montaggio, usato sia dal giorno fisso sia dal RANDOM. */
function mountWarmPanel(host,d,onEdit){
  if(!host)return;
  const openKey="warmopen_"+d.id;
  let open=store.get(openKey)==="1";
  const paint=()=>{
    const done=(S._wdone&&S._wdone[d.id])?S._wdone[d.id]:{};
    const n=Object.values(done).filter(Boolean).length;
    host.innerHTML=`
      <details class="warm" ${open?"open":""}>
        <summary>Mobilità · ${warmSummary(d.warm,d.ex)}${n?` · ${n}/${d.warm.length} fatti`:""}</summary>
        <div class="wmrows">${d.warm.map((w,wi)=>`
          <div class="wmrow${done[wi]?" done":""}" data-wi="${wi}">
            <button class="wmtick" data-wi="${wi}">✓</button>
            <span class="wmn" data-mob="${esc(w[0])}"><b>${esc(w[0])}</b> — ${esc(w[1])}</span>
          </div>`).join("")}
        </div>
        <button class="setbarbtn" id="weditbtn">✎ Modifica la sequenza</button>
      </details>`;
    const det=host.querySelector("details");
    det.ontoggle=()=>{open=det.open;store.set(openKey,open?"1":"0")};
    host.querySelectorAll(".wmtick").forEach(b=>b.onclick=ev=>{
      ev.stopPropagation();
      const wi=b.dataset.wi;
      if(!S._wdone)S._wdone={}; if(!S._wdone[d.id])S._wdone[d.id]={};
      S._wdone[d.id][wi]=!S._wdone[d.id][wi];
      save();
      // aggiorna solo la riga toccata: il pannello, aperto, non si ridisegna tutto
      const row=host.querySelector('.wmrow[data-wi="'+wi+'"]');
      row.classList.toggle("done",!!S._wdone[d.id][wi]);
      const cnt=Object.values(S._wdone[d.id]).filter(Boolean).length;
      const sm=host.querySelector("summary");
      sm.textContent=`Mobilità · ${warmSummary(d.warm,d.ex)}${cnt?` · ${cnt}/${d.warm.length} fatti`:""}`;
    });
    host.querySelectorAll(".wmn[data-mob]").forEach(el=>el.onclick=()=>openMob(el.dataset.mob));
    const we=host.querySelector("#weditbtn");
    if(we)we.onclick=()=>{if(onEdit)onEdit();else editWarmAsk(d)};
  };
  paint();
}


/* ============ CONSIGLIO DEL PT SOTTO OGNI ESERCIZIO ============
   Ancorato solo a fatti gia' calcolati o scritti dall'utente: nota di dolore
   riportata, verdetto sul carico, confronto con un esercizio dello stesso
   gruppo nello stesso giorno. Se non c'e' nulla di concreto, niente riga:
   non si inventano consigli per riempire lo spazio. */
const PAIN_RX=/dolor|fastidi|\bmale\b|tira(?!ta)|infiamm|fa male|rigid/i;

function painFlag(dayId,e){
  if(e.note&&PAIN_RX.test(e.note))
    return `Nota tua: "${e.note}". Occhio a riproporre lo stesso schema di movimento.`;
  const last=(S.log||[]).filter(s=>s.d===dayId).slice(-1)[0];
  if(last&&last.qa){
    const hit=last.qa.find(q=>PAIN_RX.test(q.a||""));
    if(hit)return `L'ultima volta segnalavi: "${hit.a}". Tienilo a mente su questo movimento.`;
  }
  return null;
}
/* se sei pronto a salire su un esercizio dello stesso gruppo ma non su questo,
   è un confronto legittimo: stesso distretto, stessa seduta, stesso metro */
function siblingPush(dayId,e,d){
  const g=grpOf(e.n); if(!g||g==="Elastici")return null;
  const sib=(d.ex||[]).filter(x=>x!==e&&grpOf(x.n)===g);
  if(!sib.length)return null;
  const meUp=overloadHint(dayId,e);
  const sibUp=sib.find(x=>overloadHint(dayId,x));
  if(!meUp&&sibUp)
    return `Su ${sibUp.n} hai chiuso tutte le serie al top: qui invece no. Se la tecnica regge, prova a spingere un po' di più.`;
  return null;
}
function ptLine(dayId,e,d){
  try{
    const p=painFlag(dayId,e); if(p)return p;
    const v=loadVerdict(dayId,e); if(v)return v.txt;
    const sib=siblingPush(dayId,e,d); if(sib)return sib;
  }catch(err){}
  return "";
}

/* ---- 8. rinomina i giorni. La lettera e' la chiave dello storico e non si tocca ---- */
const NOMI_PROP={
 squat:["Ginocchia e spinta","Gambe e petto","Forza gambe"],
 hinge:["Cerniera d'anca e tirata","Catena posteriore","Schiena e femorali"],
 hpress:["Spinta orizzontale","Petto e tricipiti","Parte alta spinta"],
 vpull:["Tirata verticale","Dorso e bicipiti","Parte alta tirata"],
 legpress:["Quadricipiti","Gambe","Volume gambe"],
 hpull:["Tirata orizzontale","Schiena spessore","Dorso"],
 vpress:["Spalle","Spinta verticale","Spalle e tricipiti"]
};
function proposteNome(d){
  const p=(d.ex&&d.ex[0])?(LIBN[d.ex[0].n]?LIBN[d.ex[0].n].ic:null):null;
  const base=NOMI_PROP[p]||["Allenamento "+d.id,"Full body","Seduta "+d.id];
  const grp=[...new Set((d.ex||[]).map(e=>LIBN[e.n]?LIBN[e.n].grp:null).filter(Boolean))].slice(0,2);
  return [...new Set(base.concat(grp.length?[grp.join(" e ")]:[]))];
}
function renameDaysAsk(){
  const sheet=document.getElementById("sheet");
  const draw=()=>{
    sheet.innerHTML=`
      <h3>Nomi dei giorni</h3>
      <div class="sub">La lettera (A, B, C…) resta com'è: è la chiave con cui lo storico ritrova le sedute. Cambia solo la descrizione che leggi in cima.</div>
      ${(S.days||[]).map((d,i)=>`
        <div class="lbl2">Giorno ${esc(d.id)}</div>
        <input class="urlin nmin" data-i="${i}" value="${esc(d.focus||"")}" placeholder="descrizione">
        <div class="chips prop" data-i="${i}">${proposteNome(d).map(n=>
          `<button class="chip" data-n="${esc(n)}">${esc(n)}</button>`).join("")}</div>`).join("")}
      <button class="genbtn" id="nm_ok" style="margin-top:14px">Salva</button>
      <button class="closebtn" id="nm_close" style="margin-top:8px">Chiudi</button>`;
    sheet.querySelectorAll(".prop").forEach(c=>c.querySelectorAll(".chip").forEach(b=>b.onclick=()=>{
      const inp=sheet.querySelector('.nmin[data-i="'+c.dataset.i+'"]');
      if(inp)inp.value=b.dataset.n;
    }));
    sheet.querySelector("#nm_close").onclick=closeModal;
    sheet.querySelector("#nm_ok").onclick=()=>{
      sheet.querySelectorAll(".nmin").forEach(inp=>{
        const d=S.days[+inp.dataset.i];
        if(d)d.focus=inp.value.trim()||d.focus;
      });
      save();closeModal();render();toast("Nomi aggiornati");
    };
  };
  draw();
  document.getElementById("modal").classList.add("on");
}

(function(){
  const fab=document.getElementById("fab");
  if(!fab)return;
  fab.onclick=()=>{if(typeof aiChatAsk==="function")aiChatAsk()};
  const agg=()=>{
    const dentro=["A","B","C","D","E","RND","LOG","BODY"].includes(view);
    const barra=document.getElementById("bar");
    const timer=barra&&barra.classList.contains("run");
    const giu=window.scrollY>220;
    fab.classList.toggle("on", !!(dentro&&giu&&!timer&&typeof gemKey==="function"&&gemKey()));
  };
  window.addEventListener("scroll",agg,{passive:true});
  setInterval(agg,700);
})();

(function(){const t=document.getElementById("verTag");if(t)t.textContent="v"+APP_VERSION})();

async function bootAuth(){
  if(store.get("app_ver")!==APP_VERSION){
    store.set("app_ver",APP_VERSION);
    setTimeout(()=>{try{toast("Aggiornata alla versione "+APP_VERSION)}catch(e){}},1500);
  }
  drawAuthMode();
  if(store.get("supa_offline")==="1"){safeStart();afterLoginFlow();return}
  let s=null;
  try{s=JSON.parse(store.get("supa_session"))}catch(e){}
  if(s&&s.access_token){
    let u=await fetchUser(s.access_token);
    if(!u&&s.refresh_token){                 // token scaduto: prova a rinnovarlo
      try{s=await refreshSession(s.refresh_token);u=await fetchUser(s.access_token)}catch(e){u=null}
    }
    if(u){
      SESSION=s; CLOUD_USER=u;
      store.set("supa_session",JSON.stringify(s));
      store.set("supa_uid",u.id);
      authScreen.classList.remove("show");
      safeStart();
      await pullAndMerge();
      await pullAIKeys();
      render(); updateBarInfo();
      afterLoginFlow();
      return;
    }
    store.del("supa_session");
  }
  authScreen.classList.add("show");
}
bootAuth();

// salva in cloud prima di chiudere o mettere in background
window.addEventListener("pagehide",()=>{if(syncReady){clearTimeout(pushTimer);pushNow()}});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&syncReady){clearTimeout(pushTimer);pushNow()}});

// guardia globale: se un errore sfugge dopo l'avvio, non lasciare la pagina rotta al prossimo caricamento
window.addEventListener("error",function(){ /* già gestito da safeStart; qui solo per non bloccare */ });