self.addEventListener("install", () => {
  console.log("✅ Service Worker instalado");
});

self.addEventListener("fetch", (event) => {
  // Aqui você pode interceptar requisições e servir cache, se quiser
});
