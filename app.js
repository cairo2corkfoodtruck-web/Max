/* ============================================================
   app.js — MAXSEN Cloud 11.1
   iOS Glassmorphism Edition + Fallback Stubs
   - ثيمات جديدة (فراشة، وردة، ورد متساقط، قطرات، أوراق، بريق، شفق)
   - خلفيات iPhone جديدة
   - إيموجي في المحادثة
   ============================================================ */

firebase.initializeApp({
  databaseURL: "https://marrwa-da998-default-rtdb.firebaseio.com"
});
const rdb = firebase.database();

/* ============================================================
   🛡️ Fallback Stubs — يمنع انهيار التطبيق
   ============================================================ */
(function(){
  const stubs = [
    'renderChats','buildChatCardHTML','toggleArchiveSection','attachCardLongPress',
    'openFriendMenu','closeFriendMenu','toggleFriendPref','deleteChatForMe',
    'fetchFriends','doSearchNow','sendFriendReq','acceptReq','rejectReq',
    'cancelFriendReq','toggleBlock','renderProfile','dirty','setTheme',
    'saveProfile','pickAvatar','openUserProfile','openUserMenu','closeActionModal',
    'openReportTech','openReportUser','submitReportTech','submitReportUser',
    'sendReport','getUserPosts','renderMyPosts','renderUserPosts','buildPostCard',
    'togglePostLike','togglePostSave','copyPost','deleteMyPost',
    'updateChatBlockUI','updateChatStatus','openChat','openChatProfile',
    'applyChatBg','clearTypingFlag','notifyTyping','markMessagesSeen',
    'setReply','cancelReply','openForward','closeForward','forwardTo',
    'getMsgSig','buildReplyHtml','createMsgEl','quickHeart','quickReply',
    'playAudioMessage','buildReactionsHtml','updateMsgEl','renderMsgs',
    'attachMsgGestures','showHeartAnim','showMsgActions','saveMsgToSaved',
    'closeMsgAction','toggleReaction','copyMsg','pinMsg','openEditMsg',
    'closeEditMsg','saveMsgEdit','requestDeleteMsg','cancelDelete','confirmDelete',
    'renderPinned','unpinCurrent','scrollToPinned','openChatMenu','closeChatMenu',
    'toggleChatMute','askClearChat','confirmClearChat','openChatBgPicker',
    'closeChatBg','setChatBg','openChatSearch','closeChatSearch','filterChatMessages',
    'searchNavigate','scrollToMatch','sendMsg','setupMessageInput',
    'updateSendBtnVisibility','setupMicButton','startRecording','startRecordingTimer',
    'stopRecording','openGalleryDirect','openPhotoPicker','closePhotoPicker',
    'pickPhotoFromCamera','pickPhotoFromGallery','pickChatPhoto',
    'selectPostBg','openCreatePost','closeCreatePost','updatePostPreviewLen',
    'pickPostImage','removePostImage','clearPostAll','onPostImagePick','publishPost',
    'openComments','closeComments','renderComments','openCommentMenu','closeCommentMenu',
    'toggleCommentLike','deleteComment','openEditComment','postComment',
    'openPhotoEditor','setupPeEvents','pushHistory','redrawFromHistory','peUndo',
    'peReset','performCrop','setPeMode','setPeColor','closePhotoEditor',
    'sendEditedPhoto','viewImage','closeImgViewer','toggleEmojiPanel','insertEmoji'
  ];
  stubs.forEach(function(name){
    if(typeof window[name] === "undefined"){
      window[name] = function(){};
    }
  });
})();

/* ---------- Constants ---------- */
const BOT_TOKEN = "8737641836:AAGjS94F5YRo_U_kmnibIxaQqw7ZQtqKMRY";
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const CHANNEL_ID = -1004421952340;
const K_SESSION = "MAXSEN_SESSION_FB";
const K_DARK = "MAXSEN_DARK";
const K_DRAFTS = "MAXSEN_DRAFTS";
const K_AUTO_DARK = "MAXSEN_AUTO_DARK";
const K_STATS = "MAXSEN_STATS";
const K_ARCHIVE = "MAXSEN_ARCHIVE";
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ccircle cx='50' cy='40' r='20' fill='%23999'/%3E%3Cpath d='M20 90 Q50 60 80 90' fill='%23999'/%3E%3C/svg%3E";
const ONLINE_THRESHOLD = 90000;
const REACTIONS_LIST = ["❤️","😂","👍","😮","😢","🔥","🎉"];
const POST_CHAR_LIMIT = 100;
const SAVED_CHAT_NAME = "__saved__";

const HEARTBEAT_INTERVAL = 60000;
const UNREAD_CHECK_INTERVAL = 20000;
const POSTS_LIMIT = 50;

/* ============================================================
   🎨 HERO_THEMES — ثيمات الملف الشخصي الجديدة
   ============================================================ */
