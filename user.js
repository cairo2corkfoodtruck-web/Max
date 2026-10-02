/* ============================================================
   user.js — MAXSEN Cloud 10.0
   Profile, Friends, Search, Archive, Reports
   ============================================================ */

/* ---------- Chat List (with Archive) ---------- */
function renderChats(){
  const c = document.getElementById("chat-list");
  if(!c) return;
  if(!currentUser){ c.innerHTML = ''; return; }

  const friendNames = Object.keys(myFriends).filter(un => allUsers[un]);
  if(!friendNames.length){
    c.innerHTML = '<div class="empty-state">لا محادثات<br><span style="font-size:13px;opacity:.7;font-weight:600">ابحث عن أصدقاء للبدء</span></div>';
    return;
  }

  const rows = friendNames.map(un => {
    const u = allUsers[un];
    const online = isUserOnline(u);
    const blocked = isBlockedWith(un);
    const pref = getPref(un);
    const key = chatKey(currentUser.username, un);
    const last = getLastMsgInfo(key);
    const lastTs = last ? (last.ts||0) : (u.createdAt||0);
    const lastTime = last ? formatTime12(last.ts) : '';
    const isDeleted = pref.deletedAt && lastTs <= pref.deletedAt;
    let preview;
    if(blocked) preview = 'محظور';
    else if(!last) preview = 'لا رسائل بعد';
    else {
      let txt = last.text || (last.photo ? '📷 صورة' : (last.audio ? '🎤 رسالة صوتية' : ''));
      if(last.from === currentUser.username) txt = 'أنت: ' + txt;
      preview = txt;
    }
    const unread = unreadCounts[un] || 0;
    const isDraftExists = hasDraft(un);

    return {
      u, un, online, blocked, preview, lastTime, unread, lastTs,
      pinned:!!pref.pinned, muted:!!pref.muted,
      deleted:isDeleted, draft:isDraftExists,
      archived: isArchived(un)
    };
  });

  const visible = rows.filter(r => !r.deleted);
  const normal = visible.filter(r => !r.archived);
  const archived = visible.filter(r => r.archived);

  normal.sort((a,b) => {
    if(a.pinned && !b.pinned) return -1;
    if(!a.pinned && b.pinned) return 1;
    return b.lastTs - a.lastTs;
  });

  if(!visible.length){
    c.innerHTML = '<div class="empty-state">لا محادثات</div>';
    return;
  }

  c.innerHTML = "";
  normal.forEach(r => { c.innerHTML += buildChatCardHTML(r); });

  if(archived.length > 0){
    const isOpen = localStorage.getItem("MAXSEN_ARCHIVE_OPEN") === "1";
    c.innerHTML += `
<div class="archive-section" id="archive-section" onclick="toggleArchiveSection()">
<svg><use href="#i-archive"/></svg>
<div class="archive-info">
<div class="archive-title">المؤرشفة</div>
<div class="archive-count">${archived.length} محادثة</div>
</div>
<div class="archive-arrow" id="archive-arrow">${isOpen ? '▾' : '▸'}</div>
</div>
<div id="archive-list" class="archive-opened" style="display:${isOpen ? 'block' : 'none'}">
${archived.map(r => buildChatCardHTML(r, true)).join('')}
</div>`;
  }

  document.querySelectorAll("#chat-list .card").forEach(card => {
    const un = card.dataset.friend;
    if(un) attachCardLongPress(card, un);
  });
}

function buildChatCardHTML(r, inArchive){
  const u = r.u;
  const unreadCls = r.unread > 0 ? 'unread' : '';
  const previewCls = r.blocked ? '' : (r.online && r.unread === 0 ? 'online' : '');
  const pinBadge = r.pinned ? '<span class="chat-pin-ic"><svg><use href="#i-pin"/></svg></span>' : '';
  const muteBadge = r.muted ? '<span style="font-size:11px;opacity:.7">🔇</span>' : '';
  const archiveBadge = (!inArchive && r.archived) ? '<span class="archive-badge">📦</span>' : '';
  const previewText = r.draft ? 'مسودة...' : r.preview;

  return `
<div class="card ${unreadCls}" data-friend="${escapeHtml(u.username)}">
<div class="avatar" onclick="event.stopPropagation();openUserProfile('${u.username}')">
<img src="${getAvatarSrc(u)}">
<div class="status-dot ${r.online&&!r.blocked?'online':''}"></div>
</div>
<div class="u-info" onclick="openChat('${u.username}')">
<div class="u-name">
${escapeHtml(u.firstName)} ${escapeHtml(u.lastName)}
${r.blocked?'<span style="color:#EF4444;font-size:12px;font-weight:600"> 🚫</span>':''}
${pinBadge} ${muteBadge} ${archiveBadge}
</div>
<div class="u-sub ${previewCls} ${r.draft?'draft':''}">
${r.draft ? '<span class="draft-indicator">✎</span> ' : ''}
${escapeHtml(previewText)}
</div>
</div>
<div class="chat-meta">
${r.lastTime?`<div class="chat-time">${escapeHtml(r.lastTime)}</div>`:''}
${r.unread>0?`<div class="chat-unread">${r.unread>99?'99+':r.unread}</div>`:''}
</div>
</div>`;
}

