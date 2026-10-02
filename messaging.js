/* ============================================================
   messaging.js — MAXSEN Cloud 10.0
   Chat UI, Messages, Reactions, Photo Editor
   ============================================================ */

let lastSeenMsgIds = new Set();

/* ---------- Safe Helpers ---------- */
function safeGet(id){ return document.getElementById(id); }

/* ============================================================
   Blocked UI
   ============================================================ */
function updateChatBlockUI(){
  if(!activeChat) return;
  const blockedByThem = isBlockedByThem(activeChat);
  const iBlocked = !!myBlocks[activeChat];
  const inputBar = safeGet("chat-input-bar");
  const blockedBanner = safeGet("blocked-banner");
  if(!inputBar || !blockedBanner) return;
  const title = blockedBanner.querySelector("div:first-of-type");
  const sub = blockedBanner.querySelector(".sub");
  if(blockedByThem){
    inputBar.style.display = "none";
    blockedBanner.style.display = "flex";
    if(title) title.textContent = "تم حظرك من قبل هذا المستخدم";
    if(sub) sub.textContent = "لا يمكنك إرسال رسائل له";
  } else if(iBlocked){
    inputBar.style.display = "none";
    blockedBanner.style.display = "flex";
    if(title) title.textContent = "قمت بحظر هذا المستخدم";
    if(sub) sub.textContent = "ألغِ الحظر لإرسال الرسائل";
  } else {
    inputBar.style.display = "flex";
    blockedBanner.style.display = "none";
  }
}

function updateChatStatus(isTyping){
  const el = safeGet("ch-status");
  if(!el || !activeChat) return;
  const u = allUsers[activeChat];
  if(isTyping){
    el.textContent = "يكتب الآن...";
    el.style.color = "var(--primary)";
    el.style.fontStyle = "italic";
  } else {
    el.style.fontStyle = "normal";
    const online = isUserOnline(u);
    const blocked = isBlockedWith(activeChat);
    el.textContent = blocked ? '🚫 محظور' : formatPresence(u);
    el.style.color = blocked ? "#EF4444" : (online ? "#22C55E" : "var(--text2)");
  }
}

/* ============================================================
   Open Chat
   ============================================================ */
async function openChat(username){
  if(activeChat && activeChat !== username){
    const taOld = safeGet("msg-in");
    if(taOld && taOld.value.trim()) setDraft(activeChat, taOld.value);
  }

  const u = allUsers[username];
  if(!u){ showToast("الحساب غير موجود", true, 3000); return; }
  activeChat = username;
  lastSeenMsgIds = new Set();

  const ava = safeGet("ch-ava");
  const name = safeGet("ch-name");
  if(ava) ava.src = getAvatarSrc(u);
  if(name) name.textContent = (u.firstName||"")+" "+(u.lastName||"");

  updateChatStatus(false);
  nav("s-chat");
  closeChatSearch();
  cancelReply();
  applyChatBg(username);
  computeUnread(); renderChats(); updateChatsBadge();

  if(activeChatRef) activeChatRef.off();
  if(activePinRef) activePinRef.off();
  if(activeTypingRef) activeTypingRef.off();
  const msgs = safeGet("msgs");
  if(msgs) msgs.innerHTML = "";

  const key = chatKey(currentUser.username, username);
  activeChatRef = rdb.ref('chats/'+key+'/messages');

  activeChatRef.on('value', snap => {
    const val = snap.val() || {};
    chatMessages = Object.keys(val).map(k => ({...val[k], _id:k})).sort((a,b) => a.ts - b.ts);

    chatMessages.forEach(m => {
      if(m.from !== currentUser.username && !lastSeenMsgIds.has(m._id)){
        if(lastSeenMsgIds.size > 0 && typeof notifyNewMessage === "function"){
          notifyNewMessage(m, m.from, false);
        }
        lastSeenMsgIds.add(m._id);
      } else lastSeenMsgIds.add(m._id);
    });

    renderMsgs();
    markMessagesSeen();
    computeUnread();
    renderChats();
    updateChatsBadge();
  });

  activePinRef = rdb.ref('pinned/'+key);
  activePinRef.on('value', snap => renderPinned(snap.val()));

  activeTypingRef = rdb.ref('chats/'+key+'/typing/'+username);
  activeTypingRef.on('value', snap => updateChatStatus(!!snap.val()));

  updateChatBlockUI();
  rdb.ref('chats/'+key+'/typing/'+currentUser.username).set(false);

  const ta = safeGet("msg-in");
  if(ta){
    const draft = getDraft(username);
    ta.value = draft || "";
    ta.style.height = 'auto';
    setTimeout(() => {
      ta.style.height = Math.min(ta.scrollHeight, 130) + 'px';
      updateSendBtnVisibility();
      setTimeout(scrollToBottom, 100);
    }, 50);
  }
}

function openChatProfile(){ if(activeChat && activeChat !== SAVED_CHAT_NAME) openUserProfile(activeChat); }

function applyChatBg(username){
  const pref = getPref(username);
  const bg = CHAT_BGS.find(b => b.id === (pref.bg||"def"));
  const el = safeGet("chat-content");
  if(!el) return;
  if(!bg){ el.style.background = ""; return; }
  const css = isDarkMode() ? bg.dark : bg.light;
  el.style.background = css || "";
  const msgs = safeGet("msgs");
  if(msgs) msgs.style.background = "transparent";
}

function clearTypingFlag(){
  if(!activeChat || !currentUser) return;
  const key = chatKey(currentUser.username, activeChat);
  rdb.ref('chats/'+key+'/typing/'+currentUser.username).set(false);
}

function notifyTyping(){
  if(!activeChat || !currentUser) return;
  if(activeChat === SAVED_CHAT_NAME) return;
  if(isBlockedWith(activeChat)) return;
  const key = chatKey(currentUser.username, activeChat);
  rdb.ref('chats/'+key+'/typing/'+currentUser.username).set(true);
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    rdb.ref('chats/'+key+'/typing/'+currentUser.username).set(false);
  }, 2500);
}

async function markMessagesSeen(){
  if(!activeChat || !currentUser) return;
  if(activeChat === SAVED_CHAT_NAME) return;
  if(isBlockedWith(activeChat)) return;
  const key = chatKey(currentUser.username, activeChat);
  const updates = {};
  let changed = false;
  chatMessages.forEach(m => {
    if(m.from !== currentUser.username){
      const seenBy = m.seenBy || {};
      if(!seenBy[currentUser.username]){
        updates['chats/'+key+'/messages/'+m._id+'/seenBy/'+currentUser.username] = true;
        changed = true;
      }
    }
  });
  if(changed){ try{ await rdb.ref().update(updates); }catch(e){} }
}

/* ============================================================
   Reply / Forward
   ============================================================ */
function setReply(msgId){
  const m = chatMessages.find(x => x._id === msgId);
  if(!m) return;
  replyTo = {
    _id: m._id, from: m.from,
    text: m.text || (m.photo ? '📷 صورة' : (m.audio ? '🎤 رسالة صوتية' : ''))
  };
  const bar = safeGet("reply-bar");
  const name = safeGet("reply-name");
  const txt = safeGet("reply-txt");
  const u = allUsers[m.from];
  if(name) name.textContent = m.from === currentUser.username ? "أنت" : ((u && (u.firstName+" "+u.lastName)) || "@"+m.from);
  if(txt) txt.textContent = replyTo.text;
  if(bar) bar.classList.add("show");
  const msgIn = safeGet("msg-in");
  if(msgIn) msgIn.focus();
}

function cancelReply(){
  replyTo = null;
  const bar = safeGet("reply-bar");
  if(bar) bar.classList.remove("show");
}

function openForward(msgId){
  const m = chatMessages.find(x => x._id === msgId);
  if(!m) return;
  forwardingMsgId = msgId;
  closeMsgAction();
  const list = safeGet("forward-list");
  if(!list) return;
  const friends = Object.keys(myFriends).filter(un => allUsers[un] && un !== activeChat);
  if(!friends.length){
    list.innerHTML = '<div class="empty-state" style="padding:24px">لا أصدقاء آخرين</div>';
  } else {
    list.innerHTML = "";
    friends.forEach(un => {
      const u = allUsers[un];
      const online = isUserOnline(u);
      list.innerHTML += `
<div class="card" onclick="forwardTo('${un}')">
<div class="avatar"><img src="${getAvatarSrc(u)}"><div class="status-dot ${online?'online':''}"></div></div>
<div class="u-info"><div class="u-name">${escapeHtml(u.firstName)} ${escapeHtml(u.lastName)}</div><div class="u-sub ${online?'online':''}">${formatPresence(u)}</div></div>
</div>`;
    });
  }
  const modal = safeGet("forward-modal");
  if(modal) modal.classList.add("active");
}