const HERO_THEMES = [
  /* ═══ أنماط جديدة — فراشات، ورود، بتلات ═══ */
  {
    id:'butterfly',
    name:'فراشة',
    bg:'radial-gradient(circle at 20% 20%, rgba(255,192,220,.6) 0, transparent 40%), radial-gradient(circle at 80% 80%, rgba(192,220,255,.6) 0, transparent 40%), linear-gradient(135deg, #FFB6C1 0%, #C9A6FF 50%, #A7C0FF 100%)',
    shadow:'#C9A6FF',
    pattern:'butterfly'
  },
  {
    id:'rose',
    name:'وردة',
    bg:'radial-gradient(circle at 30% 30%, rgba(255,200,210,.5) 0, transparent 45%), radial-gradient(circle at 70% 70%, rgba(255,150,170,.4) 0, transparent 45%), linear-gradient(135deg, #FF9A9E 0%, #FAD0C4 100%)',
    shadow:'#FF9A9E',
    pattern:'rose'
  },
  {
    id:'petals',
    name:'ورد متساقط',
    bg:'radial-gradient(circle at 50% 0%, rgba(255,225,235,.6) 0, transparent 50%), linear-gradient(180deg, #FFE4E9 0%, #FFC8D6 50%, #FFB0C8 100%)',
    shadow:'#FFB0C8',
    pattern:'petals'
  },
  {
    id:'drops',
    name:'قطرات',
    bg:'radial-gradient(circle at 20% 30%, rgba(200,235,255,.5) 0, transparent 45%), radial-gradient(circle at 80% 70%, rgba(180,220,255,.5) 0, transparent 45%), linear-gradient(135deg, #A8EDEA 0%, #B8D4FF 100%)',
    shadow:'#A8EDEA',
    pattern:'drops'
  },
  {
    id:'leaves',
    name:'أوراق',
    bg:'radial-gradient(circle at 30% 30%, rgba(200,240,210,.4) 0, transparent 45%), radial-gradient(circle at 70% 70%, rgba(190,230,255,.3) 0, transparent 45%), linear-gradient(135deg, #A8E6CF 0%, #DCEDC1 100%)',
    shadow:'#A8E6CF',
    pattern:'leaves'
  },
  {
    id:'sparkle',
    name:'بريق',
    bg:'radial-gradient(circle at 50% 50%, rgba(255,240,200,.6) 0, transparent 50%), linear-gradient(135deg, #FEE140 0%, #FA709A 100%)',
    shadow:'#FA709A',
    pattern:'sparkle'
  },
  {
    id:'aurora',
    name:'شفق',
    bg:'radial-gradient(ellipse at top, rgba(120,200,255,.6) 0, transparent 60%), radial-gradient(ellipse at bottom, rgba(180,120,255,.5) 0, transparent 60%), linear-gradient(180deg, #1E3C72 0%, #2A5298 100%)',
    shadow:'#1E3C72',
    pattern:'aurora'
  },
  {
    id:'sunset2',
    name:'غروب دافئ',
    bg:'radial-gradient(circle at 50% 100%, rgba(255,180,120,.6) 0, transparent 55%), linear-gradient(180deg, #FF9A8B 0%, #FF6B9D 50%, #C86DD7 100%)',
    shadow:'#FF6B9D',
    pattern:'dots'
  },
  {
    id:'ocean2',
    name:'محيط داكن',
    bg:'radial-gradient(circle at 30% 20%, rgba(120,220,255,.4) 0, transparent 50%), radial-gradient(circle at 70% 80%, rgba(100,180,255,.4) 0, transparent 50%), linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)',
    shadow:'#0F2027',
    pattern:'stars'
  },
  {
    id:'lavender2',
    name:'لافندر',
    bg:'radial-gradient(circle at 30% 30%, rgba(230,200,255,.6) 0, transparent 45%), linear-gradient(135deg, #C9A6FF 0%, #A7C0FF 100%)',
    shadow:'#C9A6FF',
    pattern:'hearts'
  },
  {
    id:'peach2',
    name:'خوخ ناعم',
    bg:'radial-gradient(circle at 70% 30%, rgba(255,220,200,.6) 0, transparent 45%), linear-gradient(135deg, #FFB4A2 0%, #FFCDB2 100%)',
    shadow:'#FFB4A2',
    pattern:'dots'
  },
  {
    id:'mint',
    name:'نعناع',
    bg:'radial-gradient(circle at 30% 70%, rgba(200,255,220,.6) 0, transparent 45%), linear-gradient(135deg, #7EE8FA 0%, #80FF72 100%)',
    shadow:'#7EE8FA',
    pattern:'drops'
  }
];

/* ============================================================
   🎨 CHAT_BGS — خلفيات محادثة iPhone Style
   ============================================================ */
const CHAT_BGS = [
  {id:"def", name:"افتراضي", light:"", dark:""},

  {
    id:"ios_blue",
    name:"أزرق آيفون",
    light:"radial-gradient(circle at 20% 30%, #A7C0FF 0%, transparent 60%), radial-gradient(circle at 80% 70%, #E0EAFF 0%, transparent 60%), linear-gradient(180deg, #EEF2FF 0%, #E0EAFF 100%)",
    dark:"radial-gradient(circle at 20% 30%, #1E2A5C 0%, transparent 60%), radial-gradient(circle at 80% 70%, #0F1842 0%, transparent 60%), linear-gradient(180deg, #080B14 0%, #0F1432 100%)"
  },
  {
    id:"ios_purple",
    name:"بنفسجي آيفون",
    light:"radial-gradient(circle at 30% 20%, #D8C7FF 0%, transparent 55%), radial-gradient(circle at 70% 80%, #FFE0F0 0%, transparent 55%), linear-gradient(180deg, #F4EEFF 0%, #FFE5F5 100%)",
    dark:"radial-gradient(circle at 30% 20%, #3B2570 0%, transparent 55%), radial-gradient(circle at 70% 80%, #5B1F45 0%, transparent 55%), linear-gradient(180deg, #080B14 0%, #1A0F2A 100%)"
  },
  {
    id:"ios_pink",
    name:"وردي آيفون",
    light:"radial-gradient(circle at 20% 20%, #FFD6E0 0%, transparent 55%), radial-gradient(circle at 80% 80%, #FFE5EC 0%, transparent 55%), linear-gradient(180deg, #FFF0F4 0%, #FFE0EB 100%)",
    dark:"radial-gradient(circle at 20% 20%, #4A1F35 0%, transparent 55%), radial-gradient(circle at 80% 80%, #2A1A2E 0%, transparent 55%), linear-gradient(180deg, #080B14 0%, #1A0F1E 100%)"
  },
  {
    id:"ios_mint",
    name:"نعناع آيفون",
    light:"radial-gradient(circle at 40% 30%, #C7F0E3 0%, transparent 55%), radial-gradient(circle at 70% 70%, #E0F5EA 0%, transparent 55%), linear-gradient(180deg, #EAFBF5 0%, #D8F5E8 100%)",
    dark:"radial-gradient(circle at 40% 30%, #1A3D35 0%, transparent 55%), radial-gradient(circle at 70% 70%, #0F2820 0%, transparent 55%), linear-gradient(180deg, #080B14 0%, #0A1F1A 100%)"
  },
  {
    id:"ios_peach",
    name:"خوخ آيفون",
    light:"radial-gradient(circle at 30% 40%, #FFD9C7 0%, transparent 55%), radial-gradient(circle at 70% 60%, #FFE8D6 0%, transparent 55%), linear-gradient(180deg, #FFEFE5 0%, #FFDCC8 100%)",
    dark:"radial-gradient(circle at 30% 40%, #4A2E1F 0%, transparent 55%), radial-gradient(circle at 70% 60%, #2E1F15 0%, transparent 55%), linear-gradient(180deg, #080B14 0%, #1A0F0A 100%)"
  },
  {
    id:"ios_midnight",
    name:"ليل آيفون",
    light:"radial-gradient(circle at 50% 0%, #2A4080 0%, transparent 60%), linear-gradient(180deg, #1E3C72 0%, #2A5298 100%)",
    dark:"radial-gradient(circle at 50% 0%, #4A6BC0 0%, transparent 60%), linear-gradient(180deg, #080B14 0%, #0F1432 100%)"
  },
  {
    id:"ios_sunset",
    name:"غروب آيفون",
    light:"radial-gradient(circle at 50% 100%, #FFB47D 0%, transparent 55%), radial-gradient(circle at 30% 30%, #FFD5B8 0%, transparent 50%), linear-gradient(180deg, #FFE0C8 0%, #FF9D7A 100%)",
    dark:"radial-gradient(circle at 50% 100%, #7A3B1A 0%, transparent 55%), radial-gradient(circle at 30% 30%, #3A2018 0%, transparent 50%), linear-gradient(180deg, #1A0F08 0%, #3A180F 100%)"
  },
  {
    id:"ios_mono",
    name:"رمادي آيفون",
    light:"linear-gradient(180deg, #F5F5F7 0%, #E8E8ED 100%)",
    dark:"linear-gradient(180deg, #0E0E12 0%, #1A1A22 100%)"
  },
  {
    id:"ios_ocean",
    name:"محيط آيفون",
    light:"radial-gradient(circle at 40% 30%, #A8E5F0 0%, transparent 55%), linear-gradient(180deg, #E0F5FF 0%, #A8D8F0 100%)",
    dark:"radial-gradient(circle at 40% 30%, #1A3A52 0%, transparent 55%), linear-gradient(180deg, #080B14 0%, #0F2033 100%)"
  },
  {
    id:"ios_gold",
    name:"ذهبي آيفون",
    light:"radial-gradient(circle at 30% 30%, #FFE8A7 0%, transparent 55%), linear-gradient(180deg, #FFF8DC 0%, #F5D98F 100%)",
    dark:"radial-gradient(circle at 30% 30%, #4A3F1A 0%, transparent 55%), linear-gradient(180deg, #080B14 0%, #1A1408 100%)"
  },
  {
    id:"ios_blossom",
    name:"أزهار آيفون",
    light:"radial-gradient(circle at 25% 25%, #FFC9DE 0%, transparent 45%), radial-gradient(circle at 75% 75%, #F8D5E8 0%, transparent 45%), linear-gradient(135deg, #FFE9F2 0%, #FFD0E0 100%)",
    dark:"radial-gradient(circle at 25% 25%, #4A1F35 0%, transparent 45%), radial-gradient(circle at 75% 75%, #3A1A2F 0%, transparent 45%), linear-gradient(135deg, #080B14 0%, #1A0A14 100%)"
  },
  {
    id:"ios_forest",
    name:"غابة آيفون",
    light:"radial-gradient(circle at 40% 30%, #B5E0B0 0%, transparent 55%), linear-gradient(180deg, #E8F5E0 0%, #A8D8A0 100%)",
    dark:"radial-gradient(circle at 40% 30%, #1A3D22 0%, transparent 55%), linear-gradient(180deg, #080B14 0%, #0F2214 100%)"
  }
];