function toggleArchiveSection(){
  const list = document.getElementById("archive-list");
  const arrow = document.getElementById("archive-arrow");
  if(!list || !arrow) return;
  const isOpen = list.style.display !== "none";
  if(isOpen){
    list.style.display = "none";
    arrow.textContent = "▸";
    localStorage.setItem("MAXSEN_ARCHIVE_OPEN", "0");
  } else {
    list.style.display = "block";
    arrow.textContent = "▾";
    localStorage.setItem("MAXSEN_ARCHIVE_OPEN", "1");
  }
  document.querySelectorAll("#archive-list .card").forEach(card => {
    const un = card.dataset.friend;
    if(un) attachCardLongPress(card, un);
  });
}

/* ---------- Long Press ---------- */
function attachCardLongPress(el, username){
  let timer = null, moved = false, startX = 0, startY = 0, triggered = false;
  el.addEventListener('touchstart', e => {
    moved = false; triggered = false;
    startX = e.touches[0].clientX; startY = e.touches[0].clientY;
    el.classList.add('pressing');
    timer = setTimeout(() => {
      if(!moved){
        triggered = true;
        if(navigator.vibrate) navigator.vibrate(20);
        el.classList.remove('pressing');
        openFriendMenu(username);
      }
    }, 480);
  }, {passive:true});
  el.addEventListener('touchmove', e => {
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if(Math.abs(dx) > 8 || Math.abs(dy) > 8){
      moved = true; clearTimeout(timer); el.classList.remove('pressing');
    }
  }, {passive:true});
  el.addEventListener('touchend', () => { clearTimeout(timer); el.classList.remove('pressing'); });
  el.addEventListener('touchcancel', () => { clearTimeout(timer); el.classList.remove('pressing'); });
  el.addEventListener('click', e => {
    if(triggered){ e.stopPropagation(); e.preventDefault(); triggered = false; }
  }, true);
}

/* ---------- Friend Menu ---------- */
function openFriendMenu(username){
  const u = allUsers[username]; if(!u) return;
  activeFriendMenu = username;
  const pref = getPref(username);
  const archived = isArchived(username);

  const nameEl = document.getElementById("friend-menu-name");
  if(nameEl) nameEl.textContent = (u.firstName||"")+" "+(u.lastName||"");

  const list = document.getElementById("friend-menu-list");
  if(list){
    list.innerHTML = `
<div class="act" onclick="toggleFriendPref('${username}','pinned')"><svg><use href="#i-pin"/></svg> ${pref.pinned?'إلغاء التثبيت':'تثبيت المحادثة'}</div>
<div class="act" onclick="toggleFriendPref('${username}','muted')"><svg><use href="#i-mute"/></svg> ${pref.muted?'إلغاء الكتم':'كتم الإشعارات'}</div>
<div class="act" onclick="toggleArchiveFriend('${username}')"><svg><use href="#${archived?'i-unarchive':'i-archive'}"/></svg> ${archived?'إلغاء الأرشفة':'أرشفة المحادثة'}</div>
<div class="act danger" onclick="deleteChatForMe('${username}')"><svg><use href="#i-trash"/></svg> حذف المحادثة</div>`;
  }
  const modal = document.getElementById("friend-menu-modal");
  if(modal) modal.classList.add("active");
}

function closeFriendMenu(){
  const modal = document.getElementById("friend-menu-modal");
  if(modal) modal.classList.remove("active");
  activeFriendMenu = null;
}

async function toggleFriendPref(username, key){
  if(!currentUser || !username) return;
  const pref = getPref(username);
  await fbUpdate('prefs/'+currentUser.username+'/'+username, {[key]: !pref[key]});
  showToast(!pref[key] ? 'تم التفعيل' : 'تم الإلغاء', false, 1500);
  closeFriendMenu();
}

async function deleteChatForMe(username){
  if(!currentUser || !username) return;
  const key = chatKey(currentUser.username, username);
  const last = getLastMsgInfo(key);
  const lastTs = last ? (last.ts||0) : Date.now();
  await fbUpdate('prefs/'+currentUser.username+'/'+username, {deletedAt:lastTs});
  showToast("تم حذف المحادثة", false, 1800);
  closeFriendMenu();
}

