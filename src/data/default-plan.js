/* ---------------- scheda di default ---------------- */
const mk=(w,n)=>Array.from({length:n},()=>({w:w,r:"",done:false}));
const D={days:[
 {id:"A",focus:"Squat / Spinta orizzontale",
  warm:[["Caviglia al muro","2×10 per lato"],["Anca 90/90","6 rotazioni per lato"],["Adduttori rocking","10 oscillazioni"],["Toracica open book","8 per lato"],["Dislocazioni con bastone","2×10"],["Serie di avvicinamento","Squat: vuoto → 50% → 75%"]],
  ex:[
   {n:"Perfect Squat",ic:"squat",img:"",w:125,inc:5,rest:150,r:"6-8",sets:mk(125,4),note:"",tag:""},
   {n:"Panca piana bilanciere",ic:"hpress",img:"",w:60,inc:2.5,rest:120,r:"8",sets:mk(60,4),note:"",tag:""},
   {n:"Seated row",ic:"hpull",img:"",w:54,inc:1,rest:90,r:"10",sets:mk(54,3),note:"macchina a pacco: +1 tacca",tag:""},
   {n:"Military press bilanciere",ic:"vpress",img:"",w:30,inc:2.5,rest:120,r:"8",sets:mk(30,3),note:"da tarare",tag:"NUOVO"},
   {n:"Curl martello",ic:"curl",img:"",w:12.5,inc:2.5,rest:0,r:"10",sets:mk(12.5,3),note:"superserie con calf raise",tag:"",ss:1},
   {n:"Calf raise",ic:"calf",img:"",w:20,inc:5,rest:60,r:"15",sets:mk(20,3),note:"superserie con curl martello",tag:"NUOVO",ss:1}]},
 {id:"B",focus:"Cerniera d'anca / Tirata verticale",
  warm:[["Cat-camel","10 cicli"],["Hip hinge con bastone","10 rip, 3 punti di contatto"],["Hamstring swing","10 per gamba"],["Dead hang","2×20 sec"],["Scapular pull-up","2×8"],["Serie di avvicinamento","RDL: vuoto → 50% → 75%"]],
  ex:[
   {n:"RDL bilanciere",ic:"hinge",img:"",w:75,inc:5,rest:150,r:"8",sets:mk(75,4),note:"esercizio più sottocaricato: spingi qui",tag:""},
   {n:"Lat machine supina",ic:"vpull",img:"",w:54,inc:1,rest:120,r:"8-10",sets:mk(54,4),note:"",tag:""},
   {n:"Panca 45° multipower",ic:"hpress",img:"",w:55,inc:2.5,rest:90,r:"8-10",sets:mk(55,3),note:"",tag:""},
   {n:"Alzate laterali",ic:"lat",img:"",w:8,inc:2,rest:60,r:"15",sets:mk(8,4),note:"da tarare — gomito guida",tag:"NUOVO"},
   {n:"French press EZ",ic:"tri",img:"",w:15,inc:2.5,rest:0,r:"10",sets:mk(15,3),note:"15 + bilanciere EZ. Superserie con plank",tag:"",ss:1},
   {n:"Plank",ic:"core",img:"",w:0,inc:0,rest:60,r:"40 sec",sets:mk(0,3),note:"superserie con french press",tag:"NUOVO",ss:1}]},
 {id:"C",focus:"Quadricipiti / Tirata orizzontale",
  warm:[["Anca 90/90","6 per lato"],["World's greatest stretch","5 per lato"],["Band pull apart","2×15"],["Extrarotazione spalla","2×12 per lato"],["Scapular push-up","2×10"],["Serie di avvicinamento","Leg press: slitta → 50% → 75%"]],
  ex:[
   {n:"Leg press",ic:"legpress",img:"",w:195,inc:5,rest:120,r:"10",sets:mk(195,4),note:"carico totale, slitta inclusa",tag:""},
   {n:"Rematore T-bar",ic:"hpull",img:"",w:50,inc:5,rest:120,r:"8",sets:mk(50,4),note:"",tag:""},
   {n:"Spinte manubri seduto",ic:"vpress",img:"",w:16,inc:2,rest:90,r:"10",sets:mk(16,3),note:"da tarare (per manubrio)",tag:"NUOVO"},
   {n:"Affondi in camminata",ic:"lunge",img:"",w:12.5,inc:2.5,rest:90,r:"12+12",sets:mk(12.5,3),note:"per manubrio",tag:""},
   {n:"Curl EZ",ic:"curl",img:"",w:15,inc:2.5,rest:0,r:"10",sets:mk(15,3),note:"15 + bilanciere EZ. Superserie con face pull",tag:"",ss:1},
   {n:"Face pull",ic:"face",img:"",w:20,inc:2.5,rest:60,r:"15",sets:mk(20,3),note:"superserie con curl EZ",tag:"NUOVO",ss:1}]}
],log:[],body:[],cfg:{gap:2,target:65,notif:false},profile:null};

export { mk, D };
