/* Punto d'ingresso. Vite parte da qui: prima gli stili, poi l'applicazione. */
import "./styles/index.css";
import "./app.js";

/* Service worker solo in produzione: in dev servirebbe file che non esistono
   ancora (bundle non buildato) e disturberebbe la ricarica a caldo di Vite. */
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