/* ---------- Friends List ---------- */
function fetchFriends(){
  if(!currentUser) return;

  const reqs = Object.keys(myRequests).map(un => allUsers[un]).filter(Boolean);
  const rl = document.getElementById("req-list");
  const rc = document.getElementById("req-count");
  if(rc) rc.textContent = reqs.length ? `(${reqs.length})` : "";

  if(rl){
    if(!reqs.length){
      rl.innerHTML = '<div class="empty-state" style="padding:12px;font-size:13.5px">لا توجد طلبات</div>';
    } else {
      rl.innerHTML = "";
      reqs.forEach(u => {
        rl.innerHTML += `
<div class="card" style="padding:12px;margin-bottom:10px">
<img src="${getAvatarSrc(u)}" style="width:46px;height:46px;border-radius:50%;flex-shrink:0;background:var(--fill-2);cursor:pointer" onclick="openUserProfile('${u.username}')">
<div class="u-info" style="cursor:pointer" onclick="openUserProfile('${u.username}')">
<div class="u-name" style="font-size:15px">${escapeHtml(u.firstName)} ${escapeHtml(u.lastName)}</div>
<div class="u-sub">@${u.username}</div>
</div>
<div style="display:flex;gap:6px;flex-shrink:0">
<button class="btn-sm green" onclick="acceptReq('${u.username}',this)">قبول</button>
<button class="btn-sm gray" onclick="rejectReq('${u.username}',this)">رفض</button>
</div>
</div>`;
      });
    }
  }

  const friendNames = Object.keys(myFriends).filter(un => allUsers[un]);
  const fl = document.getElementById("friends-list");
  const fc = document.getElementById("fr-count");
  if(fc) fc.textContent = friendNames.length ? `(${friendNames.length})` : "";

  if(fl){
    if(!friendNames.length){
      fl.innerHTML = '<div class="empty-state" style="padding:12px;font-size:13.5px">لا أصدقاء بعد</div>';
    } else {
      fl.innerHTML = "";
      friendNames.forEach(un => {
        const u = allUsers[un]; if(!u) return;
        const online = isUserOnline(u);
        const blocked = isBlockedWith(un);
        fl.innerHTML += `
<div class="card" data-friend="${escapeHtml(u.username)}">
<div class="avatar" onclick="openUserProfile('${u.username}')">
<img src="${getAvatarSrc(u)}">
<div class="status-dot ${online&&!blocked?'online':''}"></div>
</div>
<div class="u-info" onclick="openUserProfile('${u.username}')">
<div class="u-name">${escapeHtml(u.firstName)} ${escapeHtml(u.lastName)} ${blocked?'<span style="color:#EF4444;font-size:12px">🚫</span>':''}</div>
<div class="u-sub ${online&&!blocked?'online':''}">${blocked?'محظور':formatPresence(u)}</div>
</div>
<button class="btn-sm green" onclick="event.stopPropagation();openChat('${u.username}')">مراسلة</button>
</div>`;
      });
      document.querySelectorAll("#friends-list .card").forEach(card => {
        const un = card.dataset.friend;
        if(un) attachCardLongPress(card, un);
      });
    }
  }
}

