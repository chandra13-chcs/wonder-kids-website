document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  initRevealAnimations();
  initUiSound();
  bindSoundForImportantActions();
});

const UI_SOUND = {
  enabled: true,
  volume: 0.04,
  audioContext: null
};

function ensureAudioContext() {
  if (!('AudioContext' in window || 'webkitAudioContext' in window)) return null;

  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!UI_SOUND.audioContext) {
    UI_SOUND.audioContext = new AudioCtor();
  }

  if (UI_SOUND.audioContext.state === 'suspended') {
    UI_SOUND.audioContext.resume();
  }

  return UI_SOUND.audioContext;
}

function initUiSound() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) UI_SOUND.enabled = false;
}

function playUiClickSound() {
  if (!UI_SOUND.enabled) return;

  const context = ensureAudioContext();
  if (!context) return;

  try {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.value = 560;
    gainNode.gain.value = UI_SOUND.volume;

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + 0.06);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.08);
  } catch (error) {
    // silent fail
  }
}

function playSuccessSound() {
  if (!UI_SOUND.enabled) return;

  const context = ensureAudioContext();
  if (!context) return;

  try {
    const gainNode = context.createGain();
    const toneA = context.createOscillator();
    const toneB = context.createOscillator();

    toneA.type = 'sine';
    toneA.frequency.value = 740;
    toneB.type = 'triangle';
    toneB.frequency.value = 980;

    gainNode.gain.value = UI_SOUND.volume * 1.3;

    toneA.connect(gainNode);
    toneB.connect(gainNode);
    gainNode.connect(context.destination);

    toneA.start();
    toneB.start(context.currentTime + 0.08);
    toneA.stop(context.currentTime + 0.12);
    toneB.stop(context.currentTime + 0.2);
  } catch (error) {
    // silent fail
  }
}

function bindSoundForImportantActions() {
  document.body.addEventListener('click', function (event) {
    const trigger = event.target.closest('[data-ui-sound="true"], a[href^="#"], #submitBtnLabel, #chatButton');
    if (!trigger) return;

    if (trigger.closest('.modal-close, .close-button, button[onclick*="close"]')) return;

    playUiClickSound();
  });
}

function triggerFormError() {
  const form = document.getElementById('admissionForm');
  if (!form) return;
  form.classList.remove('form-invalid');
  void form.offsetWidth;
  form.classList.add('form-invalid');

  const error = document.getElementById('formErrorBanner');
  if (error) {
    error.classList.remove('hidden');
    error.textContent = 'Please complete the required fields before submitting.';
  }

  setTimeout(() => form.classList.remove('form-invalid'), 360);
}

function showSuccessModal(ref) {
  const modal = document.getElementById('submissionSuccessModal');
  const refBox = document.getElementById('successRefNumber');
  if (!modal || !refBox) return;

  refBox.textContent = ref;
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  const confetti = modal.querySelector('.success-confetti');
  if (confetti) {
    confetti.innerHTML = '';
    for (let i = 0; i < 12; i += 1) {
      const dot = document.createElement('span');
      dot.style.left = `${50 + (Math.random() * 30 - 15)}%`;
      dot.style.top = `${50 + (Math.random() * 18 - 9)}%`;
      dot.style.background = ['#D9822B', '#A05C26', '#C79A68', '#E6A052'][i % 4];
      dot.style.setProperty('--tx', `${(Math.random() * 120 - 60).toFixed(2)}px`);
      dot.style.setProperty('--ty', `${(Math.random() * 120 - 60).toFixed(2)}px`);
      confetti.appendChild(dot);
    }
  }
}

function closeSuccessModal() {
  const modal = document.getElementById('submissionSuccessModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function initRevealAnimations() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.section-reveal, .reveal-principal').forEach((el) => {
      el.classList.add('is-visible');
    });
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.16 });

  document.querySelectorAll('.section-reveal, .reveal-principal').forEach((el) => observer.observe(el));
}