const POST_BGS = [
  {id:"p1",css:"linear-gradient(135deg, #667EEA 0%, #764BA2 100%)"},
  {id:"p2",css:"linear-gradient(135deg, #F093FB 0%, #F5576C 100%)"},
  {id:"p3",css:"linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)"},
  {id:"p4",css:"linear-gradient(135deg, #43E97B 0%, #38F9D7 100%)"},
  {id:"p5",css:"linear-gradient(135deg, #FA709A 0%, #FEE140 100%)"},
  {id:"p6",css:"linear-gradient(135deg, #30CFD0 0%, #330867 100%)"},
  {id:"p7",css:"linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)"},
  {id:"p8",css:"linear-gradient(135deg, #1E3C72 0%, #2A5298 100%)"}
];

/* ---------- Global State ---------- */
let allUsers = {}, allChats = {}, allPosts = {};
let myFriends = {}, myRequests = {}, mySentRequests = {};
let myBlocks = {}, blockedBy = {}, myPrefs = {}, unreadCounts = {};
let currentUser = null, activeChat = null, chatMessages = [];
let activeChatRef = null, activePinRef = null, activeTypingRef = null;
let typingTimer = null, viewingUser = null, isOnline = true;
let selectedMessageIdx = null, reportedTarget = null, activeFriendMenu = null;
let activeCommentsPostId = null, activeCommentsRef = null, selectedCommentId = null;
let replyTo = null, forwardingMsgId = null;
let audioCtx = null, soundEnabled = true;
let newPostBg = POST_BGS[0].css, draftEditMsgBackup = "";
let mediaRecorder = null, audioChunks = [], recordingStartTime = 0, recordingTimer = null;
let isRecording = false, micStarted = false, micPressTimer = null;
let currentAudio = null, currentAudioBtn = null;
let currentPostImageData = null, searchMatches = [], currentMatchIndex = -1;
let heartbeatTimer = null, unTimer = null, searchInProgress = false;
let myDrafts = {};
let myArchive = {};
let scrollBottomVisible = false;
let scrollThrottleFrame = null;

/* ============================================================
   Helpers
   ============================================================ */
function escapeHtml(s){
  return String(s||"").replace(/[&<>"']/g, c => (
    {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]
  ));
}
function chatKey(a,b){return [a,b].sort().join("__")}

function isEditable(el){
  if(!el) return false;
  const t = el.tagName;
  return t==='INPUT' || t==='TEXTAREA' || el.isContentEditable;
}

function formatTime12(ts){
  if(!ts) return "";
  const d = new Date(ts);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2,'0');
  const ampm = h>=12 ? 'م' : 'ص';
  h = h%12 || 12;
  return `${h}:${m} ${ampm}`;
}

function formatAudioTime(sec){
  sec = Math.max(0, Math.round(sec||0));
  const m = Math.floor(sec/60);
  const s = String(sec%60).padStart(2,'0');
  return m+":"+s;
}

function findTheme(id){ return HERO_THEMES.find(t=>t.id===id) || HERO_THEMES[0]; }

/* ============================================================
   🎨 PATTERNS — أنماط الثيمات الجديدة
   ============================================================ */
function getPatternCSS(pattern){
  switch(pattern){
    case 'dots':
      return 'radial-gradient(circle, rgba(255,255,255,.6) 1.5px, transparent 1.5px)';
    case 'grid':
      return 'linear-gradient(rgba(255,255,255,.25) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.25) 1px, transparent 1px)';
    case 'hearts':
      return 'radial-gradient(circle at 25% 25%, rgba(255,255,255,.4) 0, transparent 25%), radial-gradient(circle at 75% 75%, rgba(255,255,255,.3) 0, transparent 25%)';
    case 'waves':
      return 'repeating-linear-gradient(45deg, transparent 0 12px, rgba(255,255,255,.18) 12px 14px)';
    case 'stars':
      return 'radial-gradient(circle, rgba(255,255,255,.7) 1px, transparent 1px)';

    /* 🦋 فراشة */
    case 'butterfly':
      return 'radial-gradient(ellipse 12px 8px at 20% 30%, rgba(255,255,255,.5) 0, transparent 50%), radial-gradient(ellipse 12px 8px at 80% 70%, rgba(255,255,255,.4) 0, transparent 50%), radial-gradient(ellipse 8px 12px at 50% 50%, rgba(255,255,255,.3) 0, transparent 50%)';

    /* 🌹 وردة */
    case 'rose':
      return 'radial-gradient(circle at 50% 50%, rgba(255,255,255,.5) 2px, transparent 8px), radial-gradient(circle at 50% 50%, rgba(255,200,220,.3) 8px, transparent 16px)';

    /* 🌸 ورد متساقط */
    case 'petals':
      return 'radial-gradient(ellipse 10px 14px at 30% 20%, rgba(255,255,255,.55) 0, transparent 60%), radial-gradient(ellipse 8px 12px at 70% 50%, rgba(255,255,255,.4) 0, transparent 60%), radial-gradient(ellipse 12px 10px at 40% 80%, rgba(255,255,255,.45) 0, transparent 60%)';

    /* 💧 قطرات */
    case 'drops':
      return 'radial-gradient(circle 4px at 25% 25%, rgba(255,255,255,.7) 0, transparent 100%), radial-gradient(circle 3px at 75% 60%, rgba(255,255,255,.6) 0, transparent 100%), radial-gradient(circle 5px at 50% 85%, rgba(255,255,255,.5) 0, transparent 100%)';

    /* 🌿 أوراق */
    case 'leaves':
      return 'radial-gradient(ellipse 8px 14px at 25% 30%, rgba(255,255,255,.5) 0, transparent 60%), radial-gradient(ellipse 6px 12px at 70% 60%, rgba(255,255,255,.4) 0, transparent 60%)';

    /* ✨ بريق */
    case 'sparkle':
      return 'radial-gradient(circle 3px at 20% 20%, rgba(255,255,255,.8) 0, transparent 100%), radial-gradient(circle 2px at 40% 60%, rgba(255,255,255,.7) 0, transparent 100%), radial-gradient(circle 3px at 80% 30%, rgba(255,255,255,.75) 0, transparent 100%), radial-gradient(circle 2px at 60% 85%, rgba(255,255,255,.6) 0, transparent 100%)';

    /* 🌌 شفق */
    case 'aurora':
      return 'repeating-linear-gradient(90deg, transparent 0 30px, rgba(255,255,255,.06) 30px 60px), repeating-linear-gradient(0deg, transparent 0 30px, rgba(255,255,255,.04) 30px 60px)';

    default:
      return '';
  }
}