/* ---------- Search ---------- */
async function doSearchNow(){
  if(searchInProgress) return;
  const qEl = document.getElementById("search-q");
  const area = document.getElementById("search-area");
  if(!qEl || !area) return;
  const q = (qEl.value||"").trim();
  if(!q){ area.innerHTML = '<div class="empty-state">اكتب اسم أو ID ثم اضغط بحث</div>'; return; }

  searchInProgress = true;
  area.innerHTML = '<div class="empty-state">جاري البحث<span class="spinner"></span></div>';

  try{
    const ql = q.toLowerCase();
    const results = [];
    for(const un in allUsers){
      const u = allUsers[un];
      const unLower = (un||"").toLowerCase();
      const firstLower = (u.firstName||"").toLowerCase();
      const lastLower = (u.lastName||"").toLowerCase();
      const idLower = (u.maxsenId||"").toLowerCase();
      const fullName = (firstLower + " " + lastLower).trim();
      if(idLower === ql || idLower.includes(ql) || unLower === ql || unLower.includes(ql) ||
         firstLower.includes(ql) || lastLower.includes(ql) || fullName.includes(ql)){
        results.push({u, isMe: un === currentUser.username, exactId: idLower === ql});
      }
    }
    results.sort((a,b) => (a.exactId && !b.exactId) ? -1 : (!a.exactId && b.exactId) ? 1 : 0);
    if(!results.length){ area.innerHTML = '<div class="empty-state">❌ لا يوجد مطابق</div>'; searchInProgress = false; return; }

    area.innerHTML = "";
    results.forEach(item => {
      const u = item.u;
      const isFriend = !!myFriends[u.username];
      const isReq = !!mySentRequests[u.username];
      const blocked = isBlockedWith(u.username);
      const online = isUserOnline(u);
      let action = "";
      if(item.isMe) action = '<span style="font-size:12px;color:var(--primary);font-weight:700">أنت</span>';
      else if(blocked) action = '<span style="font-size:12px;color:#EF4444;font-weight:700">محظور</span>';
      else if(isFriend) action = `<button class="btn-sm green" onclick="event.stopPropagation();openChat('${u.username}')">مراسلة</button>`;
      else if(isReq) action = '<span style="font-size:12px;color:var(--text2);font-weight:600">تم الإرسال</span>';
      else action = `<button class="btn-sm" onclick="event.stopPropagation();sendFriendReq('${u.username}')">إضافة</button>`;
      area.innerHTML += `
<div class="card" onclick="openUserProfile('${u.username}')">
<div class="avatar"><img src="${getAvatarSrc(u)}"><div class="status-dot ${online&&!blocked?'online':''}"></div></div>
<div class="u-info">
<div class="u-name">${escapeHtml(u.firstName)} ${escapeHtml(u.lastName)}</div>
<div class="u-sub ${online&&!blocked?'online':''}">${blocked?'محظور':formatPresence(u)} • ${escapeHtml(u.maxsenId)}</div>
</div>
${action}
</div>`;
    });
  }catch(e){ area.innerHTML = '<div class="empty-state">⚠️ خطأ في البحث</div>'; }
  searchInProgress = false;
}

/* ---------- Friend Requests ---------- */
async function sendFriendReq(target){
  if(!currentUser) return;
  if(isBlockedWith(target)){ showToast("لا يمكن إرسال الطلب", true); return; }
  if(myFriends[target]){ showToast("صديقك بالفعل", true); return; }
  if(mySentRequests[target]){ showToast("مُرسل مسبقاً", true); return; }
  const key = currentUser.username + "__" + target;
  await fbSet('requests/'+key, {from:currentUser.username, to:target, status:"pending", ts:Date.now()});
  showToast("تم إرسال الطلب ✓");
  doSearchNow();
}

async function acceptReq(username, btn){
  if(btn){ btn.disabled = true; btn.textContent = "…"; }
  try{
    const key = username + "__" + currentUser.username;
    await fbUpdate('requests/'+key, {status:"accepted"});
    await fbSet('friends/'+currentUser.username+'/'+username, true);
    await fbSet('friends/'+username+'/'+currentUser.username, true);
    showToast("أصبحتما أصدقاء ✓");
  }catch(e){
    showToast("خطأ", true);
    if(btn){ btn.disabled = false; btn.textContent = "قبول"; }
  }
}

async function rejectReq(username, btn){
  if(btn){ btn.disabled = true; btn.textContent = "…"; }
  try{
    await fbRemove('requests/'+username+"__"+currentUser.username);
    showToast("تم الرفض");
  }catch(e){
    if(btn){ btn.disabled = false; btn.textContent = "رفض"; }
  }
}

async function cancelFriendReq(target){
  await fbRemove('requests/'+currentUser.username+"__"+target);
  showToast("تم إلغاء الطلب");
  if(viewingUser && viewingUser.username === target) openUserProfile(target, false);
}

/* ---------- Block ---------- */
async function toggleBlock(username){
  if(!currentUser || username === currentUser.username) return;
  if(myBlocks[username]){
    await fbRemove('blocks/'+currentUser.username+'/'+username);
    await fbRemove('blockedBy/'+username+'/'+currentUser.username);
    myBlocks = {...myBlocks};
    delete myBlocks[username];
    showToast("تم إلغاء الحظر");
  } else {
    await fbSet('blocks/'+currentUser.username+'/'+username, true);
    await fbSet('blockedBy/'+username+'/'+currentUser.username, true);
    myBlocks[username] = true;
    showToast("🚫 تم حظر المستخدم");
    notifyBot("block", currentUser, {details:`قام بحظر @${username}`});
  }
  if(viewingUser && viewingUser.username === username) openUserProfile(username, false);
  if(activeChat === username) updateChatBlockUI();
  refreshCurrentView();
}

