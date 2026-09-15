let uploadedBase64Image = null;

document.addEventListener('DOMContentLoaded', () => {
  checkExistingSession();
  if (window.lucide) lucide.createIcons();
});

function handleFileSelection(e) {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('fileChosenLabel').innerText = file.name;

  const reader = new FileReader();
  reader.onload = function(evt) {
    uploadedBase64Image = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function getAdminAuth() {
  const savedAuth = localStorage.getItem('wonderkids_auth_creds');
  if (savedAuth) return JSON.parse(savedAuth);
  return { user: "admin", pass: "wonderkids@2026" };
}

function checkExistingSession() {
  const isAuth = sessionStorage.getItem('wonderkids_admin_logged_in');
  if (isAuth === 'true') {
    document.getElementById('loginOverlay')?.classList.add('hidden');
    document.getElementById('dashboardApp')?.classList.remove('hidden');
    loadPublishedPhotos();
    lucide.createIcons();
  }
}

function handleAdminLogin(e) {
  e.preventDefault();
  const user = document.getElementById('loginUsername').value.trim();
  const pass = document.getElementById('loginPassword').value.trim();
  const auth = getAdminAuth();

  if (user === auth.user && pass === auth.pass) {
    sessionStorage.setItem('wonderkids_admin_logged_in', 'true');
    document.getElementById('loginOverlay')?.classList.add('hidden');
    document.getElementById('dashboardApp')?.classList.remove('hidden');
    loadPublishedPhotos();
    lucide.createIcons();
  } else {
    document.getElementById('loginError')?.classList.remove('hidden');
  }
}

function handleAdminLogout() {
  if (confirm("Log out of Wonder Kids Console?")) {
    sessionStorage.removeItem('wonderkids_admin_logged_in');
    window.location.reload();
  }
}

function handleChangeCredentials(e) {
  e.preventDefault();
  const user = document.getElementById('newAdminUser').value.trim();
  const pass = document.getElementById('newAdminPass').value.trim();
  localStorage.setItem('wonderkids_auth_creds', JSON.stringify({ user, pass }));
  alert("Admin credentials updated successfully!");
}

function switchTab(tabId) {
  ['gallery', 'achievements', 'notices', 'leads', 'settings'].forEach(t => {
    document.getElementById(`sec${t.charAt(0).toUpperCase() + t.slice(1)}`)?.classList.add('hidden');
    const tab = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (tab) tab.className = "px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#E8DCCB] hover:text-white flex items-center gap-1.5 transition";
  });

  document.getElementById(`sec${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`)?.classList.remove('hidden');
  const activeTab = document.getElementById(`tab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`);
  if (activeTab) activeTab.className = "px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#663F24] text-white flex items-center gap-1.5 transition shadow-sm";

  if (tabId === 'leads') loadAdmissionLeads();
  if (tabId === 'gallery') loadPublishedPhotos();
  lucide.createIcons();
}

// GALLERY LOGIC
async function handleGalleryPublish(e) {
  e.preventDefault();
  const title = document.getElementById('photoTitle').value.trim();
  const category = document.getElementById('photoCategory').value;
  const urlInput = document.getElementById('photoUrl').value.trim();
  const imageUrl = uploadedBase64Image || urlInput;

  if (!imageUrl) {
    alert("Please choose an image file or provide an Image URL!");
    return;
  }

  const btn = document.getElementById('gallerySubmitBtn');
  btn.innerText = "Publishing to Cloud...";
  btn.disabled = true;

  try {
    await db.collection("gallery").add({
      title,
      category,
      image_url: imageUrl,
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Photo successfully published to Live Gallery!");
    e.target.reset();
    uploadedBase64Image = null;
    document.getElementById('fileChosenLabel').innerText = "No file chosen";
    loadPublishedPhotos();
  } catch (err) {
    alert("Publish error: " + err.message);
  } finally {
    btn.innerText = "Publish to Live Gallery";
    btn.disabled = false;
    lucide.createIcons();
  }
}

async function loadPublishedPhotos() {
  const container = document.getElementById('galleryContainer');
  const countLabel = document.getElementById('photosCount');
  if (!container) return;

  try {
    const snapshot = await db.collection("gallery").get();
    if (snapshot.empty) {
      container.innerHTML = "No custom photos added yet. Upload using the form above!";
      if (countLabel) countLabel.innerText = "0 custom photos uploaded";
      return;
    }

    if (countLabel) countLabel.innerText = `${snapshot.size} custom photos uploaded`;
    container.innerHTML = `<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left"></div>`;
    const grid = container.querySelector('div');

    snapshot.forEach(doc => {
      const p = doc.data();
      const item = document.createElement('div');
      item.className = "bg-white p-2.5 rounded-2xl border border-[#DFCDB7] shadow-sm";
      item.innerHTML = `
        <div class="h-32 rounded-xl overflow-hidden bg-[#FAF7F2] border border-[#EBE0D3]">
          <img src="${p.image_url}" class="w-full h-full object-cover">
        </div>
        <p class="text-[10px] font-bold text-[#8C5D38] uppercase mt-2">${p.category || 'Special Moments'}</p>
        <p class="text-xs font-bold text-[#26170E] line-clamp-1">${p.title}</p>
      `;
      grid.appendChild(item);
    });
  } catch (err) {
    container.innerHTML = `<span class="text-rose-600">Error loading photos: ${err.message}</span>`;
  }
}

// ACHIEVEMENTS & NOTICES
async function handleAchievementPublish(e) {
  e.preventDefault();
  try {
    await db.collection("achievements").add({
      student_name: document.getElementById('achName').value.trim(),
      category: document.getElementById('achCategory').value.trim(),
      title: document.getElementById('achTitle').value.trim(),
      image_url: document.getElementById('achUrl').value.trim() || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
      description: document.getElementById('achDesc').value.trim(),
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Achievement published to school site!");
    e.target.reset();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function handleNoticePublish(e) {
  e.preventDefault();
  try {
    await db.collection("notices").add({
      tag: document.getElementById('noticeTag').value.trim(),
      dept: document.getElementById('noticeDept').value.trim(),
      title: document.getElementById('noticeTitle').value.trim(),
      description: document.getElementById('noticeDesc').value.trim(),
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Notice published successfully!");
    e.target.reset();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// ADMISSION LEADS (WITH WHATSAPP + MAIL ACCEPT)
async function loadAdmissionLeads() {
  const tbody = document.getElementById('leadsTableBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-xs text-[#8C5D38]">Loading cloud leads from Firebase...</td></tr>`;

  try {
    const snapshot = await db.collection("admissions").get();
    if (snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-xs text-[#8C5D38]">No admission inquiries found in Firebase cloud.</td></tr>`;
      const leadCount = document.getElementById('leadCount');
      if (leadCount) leadCount.innerText = `0 Admission inquiries received`;
      return;
    }

    const leadCount = document.getElementById('leadCount');
    if (leadCount) leadCount.innerText = `${snapshot.size} Admission inquiries in cloud`;
    tbody.innerHTML = '';

    const docs = [];
    snapshot.forEach(doc => docs.push(doc.data()));
    docs.reverse();

    docs.forEach((l) => {
      const tr = document.createElement('tr');
      tr.className = "hover:bg-[#FAF7F2] transition";
      
      const mailSubject = encodeURIComponent(`Admission Application Accepted - Wonder Kids High School, Khammam`);
      const mailBody = encodeURIComponent(`Dear ${l.parent_name || 'Parent'},\n\nGreetings from Wonder Kids High School, Khammam.\n\nWe are pleased to inform you that your child ${l.child_name || 'the student'}'s admission application for ${l.grade || 'the requested grade'} has been reviewed and accepted.\n\nPlease visit our campus along with original certificates to complete the enrolment formalities.\n\nWarm Regards,\nAdmissions Committee\nWonder Kids High School, Khammam\nContact: +91 88977 98251`);

      tr.innerHTML = `
        <td class="py-3 px-3">
          <span class="font-bold text-[#26170E] block">${l.parent_name || 'N/A'}</span>
          <span class="text-[10px] text-[#7A6453]">${l.email || 'No Email Provided'}</span>
        </td>
        <td class="py-3 px-3">
          <a href="tel:${l.phone}" class="text-emerald-700 font-bold hover:underline">${l.phone || ''}</a>
        </td>
        <td class="py-3 px-3">${l.child_name || 'N/A'}</td>
        <td class="py-3 px-3 font-semibold text-[#663F24]">${l.grade || ''}</td>
        <td class="py-3 px-3 text-[#7A6453]">${l.locality || 'Khammam'}</td>
        <td class="py-3 px-3 text-right">
          <div class="flex flex-col sm:flex-row gap-1.5 justify-end">
            <a href="https://wa.me/91${(l.phone || '').replace(/[^0-9]/g, '')}" target="_blank" class="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold rounded-lg transition text-center whitespace-nowrap">
              WhatsApp
            </a>
            <a href="mailto:${l.email || ''}?subject=${mailSubject}&body=${mailBody}" class="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-[10px] font-bold rounded-lg transition text-center whitespace-nowrap ${!l.email ? 'opacity-40 pointer-events-none' : ''}">
              Mail Accept
            </a>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
    lucide.createIcons();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-xs text-rose-700">Firestore error: ${err.message}</td></tr>`;
  }
}