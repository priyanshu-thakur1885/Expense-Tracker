self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker activated.');
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response(
        '<h1 style="text-align:center; margin-top:40px;">⚠️ No Internet Connection</h1><p style="text-align:center;">Please connect to the internet to use Expense Tracker.</p>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    })
  );
});
