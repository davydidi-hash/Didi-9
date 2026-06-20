// DIDI Service Worker v5 — background notifications
const CACHE = "didi-v5";
const ASSETS = ["./index.html","./manifest.json","./icon.svg","./icon-192.png","./icon-512.png"];

const MOTIV_MSGS = [
  {t:"DIDI — Rise up!",b:"The sunrise already clocked in. Your goals are waiting."},
  {t:"DIDI — Stay disciplined",b:"Consistency beats motivation. Every single time."},
  {t:"DIDI — Habit check",b:"Your future self is watching. Make them proud."},
  {t:"DIDI — Keep going",b:"Tiny actions become giant results. Keep stacking."},
  {t:"DIDI — Mid-day push",b:"You didn't come this far to scroll endlessly."},
  {t:"DIDI — Focus",b:"Nobody accidentally becomes successful. Be intentional."},
  {t:"DIDI — Afternoon reminder",b:"Momentum starts with one action. Take it now."},
  {t:"DIDI — Evening check",b:"How many habits have you ticked today? Don't let the day slip."},
  {t:"DIDI — Wind down strong",b:"Reflect on today. What did you do your future self will thank you for?"},
  {t:"DIDI — Night mode",b:"Plan tomorrow before you sleep. Champions prepare the night before."},
  {t:"DIDI — Rare message",b:"Plot twist: today's effort changes everything."},
  {t:"DIDI — You got this",b:"The mission continues. One more day of discipline."}
];

// Notification times: 8 spread across the day (6am-10pm)
const NOTIF_TIMES = [6*60, 8*60, 10*60, 12*60, 14*60, 16*60, 18*60, 20*60, 21*60+30];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
  // Schedule background notifications
  scheduleBackgroundNotifs();
});

self.addEventListener("fetch", e => {
  if(e.request.method !== "GET") return;
  if(!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached){
        fetch(e.request).then(res => {
          if(res && res.status === 200) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }).catch(()=>{});
        return cached;
      }
      return fetch(e.request).then(res => {
        if(res && res.status === 200 && res.type !== "opaque")
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => caches.match("./index.html"));
    })
  );
});

// Push from server (future use)
self.addEventListener("push", e => {
  const data = e.data ? e.data.json() : {title:"DIDI",body:"Time to check your habits!"};
  e.waitUntil(
    self.registration.showNotification(data.title || "DIDI", {
      body: data.body || "",
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      vibrate: [200,100,200,100,200],
      tag: "didi-push",
      renotify: true,
      requireInteraction: false
    })
  );
});

// Background scheduled notifications via periodicsync or message
self.addEventListener("message", e => {
  if(e.data && e.data.type === "SCHEDULE_NOTIFS") {
    scheduleBackgroundNotifs();
  }
  if(e.data && e.data.type === "FIRE_NOTIF") {
    const msg = MOTIV_MSGS[Math.floor(Math.random() * MOTIV_MSGS.length)];
    self.registration.showNotification(msg.t, {
      body: msg.b,
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      vibrate: [200,100,200,100,200],
      tag: "didi-motiv-" + Date.now(),
      renotify: true,
      requireInteraction: false,
      silent: false
    });
  }
});

function scheduleBackgroundNotifs() {
  // Use alarms via setTimeout in SW context — fires when SW is alive
  const now = new Date();
  const todayMins = now.getHours() * 60 + now.getMinutes();

  NOTIF_TIMES.forEach((mins, idx) => {
    let diff = (mins - todayMins) * 60 * 1000;
    if(diff <= 0) diff += 24 * 60 * 60 * 1000; // next day
    setTimeout(() => {
      const msg = MOTIV_MSGS[idx % MOTIV_MSGS.length];
      self.registration.showNotification(msg.t, {
        body: msg.b,
        icon: "./icon-192.png",
        badge: "./icon-192.png",
        vibrate: [200,100,200,100,200],
        tag: "didi-motiv-" + idx,
        renotify: true,
        requireInteraction: false
      });
    }, diff);
  });
}

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({type:"window"}).then(cls => {
    for(const c of cls) { if(c.url.includes("index.html") && "focus" in c) return c.focus(); }
    return clients.openWindow("./index.html");
  }));
});

// Periodic background sync for notifications (where supported)
self.addEventListener("periodicsync", e => {
  if(e.tag === "didi-daily-notif") {
    e.waitUntil((async () => {
      const msg = MOTIV_MSGS[Math.floor(Math.random() * MOTIV_MSGS.length)];
      await self.registration.showNotification(msg.t, {
        body: msg.b,
        icon: "./icon-192.png",
        badge: "./icon-192.png",
        vibrate: [200,100,200,100,200],
        tag: "didi-periodic",
        renotify: true
      });
    })());
  }
});