function closeForward(){
  const modal = safeGet("forward-modal");
  if(modal) modal.classList.remove("active");
  forwardingMsgId = null;
}

async function forwardTo(username){
  const m = chatMessages.find(x => x._id === forwardingMsgId);
  if(!m || !currentUser) return;
  closeForward();
  const key = chatKey(currentUser.username, username);
  const newMsg = {
    from: currentUser.username,
    text: m.text||'', photo: m.photo||null, audio: m.audio||null,
    audioDuration: m.audioDuration||0, ts: Date.now(),
    seenBy: {}, reactions: {}, forwarded: true
  };
  await fbPush('chats/'+key+'/messages', newMsg);
  showToast("تم التحويل ✓");
}

/* ============================================================
   Message Rendering
   ============================================================ */
function getMsgSig(m){
  return JSON.stringify({
    t: m.text||"", p: !!m.photo, a: !!m.audio,
    e: !!m.editedAt, r: m.reactions||{}, s: m.seenBy||{},
    f: !!m.forwarded, rp: m.replyTo||null
  });
}

function buildReplyHtml(rp){
  if(!rp) return '';
  const u = allUsers[rp.from];
  const name = rp.from === currentUser.username ? "أنت" : ((u && (u.firstName+" "+u.lastName)) || "@"+rp.from);
  return `<div class="bubble-reply"><div class="bubble-reply-name">${escapeHtml(name)}</div><div class="bubble-reply-text">${escapeHtml(rp.text||'')}</div></div>`;
}

function createMsgEl(m){
  const idx = chatMessages.findIndex(x => x._id === m._id);
  const mine = m.from === currentUser.username;
  let inner = "";
  const hasPhoto = !!m.photo;
  const hasAudio = !!m.audio;
  const hasText = m.text && m.text.trim();
  const replyHtml = buildReplyHtml(m.replyTo);
  const emojiOnly = !hasPhoto && !hasAudio && hasText && isEmojiOnly(m.text);
  const photoClean = hasPhoto && !hasText;

  if(hasPhoto){
    inner = `<img class="msg-photo" src="${m.photo}" onclick="event.stopPropagation();viewImage(this.src)" alt="">`;
    if(hasText) inner += `<div class="bubble-text">${renderFormattedText(m.text)}</div>`;
  } else if(hasAudio){
    const bars = Array.from({length:18}).map((_,i) =>
      `<div class="bar" style="height:${4+Math.round(Math.abs(Math.sin(i*0.8))*8)}px"></div>`
    ).join('');
    inner = `<div class="audio-msg"><button class="audio-play-btn" type="button"><svg><use href="#i-play"/></svg></button><div class="audio-visual">${bars}</div><span class="audio-time">${formatAudioTime(m.audioDuration||0)}</span></div>`;
  } else {
    inner = `<div class="bubble-text">${renderFormattedText(m.text)}</div>`;
  }

  let statusIcon = '';
  if(mine && activeChat !== SAVED_CHAT_NAME){
    const seen = m.seenBy && m.seenBy[activeChat];
    if(seen) statusIcon = '<span class="check check-seen"><svg><use href="#i-check-double"/></svg></span>';
    else statusIcon = '<span class="check check-sent"><svg><use href="#i-check-single"/></svg></span>';
  }
  const editedTag = m.editedAt ? '<span class="edited">· معدّلة</span>' : '';
  const forwardTag = m.forwarded ? '<div class="forward-tag"><svg><use href="#i-forward"/></svg> محوّلة</div>' : '';
  const timeStr = formatTime12(m.ts);

  const wrap = document.createElement("div");
  wrap.className = `bubble-wrap ${mine?'mine':'other'}${emojiOnly?' emoji-only':''}`;
  wrap.dataset.mid = m._id;
  wrap.dataset.sig = getMsgSig(m);

  const bubble = document.createElement("div");
  bubble.className = `bubble ${hasPhoto?'has-photo':''} ${photoClean?'photo-clean':''}`;
  bubble.innerHTML = `${forwardTag}${replyHtml}${inner}<div class="meta">${timeStr}${statusIcon}${editedTag}</div>`;

  wrap.insertAdjacentHTML('afterbegin', '<div class="swipe-reply-hint"><svg><use href="#i-reply"/></svg></div>');

  if(activeChat !== SAVED_CHAT_NAME){
    const quickActions = document.createElement("div");
    quickActions.className = "msg-quick-actions";
    quickActions.innerHTML = `
<button class="msg-quick-action heart" onclick="event.stopPropagation();quickHeart('${m._id}')" title="إعجاب">
<svg><use href="#i-heart"/></svg>
</button>
<button class="msg-quick-action" onclick="event.stopPropagation();quickReply('${m._id}')" title="رد">
<svg><use href="#i-reply"/></svg>
</button>`;
    wrap.appendChild(quickActions);
  }

  const heart = document.createElement("div");
  heart.className = "heart-overlay";
  heart.textContent = "❤️";
  wrap.appendChild(heart);

  attachMsgGestures(bubble, wrap, m._id);
  wrap.appendChild(bubble);

  if(hasAudio){
    const playBtn = bubble.querySelector(".audio-play-btn");
    if(playBtn){
      playBtn.addEventListener("click", e => {
        e.stopPropagation();
        playAudioMessage(playBtn, m.audio);
      });
    }
  }
  const rxHtml = buildReactionsHtml(m, idx);
  if(rxHtml) wrap.insertAdjacentHTML('beforeend', rxHtml);
  return wrap;
}

async function quickHeart(msgId){
  await toggleReaction(msgId, '❤️');
  const wrap = document.querySelector(`.bubble-wrap[data-mid="${msgId}"]`);
  if(wrap){
    showHeartAnim(wrap);
    if(navigator.vibrate) navigator.vibrate(15);
  }
}

function quickReply(msgId){
  setReply(msgId);
  if(navigator.vibrate) navigator.vibrate(10);
}

function playAudioMessage(btn, src){
  if(!src) return;
  if(currentAudioBtn === btn && currentAudio){
    if(currentAudio.paused){
      currentAudio.play();
      btn.querySelector("svg use").setAttribute("href","#i-pause");
      btn.closest(".audio-msg").classList.add("playing");
    } else {
      currentAudio.pause();
      btn.querySelector("svg use").setAttribute("href","#i-play");
      btn.closest(".audio-msg").classList.remove("playing");
    }
    return;
  }
  if(currentAudio){
    try{ currentAudio.pause(); }catch(e){}
    if(currentAudioBtn){
      currentAudioBtn.querySelector("svg use").setAttribute("href","#i-play");
      const w = currentAudioBtn.closest(".audio-msg");
      if(w) w.classList.remove("playing");
    }
  }
  const audio = new Audio(src);
  currentAudio = audio;
  currentAudioBtn = btn;
  btn.querySelector("svg use").setAttribute("href","#i-pause");
  btn.closest(".audio-msg").classList.add("playing");
  audio.onended = () => {
    btn.querySelector("svg use").setAttribute("href","#i-play");
    btn.closest(".audio-msg").classList.remove("playing");
    currentAudio = null;
    currentAudioBtn = null;
  };
  audio.onerror = () => {
    showToast("خطأ في تشغيل الصوت", true);
    btn.querySelector("svg use").setAttribute("href","#i-play");
    btn.closest(".audio-msg").classList.remove("playing");
    currentAudio = null;
    currentAudioBtn = null;
  };
  audio.play().catch(() => showToast("فشل التشغيل", true));
}

function buildReactionsHtml(m, idx){
  if(!m.reactions || Object.keys(m.reactions).length === 0) return '';
  let pills = '';
  for(const em in m.reactions){
    const users = m.reactions[em] || {};
    const count = Object.keys(users).length;
    if(count === 0) continue;
    const isMine = !!users[currentUser.username];
    pills += `<div class="reaction-pill ${isMine?'mine':''}" onclick="event.stopPropagation();toggleReaction('${m._id}','${em}')"><span class="em">${em}</span><span>${count}</span></div>`;
  }
  return pills ? `<div class="reactions-row">${pills}</div>` : '';
}