/* ---------- Profile (mine) ---------- */
function renderProfile(){
  if(!currentUser) return;
  const ava = getAvatarSrc(currentUser);
  const myAva = document.getElementById("my-ava");
  if(myAva) myAva.src = ava;
  const pba = document.getElementById("post-box-ava");
  if(pba) pba.src = ava;
  const nm = document.getElementById("my-name");
  const un = document.getElementById("my-un");
  const id = document.getElementById("my-id");
  if(nm) nm.textContent = (currentUser.firstName||"")+" "+(currentUser.lastName||"");
  if(un) un.textContent = "@"+currentUser.username;
  if(id) id.textContent = currentUser.maxsenId;
  const efn = document.getElementById("ed-fn");
  const eln = document.getElementById("ed-ln");
  const eage = document.getElementById("ed-age");
  const ebio = document.getElementById("ed-bio");
  if(efn) efn.value = currentUser.firstName||"";
  if(eln) eln.value = currentUser.lastName||"";
  if(eage) eage.value = currentUser.age||"";
  if(ebio) ebio.value = currentUser.bio||"";
  const bioC = document.getElementById("bio-c");
  if(bioC) bioC.textContent = (currentUser.bio||"").length + " / 200";
  const hero = document.getElementById("my-hero");
  if(hero){
    const themeId = currentUser.themeId || "indigo";
    applyHero(hero, themeId);
    document.querySelectorAll("#my-hero-themes .hero-theme").forEach(s => {
      s.classList.toggle("active", s.dataset.theme === themeId);
    });
  }
  const saveBtn = document.getElementById("save-btn");
  if(saveBtn) saveBtn.disabled = true;
  updateProfileStats();
}

function dirty(){
  const btn = document.getElementById("save-btn");
  if(btn) btn.disabled = false;
}

function setTheme(themeId, el){
  const hero = document.getElementById("my-hero");
  if(hero) applyHero(hero, themeId);
  document.querySelectorAll("#my-hero-themes .hero-theme").forEach(s => s.classList.remove("active"));
  if(el) el.classList.add("active");
  if(currentUser) currentUser.themeId = themeId;
  dirty();
}

async function saveProfile(){
  const btn = document.getElementById("save-btn");
  if(btn){ btn.disabled = true; btn.textContent = "جاري الحفظ..."; }
  try{
    const efn = document.getElementById("ed-fn");
    const eln = document.getElementById("ed-ln");
    const eage = document.getElementById("ed-age");
    const ebio = document.getElementById("ed-bio");
    const updates = {
      firstName: efn ? efn.value.trim() : "",
      lastName: eln ? eln.value.trim() : "",
      age: eage ? (parseInt(eage.value) || 0) : 0,
      bio: ebio ? ebio.value : "",
      themeId: currentUser.themeId || "indigo",
      lastSeen: Date.now()
    };
    await fbUpdate('users/'+currentUser.username, updates);
    Object.assign(currentUser, updates);
    saveSession();
    showToast("تم الحفظ ✓");
    renderProfile();
    notifyBot("profile", currentUser);
  }catch(e){ showToast("فشل الحفظ: "+e.message, true); }
  if(btn){
    btn.disabled = true;
    btn.innerHTML = '<svg class="svg-ic"><use href="#i-check"/></svg> حفظ';
  }
}

async function pickAvatar(e){
  const f = e.target.files[0];
  if(!f || !currentUser) return;
  showToast("جاري رفع الصورة...", false, 6000);
  try{
    const dataUrl = await resizeImageToDataURL(f, 250, 0.72);
    await fbUpdate('users/'+currentUser.username, {avatarUrl:dataUrl});
    currentUser.avatarUrl = dataUrl;
    saveSession();
    const myAva = document.getElementById("my-ava");
    const pba = document.getElementById("post-box-ava");
    if(myAva) myAva.src = dataUrl;
    if(pba) pba.src = dataUrl;
    showToast("تم تحديث الصورة ✓");
  }catch(err){ showToast("خطأ: "+err.message, true); }
  e.target.value = "";
}