function getPatternSize(pattern){
  switch(pattern){
    case 'dots':      return '22px 22px';
    case 'grid':      return '28px 28px';
    case 'hearts':    return '36px 36px';
    case 'waves':     return 'auto';
    case 'stars':     return '30px 30px';
    case 'butterfly': return '60px 60px';
    case 'rose':      return '40px 40px';
    case 'petals':    return '80px 80px';
    case 'drops':     return '50px 50px';
    case 'leaves':    return '60px 60px';
    case 'sparkle':   return '70px 70px';
    case 'aurora':    return 'auto';
    default: return 'auto';
  }
}

function applyHero(el, themeId){
  if(!el) return;
  const t = findTheme(themeId);
  el.style.setProperty("--theme", t.bg);
  el.style.setProperty("--theme-shadow", t.shadow);
  el.style.background = t.bg;
  el.dataset.theme = t.id;

  let patternEl = el.querySelector(".hero-pattern");
  if(!patternEl){
    patternEl = document.createElement("div");
    patternEl.className = "hero-pattern";
    el.insertBefore(patternEl, el.firstChild);
  }
  patternEl.style.backgroundImage = getPatternCSS(t.pattern) || "none";
  patternEl.style.backgroundSize = getPatternSize(t.pattern);
  patternEl.style.backgroundRepeat = "repeat";
}

function isDarkMode(){ return document.getElementById("app").classList.contains("dark"); }
function getAvatarSrc(u){ return (u && u.avatarUrl) || DEFAULT_AVATAR; }

function isUserOnline(user){
  return user && user.lastSeen && (Date.now()-user.lastSeen) < ONLINE_THRESHOLD;
}

function formatPresence(user){
  if(!user) return "";
  if(!user.lastSeen) return "غير معروف";
  const diff = Date.now() - user.lastSeen;
  if(diff < ONLINE_THRESHOLD) return "متصل الآن";
  return "آخر ظهور " + formatTime12(user.lastSeen);
}

function isBlockedWith(username){ return !!(myBlocks[username] || blockedBy[username]); }
function isBlockedByThem(username){ return !!blockedBy[username]; }
function getPref(un){ return myPrefs[un] || {}; }

function getLastMsgInfo(key){
  const c = allChats[key];
  if(!c || !c.messages) return null;
  let latest = null;
  for(const mid in c.messages){
    const m = c.messages[mid];
    if(!latest || (m.ts||0) > (latest.ts||0)) latest = m;
  }
  return latest;
}

/* ---------- Text Formatter ---------- */
function renderFormattedText(text){
  if(!text) return '';
  return escapeHtml(text).replace(/\n/g, '<br>');
}

function isEmojiOnly(text){
  if(!text) return false;
  const t = String(text).trim();
  if(!t || t.length > 20) return false;
  try{
    const stripped = t.replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier_Base}\p{Emoji_Modifier}\uFE0F\u200D\u20E3\s]/gu, '');
    return stripped.length === 0;
  }catch(e){ return false; }
}

/* ---------- Drafts ---------- */
function loadDrafts(){
  try{ const s = localStorage.getItem(K_DRAFTS); myDrafts = s ? JSON.parse(s) : {}; }
  catch(e){ myDrafts = {}; }
}
function saveDrafts(){ try{ localStorage.setItem(K_DRAFTS, JSON.stringify(myDrafts)); }catch(e){} }
function setDraft(u, t){ if(!u) return; if(t && t.trim()) myDrafts[u] = t; else delete myDrafts[u]; saveDrafts(); }
function getDraft(u){ return myDrafts[u] || ""; }
function clearDraft(u){ if(myDrafts[u]){ delete myDrafts[u]; saveDrafts(); } }
function hasDraft(u){ return !!myDrafts[u]; }

/* ---------- Archive ---------- */
function loadArchive(){
  try{ const s = localStorage.getItem(K_ARCHIVE); myArchive = s ? JSON.parse(s) : {}; }
  catch(e){ myArchive = {}; }
}
function saveArchive(){ try{ localStorage.setItem(K_ARCHIVE, JSON.stringify(myArchive)); }catch(e){} }
function isArchived(u){ return !!myArchive[u]; }

function toggleArchiveFriend(username){
  if(!username) return;
  if(myArchive[username]){ delete myArchive[username]; showToast("تم إلغاء الأرشفة"); }
  else { myArchive[username] = true; showToast("تمت الأرشفة 📦"); }
  saveArchive();
  if(typeof closeFriendMenu === "function") closeFriendMenu();
  if(typeof renderChats === "function") renderChats();
}

/* ---------- Stats ---------- */
function loadStats(){
  try{ const s = localStorage.getItem(K_STATS); return s ? JSON.parse(s) : { messagesSent:0, lastReset:Date.now() }; }
  catch(e){ return { messagesSent:0, lastReset:Date.now() }; }
}
function saveStats(stats){ try{ localStorage.setItem(K_STATS, JSON.stringify(stats)); }catch(e){} }
function incMessagesSent(){
  const stats = loadStats();
  stats.messagesSent = (stats.messagesSent || 0) + 1;
  saveStats(stats);
}
function getStats(){
  const stats = loadStats();
  const days = Math.max(1, Math.floor((Date.now() - stats.lastReset) / (1000*60*60*24)));
  return { messagesSent: stats.messagesSent || 0, daysActive: days };
}