function updateMsgEl(el, m){
  const mine = m.from === currentUser.username;
  const meta = el.querySelector(".bubble .meta");
  if(meta){
    let statusIcon = '';
    if(mine && activeChat !== SAVED_CHAT_NAME){
      const seen = m.seenBy && m.seenBy[activeChat];
      if(seen) statusIcon = '<span class="check check-seen"><svg><use href="#i-check-double"/></svg></span>';
      else statusIcon = '<span class="check check-sent"><svg><use href="#i-check-single"/></svg></span>';
    }
    const editedTag = m.editedAt ? '<span class="edited">· معدّلة</span>' : '';
    meta.innerHTML = formatTime12(m.ts) + statusIcon + editedTag;
  }
  const oldReply = el.querySelector(".bubble-reply");
  if(m.replyTo && !oldReply){
    el.querySelector(".bubble").insertAdjacentHTML('afterbegin', buildReplyHtml(m.replyTo));
  } else if(!m.replyTo && oldReply){ oldReply.remove(); }
  const hasPhoto = !!m.photo, hasAudio = !!m.audio;
  if(!hasPhoto && !hasAudio){
    const textEl = el.querySelector(".bubble .bubble-text");
    if(textEl && textEl.getAttribute('data-rendered') !== (m.text||'')){
      textEl.innerHTML = renderFormattedText(m.text);
      textEl.setAttribute('data-rendered', m.text||'');
    }
    const emojiOnly = isEmojiOnly(m.text);
    el.classList.toggle('emoji-only', emojiOnly);
  }
  const idx = chatMessages.findIndex(x => x._id === m._id);
  const oldRx = el.querySelector(".reactions-row");
  if(oldRx) oldRx.remove();
  const newRx = buildReactionsHtml(m, idx);
  if(newRx) el.insertAdjacentHTML('beforeend', newRx);
}

function renderMsgs(){
  const box = safeGet("msgs");
  const content = safeGet("chat-content");
  if(!box || !content) return;
  const wasNearBottom = content.scrollHeight - content.scrollTop - content.clientHeight < 140;
  const existing = new Map();
  Array.from(box.children).forEach(el => { if(el.dataset.mid) existing.set(el.dataset.mid, el); });
  const seen = new Set();
  chatMessages.forEach(m => {
    seen.add(m._id);
    const sig = getMsgSig(m);
    let el = existing.get(m._id);
    if(!el){
      el = createMsgEl(m);
      el.classList.add("fresh");
      setTimeout(() => el.classList.remove("fresh"), 400);
      box.appendChild(el);
    } else if(el.dataset.sig !== sig){
      updateMsgEl(el, m);
      el.dataset.sig = sig;
    }
  });
  existing.forEach((el, id) => { if(!seen.has(id)) el.remove(); });
  if(wasNearBottom) content.scrollTop = content.scrollHeight;
  const searchInp = safeGet("chat-search-input");
  if(searchInp && searchInp.value) filterChatMessages(searchInp.value);
  setTimeout(updateScrollBottomBtn, 50);
}

/* ============================================================
   Message Gestures
   ============================================================ */
function attachMsgGestures(bubble, wrap, msgId){
  let startX = 0, startY = 0, swiping = false, moved = false;
  let longPressTimer = null, longPressFired = false, lastTapTime = 0;

  bubble.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX; startY = e.touches[0].clientY;
    swiping = false; moved = false; longPressFired = false;
    wrap.style.transition = "none"; wrap.style.transform = "";
    longPressTimer = setTimeout(() => {
      if(!moved && !swiping){
        longPressFired = true;
        if(navigator.vibrate) navigator.vibrate(20);
        wrap.style.transition = ""; wrap.style.transform = "";
        showMsgActions(msgId);
      }
    }, 450);
  }, {passive:true});

  bubble.addEventListener('touchmove', e => {
    if(!startX && !startY) return;
    const dx = e.touches[0].clientX - startX, dy = e.touches[0].clientY - startY;
    if(!swiping && Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy)){
      swiping = true; moved = true; clearTimeout(longPressTimer); wrap.classList.add('swiping');
    }
    if(swiping){
      e.preventDefault();
      const limited = Math.max(-80, Math.min(80, dx));
      wrap.style.transform = `translateX(${limited}px)`;
    } else if(Math.abs(dy) > 8 || Math.abs(dx) > 8){
      moved = true; clearTimeout(longPressTimer);
    }
  }, {passive:false});

  bubble.addEventListener('touchend', e => {
    clearTimeout(longPressTimer);
    const dx = swiping ? (e.changedTouches[0].clientX - startX) : 0;
    wrap.style.transition = "transform .28s cubic-bezier(.34,1.56,.64,1)";
    wrap.classList.remove('swiping'); wrap.style.transform = "";
    if(swiping && Math.abs(dx) > 60){
      setReply(msgId);
      if(navigator.vibrate) navigator.vibrate(15);
    } else if(!moved && !longPressFired && !swiping){
      const now = Date.now();
      if(now - lastTapTime < 320){
        e.preventDefault();
        showHeartAnim(wrap);
        toggleReaction(msgId, '❤️');
        lastTapTime = 0;
      } else {
        lastTapTime = now;
        if(wrap.classList.contains('search-match')) scrollToMatch(wrap);
      }
    }
    swiping = false; moved = false; startX = 0; startY = 0;
  });

  bubble.addEventListener('touchcancel', () => {
    clearTimeout(longPressTimer);
    wrap.style.transition = ""; wrap.style.transform = "";
    wrap.classList.remove('swiping'); swiping = false; moved = false;
  });

  bubble.addEventListener('contextmenu', e => { e.preventDefault(); showMsgActions(msgId); });

  let mouseDownX = 0, mouseDragging = false, mouseTimer = null;
  bubble.addEventListener('mousedown', e => {
    if(e.button !== 0) return;
    mouseDownX = e.clientX; mouseDragging = false;
    mouseTimer = setTimeout(() => { if(!mouseDragging) showMsgActions(msgId); }, 650);
  });
  bubble.addEventListener('mouseup', () => { clearTimeout(mouseTimer); mouseDownX = 0; mouseDragging = false; });
  bubble.addEventListener('mouseleave', () => { clearTimeout(mouseTimer); mouseDownX = 0; });
  bubble.addEventListener('dblclick', e => {
    e.preventDefault(); showHeartAnim(wrap); toggleReaction(msgId, '❤️');
  });
}

function showHeartAnim(wrap){
  const heart = wrap.querySelector(".heart-overlay");
  if(!heart) return;
  heart.classList.remove("show");
  void heart.offsetWidth;
  heart.classList.add("show");
  setTimeout(() => heart.classList.remove("show"), 900);
}

/* ============================================================
   Message Actions
   ============================================================ */
function showMsgActions(msgId){
  const m = chatMessages.find(x => x._id === msgId);
  if(!m) return;
  selectedMessageIdx = msgId;
  const picker = safeGet("reactions-picker");
  if(picker){
    picker.innerHTML = "";
    REACTIONS_LIST.forEach(em => {
      const users = (m.reactions && m.reactions[em]) || {};
      const isMine = !!users[currentUser.username];
      picker.innerHTML += `<div class="em ${isMine?'active':''}" onclick="toggleReaction('${msgId}','${em}',true)">${em}</div>`;
    });
  }
  const hasText = m.text && m.text.trim().length > 0;
  const mine = m.from === currentUser.username;
  const isSavedChat = activeChat === SAVED_CHAT_NAME;
  const list = safeGet("msg-action-list");
  if(list){
    list.innerHTML = `
<div class="act" onclick="closeMsgAction();setReply('${msgId}')"><svg><use href="#i-reply"/></svg> رد</div>
<div class="act" onclick="openForward('${msgId}')"><svg><use href="#i-forward"/></svg> تحويل</div>
${hasText&&mine&&!isSavedChat?`<div class="act" onclick="openEditMsg('${msgId}')"><svg><use href="#i-edit"/></svg> تعديل</div>`:''}
${hasText?`<div class="act" onclick="copyMsg()"><svg><use href="#i-copy"/></svg> نسخ</div>`:''}
${!isSavedChat?`<div class="act saved" onclick="saveMsgToSaved('${msgId}')"><svg><use href="#i-bookmark"/></svg> حفظ للمفضلة</div>`:''}
${!isSavedChat?`<div class="act" onclick="pinMsg()"><svg><use href="#i-pin"/></svg> تثبيت</div>`:''}
${!isSavedChat?`<div class="act danger" onclick="requestDeleteMsg()"><svg><use href="#i-trash"/></svg> حذف</div>`:''}`;
  }
  const modal = safeGet("msg-action-modal");
  if(modal) modal.classList.add("active");
}