/* ---------- User Profile (others) ---------- */
async function openUserProfile(username, fromMain){
  if(fromMain === undefined) fromMain = true;
  if(!username) return;
  const u = allUsers[username];
  if(!u){ showToast("الحساب غير موجود", true, 3000); return; }
  viewingUser = u;
  const isMe = username === currentUser.username;
  const titleEl = document.getElementById("user-nav-title");
  if(titleEl) titleEl.textContent = (u.firstName||"")+" "+(u.lastName||"");

  const themeId = u.themeId || "indigo";
  const isDisabled = !!u.disabled;
  const isFriend = !!myFriends[username];
  const sentReq = !!mySentRequests[username];
  const otherReq = !!myRequests[username];
  const blocked = !!myBlocks[username];
  const blockedByThem = !!blockedBy[username];
  const online = isUserOnline(u);

  let actionBtns = '';
  if(!isMe){
    if(blocked) actionBtns = `<button class="btn" style="flex:1;background:linear-gradient(180deg,#34D399,#16A34A)" onclick="toggleBlock('${u.username}')">إلغاء الحظر</button>`;
    else if(blockedByThem) actionBtns = `<div style="flex:1;background:linear-gradient(135deg,rgba(239,68,68,.1),rgba(239,68,68,.05));border:1px solid rgba(239,68,68,.25);border-radius:16px;padding:14px;text-align:center;color:#EF4444;font-size:14px;font-weight:700">🚫 هذا المستخدم حظرك</div>`;
    else if(isFriend) actionBtns = `<button class="btn" style="flex:1" onclick="openChat('${u.username}')"><svg class="svg-ic"><use href="#i-chat"/></svg> مراسلة</button>`;
    else if(sentReq) actionBtns = `<button class="btn-2" style="flex:1;background:var(--card);border:.5px solid var(--border);border-radius:16px;padding:14px" onclick="cancelFriendReq('${u.username}')">إلغاء الطلب</button>`;
    else if(otherReq) actionBtns = `<button class="btn" style="flex:1;background:linear-gradient(180deg,#34D399,#16A34A)" onclick="acceptReq('${u.username}',this)"><svg class="svg-ic"><use href="#i-check"/></svg> قبول الطلب</button>`;
    else actionBtns = `<button class="btn" style="flex:1" onclick="sendFriendReq('${u.username}')"><svg class="svg-ic"><use href="#i-user-add"/></svg> إضافة صديق</button>`;
  }

  const t = findTheme(themeId);
  const content = document.getElementById("user-profile-content");
  if(!content) return;

  content.innerHTML = `
<div class="user-hero" style="background:${t.bg};box-shadow:0 24px 56px -20px ${t.shadow}, 0 10px 22px rgba(0,0,0,.1);--theme:${t.bg};--theme-shadow:${t.shadow}">
<div class="hero-content">
<div class="avatar-xl"><img src="${getAvatarSrc(u)}"></div>
<div class="hero-text">
<div class="hero-name">${escapeHtml(u.firstName||"")} ${escapeHtml(u.lastName||"")}</div>
<div class="hero-username">@${escapeHtml(u.username||username)}</div>
<div class="hero-presence ${online&&!blocked?'online':''}">${blocked?'محظور':(blockedByThem?'لا يمكن التواصل':formatPresence(u))}</div>
<div class="hero-id" onclick="copyText('${u.maxsenId||""}')"><svg><use href="#i-id"/></svg><span>${u.maxsenId||"—"}</span></div>
</div>
</div>
</div>
${isDisabled?'<div style="background:linear-gradient(135deg,rgba(239,68,68,.12),rgba(239,68,68,.06));border-radius:16px;padding:14px;color:#EF4444;font-size:15px;font-weight:800;text-align:center;margin-bottom:14px">تم تعطيل هذا الحساب</div>':''}
${actionBtns?`<div class="action-btns" style="display:flex;gap:8px;margin-bottom:14px">${actionBtns}</div>`:''}
<div class="info-bar">
<div class="item"><div class="val">${u.age||'—'}</div><div class="lbl"><svg><use href="#i-cake"/></svg> سنة</div></div>
<div class="item"><div class="val">0</div><div class="lbl"><svg><use href="#i-friends"/></svg> صديق</div></div>
</div>
<div class="bio-card"><div class="head"><svg><use href="#i-note"/></svg> السيرة الذاتية</div><div class="body">${escapeHtml(u.bio)||'<span style="color:var(--text2)">لا توجد نبذة</span>'}</div></div>
<div id="user-posts-feed"></div>`;

  const hero = content.querySelector(".user-hero");
  if(hero) applyHero(hero, themeId);

  renderUserPosts(username);
  if(fromMain) nav("s-user");
}

/* ---------- User Menu ---------- */
function openUserMenu(){
  if(!viewingUser) return;
  const u = viewingUser;
  if(u.username === currentUser.username){ showToast("هذا ملفك الشخصي"); return; }
  const blocked = !!myBlocks[u.username];
  const list = document.getElementById("action-list");
  if(list){
    list.innerHTML = `
<div class="act" onclick="openReportTech('${u.username}')"><svg><use href="#i-tool"/></svg> بلاغ فني</div>
<div class="act ${blocked?'':'warn'}" onclick="closeActionModal();toggleBlock('${u.username}')"><svg><use href="#i-block"/></svg> ${blocked?'إلغاء الحظر':'حظر المستخدم'}</div>
<div class="act danger" onclick="openReportUser('${u.username}')"><svg><use href="#i-flag"/></svg> بلاغ عن مستخدم</div>`;
  }
  const modal = document.getElementById("action-modal");
  if(modal) modal.classList.add("active");
}