async function handleFormSubmit(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const form = document.getElementById('admissionForm');
  const btn = document.getElementById('submitBtnLabel');

  if (form && !form.checkValidity()) {
    triggerFormError();
    form.reportValidity();
    return false;
  }

  if (btn) {
    btn.innerHTML = '<span>Submitting...</span>';
    btn.disabled = true;
    btn.classList.add('opacity-80', 'cursor-not-allowed');
  }

  const parentName = (document.getElementById('inputParent')?.value || '').trim();
  const phone = (document.getElementById('inputPhone')?.value || '').trim();
  const email = (document.getElementById('inputEmail')?.value || '').trim();
  const childName = (document.getElementById('inputChild')?.value || '').trim() || 'N/A';
  const grade = document.getElementById('inputGrade')?.value || 'Nursery';
  const locality = (document.getElementById('inputLocality')?.value || '').trim() || 'Khammam';

  try {
    await db.collection('admissions').add({
      parent_name: parentName,
      phone: phone,
      email: email,
      child_name: childName,
      grade: grade,
      locality: locality,
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });

    const ref = `WK-${Date.now().toString().slice(-6)}`;
    playSuccessSound();
    showSuccessModal(ref);

    if (form) form.reset();

    if (btn) {
      btn.innerHTML = '<span>Application Submitted</span>';
      btn.disabled = false;
      btn.classList.remove('opacity-80', 'cursor-not-allowed');
    }

    try {
      fetch('https://formsubmit.co/ajax/chellurichandu13@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          _subject: `New Admission Inquiry - ${childName} (${grade})`,
          _replyto: email,
          Parent_Name: parentName,
          Contact_Number: phone,
          Parent_Email: email,
          Student_Name: childName,
          Grade_Applying: grade,
          Locality_and_Bus: locality,
          School: 'Wonder Kids High School Khammam'
        })
      });
    } catch (err) {
      // silent fail
    }

    setTimeout(() => {
      const waUrl = `https://wa.me/918897798251?text=${encodeURIComponent(
        `*New Admission Application - Wonder Kids*%0A%0A` +
        `*Parent Name:* ${parentName}%0A` +
        `*Phone:* ${phone}%0A` +
        `*Email:* ${email}%0A` +
        `*Child Name:* ${childName}%0A` +
        `*Grade:* ${grade}%0A` +
        `*Locality:* ${locality}%0A%0A` +
        `_Saved to 24/7 Firebase Cloud DB & Dispatched to Email_`
      )}`;

      const newWindow = window.open(waUrl, '_blank');
      if (!newWindow) window.location.href = waUrl;
    }, 1200);

    return false;
  } catch (error) {
    console.error('Admission submission failed:', error);

    if (btn) {
      btn.innerHTML = '<span>Try Again</span>';
      btn.disabled = false;
      btn.classList.remove('opacity-80', 'cursor-not-allowed');
    }

    const errorCard = document.getElementById('formErrorBanner');
    if (errorCard) {
      errorCard.classList.remove('hidden');
      errorCard.textContent = 'Submission failed. Please try again.';
      errorCard.classList.add('text-red-600');
    }

    return false;
  }
}

function closeAdmissionPopup() {
  const popup = document.getElementById('admissionPopup');
  if (popup) popup.classList.add('hidden');
}

function scrollSlider(sliderId, distance) {
  const el = document.getElementById(sliderId);
  if (el) el.scrollBy({ left: distance, behavior: 'smooth' });
}

function toggleFooterSection(listId, iconId) {
  const list = document.getElementById(listId);
  const icon = document.getElementById(iconId);
  if (list && icon) {
    const isHidden = list.classList.contains('hidden');
    list.classList.toggle('hidden', !isHidden);
    icon.innerText = isHidden ? '−' : '+';
  }
}

