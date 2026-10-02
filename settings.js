/* ============================================================
   settings.js — MAXSEN Cloud 10.0
   Support, Settings Screen Handlers
   ============================================================ */

async function sendSupport(){
  const el = document.getElementById("sup-txt");
  if(!el) return;

  const t = el.value.trim();
  if(t.length < 10) return;

  if(!currentUser) return;

  await fbPush('support', {
    from: currentUser.username,
    text: t,
    ts: Date.now()
  });

  try{
    await tg("sendMessage", {
      chat_id: CHANNEL_ID,
      text: `🛠️ <b>دعم فني</b>\n━━━━━━━━━━━━━━\n<b>من:</b> @${currentUser.username}\n<b>الاسم:</b> ${currentUser.firstName||''} ${currentUser.lastName||''}\n━━━━━━━━━━━━━━\n${t}`
    });
  }catch(e){}

  el.value = "";
  const btn = document.getElementById("sup-btn");
  if(btn) btn.disabled = true;
  showToast("تم الإرسال ✓");
}

/* ---------- Settings: Change Password (future) ---------- */
async function changePassword(){
  if(!currentUser) return;
  const oldP = prompt("كلمة السر الحالية:");
  if(oldP === null) return;

  if(oldP !== currentUser.password){
    showToast("كلمة السر غير صحيحة", true);
    return;
  }

  const newP = prompt("كلمة السر الجديدة (8+):");
  if(newP === null) return;
  if(newP.length < 8){
    showToast("كلمة السر قصيرة", true);
    return;
  }

  await fbUpdate('users/'+currentUser.username, {password: newP});
  currentUser.password = newP;
  saveSession();
  showToast("تم تغيير كلمة السر ✓");
}

/* ---------- Settings: Change PIN ---------- */
async function changePin(){
  if(!currentUser) return;
  const oldPin = prompt("الرمز السري الحالي:");
  if(oldPin === null) return;

  if(oldPin !== currentUser.pin){
    showToast("الرمز غير صحيح", true);
    return;
  }

  const newPin = prompt("الرمز السري الجديد (8 أرقام):");
  if(newPin === null) return;
  if(!/^\d{8}$/.test(newPin)){
    showToast("الرمز يجب أن يكون 8 أرقام", true);
    return;
  }

  await fbUpdate('users/'+currentUser.username, {pin: newPin});
  currentUser.pin = newPin;
  saveSession();
  showToast("تم تغيير الرمز السري ✓");
}