function closeActionModal(){
  const modal = document.getElementById("action-modal");
  if(modal) modal.classList.remove("active");
}

/* ---------- Reports ---------- */
function openReportTech(username){
  closeActionModal();
  const u = allUsers[username]; if(!u) return;
  reportedTarget = username;
  const el = document.getElementById("report-tech-user");
  if(el){
    el.innerHTML = `
<div class="card" style="pointer-events:none"><div class="avatar"><img src="${getAvatarSrc(u)}"></div><div class="u-info"><div class="u-name">${escapeHtml(u.firstName)} ${escapeHtml(u.lastName)}</div><div class="u-sub">@${u.username}</div></div></div>`;
  }
  const txt = document.getElementById("report-tech-text");
  if(txt) txt.value = "";
  const btn = document.getElementById("report-tech-submit");
  if(btn) btn.disabled = true;
  nav("s-report-tech");
}

function openReportUser(username){
  closeActionModal();
  const u = allUsers[username]; if(!u) return;
  reportedTarget = username;
  const el = document.getElementById("report-user-user");
  if(el){
    el.innerHTML = `
<div class="card" style="pointer-events:none"><div class="avatar"><img src="${getAvatarSrc(u)}"></div><div class="u-info"><div class="u-name">${escapeHtml(u.firstName)} ${escapeHtml(u.lastName)}</div><div class="u-sub">@${u.username}</div></div></div>`;
  }
  const txt = document.getElementById("report-user-text");
  if(txt) txt.value = "";
  const btn = document.getElementById("report-user-submit");
  if(btn) btn.disabled = true;
  nav("s-report-user");
}

async function submitReportTech(){
  const el = document.getElementById("report-tech-text");
  if(!el) return;
  const reason = el.value.trim();
  if(reason.length < 10) return;
  const btn = document.getElementById("report-tech-submit");
  if(btn){ btn.disabled = true; btn.textContent = "جاري الإرسال..."; }
  await sendReport(reportedTarget, "tech", reason);
  el.value = "";
  nav("s-user");
  if(btn){
    btn.disabled = false;
    btn.innerHTML = '<svg class="svg-ic"><use href="#i-send"/></svg> إرسال البلاغ';
  }
}

async function submitReportUser(){
  const el = document.getElementById("report-user-text");
  if(!el) return;
  const reason = el.value.trim();
  if(reason.length < 10) return;
  const btn = document.getElementById("report-user-submit");
  if(btn){ btn.disabled = true; btn.textContent = "جاري الإرسال..."; }
  await sendReport(reportedTarget, "user", reason);
  el.value = "";
  nav("s-user");
  if(btn){
    btn.disabled = false;
    btn.innerHTML = '<svg class="svg-ic"><use href="#i-flag"/></svg> إرسال البلاغ';
  }
}

async function sendReport(againstUsername, type, reason){
  const target = allUsers[againstUsername];
  const report = {
    from: currentUser.username, against: againstUsername,
    againstName: target ? (target.firstName+" "+target.lastName) : againstUsername,
    type, reason, ts: Date.now(), processed: false
  };
  await fbPush('reports', report);
  const typeLabel = type === "user" ? "بلاغ عن مستخدم" : "بلاغ فني";
  try{
    await tg("sendMessage", {
      chat_id: CHANNEL_ID,
      text: `بلاغ جديد\n━━━━━━━━━━━━━━\nالنوع: ${typeLabel}\nمن: @${currentUser.username}\nضد: @${againstUsername}\nالسبب: ${reason}`
    });
  }catch(e){}
  showToast("تم إرسال البلاغ ✓");
}

/* ---------- Posts ---------- */
function getUserPosts(username){
  const arr = [];
  for(const pid in allPosts){
    const p = allPosts[pid];
    if(p && p.author === username) arr.push({...p, _id:pid});
  }
  arr.sort((a,b) => (b.ts||0) - (a.ts||0));
  return arr;
}

function renderMyPosts(){
  const container = document.getElementById("my-posts-feed");
  if(!container || !currentUser) return;
  const posts = getUserPosts(currentUser.username);
  if(!posts.length){
    container.innerHTML = '<div class="no-posts"><svg viewBox="0 0 24 24"><use href="#i-post"/></svg><div>لا توجد منشورات بعد</div></div>';
    return;
  }
  container.innerHTML = "";
  posts.forEach(p => container.appendChild(buildPostCard(p)));
}