function openCampusTourModal(title, location, desc, imgUrl) {
  document.getElementById('modalCampusHeading').innerText = title;
  document.getElementById('modalCampusTitle').innerText = title;
  document.getElementById('modalCampusLoc').innerText = location;
  document.getElementById('modalCampusDesc').innerText = desc;
  document.getElementById('modalCampusImg').src = imgUrl;
  document.getElementById('campusTourModal').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeCampusTourModal() {
  document.getElementById('campusTourModal').classList.add('hidden');
}

function openFullGalleryModal() {
  const grid = document.getElementById('fullGalleryGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const photos = [
    { title: 'Grade 4B & 4I - Class Assembly', img: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=600&q=80' },
    { title: 'Annual Science & STEM Exhibition', img: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=600&q=80' },
    { title: 'Pre-Primary Creative Craft Fest', img: 'images/activities.jfif' },
    { title: 'Annual Athletic Sports Day', img: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=600&q=80' },
    { title: 'Campus Courtyard & Learning Center', img: 'images/school building photo.jfif' },
    { title: 'Cricket Academy & Nets Practice', img: 'images/cricket.jfif' }
  ];

  photos.forEach((p) => {
    const item = document.createElement('div');
    item.className = 'bg-white rounded-2xl overflow-hidden border border-[#DFCDB7] p-2.5 shadow-sm';
    item.innerHTML = `
      <div class="h-36 sm:h-44 rounded-xl overflow-hidden bg-slate-100">
        <img src="${p.img}" alt="${p.title}" class="w-full h-full object-cover">
      </div>
      <p class="text-[11px] font-bold text-[#26170E] mt-2 line-clamp-1">${p.title}</p>
    `;
    grid.appendChild(item);
  });

  document.getElementById('fullGalleryModal').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeFullGalleryModal() {
  document.getElementById('fullGalleryModal').classList.add('hidden');
}

const translations = {
  en: {
    nav_vision: 'Vision',
    nav_faculty: 'Faculty',
    nav_sports: 'Sports',
    nav_bus: 'Bus Fleet',
    nav_campus: 'Campus',
    nav_contact: 'Contact',
    hero_title: 'Nurturing Curious Minds into <span class="text-[#A05C26] italic">Future Leaders</span>',
    hero_desc: 'Empowering children through holistic academic excellence, smart audio-visual learning, structured sports coaching, and strong ethical values in Khammam.',
    vision_title: 'A Vision for Every Wonder Kid',
    vision_desc: "Guided by Dr. A. P. J. Abdul Kalam's educational ideals, Wonder Kids High School nurtures curiosity into structured thinking and practical innovation. We ensure students leave our campus with a strong ethical foundation, practical confidence, and a love for learning."
  },
  te: {
    nav_vision: 'లక్ష్యం',
    nav_faculty: 'ఉపాధ్యాయులు',
    nav_sports: 'క్రీడలు',
    nav_bus: 'బస్సు సౌకర్యం',
    nav_campus: 'క్యాంపస్',
    nav_contact: 'సంప్రదించండి',
    hero_title: 'భవిష్యత్ నాయకులుగా <span class="text-[#A05C26] italic">భావి భారత పౌరులు</span>',
    hero_desc: 'ఖమ్మంలో నాణ్యమైన విద్య, డిజిటల్ స్మార్ట్ తరగతులు, క్రీడా శిక్షణ మరియు విలువ laden విద్యను అందిస్తున్నాము.',
    vision_title: 'డాక్టర్ కలాం గారి ప్రేరణతో',
    vision_desc: 'డాక్టర్ ఏ.పి.జె. అబ్దుల్ కలాం గారి ఆదర్శాల ప్రకారం, విద్యార్థులలో జ్ఞానపూర్వకమైన ఆలోచన, ఆచరణాత్మక నైపుణ్యం మరియు సద్గుణాలపై దృష్టి పెడతాము.'
  }
};

function setLanguage(lang) {
  const data = translations[lang];
  if (!data) return;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (data[key]) el.innerHTML = data[key];
  });

  const enBtn = document.getElementById('langEnBtn');
  const teBtn = document.getElementById('langTeBtn');

  if (lang === 'te') {
    teBtn.className = 'px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FAF7F2] text-[#2D1B10] transition';
    enBtn.className = 'px-2 py-0.5 rounded text-[11px] font-semibold text-[#E8DCCB] hover:text-white transition';
  } else {
    enBtn.className = 'px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FAF7F2] text-[#2D1B10] transition';
    teBtn.className = 'px-2 py-0.5 rounded text-[11px] font-semibold text-[#E8DCCB] hover:text-white transition';
  }
}

function toggleChat() {
  const modal = document.getElementById('chatModal');
  if (!modal) return;
  modal.classList.toggle('hidden');
  if (!modal.classList.contains('hidden')) {
    const input = document.getElementById('chatInput');
    if (input) input.focus();
  }
}

function sendQuickQuery(text) {
  const input = document.getElementById('chatInput');
  if (!input) return;
  input.value = text;
  handleChatSubmit(new Event('submit'));
}

function handleChatSubmit(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('chatInput');
  const query = input?.value.trim();
  if (!query) return;

  const container = document.getElementById('chatMessages');
  const userBubble = document.createElement('div');
  userBubble.className = 'flex justify-end';
  userBubble.innerHTML = `
    <div class="bg-[#663F24] text-[#FAF7F2] p-3 rounded-2xl rounded-tr-none text-xs max-w-[80%] leading-relaxed shadow-sm">
      ${query}
    </div>
  `;
  container.appendChild(userBubble);
  input.value = '';
  container.scrollTop = container.scrollHeight;

  setTimeout(() => {
    const aiBubble = document.createElement('div');
    aiBubble.className = 'flex gap-2';
    let response = 'Thank you! For specific queries, please reach out via WhatsApp (+91 88977 98251) or visit our Khammam campus.';
    const q = query.toLowerCase();

    if (q.includes('bus') || q.includes('transport') || q.includes('route') || q.includes('pickup')) {
      response = 'Wonder Kids High School operates reliable bus routes across Mamillagudem, Wyra Road, Kaman Bazar, and all major parts of Khammam. Every bus is accompanied by a female attendant.';
    } else if (q.includes('admission') || q.includes('fee') || q.includes('seat')) {
      response = 'Admissions for Academic Year 2026-27 are currently open for Nursery to Grade 10. You can submit an application via the form on this page.';
    } else if (q.includes('sport') || q.includes('cricket') || q.includes('football') || q.includes('basketball')) {
      response = 'We prioritize physical health with daily dedicated sports coaching, including net cricket practice, full football ground drills, and a regulation basketball court.';
    } else if (q.includes('faculty') || q.includes('teacher')) {
      response = 'Our senior teaching faculty brings 10+ years of dedicated teaching experience in state board syllabi and foundation concepts.';
    }

    aiBubble.innerHTML = `
      <div class="w-6 h-6 rounded-full bg-[#663F24] text-white flex items-center justify-center text-[10px] shrink-0 mt-1">AI</div>
      <div class="bg-[#EFE5D5] p-3 rounded-2xl rounded-tl-none border border-[#DECBB4] text-[#3D2A1D] shadow-sm leading-relaxed max-w-[80%]">
        ${response}
      </div>
    `;
    container.appendChild(aiBubble);
    container.scrollTop = container.scrollHeight;
    if (window.lucide) lucide.createIcons();
  }, 400);
}

window.closeAdmissionPopup = closeAdmissionPopup;
window.scrollSlider = scrollSlider;
window.toggleFooterSection = toggleFooterSection;
window.openCampusTourModal = openCampusTourModal;
window.closeCampusTourModal = closeCampusTourModal;
window.openFullGalleryModal = openFullGalleryModal;
window.closeFullGalleryModal = closeFullGalleryModal;
window.setLanguage = setLanguage;
window.toggleChat = toggleChat;
window.sendQuickQuery = sendQuickQuery;
window.handleChatSubmit = handleChatSubmit;
window.handleFormSubmit = handleFormSubmit;
window.closeSuccessModal = closeSuccessModal;
