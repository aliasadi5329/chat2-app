// ============================================
// تنظیمات Firebase - این قسمت را با اطلاعات پروژه خودتان عوض کنید
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyBWkd5Zi_1Pb9zThRGun69VcOwYaNyDckw",
  authDomain: "sample-firebase-ai-app-f211a.firebaseapp.com",
  databaseURL: "https://sample-firebase-ai-app-f211a-default-rtdb.firebaseio.com",
  projectId: "sample-firebase-ai-app-f211a",
  storageBucket: "sample-firebase-ai-app-f211a.firebasestorage.app",
  messagingSenderId: "689511797055",
  appId: "1:689511797055:web:5269152f011d284962438a"
};

// مقداردهی اولیه Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const messagesRef = db.ref('messages');

// عناصر DOM
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const loginForm = document.getElementById('login-form');
const firstNameInput = document.getElementById('first-name');
const lastNameInput = document.getElementById('last-name');
const messagesContainer = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const logoutBtn = document.getElementById('logout-btn');

let currentUser = null;
let messagesListener = null;

// بررسی ورود قبلی
const savedUser = localStorage.getItem('chatUser');
if (savedUser) {
  currentUser = JSON.parse(savedUser);
  showChat();
}

// فرم ورود
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();

  if (!firstName || !lastName) return;

  currentUser = {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
  };

  localStorage.setItem('chatUser', JSON.stringify(currentUser));
  showChat();
});

// خروج
logoutBtn.addEventListener('click', () => {
  if (confirm('آیا می‌خواهید خارج شوید؟')) {
    localStorage.removeItem('chatUser');
    currentUser = null;
    if (messagesListener) {
      messagesRef.off('child_added', messagesListener);
      messagesListener = null;
    }
    messagesContainer.innerHTML = '';
    chatScreen.classList.remove('active');
    loginScreen.classList.add('active');
    firstNameInput.value = '';
    lastNameInput.value = '';
  }
});

// نمایش صفحه چت
function showChat() {
  loginScreen.classList.remove('active');
  chatScreen.classList.add('active');
  loadMessages();
  messageInput.focus();
}

// بارگذاری پیام‌ها
function loadMessages() {
  messagesContainer.innerHTML = '<div class="loading">در حال بارگذاری پیام‌ها...</div>';

  // فقط ۱۰۰ پیام آخر
  messagesRef.limitToLast(100).once('value', (snapshot) => {
    messagesContainer.innerHTML = '';
    if (!snapshot.exists()) {
      messagesContainer.innerHTML = `
        <div class="empty-state">
          <span>💬</span>
          <p>هنوز پیامی نیست<br>اولین پیام را بفرستید!</p>
        </div>
      `;
    } else {
      snapshot.forEach((child) => {
        appendMessage(child.val(), child.key);
      });
      scrollToBottom();
    }

    // گوش دادن به پیام‌های جدید
    if (messagesListener) {
      messagesRef.off('child_added', messagesListener);
    }
    messagesListener = messagesRef.limitToLast(100).on('child_added', (snapshot) => {
      // اگر پیام قبلاً نمایش داده شده، رد کن
      if (document.querySelector(`[data-id="${snapshot.key}"]`)) return;
      
      // حذف empty state اگر وجود دارد
      const empty = messagesContainer.querySelector('.empty-state');
      if (empty) empty.remove();
      const loading = messagesContainer.querySelector('.loading');
      if (loading) loading.remove();

      appendMessage(snapshot.val(), snapshot.key);
      scrollToBottom();
    });
  });
}

// اضافه کردن پیام به UI
function appendMessage(msg, id) {
  const isMe = msg.userId === currentUser.id;
  const time = formatTime(msg.timestamp);

  const div = document.createElement('div');
  div.className = `message ${isMe ? 'me' : 'other'}`;
  div.dataset.id = id;

  div.innerHTML = `
    <div class="message-meta">
      <span class="message-name">${escapeHtml(msg.name)}</span>
      <span class="message-time">${time}</span>
    </div>
    <div class="message-bubble">${escapeHtml(msg.text)}</div>
  `;

  messagesContainer.appendChild(div);
}

// ارسال پیام
messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !currentUser) return;

  sendBtn.disabled = true;

  const message = {
    text,
    name: currentUser.fullName,
    userId: currentUser.id,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  };

  messagesRef.push(message)
    .then(() => {
      messageInput.value = '';
      sendBtn.disabled = true;
      messageInput.focus();
    })
    .catch((err) => {
      console.error('خطا در ارسال:', err);
      alert('خطا در ارسال پیام. اتصال اینترنت و تنظیمات Firebase را بررسی کنید.');
      sendBtn.disabled = false;
    });
});

// فعال/غیرفعال کردن دکمه ارسال
messageInput.addEventListener('input', () => {
  sendBtn.disabled = messageInput.value.trim().length === 0;
});

// اسکرول به پایین
function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
}

// فرمت زمان
function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  if (isToday) {
    return `${hours}:${minutes}`;
  }
  return `${date.getDate()}/${date.getMonth() + 1} ${hours}:${minutes}`;
}

// جلوگیری از XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// پشتیبانی از Enter برای ارسال
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled) {
      messageForm.dispatchEvent(new Event('submit'));
    }
  }
});