function renderUserPosts(username){
  const container = document.getElementById("user-posts-feed");
  if(!container) return;
  const posts = getUserPosts(username);
  if(!posts.length){
    container.innerHTML = '<div class="no-posts"><svg viewBox="0 0 24 24"><use href="#i-post"/></svg><div>لا توجد منشورات بعد</div></div>';
    return;
  }
  container.innerHTML = "";
  posts.forEach(p => container.appendChild(buildPostCard(p)));
}

function buildPostCard(p){
  const u = allUsers[p.author] || {};
  const me = currentUser.username;
  const liked = !!(p.likes && p.likes[me]);
  const saved = !!(p.saves && p.saves[me]);
  const likesCount = p.likes ? Object.keys(p.likes).length : 0;
  const commentsCount = p.comments ? Object.keys(p.comments).length : 0;
  const card = document.createElement("div");
  card.className = "post-card";
  card.dataset.pid = p._id;
  const canDelete = p.author === me;
  let bodyHtml = "";
  if(p.image){
    bodyHtml = `<div class="post-image-wrap"><img src="${p.image}" onclick="viewImage(this.src)" alt=""></div>`;
  }
  if(p.text && p.text.trim()){
    bodyHtml += `<div class="post-square-wrap"><div class="post-square" style="${p.image?'aspect-ratio:auto;min-height:auto;padding:14px 16px;background:var(--card);color:var(--text);box-shadow:none;border-radius:0':`background:${p.bg||POST_BGS[0].css}`}" ondblclick="togglePostLike('${p._id}')">${escapeHtml(p.text)}</div></div>`;
  } else if(!p.image){
    bodyHtml = `<div class="post-square-wrap"><div class="post-square" style="background:${p.bg||POST_BGS[0].css}" ondblclick="togglePostLike('${p._id}')">${escapeHtml(p.text||'')}</div></div>`;
  }
  card.innerHTML = `
<div class="post-header">
<div class="avatar" onclick="openUserProfile('${p.author}')"><img src="${getAvatarSrc(u)}"></div>
<div class="u-info" onclick="openUserProfile('${p.author}')">
<div class="u-name">${escapeHtml(u.firstName||p.author)} ${escapeHtml(u.lastName||"")}</div>
<div class="u-sub">${formatTime12(p.ts)}</div>
</div>
${canDelete?`<button class="nav-btn icon-only" onclick="deleteMyPost('${p._id}')"><svg><use href="#i-trash"/></svg></button>`:''}
</div>
${bodyHtml}
<div class="post-stats">${likesCount?`<div class="liked-by">❤️ ${likesCount}</div>`:''}${commentsCount?`<div>💬 ${commentsCount}</div>`:''}</div>
<div class="post-actions">
<button class="post-action ${liked?'liked':''}" onclick="togglePostLike('${p._id}')"><svg><use href="#${liked?'i-heart':'i-heart-outline'}"/></svg><span>إعجاب</span></button>
<button class="post-action" onclick="openComments('${p._id}')"><svg><use href="#i-comment"/></svg><span>تعليق</span></button>
<button class="post-action" onclick="copyPost('${p._id}')"><svg><use href="#i-copy"/></svg><span>نسخ</span></button>
<button class="post-action ${saved?'saved':''}" onclick="togglePostSave('${p._id}')"><svg><use href="#${saved?'i-bookmark':'i-bookmark-outline'}"/></svg><span>حفظ</span></button>
</div>`;
  return card;
}

async function togglePostLike(pid){
  if(!currentUser) return;
  const ref = rdb.ref('posts/'+pid+'/likes/'+currentUser.username);
  const snap = await ref.once('value');
  if(snap.val()) await ref.remove();
  else await ref.set(true);
}

async function togglePostSave(pid){
  if(!currentUser) return;
  const ref = rdb.ref('posts/'+pid+'/saves/'+currentUser.username);
  const snap = await ref.once('value');
  if(snap.val()){ await ref.remove(); showToast("تم إلغاء الحفظ", false, 1500); }
  else { await ref.set(true); showToast("تم الحفظ ✓", false, 1500); }
}

async function copyPost(pid){
  const p = allPosts[pid]; if(!p) return;
  copyText(p.text||"");
}

async function deleteMyPost(pid){
  const p = allPosts[pid];
  if(!p || p.author !== currentUser.username) return;
  if(!confirm("حذف المنشور؟")) return;
  await fbRemove('posts/'+pid);
  showToast("تم الحذف");
}