async function saveMsgToSaved(msgId){
  const m = chatMessages.find(x => x._id === msgId);
  if(!m){ closeMsgAction(); return; }
  closeMsgAction();
  if(!currentUser) return;
  const newMsg = {
    from: currentUser.username,
    text: m.text || "",
    photo: m.photo || null,
    audio: m.audio || null,
    audioDuration: m.audioDuration || 0,
    ts: Date.now(),
    seenBy: {},
    reactions: {},
    savedFrom: m.from
  };
  await fbPush('savedMessages/'+currentUser.username, newMsg);
  showToast("تم الحفظ في المفضلة ✓");
}

function closeMsgAction(){
  const modal = safeGet("msg-action-modal");
  if(modal) modal.classList.remove("active");
}

async function toggleReaction(msgId, emoji, fromPicker){
  const m = chatMessages.find(x => x._id === msgId);
  if(!m) return;
  playTap();
  if(activeChat === SAVED_CHAT_NAME){
    if(fromPicker) closeMsgAction();
    return;
  }
  const key = chatKey(currentUser.username, activeChat);
  const ref = rdb.ref('chats/'+key+'/messages/'+msgId+'/reactions/'+emoji+'/'+currentUser.username);
  const snap = await ref.once('value');
  if(snap.val()){
    await ref.remove();
    const all = await rdb.ref('chats/'+key+'/messages/'+msgId+'/reactions/'+emoji).once('value');
    if(!all.val()) await rdb.ref('chats/'+key+'/messages/'+msgId+'/reactions/'+emoji).remove();
  } else await ref.set(true);
  if(fromPicker) closeMsgAction();
}

function copyMsg(){
  const m = chatMessages.find(x => x._id === selectedMessageIdx);
  if(!m){ closeMsgAction(); return; }
  closeMsgAction();
  copyText(m.text||'');
}

async function pinMsg(){
  const m = chatMessages.find(x => x._id === selectedMessageIdx);
  if(!m) return;
  closeMsgAction();
  if(activeChat === SAVED_CHAT_NAME) return;
  const key = chatKey(currentUser.username, activeChat);
  const pinned = await fbGet('pinned/'+key);
  if(pinned && pinned.ts === m.ts){
    await fbRemove('pinned/'+key);
    showToast("تم إلغاء التثبيت");
  } else {
    await fbSet('pinned/'+key, {
      from: m.from,
      text: m.text||(m.photo?'صورة':(m.audio?'رسالة صوتية':'رسالة')),
      ts: m.ts
    });
    showToast("تم التثبيت");
  }
}

function openEditMsg(msgId){
  const m = chatMessages.find(x => x._id === msgId);
  if(!m || !m.text) return;
  closeMsgAction();
  selectedMessageIdx = msgId;
  const inp = safeGet("edit-msg-input");
  if(!inp) return;
  inp.value = m.text;
  draftEditMsgBackup = m.text;
  const modal = safeGet("edit-msg-modal");
  if(modal) modal.classList.add("active");
  setTimeout(() => inp.focus(), 100);
}

function closeEditMsg(){
  const modal = safeGet("edit-msg-modal");
  if(modal) modal.classList.remove("active");
  const inp = safeGet("edit-msg-input");
  if(inp) inp.value = "";
}

async function saveMsgEdit(){
  const m = chatMessages.find(x => x._id === selectedMessageIdx);
  if(!m) return;
  const inp = safeGet("edit-msg-input");
  if(!inp) return;
  const txt = inp.value.trim();
  if(!txt || txt === draftEditMsgBackup){ closeEditMsg(); return; }
  const key = chatKey(currentUser.username, activeChat);
  await fbUpdate('chats/'+key+'/messages/'+selectedMessageIdx, {text:txt, editedAt:Date.now()});
  closeEditMsg();
  showToast("تم التعديل ✓");
}

function requestDeleteMsg(){
  const m = chatMessages.find(x => x._id === selectedMessageIdx);
  if(!m) return;
  closeMsgAction();
  if(activeChat === SAVED_CHAT_NAME){
    showToast("لا يمكن حذف الرسائل المحفوظة", false, 1500);
    return;
  }
  const mine = m.from === currentUser.username;
  const cb = safeGet("delete-for-everyone");
  if(cb) cb.checked = false;
  const row = safeGet("delete-everyone-row");
  if(row) row.style.display = mine ? "flex" : "none";
  const modal = safeGet("delete-modal");
  if(modal) modal.classList.add("active");
}

function cancelDelete(){
  const modal = safeGet("delete-modal");
  if(modal) modal.classList.remove("active");
}

async function confirmDelete(){
  const m = chatMessages.find(x => x._id === selectedMessageIdx);
  const cb = safeGet("delete-for-everyone");
  const forEveryone = cb && cb.checked && m && m.from === currentUser.username && activeChat !== SAVED_CHAT_NAME;
  const modal = safeGet("delete-modal");
  if(modal) modal.classList.remove("active");
  if(!m || !currentUser) return;
  if(activeChat === SAVED_CHAT_NAME){ showToast("لا يمكن الحذف", true); return; }
  const key = chatKey(currentUser.username, activeChat);
  if(forEveryone){
    await fbRemove('chats/'+key+'/messages/'+m._id);
    const pinned = await fbGet('pinned/'+key);
    if(pinned && pinned.ts === m.ts) await fbRemove('pinned/'+key);
    showToast("تم الحذف للجميع");
  } else {
    await fbSet('hiddenMsgs/'+currentUser.username+'/'+key+'/'+m._id, true);
    const el = document.querySelector(`#msgs .bubble-wrap[data-mid="${m._id}"]`);
    if(el) el.remove();
    chatMessages = chatMessages.filter(x => x._id !== m._id);
    showToast("تم الحذف لديك");
  }
}

function renderPinned(p){
  const banner = safeGet("pinned-banner");
  const textEl = safeGet("pinned-text");
  if(!banner) return;
  if(!p || activeChat === SAVED_CHAT_NAME){ banner.style.display = "none"; return; }
  const fromName = p.from === currentUser.username ? "أنت" : "@"+p.from;
  if(textEl) textEl.textContent = `${fromName}: ${p.text||'رسالة'}`;
  banner.style.display = "flex";
}

async function unpinCurrent(){
  if(!activeChat || activeChat === SAVED_CHAT_NAME) return;
  await fbRemove('pinned/'+chatKey(currentUser.username, activeChat));
  showToast("تم إلغاء التثبيت");
}

function scrollToPinned(){}

/* ============================================================
   Chat Menu
   ============================================================ */
function openChatMenu(){
  if(!activeChat) return;
  const pref = getPref(activeChat);
  const isSaved = activeChat === SAVED_CHAT_NAME;
  const list = safeGet("chat-menu-list");
  if(list){
    list.innerHTML = `
<div class="act" onclick="closeChatMenu();openChatSearch()"><svg><use href="#i-search"/></svg> بحث في المحادثة</div>
${!isSaved?`<div class="act" onclick="closeChatMenu();openChatProfile()"><svg><use href="#i-user"/></svg> معلومات المستخدم</div>`:''}
${!isSaved?`<div class="act" onclick="closeChatMenu();toggleChatMute()"><svg><use href="#i-mute"/></svg> ${pref.muted?'إلغاء الكتم':'كتم المحادثة'}</div>`:''}
<div class="act" onclick="closeChatMenu();openChatBgPicker()"><svg><use href="#i-palette"/></svg> تغيير الخلفية</div>
${!isSaved?`<div class="act warn" onclick="closeChatMenu();askClearChat()"><svg><use href="#i-erase"/></svg> مسح السجل</div>`:''}
${!isSaved?`<div class="act danger" onclick="closeChatMenu();deleteChatForMe('${activeChat}');setTimeout(()=>nav('s-main'),250)"><svg><use href="#i-trash"/></svg> حذف المحادثة</div>`:''}`;
  }
  const modal = safeGet("chat-menu-modal");
  if(modal) modal.classList.add("active");
}

function closeChatMenu(){
  const modal = safeGet("chat-menu-modal");
  if(modal) modal.classList.remove("active");
}

async function toggleChatMute(){
  if(!activeChat || !currentUser) return;
  if(activeChat === SAVED_CHAT_NAME) return;
  const pref = getPref(activeChat);
  await fbUpdate('prefs/'+currentUser.username+'/'+activeChat, {muted: !pref.muted});
  showToast(!pref.muted ? "تم الكتم" : "تم إلغاء الكتم");
}

