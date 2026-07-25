/* ---------------- LIBRERIA ESERCIZI ----------------
   Curata dai database open source wger.de e free-exercise-db (nomi
   deduplicati: un solo nome per movimento). Campi:
   [nome, figura, riferimento, coefficiente, step kg, gruppo]
   Il carico stimato = riferimento personale × coefficiente.        */
const LIB=[
 /* GAMBE */
 ["Back squat bilanciere","squat","squat",1.0,2.5,"Gambe"],
 ["Front squat","squat","squat",.8,2.5,"Gambe"],
 ["Perfect Squat","squat","squat",1.6,5,"Gambe"],
 ["Hack squat","squat","squat",1.4,5,"Gambe"],
 ["Goblet squat (manubrio)","squat","squat",.35,2,"Gambe"],
 ["Leg press","legpress","squat",2.5,5,"Gambe"],
 ["Leg extension","legpress","squat",.7,5,"Gambe"],
 ["Affondi in camminata","lunge","squat",.16,2.5,"Gambe"],
 ["Affondi bulgari (per manubrio)","lunge","squat",.16,2,"Gambe"],
 ["Step-up (per manubrio)","lunge","squat",.16,2,"Gambe"],
 ["Stacco da terra","hinge","hinge",1.25,5,"Gambe"],
 ["RDL bilanciere","hinge","hinge",1.0,2.5,"Gambe"],
 ["RDL manubri (per manubrio)","hinge","hinge",.4,2,"Gambe"],
 ["Good morning","hinge","hinge",.5,2.5,"Gambe"],
 ["Hip thrust bilanciere","hinge","hinge",1.5,5,"Gambe"],
 ["Leg curl sdraiato","hinge","hinge",.5,5,"Gambe"],
 ["Leg curl seduto","hinge","hinge",.55,5,"Gambe"],
 ["Adductor machine","legpress","squat",.55,5,"Gambe"],
 ["Abductor machine","legpress","squat",.5,5,"Gambe"],
 ["Calf raise","calf","squat",.26,5,"Gambe"],
 ["Calf machine seduto","calf","squat",.4,5,"Gambe"],
 ["Calf alla leg press","calf","squat",1.2,5,"Gambe"],
 /* PETTO */
 ["Panca piana bilanciere","hpress","bench",1.0,2.5,"Petto"],
 ["Panca piana manubri (per manubrio)","hpress","bench",.38,2,"Petto"],
 ["Panca inclinata bilanciere","hpress","bench",.85,2.5,"Petto"],
 ["Panca inclinata manubri (per manubrio)","hpress","bench",.33,2,"Petto"],
 ["Panca 45° multipower","hpress","bench",.95,2.5,"Petto"],
 ["Panca presa stretta","hpress","bench",.8,2.5,"Petto"],
 ["Chest press","hpress","bench",.9,5,"Petto"],
 ["Chest press inclinata","hpress","bench",.85,5,"Petto"],
 ["Croci manubri (per manubrio)","hpress","bench",.22,2,"Petto"],
 ["Croci ai cavi (per lato)","hpress","bench",.18,2.5,"Petto"],
 ["Pec deck","hpress","bench",.75,5,"Petto"],
 ["Dip alle parallele","hpress","bench",0,0,"Petto"],
 ["Push-up","hpress","bench",0,0,"Petto"],
 /* SCHIENA */
 ["Rematore bilanciere","hpull","row",1.0,2.5,"Schiena"],
 ["Rematore manubrio (per manubrio)","hpull","row",.5,2,"Schiena"],
 ["Rematore T-bar","hpull","row",.85,5,"Schiena"],
 ["Seated row","hpull","row",.95,1,"Schiena"],
 ["Pulley presa larga","hpull","row",.95,1,"Schiena"],
 ["Lat machine presa larga","vpull","row",.9,1,"Schiena"],
 ["Lat machine supina","vpull","row",.95,1,"Schiena"],
 ["Trazioni alla sbarra","vpull","row",0,0,"Schiena"],
 ["Trazioni assistite","vpull","row",0,0,"Schiena"],
 ["Pulldown braccia tese","vpull","row",.5,2.5,"Schiena"],
 ["Pullover ai cavi","vpull","row",.5,2.5,"Schiena"],
 ["Shrug bilanciere","hpull","hinge",1.0,5,"Schiena"],
 ["Shrug manubri (per manubrio)","hpull","hinge",.35,2,"Schiena"],
 ["Hyperextension","hinge","hinge",0,0,"Schiena"],
 ["Face pull","face","row",.35,2.5,"Schiena"],
 ["Reverse pec deck","face","row",.5,5,"Schiena"],
 ["Reverse fly ai cavi (per braccio)","face","row",.2,2.5,"Schiena"],
 /* SPALLE */
 ["Military press bilanciere","vpress","ohp",1.0,2.5,"Spalle"],
 ["Spinte manubri seduto","vpress","ohp",.5,2,"Spalle"],
 ["Arnold press (per manubrio)","vpress","ohp",.45,2,"Spalle"],
 ["Shoulder press machine","vpress","ohp",1.6,5,"Spalle"],
 ["Landmine press","vpress","ohp",.9,2.5,"Spalle"],
 ["Alzate laterali","lat","ohp",.25,1,"Spalle"],
 ["Alzate ai cavi (per braccio)","lat","ohp",.2,1,"Spalle"],
 ["Lateral raise machine","lat","ohp",.5,5,"Spalle"],
 ["Alzate frontali (per manubrio)","lat","ohp",.25,1,"Spalle"],
 ["Alzate posteriori manubri (per manubrio)","face","ohp",.2,1,"Spalle"],
 /* BRACCIA */
 ["Curl bilanciere","curl","bench",.3,2.5,"Braccia"],
 ["Curl EZ","curl","bench",.26,2.5,"Braccia"],
 ["Curl manubri (per manubrio)","curl","bench",.2,2,"Braccia"],
 ["Curl martello","curl","bench",.21,2.5,"Braccia"],
 ["Curl panca inclinata (per manubrio)","curl","bench",.18,2,"Braccia"],
 ["Curl concentrato (manubrio)","curl","bench",.18,2,"Braccia"],
 ["Curl ai cavi","curl","bench",.3,2.5,"Braccia"],
 ["Preacher curl EZ","curl","bench",.24,2.5,"Braccia"],
 ["French press EZ","tri","bench",.26,2.5,"Braccia"],
 ["French press manubrio","tri","bench",.24,2,"Braccia"],
 ["Push down ai cavi","tri","bench",.5,2.5,"Braccia"],
 ["Push down presa inversa","tri","bench",.4,2.5,"Braccia"],
 ["Estensioni overhead ai cavi","tri","bench",.45,2.5,"Braccia"],
 ["Kickback manubrio","tri","bench",.12,2,"Braccia"],
 /* CORE */
 ["Plank","core","row",0,0,"Core"],
 ["Plank laterale","core","row",0,0,"Core"],
 ["Ab wheel","core","row",0,0,"Core"],
 ["Hollow hold","core","row",0,0,"Core"],
 ["Crunch ai cavi","core","row",.3,2.5,"Core"],
 ["Leg raise alla sbarra","core","row",0,0,"Core"],
 ["Russian twist (disco)","core","bench",.15,2.5,"Core"],
 ["Pallof press ai cavi","core","row",.2,2.5,"Core"],
 /* ELASTICI — resistenza non in kg: si regola con tensione/banda (k=0) */
 ["Band squat","squat","squat",0,0,"Elastici"],
 ["Band good morning","hinge","hinge",0,0,"Elastici"],
 ["Band deadlift","hinge","hinge",0,0,"Elastici"],
 ["Band hip thrust","hinge","hinge",0,0,"Elastici"],
 ["Band monster walk (laterale)","lunge","squat",0,0,"Elastici"],
 ["Band leg curl","hinge","hinge",0,0,"Elastici"],
 ["Band kickback glutei","hinge","hinge",0,0,"Elastici"],
 ["Band chest press","hpress","bench",0,0,"Elastici"],
 ["Band push-up (banda sulla schiena)","hpress","bench",0,0,"Elastici"],
 ["Band fly (croci)","hpress","bench",0,0,"Elastici"],
 ["Band row (rematore)","hpull","row",0,0,"Elastici"],
 ["Band lat pulldown","vpull","row",0,0,"Elastici"],
 ["Band pull-apart","face","row",0,0,"Elastici"],
 ["Band face pull","face","row",0,0,"Elastici"],
 ["Band shoulder press","vpress","ohp",0,0,"Elastici"],
 ["Band alzate laterali","lat","ohp",0,0,"Elastici"],
 ["Band alzate frontali","lat","ohp",0,0,"Elastici"],
 ["Band external rotation (cuffia)","face","ohp",0,0,"Elastici"],
 ["Band curl bicipiti","curl","bench",0,0,"Elastici"],
 ["Band hammer curl","curl","bench",0,0,"Elastici"],
 ["Band push down tricipiti","tri","bench",0,0,"Elastici"],
 ["Band overhead extension","tri","bench",0,0,"Elastici"],
 ["Band pallof press","core","row",0,0,"Elastici"],
 ["Band wood chop (core)","core","row",0,0,"Elastici"]
];
const LIBN={};LIB.forEach(a=>LIBN[a[0]]={n:a[0],ic:a[1],ref:a[2],k:a[3],st:a[4],grp:a[5],band:a[5]==="Elastici"});
const GRPS=["Tutti","Gambe","Petto","Schiena","Spalle","Braccia","Core","Elastici"];
function isBand(name){return (LIBN[name]&&LIBN[name].band)|| /^band /i.test(name||"")}
function defaultsFor(li){
  if(li.grp==="Elastici")return{r:"15",rest:60};
  if(li.k===0)return{r:/Plank|Hollow/.test(li.n)?"40 sec":"10",rest:90};
  if(li.k>=.8)return{r:"8",rest:120};
  if(li.k>=.45)return{r:"10",rest:90};
  return{r:"12",rest:60};
}

export { LIB, LIBN, GRPS, isBand, defaultsFor };
