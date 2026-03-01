const CACHE_NAME = 'adoradores-del-rey-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/src/styles/main.css',
  '/src/styles/mobile.css',
  '/src/js/app.js',
  '/src/js/auth.js',
  '/src/js/chords-render.js',
  '/src/js/supabaseClient.js',
  '/src/js/transpose.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;800;900&family=Roboto:wght@300;400;500;700&display=swap',
  'https://html2canvas.hertzen.com/dist/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
];

// Evento de instalación: guarda en caché todos los assets principales de la aplicación.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Evento de activación: limpia los cachés antiguos para mantener la aplicación actualizada.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Evento fetch: intercepta las peticiones. Sirve desde el caché si está disponible, si no, va a la red.
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // No guardar en caché las llamadas a la API de Supabase. Siempre deben ir a la red.
  if (requestUrl.origin === 'https://pmqwanlsdnzdfqkxjppa.supabase.co') {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si hay una respuesta en el caché, la retornamos.
        if (response) {
          return response;
        }

        // Si no, la buscamos en la red.
        return fetch(event.request).then(
          response => {
            // Si la respuesta es válida, la guardamos en caché para futuras visitas.
            if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
            return response;
          }
        );
      })
  );
});