/* ---------- Auto Dark ---------- */
function checkAutoDark(){
  const auto = localStorage.getItem(K_AUTO_DARK) === "1";
  const autoSw = document.getElementById("auto-dark-switch");
  if(autoSw){
    if(auto) autoSw.classList.add("on");
    else autoSw.classList.remove("on");
  }
  if(!auto) return;
  const hour = new Date().getHours();
  const isNight = hour >= 19 || hour < 6;
  const app = document.getElementById("app");
  const currentDark = app.classList.contains("dark");
  if(isNight && !currentDark){ app.classList.add("dark"); updateDarkSwitch(); }
  else if(!isNight && currentDark && localStorage.getItem(K_DARK) !== "1"){
    app.classList.remove("dark"); updateDarkSwitch();
  }
}
function toggleAutoDark(){
  const auto = localStorage.getItem(K_AUTO_DARK) === "1";
  localStorage.setItem(K_AUTO_DARK, auto ? "0" : "1");
  showToast(auto ? "الوضع التلقائي متوقف" : "الوضع التلقائي مفعّل (19:00 - 06:00)");
  checkAutoDark();
}

/* ---------- Session ---------- */
function saveSession(){
  if(currentUser) localStorage.setItem(K_SESSION, JSON.stringify(currentUser));
  else localStorage.removeItem(K_SESSION);
}
function loadSession(){
  try{ const s = localStorage.getItem(K_SESSION); if(s) currentUser = JSON.parse(s); }catch(e){}
}

/* ---------- Firebase Helpers ---------- */
async function fbSet(p,d){try{await rdb.ref(p).set(d);return true}catch(e){return false}}
async function fbUpdate(p,d){try{await rdb.ref(p).update(d);return true}catch(e){return false}}
async function fbPush(p,d){try{const r=rdb.ref(p).push();await r.set(d);return r.key}catch(e){return null}}
async function fbRemove(p){try{await rdb.ref(p).remove();return true}catch(e){return false}}
async function fbGet(p){try{const s=await rdb.ref(p).once('value');return s.val()}catch(e){return null}}