function askClearChat(){
  const modal = safeGet("clear-chat-modal");
  if(modal) modal.classList.add("active");
}

async function confirmClearChat(){
  const modal = safeGet("clear-chat-modal");
  if(modal) modal.classList.remove("active");
  if(!activeChat || activeChat === SAVED_CHAT_NAME) return;
  const key = chatKey(currentUser.username, activeChat);
  await rdb.ref('chats/'+key+'/messages').remove();
  await rdb.ref('pinned/'+key).remove();
  showToast("تم مسح السجل ✓");
}

function openChatBgPicker(){
  closeChatMenu();
  if(!activeChat) return;
  const grid = safeGet("chat-bg-grid");
  if(!grid) return;
  const current = getPref(activeChat).bg || "def";
  const dark = isDarkMode();
  grid.innerHTML = CHAT_BGS.map(bg => {
    const css = dark ? (bg.dark||bg.light||'var(--bg)') : (bg.light||'var(--bg)');
    return `
<div class="bg-item ${bg.id===current?'active':''}" onclick="setChatBg('${bg.id}')">
<div class="bg-preview" style="background:${css};${bg.id==='def'?'box-shadow:inset 0 0 0 1px rgba(23,26,36,.1)':''}"></div>
<div>${bg.name}</div>
</div>`;
  }).join("");
  const modal = safeGet("chat-bg-modal");
  if(modal) modal.classList.add("active");
}

function closeChatBg(){
  const modal = safeGet("chat-bg-modal");
  if(modal) modal.classList.remove("active");
}

async function setChatBg(bgId){
  if(!activeChat || !currentUser) return;
  await fbUpdate('prefs/'+currentUser.username+'/'+activeChat, {bg:bgId});
  applyChatBg(activeChat);
  openChatBgPicker();
  showToast("تم تغيير الخلفية ✓");
}

/* ============================================================
   Chat Search
   ============================================================ */
function openChatSearch(){
  const bar = safeGet("chat-search-bar");
  if(bar) bar.classList.add("show");
  setTimeout(() => { const inp = safeGet("chat-search-input"); if(inp) inp.focus(); }, 100);
}

function closeChatSearch(){
  const bar = safeGet("chat-search-bar");
  if(bar) bar.classList.remove("show");
  const inp = safeGet("chat-search-input");
  if(inp) inp.value = "";
  const cnt = safeGet("chat-search-count");
  if(cnt) cnt.textContent = "";
  document.querySelectorAll("#msgs .bubble-wrap").forEach(w => {
    w.style.display = "";
    w.classList.remove('search-match','search-current');
  });
  searchMatches = [];
  currentMatchIndex = -1;
}

function filterChatMessages(q){
  q = (q||"").trim().toLowerCase();
  const wraps = document.querySelectorAll("#msgs .bubble-wrap");
  let count = 0;
  searchMatches = [];
  wraps.forEach(w => {
    const txt = (w.querySelector(".bubble-text")?.textContent || "").toLowerCase();
    w.classList.remove('search-match','search-current');
    if(!q){ w.style.display = ""; return; }
    if(txt.includes(q)){
      w.style.display = "";
      w.classList.add('search-match');
      searchMatches.push(w);
      count++;
    } else w.style.display = "none";
  });
  const cnt = safeGet("chat-search-count");
  if(cnt) cnt.textContent = q ? (count + " نتيجة") : "";
  currentMatchIndex = searchMatches.length ? 0 : -1;
  if(currentMatchIndex >= 0){
    searchMatches[0].classList.add('search-current');
    scrollToMatch(searchMatches[0]);
  }
}

function searchNavigate(dir){
  if(!searchMatches.length) return;
  if(currentMatchIndex >= 0) searchMatches[currentMatchIndex].classList.remove('search-current');
  currentMatchIndex = (currentMatchIndex + dir + searchMatches.length) % searchMatches.length;
  const el = searchMatches[currentMatchIndex];
  if(el){ el.classList.add('search-current'); scrollToMatch(el); }
}

function scrollToMatch(el){
  if(!el) return;
  const content = safeGet("chat-content");
  if(!content) return;
  const top = el.offsetTop - content.clientHeight/2 + el.clientHeight/2;
  content.scrollTo({top: Math.max(0, top), behavior: "smooth"});
}

/* ============================================================
   Send Message
   ============================================================ */
async function sendMsg(){
  const ta = safeGet("msg-in");
  if(!ta) return;
  const t = ta.value.trim();
  if(!t || !activeChat || !currentUser) return;
  if(activeChat !== SAVED_CHAT_NAME && isBlockedWith(activeChat)){
    showToast("لا يمكن إرسال رسائل", true);
    return;
  }

  ta.value = "";
  ta.style.height = 'auto';
  updateSendBtnVisibility();
  playSend();
  clearTypingFlag();
  clearDraft(activeChat);

  if(activeChat === SAVED_CHAT_NAME){
    await sendSavedMessage(t, null);
    incMessagesSent();
    updateSendBtnVisibility();
    setTimeout(scrollToBottom, 100);
    return;
  }

  const newMsg = {
    from: currentUser.username, text: t,
    ts: Date.now(), seenBy: {}, reactions: {}
  };
  if(replyTo) newMsg.replyTo = {from: replyTo.from, text: replyTo.text};
  cancelReply();
  await fbPush('chats/'+chatKey(currentUser.username, activeChat)+'/messages', newMsg);
  incMessagesSent();
  updateSendBtnVisibility();
  setTimeout(scrollToBottom, 100);
}

/* ============================================================
   Message Input Setup
   ============================================================ */
function setupMessageInput(){
  const ta = safeGet("msg-in");
  if(!ta) return;
  function autoResize(){ ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 130) + 'px'; }

  let draftTimer = null;
  ta.addEventListener('input', () => {
    autoResize();
    updateSendBtnVisibility();
    notifyTyping();
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      if(activeChat && ta.value.trim()) setDraft(activeChat, ta.value);
      else if(activeChat) clearDraft(activeChat);
    }, 600);
  });

  ta.addEventListener('keydown', e => {
    if(e.key === 'Enter' && !e.shiftKey){
      e.preventDefault();
      if(ta.value.trim()) sendMsg();
    }
  });
  ta.addEventListener('focus', () => { autoResize(); });
  ta.addEventListener('blur', () => {
    setTimeout(() => {
      if(activeChat){
        if(ta.value.trim()) setDraft(activeChat, ta.value);
        else clearDraft(activeChat);
      }
    }, 200);
  });
  setTimeout(() => { autoResize(); updateSendBtnVisibility(); }, 100);
}

function updateSendBtnVisibility(){
  const ta = safeGet("msg-in");
  if(!ta) return;
  const hasText = ta.value.trim().length > 0;
  const sendBtn = safeGet("send-btn");
  const micBtn = safeGet("mic-btn");
  if(sendBtn) sendBtn.disabled = !hasText;
  if(micBtn) micBtn.style.display = hasText ? "none" : "flex";
  if(sendBtn) sendBtn.style.display = hasText ? "flex" : "none";
}

/* ============================================================
   Voice Recording
   ============================================================ */
function setupMicButton(){
  const micBtn = safeGet("mic-btn");
  if(!micBtn) return;
  micBtn.addEventListener("pointerdown", e => {
    e.preventDefault();
    if(!activeChat || (activeChat !== SAVED_CHAT_NAME && isBlockedWith(activeChat))){
      showToast("لا يمكن التسجيل", true);
      return;
    }
    micStarted = false;
    clearTimeout(micPressTimer);
    micPressTimer = setTimeout(() => { micStarted = true; startRecording(); }, 250);
  });
  document.addEventListener("pointerup", () => {
    clearTimeout(micPressTimer);
    if(micStarted){ micStarted = false; stopRecording(true); }
  });
  document.addEventListener("pointercancel", () => {
    clearTimeout(micPressTimer);
    if(micStarted){ micStarted = false; stopRecording(false); }
  });
}

