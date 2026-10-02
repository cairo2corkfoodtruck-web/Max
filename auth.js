/* ============================================================
   auth.js — MAXSEN Cloud 10.1
   Login, Signup, Logout
   ============================================================ */

async function doLogin(){
  const u = document.getElementById("lg-user").value.trim();
  const p = document.getElementById("lg-pass").value.trim();
  const pin = document.getElementById("lg-pin").value.trim();

  if(!u || !p || !pin){
    showToast("املأ جميع الحقول", true);
    return;
  }

  const btn = document.getElementById("btn-login");
  btn.disabled = true;
  btn.textContent = "جاري التحقق...";

  try{
    const users = await fbGet('users') || {};
    let found = null;

    for(const un in users){
      const usr = users[un];
      if((usr.username === u || usr.maxsenId === u) &&
         usr.password === p &&
         usr.pin === pin){
        found = usr;
        break;
      }
    }

    if(found){
      if(found.disabled){
        showToast("الحساب معطّل", true, 3000);
        btn.disabled = false;
        btn.innerHTML = '<svg class="svg-ic"><use href="#i-check"/></svg> تسجيل الدخول';
        return;
      }
      currentUser = Object.assign({}, found);
      currentUser.lastSeen = Date.now();
      await fbUpdate('users/'+found.username, {lastSeen: currentUser.lastSeen});
      saveSession();
      attachMyListeners();
      showToast("مرحباً @" + found.username);
      nav("s-main");
      tab("chats");
      notifyBot("login", found);
      startHeartbeat();
    } else {
      showToast("بيانات خاطئة", true, 3500);
    }
  }catch(e){
    showToast("خطأ: " + e.message, true);
  }

  btn.disabled = false;
  btn.innerHTML = '<svg class="svg-ic"><use href="#i-check"/></svg> تسجيل الدخول';
}

/* ⚠️ unTimer معرّف في app.js — لا نُعيد تعريفه هنا */

function checkUsername(v){
  const badge = document.getElementById("un-badge");
  if(!badge) return;
  clearTimeout(unTimer);

  if(!v.trim()){
    badge.textContent = "";
    return;
  }

  if(!/^[a-zA-Z0-9._]{4,}$/.test(v)){
    badge.textContent = "✗";
    badge.style.color = "#EF4444";
    return;
  }

  badge.textContent = "…";
  badge.style.color = "var(--text2)";

  unTimer = setTimeout(async () => {
    try{
      const exists = await fbGet('users/'+v);
      badge.textContent = exists ? "✗" : "✓";
      badge.style.color = exists ? "#EF4444" : "#22C55E";
    }catch(e){
      badge.textContent = "⚠";
    }
  }, 300);
}

function genId(){
  const rand = String(Math.floor(Math.random()*1e12)).padStart(12,'0');
  return "M" + rand.substring(0,12);
}

async function doSignup(){
  const fn = document.getElementById("su-fn").value.trim();
  const ln = document.getElementById("su-ln").value.trim();
  const un = document.getElementById("su-un").value.trim();
  const age = document.getElementById("su-age").value.trim();
  const p = document.getElementById("su-pass").value.trim();
  const pin = document.getElementById("su-pin").value.trim();

  if(!fn || !ln || !un || !age || p.length < 8 || pin.length !== 8){
    showToast("كلمة السر 8+ والرمز 8 أرقام", true);
    return;
  }

  if(!/^[a-zA-Z0-9._]{4,}$/.test(un)){
    showToast("اسم المستخدم 4+ (a-z 0-9 . _)", true);
    return;
  }

  const btn = document.getElementById("btn-signup");
  btn.disabled = true;
  btn.textContent = "جاري الإنشاء...";

  try{
    const existing = await fbGet('users/'+un);

    if(existing){
      showToast("اسم المستخدم محجوز", true);
      btn.disabled = false;
      btn.innerHTML = '<svg class="svg-ic"><use href="#i-user-add"/></svg> إنشاء الحساب';
      return;
    }

    const uid = genId();
    const user = {
      username: un,
      maxsenId: uid,
      firstName: fn,
      lastName: ln,
      age: parseInt(age),
      password: p,
      pin: pin,
      bio: "",
      avatarUrl: null,
      themeId: "indigo",
      lastSeen: Date.now(),
      createdAt: Date.now()
    };

    await fbSet('users/'+un, user);
    currentUser = Object.assign({}, user);
    saveSession();
    attachMyListeners();
    showToast("تم الإنشاء! ID: " + uid, false, 4000);
    nav("s-main");
    tab("chats");
    notifyBot("signup", user);
    startHeartbeat();
  }catch(e){
    showToast("خطأ: " + e.message, true);
  }

  btn.disabled = false;
  btn.innerHTML = '<svg class="svg-ic"><use href="#i-user-add"/></svg> إنشاء الحساب';
}

function doLogout(){
  if(currentUser){
    fbUpdate('users/'+currentUser.username, {lastSeen: Date.now() - 10000});
    notifyBot("logout", currentUser);
  }

  detachMyListeners();

  if(activeChatRef){ activeChatRef.off(); activeChatRef = null; }
  if(activePinRef){ activePinRef.off(); activePinRef = null; }
  if(activeTypingRef){ activeTypingRef.off(); activeTypingRef = null; }
  if(activeCommentsRef){ activeCommentsRef.off(); activeCommentsRef = null; }

  stopHeartbeat();
  currentUser = null;
  saveSession();
  nav("s-login");
  showToast("تم الخروج");
}