import { defineConfig } from "vite";

/* base: "./" produce percorsi relativi nel bundle. Serve perche' su GitHub
   Pages il sito vive sotto /nome-repo/ e non sulla radice del dominio: con
   percorsi assoluti il browser cercherebbe /assets/... e prenderebbe 404. */
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    target: "es2020",      // Safari iOS 14+
    sourcemap: true,       // per leggere gli errori veri in produzione
    chunkSizeWarningLimit: 1200
  },
  server: { host: true, port: 5173 }   // host:true = raggiungibile dal telefono in rete locale
});
