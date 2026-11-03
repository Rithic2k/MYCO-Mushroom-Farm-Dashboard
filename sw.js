/* Cache the app shell for offline use. Never cache Supabase data, authentication or photos. */
const CACHE='myco-field-lab-shell-v2';
const FILES=['./','./index.html','./styles.css','./app.js','./cloud.js','./config.js','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(x=>x!==CACHE).map(x=>caches.delete(x)))),self.clients.claim()])));
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 event.respondWith(fetch(req).then(res=>{if(res.ok&&FILES.some(f=>new URL(f,self.registration.scope).href===req.url)){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return res;}).catch(()=>caches.match(req).then(r=>r||Response.error())));
});