async function startRecording(){
  if(!activeChat) return;
  if(activeChat !== SAVED_CHAT_NAME && isBlockedWith(activeChat)) return;
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    showToast("التسجيل الصوتي يحتاج HTTPS", true, 4000);
    return;
  }
  if(!window.MediaRecorder){
    showToast("متصفحك لا يدعم التسجيل الصوتي", true, 3500);
    return;
  }
  try{
    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    let mimeType = 'audio/webm';
    if(!MediaRecorder.isTypeSupported('audio/webm')){
      if(MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
      else if(MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
      else mimeType = '';
    }
    mediaRecorder = mimeType ? new MediaRecorder(stream, {mimeType}) : new MediaRecorder(stream);
    audioChunks = [];
    mediaRecorder.ondataavailable = e => { if(e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.start();
    isRecording = true;
    recordingStartTime = Date.now();
    const micBtn = safeGet("mic-btn");
    if(micBtn) micBtn.classList.add("recording");
    const sendBtn = safeGet("send-btn");
    if(sendBtn) sendBtn.style.display = "none";
    const rec = safeGet("recording-indicator");
    if(rec) rec.classList.add("active");
    startRecordingTimer();
    if(navigator.vibrate) navigator.vibrate(30);
  }catch(e){
    let msg = "تعذر الوصول للميكروفون";
    if(e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') msg = "الرجاء السماح باستخدام الميكروفون";
    else if(e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') msg = "لا يوجد ميكروفون متصل";
    else if(e.name === 'NotReadableError') msg = "الميكروفون مستخدم من تطبيق آخر";
    else if(e.name === 'SecurityError') msg = "التسجيل يحتاج HTTPS";
    showToast(msg, true, 3500);
    isRecording = false;
  }
}

function startRecordingTimer(){
  const el = safeGet("recording-timer");
  clearInterval(recordingTimer);
  recordingTimer = setInterval(() => {
    const sec = Math.floor((Date.now() - recordingStartTime)/1000);
    if(el) el.textContent = formatAudioTime(sec);
  }, 200);
}

function stopRecording(send){
  if(!mediaRecorder || !isRecording) return;
  isRecording = false;
  clearInterval(recordingTimer);
  const duration = Date.now() - recordingStartTime;
  const mr = mediaRecorder;
  mr.onstop = async () => {
    try{ mr.stream.getTracks().forEach(t => t.stop()); }catch(e){}
    const micBtn = safeGet("mic-btn");
    if(micBtn) micBtn.classList.remove("recording");
    const rec = safeGet("recording-indicator");
    if(rec) rec.classList.remove("active");
    if(send && audioChunks.length && duration > 600){
      const blob = new Blob(audioChunks, {type: mr.mimeType||'audio/webm'});
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result;
        if(activeChat === SAVED_CHAT_NAME){
          await fbPush('savedMessages/'+currentUser.username, {
            from: currentUser.username, audio: dataUrl,
            audioDuration: Math.round(duration/1000),
            ts: Date.now(), seenBy: {}, reactions: {}
          });
        } else {
          const newMsg = {
            from: currentUser.username, audio: dataUrl,
            audioDuration: Math.round(duration/1000),
            ts: Date.now(), seenBy: {}, reactions: {}
          };
          if(replyTo) newMsg.replyTo = {from: replyTo.from, text: replyTo.text};
          cancelReply();
          playSend();
          await fbPush('chats/'+chatKey(currentUser.username, activeChat)+'/messages', newMsg);
        }
        incMessagesSent();
        showToast("تم الإرسال ✓");
        updateSendBtnVisibility();
        setTimeout(scrollToBottom, 100);
      };
      reader.readAsDataURL(blob);
    } else updateSendBtnVisibility();
    mediaRecorder = null;
    audioChunks = [];
  };
  try{ mr.stop(); }catch(e){}
}

/* ============================================================
   Photo
   ============================================================ */
function openGalleryDirect(){
  if(!activeChat) return;
  if(activeChat !== SAVED_CHAT_NAME && isBlockedWith(activeChat)){
    showToast("لا يمكن إرسال", true);
    return;
  }
  const inp = safeGet("chat-photo-input");
  if(!inp) return;
  inp.value = "";
  inp.removeAttribute("capture");
  inp.dataset.editor = "1";
  inp.click();
}

function openPhotoPicker(){ const p = safeGet("photo-picker"); if(p) p.classList.add("active"); }
function closePhotoPicker(){ const p = safeGet("photo-picker"); if(p) p.classList.remove("active"); }

function pickPhotoFromCamera(){
  closePhotoPicker();
  setTimeout(() => {
    const inp = safeGet("chat-photo-input");
    if(!inp) return;
    inp.value = ""; inp.setAttribute("capture","environment");
    inp.removeAttribute("data-editor"); inp.click();
  }, 200);
}

function pickPhotoFromGallery(){
  closePhotoPicker();
  setTimeout(() => {
    const inp = safeGet("chat-photo-input");
    if(!inp) return;
    inp.value = ""; inp.removeAttribute("capture");
    inp.dataset.editor = "1"; inp.click();
  }, 200);
}

async function pickChatPhoto(e){
  const f = e.target.files[0];
  const useEditor = e.target.dataset.editor === "1";
  e.target.value = ""; e.target.removeAttribute("capture"); delete e.target.dataset.editor;
  if(!f || !activeChat) return;
  if(activeChat !== SAVED_CHAT_NAME && isBlockedWith(activeChat)){
    showToast("لا يمكن إرسال", true);
    return;
  }
  if(useEditor){ openPhotoEditor(f); return; }
  try{
    showToast("جاري الرفع...", false, 5000);
    const dataUrl = await resizeImageToDataURL(f, 900, 0.75);
    if(activeChat === SAVED_CHAT_NAME){
      await fbPush('savedMessages/'+currentUser.username, {
        from: currentUser.username, photo: dataUrl, ts: Date.now(), seenBy: {}, reactions: {}
      });
    } else {
      const newMsg = {from: currentUser.username, photo: dataUrl, ts: Date.now(), seenBy: {}, reactions: {}};
      if(replyTo) newMsg.replyTo = {from: replyTo.from, text: replyTo.text};
      cancelReply();
      await fbPush('chats/'+chatKey(currentUser.username, activeChat)+'/messages', newMsg);
    }
    incMessagesSent();
    showToast("تم الإرسال ✓");
    setTimeout(scrollToBottom, 100);
  }catch(err){ showToast("خطأ: "+err.message, true); }
}

/* ============================================================
   Posts Creation
   ============================================================ */
function selectPostBg(css, el){
  newPostBg = css;
  const prev = safeGet("post-preview");
  if(prev) prev.style.background = css;
  document.querySelectorAll(".post-bg-opt").forEach(x => x.classList.remove("active"));
  if(el) el.classList.add("active");
}

function openCreatePost(){
  const prev = safeGet("post-preview");
  if(!prev) return;
  prev.innerHTML = "";
  prev.style.background = newPostBg;
  currentPostImageData = null;
  const pip = safeGet("post-image-preview"); if(pip) pip.style.display = "none";
  const plen = safeGet("post-len"); if(plen) plen.textContent = "0 / " + POST_CHAR_LIMIT;
  const pub = safeGet("post-publish-btn"); if(pub) pub.disabled = false;
  const modal = safeGet("post-modal"); if(modal) modal.classList.add("active");
  setTimeout(() => prev.focus(), 150);
}

function closeCreatePost(){
  const modal = safeGet("post-modal");
  if(modal) modal.classList.remove("active");
}

function updatePostPreviewLen(){
  const prev = safeGet("post-preview");
  if(!prev) return;
  let txt = prev.innerText || prev.textContent || "";
  if(txt.endsWith('\n')) txt = txt.substring(0, txt.length-1);
  if(txt.length > POST_CHAR_LIMIT){
    const trimmed = txt.substring(0, POST_CHAR_LIMIT);
    prev.innerText = trimmed;
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(prev);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    txt = trimmed;
  }
  const plen = safeGet("post-len");
  if(plen) plen.textContent = txt.length + " / " + POST_CHAR_LIMIT;
}

function pickPostImage(){ const inp = safeGet("post-image-input"); if(inp){ inp.value = ""; inp.click(); } }
function removePostImage(){ currentPostImageData = null; const p = safeGet("post-image-preview"); if(p) p.style.display = "none"; }

function clearPostAll(){
  const prev = safeGet("post-preview");
  if(prev) prev.innerHTML = "";
  const plen = safeGet("post-len");
  if(plen) plen.textContent = "0 / " + POST_CHAR_LIMIT;
  currentPostImageData = null;
  const pip = safeGet("post-image-preview");
  if(pip) pip.style.display = "none";
}

async function onPostImagePick(e){
  const f = e.target.files[0]; e.target.value = "";
  if(!f) return;
  try{
    showToast("جاري المعالجة...", false, 3000);
    const dataUrl = await resizeImageToDataURL(f, 1000, 0.82);
    currentPostImageData = dataUrl;
    const img = safeGet("post-image-img"); if(img) img.src = dataUrl;
    const pip = safeGet("post-image-preview"); if(pip) pip.style.display = "block";
    showToast("تم رفع الصورة ✓", false, 1500);
  }catch(err){ showToast("خطأ: "+err.message, true); }
}

async function publishPost(){
  const prev = safeGet("post-preview");
  if(!prev) return;
  let txt = (prev.innerText || prev.textContent || "").trim();
  if(txt.length > POST_CHAR_LIMIT){ showToast("الحد "+POST_CHAR_LIMIT+" حرف", true); return; }
  if(!txt && !currentPostImageData){ showToast("أضف نصاً أو صورة", true); return; }
  const btn = safeGet("post-publish-btn");
  if(btn){ btn.disabled = true; btn.textContent = "جاري النشر..."; }
  try{
    const postData = {author: currentUser.username, text: txt, ts: Date.now(), likes: {}, comments: {}, saves: {}};
    if(currentPostImageData) postData.image = currentPostImageData;
    else postData.bg = newPostBg;
    await fbPush('posts', postData);
    showToast("تم النشر ✓");
    closeCreatePost();
    notifyBot("post", currentUser, {details:`نشر: ${(txt||'(صورة)').substring(0,60)}`});
  }catch(e){ showToast("خطأ: "+e.message, true); }
  if(btn){
    btn.disabled = false;
    btn.innerHTML = '<svg class="svg-ic"><use href="#i-send"/></svg> نشر';
  }
}

/* ============================================================
   Comments
   ============================================================ */
function openComments(pid){
  const p = allPosts[pid]; if(!p) return;
  activeCommentsPostId = pid;
  const u = allUsers[p.author] || {};
  const preview = safeGet("comments-post-preview");
  if(preview){
    preview.innerHTML = `
<div class="pp"><div class="mini-sq" style="${p.image?`background-image:url('${p.image}');background-size:cover;background-position:center`:`background:${p.bg||POST_BGS[0].css}`}">${p.image?'':escapeHtml((p.text||"").substring(0,50))}</div><div class="pp-info"><div class="pp-name">${escapeHtml(u.firstName||p.author)} ${escapeHtml(u.lastName||"")}</div><div class="pp-text">${escapeHtml(p.text||"")}</div></div></div>`;
  }
  renderComments();
  if(activeCommentsRef) activeCommentsRef.off();
  activeCommentsRef = rdb.ref('posts/'+pid+'/comments');
  activeCommentsRef.on('value', () => renderComments());
  const modal = safeGet("comments-modal");
  if(modal) modal.classList.add("active");
}

function closeComments(){
  const modal = safeGet("comments-modal");
  if(modal) modal.classList.remove("active");
  if(activeCommentsRef){ activeCommentsRef.off(); activeCommentsRef = null; }
  activeCommentsPostId = null;
}

function renderComments(){
  if(!activeCommentsPostId) return;
  const p = allPosts[activeCommentsPostId];
  if(!p){ closeComments(); return; }
  const list = safeGet("comments-list");
  if(!list) return;
  const comments = p.comments || {};
  const arr = Object.keys(comments).map(k => ({...comments[k], _id:k}));
  arr.sort((a,b) => (a.ts||0) - (b.ts||0));
  if(!arr.length){
    list.innerHTML = '<div class="empty-state" style="padding:24px;font-size:13.5px">لا تعليقات بعد</div>';
    return;
  }
  const postOwner = p.author;
  list.innerHTML = "";
  arr.forEach(c => {
    const cu = allUsers[c.author] || {};
    const me = currentUser.username;
    const isMine = c.author === me;
    const isOwner = postOwner === me;
    const liked = !!(c.likes && c.likes[me]);
    const likeCount = c.likes ? Object.keys(c.likes).length : 0;
    const item = document.createElement("div");
    item.className = "comment-item";
    item.innerHTML = `
<div class="avatar" onclick="openUserProfile('${c.author}')"><img src="${getAvatarSrc(cu)}"></div>
<div class="comment-body ${isMine?'mine':''}" data-cid="${c._id}"><div class="comment-name">${escapeHtml(cu.firstName||c.author)} ${isOwner?'<span class="owner-tag">صاحب المنشور</span>':''}${c.editedAt?'<span style="font-size:10px;color:var(--text2)">· معدّل</span>':''}</div><div class="comment-text">${escapeHtml(c.text)}</div><div class="comment-meta">${formatTime12(c.ts)}</div></div>
<button class="comment-like ${liked?'liked':''}" onclick="event.stopPropagation();toggleCommentLike('${c._id}')"><svg><use href="#${liked?'i-heart':'i-heart-outline'}"/></svg>${likeCount||''}</button>`;
    const body = item.querySelector(".comment-body");
    let lpTimer = null, lpmoved = false, lpX = 0, lpY = 0;
    body.addEventListener('touchstart', e => {
      lpmoved = false; lpX = e.touches[0].clientX; lpY = e.touches[0].clientY;
      lpTimer = setTimeout(() => {
        if(!lpmoved){
          if(navigator.vibrate) navigator.vibrate(20);
          openCommentMenu(c._id);
        }
      }, 450);
    }, {passive:true});
    body.addEventListener('touchmove', e => {
      const dx = Math.abs(e.touches[0].clientX - lpX);
      const dy = Math.abs(e.touches[0].clientY - lpY);
      if(dx > 8 || dy > 8){ lpmoved = true; clearTimeout(lpTimer); }
    }, {passive:true});
    body.addEventListener('touchend', () => clearTimeout(lpTimer));
    body.addEventListener('click', () => { if(isMine) openEditComment(c._id); });
    list.appendChild(item);
  });
}

function openCommentMenu(cid){
  if(!activeCommentsPostId) return;
  const p = allPosts[activeCommentsPostId]; if(!p) return;
  const c = p.comments && p.comments[cid]; if(!c) return;
  selectedCommentId = cid;
  const me = currentUser.username;
  const isMine = c.author === me;
  const isOwner = p.author === me;
  let html = '';
  if(isMine) html += `<div class="act" onclick="closeCommentMenu();openEditComment('${cid}')"><svg><use href="#i-edit"/></svg> تعديل تعليقي</div>`;
  if(isMine || isOwner) html += `<div class="act danger" onclick="closeCommentMenu();deleteComment('${cid}')"><svg><use href="#i-trash"/></svg> حذف التعليق</div>`;
  if(!html) html = `<div class="act" style="color:var(--text2);pointer-events:none">لا خيارات متاحة</div>`;
  const list = safeGet("comment-menu-list");
  if(list) list.innerHTML = html;
  const modal = safeGet("comment-menu-modal");
  if(modal) modal.classList.add("active");
}

function closeCommentMenu(){
  const modal = safeGet("comment-menu-modal");
  if(modal) modal.classList.remove("active");
}

async function toggleCommentLike(cid){
  if(!activeCommentsPostId || !currentUser) return;
  const ref = rdb.ref('posts/'+activeCommentsPostId+'/comments/'+cid+'/likes/'+currentUser.username);
  const snap = await ref.once('value');
  if(snap.val()) await ref.remove();
  else await ref.set(true);
}

async function deleteComment(cid){
  if(!activeCommentsPostId) return;
  const p = allPosts[activeCommentsPostId]; if(!p) return;
  const c = p.comments && p.comments[cid]; if(!c) return;
  const me = currentUser.username;
  if(c.author !== me && p.author !== me) return;
  await fbRemove('posts/'+activeCommentsPostId+'/comments/'+cid);
  showToast("تم حذف التعليق");
}

function openEditComment(cid){
  if(!activeCommentsPostId) return;
  const p = allPosts[activeCommentsPostId]; if(!p) return;
  const c = p.comments && p.comments[cid]; if(!c || c.author !== currentUser.username) return;
  const newTxt = prompt("تعديل التعليق:", c.text);
  if(newTxt === null) return;
  const t = newTxt.trim();
  if(!t || t === c.text) return;
  rdb.ref('posts/'+activeCommentsPostId+'/comments/'+cid).update({text:t, editedAt:Date.now()}).then(() => showToast("تم التعديل"));
}

async function postComment(){
  if(!activeCommentsPostId || !currentUser) return;
  const inp = safeGet("comment-input");
  if(!inp) return;
  const t = inp.value.trim(); if(!t) return;
  inp.value = "";
  const send = safeGet("comment-send");
  if(send) send.disabled = true;
  await fbPush('posts/'+activeCommentsPostId+'/comments', {
    author: currentUser.username, text: t, ts: Date.now(), likes: {}
  });
}

/* ============================================================
   Photo Editor
   ============================================================ */
let peState = {
  originalImg:null, canvas:null, ctx:null, mode:'draw',
  color:'#EF4444', size:6, isDrawing:false, isCropping:false,
  cropStart:null, history:[], historyMax:15
};

async function openPhotoEditor(blob){
  const pe = safeGet("photo-editor");
  if(!pe) return;
  pe.classList.add("active");
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  let url = null;
  try{
    const img = new Image();
    url = URL.createObjectURL(blob);
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    peState.originalImg = img;
    const canvas = safeGet("pe-canvas");
    if(!canvas) throw new Error("Canvas not found");
    const wrap = canvas.parentElement;
    let maxW = wrap.clientWidth - 20, maxH = wrap.clientHeight - 20;
    if(maxW <= 0) maxW = 300;
    if(maxH <= 0) maxH = 300;
    let w = img.width, h = img.height;
    if(w > maxW){ h = Math.round(h*maxW/w); w = maxW; }
    if(h > maxH){ w = Math.round(w*maxH/h); h = maxH; }
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    canvas.width = w; canvas.height = h;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,w,h);
    ctx.drawImage(img,0,0,w,h);
    peState.canvas = canvas; peState.ctx = ctx;
    peState.history = [ctx.getImageData(0,0,w,h)];
    setupPeEvents();
    setPeMode('draw', document.querySelector('.pe-tool[data-mode="draw"]'));
    const sizeInp = safeGet("pe-size");
    if(sizeInp) sizeInp.value = peState.size;
    const sizeVal = safeGet("pe-size-val");
    if(sizeVal) sizeVal.textContent = peState.size;
  }catch(err){
    showToast("تعذر فتح الصورة", true);
    pe.classList.remove("active");
  }finally{
    if(url) URL.revokeObjectURL(url);
  }
}

function setupPeEvents(){
  const canvas = peState.canvas;
  if(!canvas) return;
  canvas.onpointerdown = e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    if(peState.mode === 'draw'){
      peState.isDrawing = true;
      peState.ctx.beginPath();
      peState.ctx.moveTo(x,y);
      peState.ctx.lineCap = 'round';
      peState.ctx.lineJoin = 'round';
      peState.ctx.strokeStyle = peState.color;
      peState.ctx.lineWidth = peState.size;
      canvas.setPointerCapture(e.pointerId);
    } else if(peState.mode === 'text'){
      const txt = prompt("اكتب النص:");
      if(txt && txt.trim()){
        pushHistory();
        peState.ctx.font = `bold ${Math.max(18, peState.size*4)}px -apple-system, "Segoe UI", sans-serif`;
        peState.ctx.fillStyle = peState.color;
        peState.ctx.strokeStyle = 'rgba(0,0,0,.5)';
        peState.ctx.lineWidth = 3;
        peState.ctx.textBaseline = 'top';
        peState.ctx.strokeText(txt, x, y);
        peState.ctx.fillText(txt, x, y);
      }
    } else if(peState.mode === 'crop'){
      peState.isCropping = true;
      peState.cropStart = {x,y};
    }
  };
  canvas.onpointermove = e => {
    if(!peState.isDrawing && !peState.isCropping) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    if(peState.isDrawing){
      peState.ctx.lineTo(x,y);
      peState.ctx.stroke();
    } else if(peState.isCropping && peState.cropStart){
      redrawFromHistory();
      const c = peState.ctx;
      const sx = peState.cropStart.x, sy = peState.cropStart.y;
      c.save();
      c.strokeStyle = '#4F6FF5';
      c.lineWidth = 3;
      c.setLineDash([6,4]);
      c.strokeRect(sx, sy, x-sx, y-sy);
      c.restore();
    }
  };
  canvas.onpointerup = e => {
    if(peState.isDrawing){ peState.isDrawing = false; pushHistory(); }
    if(peState.isCropping && peState.cropStart){
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      const sx = Math.max(0, Math.min(peState.cropStart.x, x));
      const sy = Math.max(0, Math.min(peState.cropStart.y, y));
      const sw = Math.abs(x - peState.cropStart.x);
      const sh = Math.abs(y - peState.cropStart.y);
      peState.isCropping = false;
      peState.cropStart = null;
      if(sw > 20 && sh > 20) performCrop(sx, sy, sw, sh);
      else redrawFromHistory();
    }
  };
  canvas.onpointercancel = () => {
    peState.isDrawing = false;
    peState.isCropping = false;
    peState.cropStart = null;
    redrawFromHistory();
  };
}

function pushHistory(){
  const c = peState.canvas; if(!c) return;
  peState.history.push(peState.ctx.getImageData(0,0,c.width,c.height));
  if(peState.history.length > peState.historyMax) peState.history.shift();
}

function redrawFromHistory(){
  if(!peState.history.length) return;
  peState.ctx.putImageData(peState.history[peState.history.length-1], 0, 0);
}

function peUndo(){
  if(peState.history.length <= 1){ showToast("لا يمكن التراجع"); return; }
  peState.history.pop();
  redrawFromHistory();
}

function peReset(){
  if(!peState.originalImg) return;
  const c = peState.canvas, ctx = peState.ctx;
  ctx.clearRect(0,0,c.width,c.height);
  ctx.drawImage(peState.originalImg, 0, 0, c.width, c.height);
  peState.history = [ctx.getImageData(0,0,c.width,c.height)];
  showToast("تمت الإعادة");
}

function performCrop(sx, sy, sw, sh){
  pushHistory();
  const c = peState.canvas, ctx = peState.ctx;
  const data = peState.history[peState.history.length-2] || peState.history[0];
  const tmp = document.createElement('canvas');
  tmp.width = data.width; tmp.height = data.height;
  tmp.getContext('2d').putImageData(data, 0, 0);
  const newCanvas = document.createElement('canvas');
  newCanvas.width = Math.round(sw); newCanvas.height = Math.round(sh);
  newCanvas.getContext('2d').drawImage(tmp, sx, sy, sw, sh, 0, 0, sw, sh);
  c.width = newCanvas.width; c.height = newCanvas.height;
  ctx.clearRect(0,0,c.width,c.height);
  ctx.drawImage(newCanvas, 0, 0);
  peState.history = [ctx.getImageData(0,0,c.width,c.height)];
  showToast("تم القص");
}

function setPeMode(mode, el){
  peState.mode = mode;
  document.querySelectorAll('.pe-tool[data-mode]').forEach(b => b.classList.remove('active'));
  if(el) el.classList.add('active');
  const row = safeGet('pe-color-row');
  if(row) row.style.display = (mode === 'crop') ? 'none' : 'flex';
}

function setPeColor(color, el){
  peState.color = color;
  document.querySelectorAll('.pe-color').forEach(c => c.classList.remove('active'));
  if(el) el.classList.add('active');
}

function closePhotoEditor(){
  const pe = safeGet("photo-editor");
  if(pe) pe.classList.remove("active");
  peState.originalImg = null;
  peState.history = [];
}

async function sendEditedPhoto(){
  if(!peState.canvas || !activeChat) return;
  try{
    showToast("جاري الرفع...", false, 5000);
    const dataUrl = peState.canvas.toDataURL('image/jpeg', 0.78);
    if(activeChat === SAVED_CHAT_NAME){
      await fbPush('savedMessages/'+currentUser.username, {
        from: currentUser.username, photo: dataUrl, ts: Date.now(), seenBy: {}, reactions: {}
      });
    } else {
      const newMsg = {from: currentUser.username, photo: dataUrl, ts: Date.now(), seenBy: {}, reactions: {}};
      if(replyTo) newMsg.replyTo = {from: replyTo.from, text: replyTo.text};
      cancelReply();
      await fbPush('chats/'+chatKey(currentUser.username, activeChat)+'/messages', newMsg);
    }
    incMessagesSent();
    closePhotoEditor();
    showToast("تم الإرسال ✓");
    setTimeout(scrollToBottom, 100);
  }catch(err){ showToast("خطأ: "+err.message, true); }
}

function viewImage(url){
  if(!url) return;
  const img = safeGet("img-viewer-src");
  if(img) img.src = url;
  const v = safeGet("img-viewer");
  if(v) v.classList.add("active");
}

function closeImgViewer(){
  const v = safeGet("img-viewer");
  if(v) v.classList.remove("active");
}