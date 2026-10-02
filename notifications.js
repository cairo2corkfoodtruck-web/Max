/* ============================================================
   notifications.js — MAXSEN Cloud 10.0
   Sounds, Telegram Bot, Message Notifications, Unread Counters
   ============================================================ */

/* ---------- Sounds ---------- */
function playTap(){
  if(!soundEnabled) return;
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if(audioCtx.state === 'suspended') audioCtx.resume();

    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g);
    g.connect(audioCtx.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(1400, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.06);
    g.gain.setValueAtTime(0.035, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    o.start();
    o.stop(audioCtx.currentTime + 0.08);
  }catch(e){}
}

function playSend(){
  if(!soundEnabled) return;
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if(audioCtx.state === 'suspended') audioCtx.resume();

    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g);
    g.connect(audioCtx.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(900, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1600, audioCtx.currentTime + 0.07);
    g.gain.setValueAtTime(0.045, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    o.start();
    o.stop(audioCtx.currentTime + 0.12);
  }catch(e){}
}

/* ---------- Telegram Bot ---------- */
async function tg(method, body, timeoutMs = 15000){
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);

  try{
    const r = await fetch(`${API}/${method}`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(tid);
    return r.json();
  }catch(e){
    clearTimeout(tid);
    return {ok: false};
  }
}

async function notifyBot(type, user, extra = {}){
  try{
    let title = "", icon = "📢";

    if(type === "login"){ title = "تسجيل دخول"; icon = "🔓"; }
    else if(type === "signup"){ title = "حساب جديد"; icon = "✨"; }
    else if(type === "logout"){ title = "تسجيل خروج"; icon = "🚪"; }
    else if(type === "profile"){ title = "تحديث ملف"; icon = "📝"; }
    else if(type === "block"){ title = "حظر مستخدم"; icon = "🚫"; }
    else if(type === "post"){ title = "منشور جديد"; icon = "📰"; }
    else title = "حدث";

    let text = `${icon} <b>${title}</b>\n━━━━━━━━━━━━━━\n`;

    if(user){
      text += `<b>الاسم:</b> ${user.firstName||''} ${user.lastName||''}\n`;
      text += `<b>اليوزر:</b> @${user.username}\n`;
      if(user.maxsenId) text += `<b>MAXSEN ID:</b> <code>${user.maxsenId}</code>\n`;
    }

    if(extra.details) text += `${extra.details}\n`;

    text += `━━━━━━━━━━━━━━\n<b>الوقت:</b> ${new Date().toLocaleString('ar-EG')}`;

    await tg("sendMessage", {
      chat_id: CHANNEL_ID,
      text: text,
      parse_mode: "HTML"
    });
  }catch(e){}
}

/* ---------- Unread Counters ---------- */
function computeUnread(){
  unreadCounts = {};
  if(!currentUser) return;

  const me = currentUser.username;
  const chatScreen = document.getElementById("s-chat");
  const activeChatOpen = activeChat && chatScreen && chatScreen.classList.contains("active");

  for(const key in allChats){
    const parts = key.split("__");
    if(parts.length !== 2) continue;
    if(parts[0] !== me && parts[1] !== me) continue;

    const other = parts[0] === me ? parts[1] : parts[0];
    if(activeChatOpen && other === activeChat) continue;

    const msgs = (allChats[key] && allChats[key].messages) || {};
    let count = 0;

    for(const mid in msgs){
      const m = msgs[mid];
      if(m.from === me) continue;
      if(!m.seenBy || !m.seenBy[me]) count++;
    }

    if(count > 0) unreadCounts[other] = count;
  }
}

function totalUnread(){
  let t = 0;
  for(const k in unreadCounts) t += unreadCounts[k];
  return t;
}

/* ---------- New Message Notifications ---------- */
const notifiedMsgs = new Set();

function notifyNewMessage(msg, fromUser, isMine){
  if(isMine) return;
  if(!msg || !msg._id) return;
  if(notifiedMsgs.has(msg._id)) return;
  notifiedMsgs.add(msg._id);

  const chatScreen = document.getElementById("s-chat");
  if(chatScreen && chatScreen.classList.contains("active") && activeChat === fromUser){
    return;
  }

  const u = allUsers[fromUser] || {};
  const title = ((u.firstName || "") + " " + (u.lastName || "")).trim() || ("@" + fromUser);
  const body = msg.text || (msg.photo ? "📷 صورة" : (msg.audio ? "🎤 رسالة صوتية" : "رسالة"));

  if(window.AndroidBridge && window.AndroidBridge.showNotification){
    try{ window.AndroidBridge.showNotification(title, body, fromUser); }
    catch(e){ console.warn("notify error", e); }
  }

  if(window.AndroidBridge && window.AndroidBridge.vibrate){
    try{ window.AndroidBridge.vibrate(80); }catch(e){}
  }

  playSend();
}