/* ---------- Image Resize ---------- */
function resizeImageToDataURL(file, maxDim, quality){
  return new Promise((resolve,reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.width, h = img.height;
      if(w > h){ if(w > maxDim){ h = Math.round(h*maxDim/w); w = maxDim; } }
      else { if(h > maxDim){ w = Math.round(w*maxDim/h); h = maxDim; } }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/* ---------- Dark Mode ---------- */
function loadDarkMode(){
  const dark = localStorage.getItem(K_DARK) === "1";
  if(dark) document.getElementById("app").classList.add("dark");
  updateDarkSwitch();
  checkAutoDark();
}
function toggleDark(){
  const app = document.getElementById("app");
  const isDark = app.classList.toggle("dark");
  localStorage.setItem(K_DARK, isDark ? "1" : "0");
  updateDarkSwitch();
  if(activeChat && typeof applyChatBg === "function") applyChatBg(activeChat);
  showToast(isDark ? "الوضع الداكن ✓" : "الوضع الفاتح ✓");
}
function updateDarkSwitch(){
  const sw = document.getElementById("dark-switch");
  if(!sw) return;
  if(isDarkMode()) sw.classList.add("on");
  else sw.classList.remove("on");
}

/* ============================================================
   Navigation + History
   ============================================================ */
const SCREEN_MAIN = "s-main";
const SCREEN_LOGIN = "s-login";

function nav(id, pushHistory){
  if(pushHistory === undefined) pushHistory = true;
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const screen = document.getElementById(id);
  if(!screen) return;
  screen.classList.add("active");
  if(pushHistory && id !== SCREEN_LOGIN){
    try{ window.history.pushState({ screen: id }, "", ""); }catch(e){}
  }
}

window.addEventListener("popstate", function(e){
  const state = e.state;
  const activeModal = document.querySelector(".modal.active");
  if(activeModal){ activeModal.classList.remove("active"); return; }
  const picker = document.querySelector(".photo-picker.active");
  if(picker){ picker.classList.remove("active"); return; }
  const viewer = document.querySelector(".img-viewer.active");
  if(viewer){ viewer.classList.remove("active"); return; }
  const pe = document.querySelector(".pe.active");
  if(pe){ pe.classList.remove("active"); return; }

  const currentActive = document.querySelector(".screen.active");
  if(!state || !state.screen){
    if(currentActive && currentActive.id !== SCREEN_MAIN && currentActive.id !== SCREEN_LOGIN){
      document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
      const main = document.getElementById(SCREEN_MAIN);
      if(main) main.classList.add("active");
    }
    return;
  }
  if(state.screen === "s-chat" && currentActive && currentActive.id === "s-chat"){
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const main = document.getElementById(SCREEN_MAIN);
    if(main) main.classList.add("active");
    return;
  }
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const target = document.getElementById(state.screen);
  if(target) target.classList.add("active");
});

window.handleBackButton = function(){
  const modal = document.querySelector(".modal.active");
  if(modal){ modal.classList.remove("active"); return "handled"; }
  const picker = document.querySelector(".photo-picker.active");
  if(picker){ picker.classList.remove("active"); return "handled"; }
  const viewer = document.querySelector(".img-viewer.active");
  if(viewer){ viewer.classList.remove("active"); return "handled"; }
  const pe = document.querySelector(".pe.active");
  if(pe){ pe.classList.remove("active"); return "handled"; }

  const active = document.querySelector(".screen.active");
  if(!active) return "exit";
  const mainScreens = ["s-main", "s-login"];
  if(mainScreens.indexOf(active.id) !== -1) return "exit";
  if(active.id === "s-signup"){ nav("s-login", false); return "handled"; }
  window.history.back();
  return "handled";
};

function tab(name){
  document.querySelectorAll(".tab").forEach(t =>
    t.classList.toggle("active", t.dataset.tab === name));
  const sheets = {friends:"tab-friends", profile:"tab-profile"};
  for(const k in sheets){
    const el = document.getElementById(sheets[k]);
    if(!el) continue;
    if(k === name){ el.classList.add("open"); el.style.transform = ""; }
    else el.classList.remove("open");
  }
  if(name === "chats" && typeof renderChats === "function") renderChats();
  else if(name === "friends" && typeof fetchFriends === "function") fetchFriends();
  else if(name === "profile"){
    if(typeof renderProfile === "function") renderProfile();
    if(typeof renderMyPosts === "function") renderMyPosts();
    updateProfileStats();
  }
}

/* ---------- Sheet Draggable ---------- */
function setupSheetDraggable(id){
  const sheet = document.getElementById(id);
  if(!sheet) return;
  const grip = sheet.querySelector(".sheet-grip");
  if(!grip) return;
  let startY = 0, currentY = 0, dragging = false, moved = false;

  function start(y){ startY = y; currentY = 0; dragging = true; moved = false; sheet.style.transition = "none"; }
  function move(y){
    if(!dragging) return;
    const dy = y - startY;
    if(dy < 0) return;
    if(!moved && dy > 6) moved = true;
    if(!moved) return;
    currentY = dy;
    sheet.style.transform = "translateY(" + dy + "px)";
  }
  function end(){
    if(!dragging) return;
    dragging = false;
    sheet.style.transition = "";
    if(moved && currentY > 90){
      sheet.style.transform = "translateY(100%)";
      setTimeout(function(){ sheet.classList.remove("open"); sheet.style.transform=""; tab('chats'); }, 380);
    } else sheet.style.transform = "";
    moved = false; currentY = 0;
  }

  grip.addEventListener("touchstart", function(e){ start(e.touches[0].clientY); }, {passive:true});
  grip.addEventListener("touchmove", function(e){ if(dragging) e.preventDefault(); move(e.touches[0].clientY); }, {passive:false});
  grip.addEventListener("touchend", end);
  grip.addEventListener("touchcancel", end);
  grip.addEventListener("mousedown", function(e){ start(e.clientY); });
  document.addEventListener("mousemove", function(e){ if(dragging) move(e.clientY); });
  document.addEventListener("mouseup", function(){ if(dragging) end(); });
}

/* ---------- Toast / Copy ---------- */
function showToast(txt, isErr, ms){
  const t = document.getElementById("toast");
  const tt = document.getElementById("toast-text");
  if(tt) tt.textContent = txt;
  if(!t) return;
  t.className = "toast show" + (isErr ? " err" : "");
  clearTimeout(t._timer);
  t._timer = setTimeout(function(){ t.classList.remove("show"); }, ms || 2400);
}

function copyText(t){
  if(!t){ showToast("لا يوجد نص", true); return; }
  if(navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(t)
      .then(function(){ showToast("تم النسخ"); })
      .catch(function(){ fallbackCopy(t); });
  } else fallbackCopy(t);
}
function fallbackCopy(t){
  try{
    const ta = document.createElement('textarea');
    ta.value = t;
    ta.style.position='fixed'; ta.style.opacity='0';
    ta.setAttribute('readonly','');
    document.body.appendChild(ta);
    ta.select(); ta.setSelectionRange(0,999999);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if(ok) showToast("تم النسخ");
    else showToast("فشل النسخ", true);
  }catch(e){ showToast("فشل النسخ", true); }
}
function copyId(){
  const el = document.getElementById("my-id");
  if(el) copyText(el.textContent);
}

/* ---------- Badges ---------- */
function updateBadges(){
  if(!currentUser) return;
  const count = Object.keys(myRequests).length;
  const badge = document.getElementById("tab-badge");
  if(badge){
    if(count > 0){ badge.textContent = count; badge.style.display = "block"; }
    else badge.style.display = "none";
  }
}
function updateChatsBadge(){
  const badge = document.getElementById("tab-chats-badge");
  if(!badge) return;
  const total = totalUnread();
  if(total > 0){ badge.textContent = total > 99 ? '99+' : total; badge.style.display = "block"; }
  else badge.style.display = "none";
}
function updateLiveStatus(){
  const cs = document.getElementById("conn-status");
  if(cs) cs.textContent = isOnline ? "متصل مباشر ✓" : "جاري الاتصال...";
}

function refreshCurrentView(){
  const active = document.querySelector(".screen.active");
  if(!active) return;
  if(active.id === "s-main"){
    const at = document.querySelector(".tab.active");
    const name = at ? at.dataset.tab : "chats";
    if(name === "chats" && typeof renderChats === "function") renderChats();
    else if(name === "friends" && typeof fetchFriends === "function") fetchFriends();
    else if(name === "profile"){
      if(typeof renderProfile === "function") renderProfile();
      if(typeof renderMyPosts === "function") renderMyPosts();
      updateProfileStats();
    }
  } else if(active.id === "s-user" && viewingUser){
    if(allUsers[viewingUser.username] && typeof openUserProfile === "function"){
      openUserProfile(viewingUser.username, false);
    }
  }
}

function updateProfileStats(){
  if(!currentUser) return;
  const sp = document.getElementById("stat-posts");
  const sf = document.getElementById("stat-friends");
  const sa = document.getElementById("stat-age");
  if(sp && typeof getUserPosts === "function"){
    sp.textContent = getUserPosts(currentUser.username).length;
  }
  if(sf) sf.textContent = Object.keys(myFriends).filter(function(un){ return allUsers[un]; }).length;
  if(sa) sa.textContent = currentUser.age || "—";

  const sMsgs = document.getElementById("stat-msgs");
  const sDays = document.getElementById("stat-days");
  if(sMsgs || sDays){
    const stats = getStats();
    if(sMsgs) sMsgs.textContent = stats.messagesSent;
    if(sDays) sDays.textContent = stats.daysActive;
  }
}

/* ---------- Scroll Bottom ---------- */
function updateScrollBottomBtn(){
  if(scrollThrottleFrame) return;
  scrollThrottleFrame = requestAnimationFrame(function(){
    scrollThrottleFrame = null;
    const content = document.getElementById("chat-content");
    const btn = document.getElementById("scroll-bottom-btn");
    if(!content || !btn) return;

    const distanceFromBottom = content.scrollHeight - content.scrollTop - content.clientHeight;

    if(distanceFromBottom > 200){
      if(!scrollBottomVisible){
        btn.classList.add("show");
        scrollBottomVisible = true;
      }
      const badge = document.getElementById("scroll-bottom-badge");
      if(badge){
        const unread = activeChat ? (unreadCounts[activeChat] || 0) : 0;
        if(unread > 0){
          badge.textContent = unread > 99 ? '99+' : unread;
          badge.style.display = "flex";
        } else badge.style.display = "none";
      }
    } else {
      if(scrollBottomVisible){
        btn.classList.remove("show");
        scrollBottomVisible = false;
      }
    }
  });
}

function scrollToBottom(){
  const content = document.getElementById("chat-content");
  if(!content) return;
  content.scrollTo({top: content.scrollHeight, behavior: "smooth"});
  scrollBottomVisible = false;
  const btn = document.getElementById("scroll-bottom-btn");
  if(btn) btn.classList.remove("show");
}

/* ============================================================
   Saved Messages
   ============================================================ */
function openSavedMessages(){
  if(!currentUser) return;

  if(activeChat && activeChat !== SAVED_CHAT_NAME){
    const taOld = document.getElementById("msg-in");
    if(taOld && taOld.value.trim()) setDraft(activeChat, taOld.value);
  }

  activeChat = SAVED_CHAT_NAME;
  const ava = document.getElementById("ch-ava");
  const name = document.getElementById("ch-name");
  const status = document.getElementById("ch-status");
  if(ava) ava.src = getAvatarSrc(currentUser);
  if(name) name.textContent = "الرسائل المحفوظة";
  if(status){
    status.textContent = "🔒 خاصة بك";
    status.style.color = "var(--primary)";
    status.style.fontStyle = "normal";
  }

  nav("s-chat");
  if(typeof closeChatSearch === "function") closeChatSearch();
  if(typeof cancelReply === "function") cancelReply();
  if(typeof applyChatBg === "function") applyChatBg(SAVED_CHAT_NAME);

  if(activeChatRef) activeChatRef.off();
  if(activePinRef) activePinRef.off();
  if(activeTypingRef) activeTypingRef.off();
  const msgs = document.getElementById("msgs");
  if(msgs) msgs.innerHTML = "";

  activeChatRef = rdb.ref('savedMessages/'+currentUser.username);
  activeChatRef.on('value', snap => {
    const val = snap.val() || {};
    chatMessages = Object.keys(val).map(k => ({...val[k], _id:k})).sort((a,b) => a.ts - b.ts);
    if(typeof renderMsgs === "function") renderMsgs();
    const msgsEl = document.getElementById("msgs");
    const content = document.getElementById("chat-content");
    if(msgsEl && content) content.scrollTop = content.scrollHeight;
  });

  const ta = document.getElementById("msg-in");
  if(ta){
    const draft = getDraft(SAVED_CHAT_NAME);
    ta.value = draft || "";
    ta.style.height = 'auto';
    setTimeout(() => {
      ta.style.height = Math.min(ta.scrollHeight, 130) + 'px';
      if(typeof updateSendBtnVisibility === "function") updateSendBtnVisibility();
      setTimeout(scrollToBottom, 100);
    }, 50);
  }
}

async function sendSavedMessage(text, photo){
  if(!currentUser) return;
  const myUsername = currentUser.username;
  const newMsg = {
    from: myUsername,
    text: text || "",
    photo: photo || null,
    ts: Date.now(),
    seenBy: {},
    reactions: {}
  };
  await fbPush('savedMessages/'+myUsername, newMsg);
}

/* ============================================================
   Firebase Listeners
   ============================================================ */
function startFirebaseListeners(){
  rdb.ref('users').on('value', function(snap){
    allUsers = snap.val() || {};
    isOnline = true;
    updateLiveStatus();
    refreshCurrentView();
    updateBadges();
    if(currentUser){
      const me = allUsers[currentUser.username];
      if(!me){
        showToast("تم حذف حسابك", true, 3000);
        setTimeout(function(){ doLogout(); }, 2000);
      } else if(me.disabled){
        showToast("🚫 تم تعطيل حسابك", true, 3000);
        setTimeout(function(){ doLogout(); }, 2000);
      } else {
        currentUser = Object.assign({}, currentUser, me);
        saveSession();
      }
    }
  }, function(err){ isOnline = false; updateLiveStatus(); });

  rdb.ref('chats').on('value', function(snap){
    allChats = snap.val() || {};
    if(typeof computeUnread === "function") computeUnread();
    const mainScreen = document.querySelector(".screen.active");
    if(mainScreen && mainScreen.id === "s-main"){
      const at = document.querySelector(".tab.active");
      if(at && at.dataset.tab === "chats" && typeof renderChats === "function") renderChats();
    }
    updateChatsBadge();
  });

  rdb.ref('posts').limitToLast(POSTS_LIMIT).on('value', function(snap){
    allPosts = snap.val() || {};
    const mainScreen = document.getElementById("s-main");
    if(mainScreen && mainScreen.classList.contains("active") &&
       document.querySelector(".tab.active[data-tab='profile']")){
      if(typeof renderMyPosts === "function") renderMyPosts();
      updateProfileStats();
    }
    const userScreen = document.getElementById("s-user");
    if(userScreen && userScreen.classList.contains("active") && viewingUser){
      if(typeof renderUserPosts === "function") renderUserPosts(viewingUser.username);
    }
  });

  if(unTimer) clearInterval(unTimer);
  unTimer = setInterval(function(){
    if(currentUser && !document.hidden){
      if(typeof computeUnread === "function") computeUnread();
      const mainScreen = document.querySelector(".screen.active");
      if(mainScreen && mainScreen.id === "s-main"){
        const at = document.querySelector(".tab.active");
        if(at && at.dataset.tab === "chats" && typeof renderChats === "function") renderChats();
      }
      updateChatsBadge();
    }
  }, UNREAD_CHECK_INTERVAL);
}

function attachMyListeners(){
  if(!currentUser) return;
  rdb.ref('friends/'+currentUser.username).on('value', function(snap){
    myFriends = snap.val() || {};
    refreshCurrentView(); updateBadges(); updateProfileStats();
  });
  rdb.ref('requests').on('value', function(snap){
    const all = snap.val() || {};
    myRequests = {}; mySentRequests = {};
    for(const k in all){
      const r = all[k];
      if(!r) continue;
      if(r.to === currentUser.username && r.status === "pending") myRequests[r.from] = r;
      if(r.from === currentUser.username && r.status === "pending") mySentRequests[r.to] = r;
    }
    refreshCurrentView(); updateBadges();
  });
  rdb.ref('blocks/'+currentUser.username).on('value', function(snap){
    myBlocks = snap.val() || {};
    refreshCurrentView();
  });
  rdb.ref('blockedBy/'+currentUser.username).on('value', function(snap){
    blockedBy = snap.val() || {};
    if(activeChat && typeof updateChatBlockUI === "function") updateChatBlockUI();
  });
  rdb.ref('prefs/'+currentUser.username).on('value', function(snap){
    myPrefs = snap.val() || {};
    if(typeof renderChats === "function") renderChats();
    if(activeChat && typeof applyChatBg === "function") applyChatBg(activeChat);
  });
}

function detachMyListeners(){
  if(currentUser){
    rdb.ref('friends/'+currentUser.username).off();
    rdb.ref('blocks/'+currentUser.username).off();
    rdb.ref('blockedBy/'+currentUser.username).off();
    rdb.ref('prefs/'+currentUser.username).off();
  }
  rdb.ref('requests').off();
}

/* ---------- Heartbeat ---------- */
function startHeartbeat(){
  if(heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(function(){
    if(currentUser && !document.hidden) fbUpdate('users/'+currentUser.username, {lastSeen:Date.now()});
  }, HEARTBEAT_INTERVAL);
  if(currentUser) fbUpdate('users/'+currentUser.username, {lastSeen:Date.now()});
}
function stopHeartbeat(){
  if(heartbeatTimer){ clearInterval(heartbeatTimer); heartbeatTimer = null; }
}

/* ============================================================
   Hero Themes Swatches
   ============================================================ */
function buildHeroThemeSwatches(){
  const wrap = document.getElementById("my-hero-themes");
  if(!wrap) return;
  wrap.innerHTML = HERO_THEMES.map(function(t){
    const patternCSS = getPatternCSS(t.pattern);
    const patternSize = getPatternSize(t.pattern);
    const patternOverlay = patternCSS
      ? '<div style="position:absolute;inset:0;background-image:'+patternCSS+';background-size:'+patternSize+';background-repeat:repeat;opacity:.4;border-radius:inherit;"></div>'
      : '';
    return '<div class="hero-theme" style="background:'+t.bg+'" data-theme="'+t.id+'" title="'+t.name+'" onclick="setTheme(\''+t.id+'\',this)">'+patternOverlay+'</div>';
  }).join("");
}

/* ============================================================
   😀 Emoji Panel — جديد
   ============================================================ */
function buildEmojiPanel(){
  const panel = document.getElementById("emoji-panel");
  if(!panel) return;
  const EMOJI_LIST = "😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 🤯 🤠 🥳 😎 🤓 🧐 😕 😟 🙁 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 💩 🤡 👹 👺 👻 👽 👾 🤖 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ✨ ⭐ 🌟 💫 ⚡ 🔥 💥 💯 ✅ ❌ ⭕ 🚫 ⚠️ 👋 🤚 ✋ 🖐️ 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 👈 👉 👆 👇 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🙏 💪 🦾 🧠 👀 🫀 💋 👄 🎉 🎊 🎈 🎁 🏆 🥇 🥈 🥉 ⚽ 🏀 🎯 🎮 📱 💻 ⌚ 🎧 🎵 🎶 📷 📸 🍕 🍔 🍟 🌭 🍿 🍩 🍪 🎂 🍰 🍫 🍬 🍭 ☕ 🍵 🍺 🍻 🥂 🌹 🌷 🌸 💐 🌺 🌻 🌼 🍀 🌿 🌱 🌳 🌴 🌵 🌊 🌈 ☀️ 🌙 ⭐ ☁️ ⛅ 🌧️ ⛈️ ❄️ ☃️ 🌡️ 💧".split(/\s+/).filter(Boolean);
  panel.innerHTML = EMOJI_LIST.map(function(e){
    return '<button class="em" type="button" onclick="insertEmoji(\''+e+'\')">'+e+'</button>';
  }).join("");
}

function toggleEmojiPanel(){
  const panel = document.getElementById("emoji-panel");
  if(!panel) return;
  panel.classList.toggle("show");
}

function insertEmoji(em){
  const ta = document.getElementById("msg-in");
  if(!ta) return;
  const s = ta.selectionStart || ta.value.length;
  const e = ta.selectionEnd || ta.value.length;
  const before = ta.value.substring(0, s);
  const after = ta.value.substring(e);
  ta.value = before + em + after;
  ta.selectionStart = ta.selectionEnd = s + em.length;
  ta.focus();
  if(typeof updateSendBtnVisibility === "function") updateSendBtnVisibility();
  if(typeof notifyTyping === "function") notifyTyping();
}

/* ---------- Post BG row ---------- */
function buildPostBgRow(){
  const row = document.getElementById("post-bg-row");
  if(!row) return;
  row.innerHTML = POST_BGS.map(function(bg, i){
    return '<div class="post-bg-opt '+(i===0?'active':'')+'" style="background:'+bg.css+'" data-bg="'+bg.css+'" onclick="selectPostBg(\''+bg.css.replace(/'/g,"\\'")+'\',this)"></div>';
  }).join("");
}

/* ============================================================
   Global Message Listener
   ============================================================ */
const notifiedGlobal = new Set();

function startGlobalMessageListener(){
  if(!currentUser) return;
  const friends = Object.keys(myFriends);
  if(friends.length === 0) return;

  friends.slice(0, 5).forEach(function(friend){
    const key = chatKey(currentUser.username, friend);
    rdb.ref('chats/'+key+'/messages').limitToLast(1).on('value', function(snap){
      const val = snap.val() || {};
      Object.keys(val).forEach(function(mid){
        const m = val[mid];
        if(m.from === currentUser.username) return;
        if(notifiedGlobal.has(mid)) return;
        notifiedGlobal.add(mid);
        const age = Date.now() - (m.ts || 0);
        if(age < 20000 && typeof notifyNewMessage === "function"){
          notifyNewMessage(Object.assign({}, m, {_id:mid}), m.from, false);
        }
      });
    });
  });
}

/* ============================================================
   DOMContentLoaded
   ============================================================ */
window.addEventListener("DOMContentLoaded", function(){
  loadSession();
  loadDarkMode();
  loadDrafts();
  loadArchive();
  startFirebaseListeners();
  setupSheetDraggable('tab-friends');
  setupSheetDraggable('tab-profile');
  buildPostBgRow();
  buildHeroThemeSwatches();

  if(typeof setupMicButton === "function") setupMicButton();
  if(typeof buildEmojiPanel === "function") buildEmojiPanel();

  const chatContent = document.getElementById("chat-content");
  if(chatContent){
    chatContent.addEventListener("scroll", updateScrollBottomBtn, {passive:true});
  }

  if(currentUser){
    const splash = document.getElementById("splash");
    if(splash) splash.classList.add("hide");
    nav("s-main", false);
    tab("chats");
    attachMyListeners();
    startHeartbeat();
    setTimeout(function(){ startGlobalMessageListener(); }, 5000);
  } else {
    const splash = document.getElementById("splash");
    if(splash) splash.classList.add("hide");
    nav("s-login", false);
  }
  if(typeof setupMessageInput === "function") setupMessageInput();
  updateLiveStatus();
});

/* ---------- Global Events ---------- */
document.addEventListener('click', function(e){
  if(!e.target || typeof e.target.closest !== 'function') return;
  const t = e.target.closest('.btn, .btn-sm, .btn-2, .tab, .card, .act, .settings-item, .post-action, .nav-btn, .icon-btn, .emoji-btn, .send-btn, .search-btn, .reaction-pill, .reactions-picker .em, .audio-play-btn, .scroll-bottom-btn, .msg-quick-action');
  if(t && typeof playTap === "function") playTap();
}, true);

document.addEventListener('contextmenu', function(e){
  if(!e.target || typeof e.target.closest !== 'function') return;
  if(!isEditable(e.target)) e.preventDefault();
}, false);

document.addEventListener('selectstart', function(e){
  if(!e.target || typeof e.target.closest !== 'function') return;
  if(!isEditable(e.target) && !e.target.closest('.post-square,.post-create-preview,.post-box-hint')){
    e.preventDefault(); return false;
  }
}, false);

document.addEventListener('copy', function(e){
  if(!e.target || typeof e.target.closest !== 'function') return;
  if(!isEditable(e.target)) e.preventDefault();
}, false);

document.addEventListener("visibilitychange", function(){
  if(!document.hidden && currentUser){
    if(typeof computeUnread === "function") computeUnread();
    const mainScreen = document.querySelector(".screen.active");
    if(mainScreen && mainScreen.id === "s-main"){
      const at = document.querySelector(".tab.active");
      if(at && at.dataset.tab === "chats" && typeof renderChats === "function") renderChats();
    }
    updateChatsBadge();
    checkAutoDark();
  }
});

rdb.ref('users').on('value', function(snap){
  const users = snap.val() || {};
  if(currentUser && users[currentUser.username] && users[currentUser.username].disabled){
    showToast("🚫 تم تعطيل حسابك", true, 3000);
    setTimeout(function(){ doLogout(); }, 2000);
  }
});

const peSizeEl = document.getElementById('pe-size');
if(peSizeEl){
  peSizeEl.addEventListener('input', function(e){
    if(typeof peState !== 'undefined') peState.size = parseInt(e.target.value);
    const sv = document.getElementById('pe-size-val');
    if(sv) sv.textContent = e.target.value;
  });
}