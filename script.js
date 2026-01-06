/* ====================================================================
   SCRIPT.JS - THE ULTIMATE MASTER FILE (JARVIS EDITION 🗣️)
   Fitur: Text-to-Speech Welcome, Register, Login, Dashboard 3 Kategori, 
   Dropdown Cerdas, Auto Email Footer, Bulk Input Service Station, 
   Triple Export (Direct DL), Smart Cert Numbering & Email Bundling.
   ==================================================================== */

// ⚠️ PASTE URL WEB APP (DEPLOYMENT BARU) KAMU DI SINI
const API_URL = "https://script.google.com/macros/s/AKfycbwo5j74mC6sMx4NPlfrFRIVkLT5tTgfFU5rPymDjRzjPjcDKwgjaVXVhkGa6tkVwK_mFA/exec"; 

// --- DATABASE KODE SURAT ---
const CERT_CODES = {
  "KONSTRUKSI": "AL.501",
  "PERLENGKAPAN": "AL.501",
  "RADIO": "AL.502",
  "ENDORS KONSTRUKSI": "AL.501",
  "ENDORS PERLENGKAPAN": "AL.501",
  "ENDORS RADIO": "AL.502",
  "GARIS MUAT": "AL.509",
  "KESELAMATAN KLM": "AL.501",
  "KESELAMATAN MOORING": "AL.501",
  "IMDG": "AL.503",
  "SNPP": "AL.601",
  "ENDORS SNPP": "AL.601",
  "IOPP": "AL.602",
  "ENDORS IOPP": "AL.602",
  "ISPP": "AL.602",
  "ENDORS ISPP": "AL.602",
  "IAPP": "AL.602",
  "ENDORS IAPP": "AL.602",
  "BALLAST WATER MANAGEMENT": "AL.601",
  "ANTIFOULING": "AL.601",
  "DOC": "AL.602",
  "ENDORS DOC": "AL.602",
  "SMC": "AL.602",
  "SMC INTERMEDIATE": "AL.602"
};

let globalCompanySet = new Set(); 

// ====================================================================
// 1. UTILITIES & HELPER (TERMASUK SUARA JARVIS)
// ====================================================================

// --- FUNGSI SUARA SELAMAT DATANG ---
function speakWelcome(nama) {
    // Cek apakah browser mendukung suara & apakah sudah pernah diputar sesi ini
    if ('speechSynthesis' in window) {
        if (sessionStorage.getItem("welcome_played")) return; // Jangan ngomong kalau cuma refresh

        // Bersihkan antrian suara sebelumnya
        window.speechSynthesis.cancel();

        const text = `Selamat datang, ${nama}, di era digitalisasi arsip, Seksi SHSK, KSOP Kelas 2 Pekanbaru`;
        const utterance = new SpeechSynthesisUtterance(text);
        
        utterance.lang = 'id-ID'; // Set Bahasa Indonesia
        utterance.rate = 0.9;     // Kecepatan (0.1 - 10), 0.9 biar natural
        utterance.pitch = 1;      // Nada (0 - 2)
        utterance.volume = 1;     // Volume (0 - 1)

        // Coba cari suara Google Bahasa Indonesia (kalau ada)
        const voices = window.speechSynthesis.getVoices();
        const indoVoice = voices.find(v => v.lang === 'id-ID' || v.name.includes('Indonesia'));
        if (indoVoice) utterance.voice = indoVoice;

        // MAINKAN SUARA
        window.speechSynthesis.speak(utterance);
        
        // Tandai sudah diputar biar gak spam saat refresh
        sessionStorage.setItem("welcome_played", "true");
    }
}

function showPopup(message, type = "info") {
  const popup = document.getElementById("app-notification");
  if (!popup) { alert(message); return; }

  const msgEl = document.getElementById("popup-message");
  const iconEl = popup.querySelector("i");
  msgEl.innerText = message;

  popup.className = "popup";
  if (type === "success") {
    popup.classList.add("success");
    if (iconEl) iconEl.className = "fa fa-check-circle";
  } else if (type === "error") {
    popup.classList.add("error");
    if (iconEl) iconEl.className = "fa fa-times-circle";
  } else {
    popup.classList.add("info");
    if (iconEl) iconEl.className = "fa fa-info-circle";
  }

  popup.classList.add("show");
  setTimeout(() => popup.classList.remove("show"), 3000);
}

function formatDate(dateStr) {
  if (!dateStr || dateStr === "-") return "-";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("id-ID");
}

function formatDateForInput(dateStr) {
  if (!dateStr || dateStr === "-") return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

async function postData(data) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (e) {
    return { status: "ERROR", message: "Koneksi Terputus" };
  }
}

function injectCustomStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        .service-options-container { display: flex; gap: 10px; }
        .tool-checkbox-card { flex: 1; }
        @media (max-width: 768px) {
            .service-options-container { flex-direction: column !important; }
            .tool-checkbox-card { width: 100% !important; margin-bottom: 10px; }
        }
    `;
    document.head.appendChild(style);
}

function initSmartSearch() {
    if (!document.getElementById('companyList')) {
        const dl = document.createElement('datalist');
        dl.id = 'companyList';
        document.body.appendChild(dl);
    }
}

function updateCompanyDatalist(dataArray, keyName) {
    dataArray.forEach(item => {
        if(item[keyName]) globalCompanySet.add(item[keyName].trim().toUpperCase());
    });
    const dl = document.getElementById('companyList');
    if(dl) {
        dl.innerHTML = '';
        globalCompanySet.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            dl.appendChild(opt);
        });
    }
}

window.autoFillCertNum = function(index) {
    const jenisEl = document.querySelector(`select[name="jenisSertifikat_${index}"]`);
    const noSertEl = document.querySelector(`input[name="noSertifikat_${index}"]`);
    if(!jenisEl || !noSertEl) return;
    
    const jenis = jenisEl.value;
    const currentYear = new Date().getFullYear();
    if(CERT_CODES[jenis]) {
        noSertEl.value = `${CERT_CODES[jenis]}///KSOP.PKU/${currentYear}`;
    } else {
        if(noSertEl.value.includes("KSOP.PKU")) noSertEl.value = ""; 
    }
}

// ====================================================================
// 2. AUTO LOGOUT & SESSION
// ====================================================================

let idleTime = 0;
function resetIdleTimer() { idleTime = 0; }

function initAutoLogout() {
  setInterval(() => {
    idleTime++;
    if (idleTime >= 60) { logout(); }
  }, 60000); 

  window.onmousemove = resetIdleTimer;
  window.onkeypress = resetIdleTimer;
  window.onclick = resetIdleTimer;
  window.onscroll = resetIdleTimer;
}

// ====================================================================
// 3. AUTHENTICATION (LOGIN, REGISTER, OTP)
// ====================================================================

async function handleLogin(e, role) {
  if (e) e.preventDefault();
  let inputIdStr, inputPassStr, btnIdStr;
  
  if (role === "PETUGAS") {
    inputIdStr = "nip"; inputPassStr = "passPetugas"; btnIdStr = "btnSubmitPetugas";
  } else {
    inputIdStr = "email"; inputPassStr = "passPengguna"; btnIdStr = "btnSubmitPengguna";
  }

  const inputIdElem = document.getElementById(inputIdStr);
  const inputPassElem = document.getElementById(inputPassStr);
  const btnElem = document.getElementById(btnIdStr);
  if (!inputIdElem || !inputPassElem || !btnElem) return;

  const userId = inputIdElem.value.trim();
  const password = inputPassElem.value.trim();
  if (!userId || !password) { showPopup("Data tidak lengkap.", "error"); return; }

  const originalText = btnElem.innerHTML;
  btnElem.innerHTML = '<i class="fa fa-spinner fa-spin"></i> MEMPROSES...';
  btnElem.disabled = true;
  showPopup("Sedang Masuk...", "info");

  try {
    const res = await postData({ action: "login", role: role, id: userId, password: password });
    if (res.status === "SUCCESS") {
      localStorage.setItem("user", JSON.stringify(res.data));
      
      // RESET STATUS SUARA BIAR NGOMONG PAS MASUK
      sessionStorage.removeItem("welcome_played");

      showPopup(`Login Berhasil! Halo ${res.data.nama}`, "success");
      setTimeout(() => { window.location.href = role === "PETUGAS" ? "petugas.html" : "pengguna.html"; }, 1500);
    } else {
      showPopup(res.message, "error");
      btnElem.innerHTML = originalText;
      btnElem.disabled = false;
    }
  } catch (error) {
    showPopup("Gagal koneksi.", "error");
    btnElem.innerHTML = originalText;
    btnElem.disabled = false;
  }
}

async function handleRegisterSubmit(e) {
  if (e) e.preventDefault();
  const nama = document.getElementById("reg-nama").value;
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;
  const perusahaan = document.getElementById("reg-perusahaan").value;
  const btn = document.getElementById("btn-register-submit");

  if (!nama || !email || !password || !perusahaan) { showPopup("Harap isi semua kolom!", "error"); return; }

  const originalText = btn.innerText;
  btn.innerText = "MEMPROSES...";
  btn.disabled = true;

  try {
    const res = await postData({ action: "register", nama: nama, email: email, password: password, perusahaan: perusahaan });
    if (res.status === "SUCCESS") {
      showPopup("Pendaftaran Berhasil! Mengalihkan...", "success");
      setTimeout(() => { window.location.href = "index.html"; }, 2000);
    } else {
      showPopup(res.message, "error");
      btn.innerText = originalText;
      btn.disabled = false;
    }
  } catch (err) {
    showPopup("Gagal koneksi server.", "error");
    btn.innerText = originalText;
    btn.disabled = false;
  }
}

function logout() { document.getElementById("modal-logout").classList.remove("hidden"); }
function closeLogoutModal() { document.getElementById("modal-logout").classList.add("hidden"); }
function confirmLogout() { 
    localStorage.removeItem("user"); 
    sessionStorage.removeItem("welcome_played"); // Reset suara
    window.location.href = "index.html"; 
}

async function requestOTP() {
  const email = document.getElementById("reset-email").value;
  if (!email) { showPopup("Masukkan email dulu!", "error"); return; }
  showPopup("Mengirim kode OTP...", "info");
  const res = await postData({ action: "sendOTP", email: email });
  if (res.status === "SUCCESS") {
    showPopup("Kode OTP terkirim ke email!", "success");
    document.getElementById("step-email").classList.add("hidden");
    document.getElementById("step-otp").classList.remove("hidden");
  } else { showPopup(res.message, "error"); }
}

async function verifyOTP() {
  const email = document.getElementById("reset-email").value;
  const otp = document.getElementById("reset-otp").value;
  if (!otp) { showPopup("Masukkan OTP!", "error"); return; }
  const res = await postData({ action: "verifyOTP", email: email, otp: otp });
  if (res.status === "SUCCESS") {
    showPopup("OTP Benar!", "success");
    document.getElementById("step-otp").classList.add("hidden");
    document.getElementById("step-newpass").classList.remove("hidden");
  } else { showPopup(res.message, "error"); }
}

async function resetPasswordFinal() {
  const email = document.getElementById("reset-email").value;
  const newPass = document.getElementById("reset-newpass").value;
  if (!newPass) { showPopup("Masukkan password baru!", "error"); return; }
  showPopup("Menyimpan password...", "info");
  const res = await postData({ action: "resetPasswordFinal", email: email, newPassword: newPass });
  if (res.status === "SUCCESS") {
    showPopup("Sukses! Silakan login.", "success");
    setTimeout(() => window.location.reload(), 2000);
  } else { showPopup(res.message, "error"); }
}

// ====================================================================
// 4. PAGE INITIALIZATION & NAVIGATION
// ====================================================================

document.addEventListener("DOMContentLoaded", () => {
  injectCustomStyles(); 
  initSmartSearch();    

  if (document.querySelector(".dashboard-page")) {
      initPenggunaDashboard();
      initAutoLogout();
  } else if (document.querySelector(".petugas-page")) {
      loadProfilePetugas();
      const defaultBtn = document.querySelector(".filter-btn.active");
      updateChartFilter("year", defaultBtn);
      renderBulkForm('SHSK');
      renderBulkForm('SERTIFIKASI');
      renderBulkForm('SERVICE');
      initAutoLogout();
  }
});

function toggleSidebar(){ const s=document.getElementById("sidebar"); const o=document.getElementById("sidebar-overlay"); s.classList.toggle("show"); o.classList.toggle("active"); }

function showSection(id, el){ 
    document.querySelectorAll(".main-content > div").forEach(d=>d.classList.add("hidden")); 
    document.getElementById(`sec-${id}`).classList.remove("hidden"); 
    document.querySelectorAll(".menu-item").forEach(m=>m.classList.remove("active"));
    if(el) el.classList.add("active");
    if(id.includes("data")) {
        if(id.includes("shsk")) loadData("SHSK");
        else if(id.includes("sertifikasi")) loadData("SERTIFIKASI");
        else if(id.includes("service")) loadData("SERVICE");
    }
    if(window.innerWidth <= 900) {
       const s=document.getElementById("sidebar");
       const o=document.getElementById("sidebar-overlay");
       if(s.classList.contains("show")) { s.classList.remove("show"); o.classList.remove("active"); }
    }
}

function toggleSubmenu(id){ 
    const target = document.getElementById(id);
    const isOpen = target.classList.contains("show");
    document.querySelectorAll(".submenu-container").forEach(el => el.classList.remove("show"));
    document.querySelectorAll(".menu-item").forEach(el => el.classList.remove("open"));
    if(!isOpen) { target.classList.add("show"); if(target.previousElementSibling) target.previousElementSibling.classList.add("open"); }
}

window.toggleAccordion = function(headerElement) {
  const item = headerElement.closest(".accordion-item");
  if (item) item.classList.toggle("open");
};

// ====================================================================
// 5. CHART UI
// ====================================================================
let barChartInstance = null;
let doughnutChartInstance = null;
let currentFilter = "year";

function updateChartFilter(period, btnElement) {
  currentFilter = period;
  document.querySelectorAll(".filter-btn").forEach((btn) => btn.classList.remove("active"));
  if (btnElement) { btnElement.classList.add("active"); }
  else {
    const targetBtn = Array.from(document.querySelectorAll(".filter-btn")).find(
      (b) => b.innerText.toLowerCase().includes(
            period === "year" ? "tahun" : period === "month" ? "bulan" : period === "week" ? "minggu" : "hari"
          )
    );
    if (targetBtn) targetBtn.classList.add("active");
  }
  initCharts(period);
}

async function initCharts(p = "year") {
  if (!document.getElementById("barChart")) return;
  const res = await postData({ action: "getDashboardStats", period: p });
  let d = { year: new Date().getFullYear(), totalYear: 0, breakdown: { shsk: 0, sert: 0, serv: 0 }, labels: [], datasets: { shsk: [], sert: [], serv: [] } };
  if (res.status === "SUCCESS") d = res.data;

  const titleEl = document.querySelector(".chart-card h3 i.fa-bullseye");
  if (titleEl && titleEl.parentNode) titleEl.parentNode.innerHTML = `<i class="fa fa-bullseye" style="color: var(--gold)"></i> Target ${d.year}`;

  const total = 2040;
  const sisa = total - d.totalYear;
  const targetInfo = document.querySelector(".target-info");
  if (targetInfo) {
    targetInfo.innerHTML = `
        <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center; font-size:12px;">
            <span><i class="fa fa-circle" style="color: #ffd700"></i> Status Hukum: <b>${d.breakdown.shsk}</b></span>
            <span><i class="fa fa-circle" style="color: #0a192f"></i> Sertifikasi: <b>${d.breakdown.sert}</b></span>
            <span><i class="fa fa-circle" style="color: #00c853"></i> ILR & PMK: <b>${d.breakdown.serv}</b></span>
        </div>
      `;
  }

  const ctxBar = document.getElementById("barChart").getContext("2d");
  if (barChartInstance) barChartInstance.destroy();
  barChartInstance = new Chart(ctxBar, {
    type: "bar",
    data: {
      labels: d.labels,
      datasets: [
        { label: "Status Hukum", data: d.datasets.shsk, backgroundColor: "rgba(255, 215, 0, 0.8)", borderColor: "rgba(255, 215, 0, 1)", borderWidth: 1, borderRadius: 3 },
        { label: "Sertifikasi", data: d.datasets.sert, backgroundColor: "rgba(10, 25, 47, 0.8)", borderColor: "rgba(10, 25, 47, 1)", borderWidth: 1, borderRadius: 3 },
        { label: "ILR & PMK", data: d.datasets.serv, backgroundColor: "rgba(0, 200, 83, 0.8)", borderColor: "rgba(0, 200, 83, 1)", borderWidth: 1, borderRadius: 3 },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: "bottom", labels: { boxWidth: 12 } } }, scales: { x: { stacked: false }, y: { beginAtZero: true } } },
  });

  const ctxD = document.getElementById("doughnutChart").getContext("2d");
  if (doughnutChartInstance) doughnutChartInstance.destroy();
  doughnutChartInstance = new Chart(ctxD, {
    type: "doughnut",
    data: {
      labels: ["Status Hukum", "Sertifikasi", "ILR & PMK", "Sisa Target"],
      datasets: [{ data: [d.breakdown.shsk, d.breakdown.sert, d.breakdown.serv, sisa < 0 ? 0 : sisa], backgroundColor: ["#ffd700", "#0a192f", "#00c853", "#eee"], borderWidth: 0 }],
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: "70%", plugins: { legend: { display: false } } },
  });
}

// ====================================================================
// 6. PROFILE PETUGAS (DENGAN SUARA SAMBUTAN)
// ====================================================================
function loadProfilePetugas() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) { window.location.href = "index.html"; return; }
  if (document.getElementById("nav-name")) document.getElementById("nav-name").innerText = user.nama;
  if (document.getElementById("sidebar-name")) document.getElementById("sidebar-name").innerText = user.nama;
  if (document.getElementById("sidebar-nip")) document.getElementById("sidebar-nip").innerText = "NIP. " + (user.id || "-");
  if (document.getElementById("dash-name")) document.getElementById("dash-name").innerText = user.nama.split(" ")[0];
  if (document.getElementById("sidebar-role")) document.getElementById("sidebar-role").innerText = user.extra || "PETUGAS";
  const sbInitial = document.getElementById("sidebar-initial");
  if (sbInitial && user.foto) {
    sbInitial.innerHTML = `<img src="${user.foto}" class="profile-img-fit">`;
    sbInitial.style.border = "2px solid var(--gold)";
  }

  // --- TRIGGER SUARA JARVIS ---
  speakWelcome(user.nama);
}

// ====================================================================
// 7. BULK INPUT ENGINE
// ====================================================================

window.updateServiceQty = function (i) {
  const container = document.getElementById(`qty-container-${i}`);
  const liferaftCheck = document.querySelector(`input[name="check_liferaft_${i}"]`);
  const feCheck = document.querySelector(`input[name="check_fe_${i}"]`);
  let html = "";
  if (liferaftCheck && liferaftCheck.checked) html += `<label>Jumlah LIFERAFT <input type="number" name="jumlah_LIFERAFT_${i}" class="form-control" placeholder="0"></label>`;
  if (feCheck && feCheck.checked) html += `<label>Jumlah FIRE EXTINGUISHER <input type="number" name="jumlah_FE_${i}" class="form-control" placeholder="0"></label>`;
  container.innerHTML = html ? `<div class="grid-form">${html}</div>` : "";
};

function renderBulkForm(type) {
  let countSelectId, containerId;
  if (type === "SHSK") { countSelectId = "bulkCountSHSK"; containerId = "bulk-container-SHSK"; } 
  else if (type === "SERTIFIKASI") { countSelectId = "bulkCountSertifikasi"; containerId = "bulk-container-SERTIFIKASI"; } 
  else if (type === "SERVICE") { countSelectId = "bulkCountService"; containerId = "bulk-container-SERVICE"; }

  const countSelect = document.getElementById(countSelectId);
  const container = document.getElementById(containerId);
  if (!container || !countSelect) return;

  const count = parseInt(countSelect.value);
  container.innerHTML = "";

  for (let i = 1; i <= count; i++) {
    let html = `
        <div class="data-wrapper" style="margin-bottom:30px; border:2px solid var(--navy); border-radius:10px; overflow:hidden;">
            <div style="background:var(--navy); color:#fff; padding:10px 15px; font-weight:bold;">
                <i class="fa fa-file-alt"></i> DATA KE-${i}
            </div>
            <div style="padding:15px; background:#fff;">
                <input type="hidden" name="noUrut_${i}">
                <input type="hidden" name="oldFolderUrl_${i}">
        `;

    if (type === "SHSK") {
      html += `
            <div class="accordion-item open">
                <div class="accordion-header" onclick="toggleAccordion(this)"><span>1. Informasi Kapal</span> <i class="fa fa-chevron-down"></i></div>
                <div class="accordion-body" style="display:block;">
                    <div class="grid-form">
                        <label>Nama Kapal <input type="text" name="namaKapal_${i}" class="form-control" style="text-transform:uppercase"></label>
                        <label>Tonase <input type="text" name="tonase_${i}" class="form-control"></label>
                        <label>Tanda Pendaftaran <input type="text" name="tandaPendaftaran_${i}" class="form-control" style="text-transform:uppercase"></label>
                        <label>Pemilik <input type="text" name="pemilik_${i}" class="form-control" style="text-transform:uppercase" list="companyList"></label>
                    </div>
                </div>
            </div>
            <div class="accordion-item">
                <div class="accordion-header" onclick="toggleAccordion(this)"><span>2. Penerbitan STKK</span> <i class="fa fa-chevron-down"></i></div>
                <div class="accordion-body">
                    <div class="grid-form">
                        <label>Tempat STKK <input type="text" name="tempatStkk_${i}" class="form-control style="text-transform:uppercase""></label>
                        <label>Tgl STKK <input type="date" name="tglStkk_${i}" class="form-control"></label>
                        <label>No Urut <input type="text" name="noUrutStkk_${i}" class="form-control"></label>
                        <label>No Hal <input type="text" name="noHalStkk_${i}" class="form-control"></label>
                        <label>No Buku <input type="text" name="noBukuStkk_${i}" class="form-control"></label>
                    </div>
                </div>
            </div>
            <div class="accordion-item">
                <div class="accordion-header" onclick="toggleAccordion(this)"><span>3. Pengukuhan STKK</span> <i class="fa fa-chevron-down"></i></div>
                <div class="accordion-body">
                    <div class="grid-form">
                        <label>STKK 
                            <select name="statusPengukuhan_${i}" class="form-control">
                                <option value="">-- Pilih --</option>
                                <option value="SURAT LAUT">SURAT LAUT</option>
                                <option value="PAS BESAR">PAS BESAR</option>
                                <option value="PAS KECIL">PAS KECIL</option>
                            </select>
                        </label>
                        <label>Tgl Pengukuhan <input type="date" name="tglPengukuhan_${i}" class="form-control"></label>
                    </div>
                </div>
            </div>
            <div class="accordion-item">
                <div class="accordion-header" onclick="toggleAccordion(this)"><span>4. Upload Dokumen</span> <i class="fa fa-chevron-down"></i></div>
                <div class="accordion-body">
                    <div class="grid-form">
                        <label>Permohonan <input type="file" name="permohonan_${i}"></label>
                        <label>STKK <input type="file" name="stkk_${i}"></label>
                        <label>Grosse <input type="file" name="grosse_${i}"></label>
                        <label>Surat Ukur <input type="file" name="ukur_${i}"></label>
                        <label>PNBP <input type="file" name="pnbp_${i}"></label>
                    </div>
                </div>
            </div>`;
    } else if (type === "SERTIFIKASI") {
      html += `
            <div class="accordion-item open">
                <div class="accordion-header" onclick="toggleAccordion(this)"><span>1. Informasi Kapal</span> <i class="fa fa-chevron-down"></i></div>
                <div class="accordion-body" style="display:block;">
                    <div class="grid-form">
                        <label>Perusahaan <input type="text" name="perusahaan_${i}" class="form-control" style="text-transform:uppercase" list="companyList"></label>
                        <label>Nama Kapal <input type="text" name="namaKapal_${i}" class="form-control" style="text-transform:uppercase"></label>
                        <label>Ukuran (GT) <input type="text" name="ukuran_${i}" class="form-control"></label>
                        <label>Call Sign <input type="text" name="callSign_${i}" class="form-control" style="text-transform:uppercase"></label>
                        <label>Bahan <input type="text" name="bahan_${i}" class="form-control" style="text-transform:uppercase"></label>
                        <label>Daerah Pelayaran 
                             <select name="daerahPelayaran_${i}" class="form-control">
                                <option value="">-- Pilih --</option>
                                <option value="SEMUA LAUTAN">SEMUA LAUTAN</option>
                                <option value="PERAIRAN INDONESIA">PERAIRAN INDONESIA</option>
                                <option value="LOKAL">LOKAL</option>
                                <option value="TERBATAS">TERBATAS</option>
                                <option value="AREA PELABUHAN">AREA PELABUHAN</option>
                            </select>
                        </label>
                        <label>Keterangan 
                            <select name="keterangan_${i}" class="form-control">
                                <option value="">(Kosong)</option>
                                <option value="DOCKING">DOCKING</option>
                                <option value="1 X PELAYARAN">1 X PELAYARAN</option>
                            </select>
                        </label>
                    </div>
                </div>
            </div>
            <div class="accordion-item">
                <div class="accordion-header" onclick="toggleAccordion(this)"><span>2. Data Sertifikat</span> <i class="fa fa-chevron-down"></i></div>
                <div class="accordion-body">
                    <div class="grid-form">
                        <label>Jenis Sertifikat 
                            <select name="jenisSertifikat_${i}" class="form-control" onchange="autoFillCertNum(${i})">
                                <option value="">-- Pilih Jenis --</option>
                                <option value="KONSTRUKSI">KONSTRUKSI</option>
                                <option value="PERLENGKAPAN">PERLENGKAPAN</option>
                                <option value="RADIO">RADIO</option>
                                <option value="ENDORS KONSTRUKSI">ENDORS KONSTRUKSI</option>
                                <option value="ENDORS PERLENGKAPAN">ENDORS PERLENGKAPAN</option>
                                <option value="ENDORS RADIO">ENDORS RADIO</option>
                                <option value="GARIS MUAT">GARIS MUAT</option>
                                <option value="KESELAMATAN KLM">KESELAMATAN KLM</option>
                                <option value="KESELAMATAN MOORING">KESELAMATAN MOORING</option>
                                <option value="IMDG">IMDG</option>
                                <option value="SNPP">SNPP</option>
                                <option value="ENDORS SNPP">ENDORS SNPP</option>
                                <option value="IOPP">IOPP</option>
                                <option value="ENDORS IOPP">ENDORS IOPP</option>
                                <option value="ISPP">ISPP</option>
                                <option value="ENDORS ISPP">ENDORS ISPP</option>
                                <option value="IAPP">IAPP</option>
                                <option value="ENDORS IAPP">ENDORS IAPP</option>
                                <option value="BALLAST WATER MANAGEMENT">BALLAST WATER MANAGEMENT</option>
                                <option value="ANTIFOULING">ANTIFOULING</option>
                                <option value="DOC">DOC</option>
                                <option value="ENDORS DOC">ENDORS DOC</option>
                                <option value="SMC">SMC</option>
                                <option value="SMC INTERMEDIATE">SMC INTERMEDIATE</option>
                                <option value="PENGESAHAN GAMBAR KAPAL">PENGESAHAN GAMBAR KAPAL</option>
                            </select>
                        </label>
                        <label>Tgl Terbit <input type="date" name="tglTerbit_${i}" class="form-control"></label>
                        <label>Masa Berlaku <input type="date" name="tglBerlaku_${i}" class="form-control"></label>
                        <label>No Sertifikat <input type="text" name="noSertifikat_${i}" class="form-control"></label>
                        <label>Kode Billing <input type="text" name="kodeBilling_${i}" class="form-control"></label>
                    </div>
                </div>
            </div>
            <div class="accordion-item">
                <div class="accordion-header" onclick="toggleAccordion(this)"><span>3. Pemeriksa</span> <i class="fa fa-chevron-down"></i></div>
                <div class="accordion-body">
                    <div class="grid-form">
                         <label>Nama Pemeriksa 
                            <select name="pemeriksa_${i}" class="form-control">
                                <option value="">-- Pilih Pemeriksa --</option>
                                <option value="ANTON SUJARWADI, S.Si.T, M.M.">ANTON SUJARWADI, S.Si.T, M.M.</option>
                                <option value="HARNO SIAGIAN, A.Md">HARNO SIAGIAN, A.Md</option>
                                <option value="BUSTANUL ARIFIN, S.A.P.">BUSTANUL ARIFIN, S.A.P.</option>
                            </select>
                        </label>
                    </div>
                </div>
            </div>
            <div class="accordion-item">
                <div class="accordion-header" onclick="toggleAccordion(this)"><span>4. Upload Dokumen</span> <i class="fa fa-chevron-down"></i></div>
                <div class="accordion-body">
                    <div class="grid-form">
                        <label>Permohonan <input type="file" name="permohonan_${i}"></label>
                        <label>Evaluasi <input type="file" name="evaluasi_${i}"></label>
                        <label>Laporan Pemeriksaan <input type="file" name="laporan_pemeriksaan_${i}"></label>
                        <label>Sertifikat <input type="file" name="sertifikat_${i}"></label>
                        <label>Surat Tugas <input type="file" name="surat_tugas_${i}"></label>
                        <label>PNBP <input type="file" name="pnbp_${i}"></label>
                        <label>Foto/Dokumentasi <input type="file" name="foto_${i}"></label>
                    </div>
                </div>
            </div>`;
    } else if (type === "SERVICE") {
      html += `
            <div class="accordion-item open">
                <div class="accordion-header" onclick="toggleAccordion(this)"><span>1. Informasi & Alat</span> <i class="fa fa-chevron-down"></i></div>
                <div class="accordion-body" style="display:block;">
                    <div class="grid-form">
                        <label>Nama Penyedia Jasa <input type="text" name="namaPenyediaJasa_${i}" class="form-control" style="text-transform:uppercase" list="companyList"></label>
                        <label>Nama Kapal <input type="text" name="namaKapal_${i}" class="form-control" style="text-transform:uppercase"></label>
                        <label>Tanggal Validasi <input type="date" name="tglValidasi_${i}" class="form-control"></label>
                    </div>
                    
                    <div class="service-selection-box">
                        <label class="form-label-bold">Pilih Jenis Alat Keselamatan:</label>
                        <div class="service-options-container">
                            <label class="tool-checkbox-card">
                                <input type="checkbox" name="check_liferaft_${i}" value="LIFERAFT" onchange="updateServiceQty(${i})">
                                <div class="tool-card-design">
                                    <div class="tool-icon"><i class="fa fa-life-ring"></i></div>
                                    <span class="tool-text">1. LIFERAFT</span>
                                </div>
                            </label>
                            <label class="tool-checkbox-card">
                                <input type="checkbox" name="check_fe_${i}" value="FIRE EXTINGUISHER" onchange="updateServiceQty(${i})">
                                <div class="tool-card-design">
                                    <div class="tool-icon"><i class="fa fa-fire-extinguisher"></i></div>
                                    <span class="tool-text">2. FIRE EXTINGUISHER</span>
                                </div>
                            </label>
                        </div>
                        <div id="qty-container-${i}" class="qty-dynamic-area"></div>
                    </div>

                </div>
            </div>
            <div class="accordion-item">
                <div class="accordion-header" onclick="toggleAccordion(this)"><span>2. Upload Dokumen</span> <i class="fa fa-chevron-down"></i></div>
                <div class="accordion-body">
                    <div class="grid-form">
                        <label>Permohonan <input type="file" name="permohonan_${i}"></label>
                        <label>STKK <input type="file" name="stkk_${i}"></label>
                        <label>Sertifikat ILR PMK <input type="file" name="sertifikat_${i}"></label>
                    </div>
                </div>
            </div>`;
    }

    html += `</div></div>`;
    container.innerHTML += html;
  }
}

async function handleBulkSubmit(type) {
  let formId, countId, btnId;
  if (type === "SHSK") { formId = "formSHSK"; countId = "bulkCountSHSK"; btnId = "btn-save-SHSK"; } 
  else if (type === "SERTIFIKASI") { formId = "formSertifikasi"; countId = "bulkCountSertifikasi"; btnId = "btn-save-SERTIFIKASI"; } 
  else if (type === "SERVICE") { formId = "formService"; countId = "bulkCountService"; btnId = "btn-save-SERVICE"; }

  const form = document.getElementById(formId);
  const count = parseInt(document.getElementById(countId).value);
  const btnSave = document.getElementById(btnId);
  const originalText = btnSave.innerHTML;

  btnSave.innerHTML = '<i class="fa fa-spinner fa-spin"></i> MEMPROSES...';
  btnSave.disabled = true;
  showPopup("Sedang menyimpan data...", "info");

  const items = [];
  let fileFields = [];

  if (type === "SHSK") fileFields = ["permohonan", "stkk", "grosse", "ukur", "pnbp"];
  else if (type === "SERTIFIKASI") fileFields = ["permohonan", "evaluasi", "laporan_pemeriksaan", "sertifikat", "surat_tugas", "pnbp", "foto"];
  else if (type === "SERVICE") fileFields = ["permohonan", "stkk", "sertifikat"];

  for (let i = 1; i <= count; i++) {
    const itemData = {};
    let hasData = false;

    if (type === "SERVICE") {
      const penyedia = form.querySelector(`[name="namaPenyediaJasa_${i}"]`).value;
      if (penyedia.trim()) hasData = true;

      itemData.namaPenyediaJasa = penyedia.toUpperCase();
      itemData.namaKapal = form.querySelector(`[name="namaKapal_${i}"]`).value.toUpperCase();
      itemData.tglValidasi = form.querySelector(`[name="tglValidasi_${i}"]`).value;
      itemData.noUrut = form.querySelector(`[name="noUrut_${i}"]`).value;
      itemData.oldFolderUrl = form.querySelector(`[name="oldFolderUrl_${i}"]`).value;

      let jenisArr = [];
      let jumlahArr = [];
      const lrCheck = form.querySelector(`[name="check_liferaft_${i}"]`);
      const feCheck = form.querySelector(`[name="check_fe_${i}"]`);
      const lrQty = form.querySelector(`[name="jumlah_LIFERAFT_${i}"]`);
      const feQty = form.querySelector(`[name="jumlah_FE_${i}"]`);

      let counter = 1;
      if (lrCheck && lrCheck.checked) { jenisArr.push(`${counter}. LIFERAFT`); jumlahArr.push(lrQty ? lrQty.value : "0"); counter++; }
      if (feCheck && feCheck.checked) { jenisArr.push(`${counter}. FIRE EXTINGUISHER`); jumlahArr.push(feQty ? feQty.value : "0"); }

      itemData.jenisAlat = jenisArr.join("\n");
      itemData.jumlah = jumlahArr.join("\n");
    } else {
      const inputs = form.querySelectorAll(`[name$="_${i}"]`);
      inputs.forEach((input) => {
        const key = input.name.replace(`_${i}`, "");
        if (input.type !== "file" && !key.startsWith("check_") && !key.startsWith("jumlah_")) {
          itemData[key] = input.value.toUpperCase();
          if (key === "namaKapal" && input.value.trim() !== "") hasData = true;
        }
      });
    }

    if (!hasData) continue;

    itemData.files = [];
    for (const field of fileFields) {
      const fileInput = form.querySelector(`[name="${field}_${i}"]`);
      if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onload = (e) => {
            itemData.files.push({ jenis: field, ext: file.name.split(".").pop(), data: e.target.result });
            resolve();
          };
          reader.readAsDataURL(file);
        });
      }
    }
    items.push(itemData);
  }

  if (items.length === 0) { showPopup("Form masih kosong!", "error"); btnSave.innerHTML = originalText; btnSave.disabled = false; return; }

  let action = "";
  if (type === "SHSK") action = "uploadBulkSHSK";
  else if (type === "SERTIFIKASI") action = "uploadBulkSertifikasi";
  else if (type === "SERVICE") action = "uploadBulkService";

  if (items.length === 1 && items[0].noUrut) {
    if (type === "SHSK") action = "updateSHSK";
    else if (type === "SERTIFIKASI") action = "updateSertifikasi";
    else if (type === "SERVICE") action = "updateService";
    Object.assign(items[0], { action: action });
    const res = await postData(items[0]);
    handleResponse(res, type, form, originalText, btnSave, true);
    return;
  }

  const res = await postData({ action: action, items: items });
  handleResponse(res, type, form, originalText, btnSave, false);
}

function handleResponse(res, type, form, btnText, btnEl, isEdit) {
  btnEl.innerHTML = btnText;
  btnEl.disabled = false;

  if (res.status === "SUCCESS") {
    showPopup(isEdit ? "Data Diperbarui!" : "Data Berhasil Disimpan!", "success");
    form.reset();
    renderBulkForm(type);
    if (isEdit) cancelEdit(type);
    loadData(type);
    if (type !== "SERVICE") updateChartFilter(currentFilter);
    else initCharts(currentFilter);
  } else { showPopup("Gagal: " + res.message, "error"); }
}

// ====================================================================
// 8. EDIT DATA & LOCK MECHANISM
// ====================================================================

function editData(type, rowDataStr) {
  const rowData = JSON.parse(decodeURIComponent(rowDataStr));
  let formId, countId;

  if (type === "SHSK") { formId = "formSHSK"; countId = "bulkCountSHSK"; } 
  else if (type === "SERTIFIKASI") { formId = "formSertifikasi"; countId = "bulkCountSertifikasi"; } 
  else if (type === "SERVICE") { formId = "formService"; countId = "bulkCountService"; }

  showSection(`${type.toLowerCase()}-input`);
  const countSelect = document.getElementById(countId);
  countSelect.value = "1";
  renderBulkForm(type);

  const form = document.getElementById(formId);
  const setVal = (name, val) => {
    const el = form.querySelector(`[name="${name}_1"]`);
    if (el) {
      if (el.type === "date") el.value = formatDateForInput(val);
      else el.value = val;
      el.disabled = true;
    }
  };

  setVal("noUrut", rowData.NO_URUT);
  setVal("oldFolderUrl", rowData.LINK_FOLDER);

  if (type === "SHSK") {
    setVal("namaKapal", rowData.NAMA_KAPAL);
    setVal("tonase", rowData.TONASE_GT);
    setVal("tandaPendaftaran", rowData.TANDA_PENDAFTARAN);
    setVal("pemilik", rowData.PEMILIK);
    setVal("tempatStkk", rowData.TEMPAT_STKK);
    setVal("tglStkk", rowData.TANGGAL_STKK);
    setVal("noUrutStkk", rowData.NO_URUT_STKK);
    setVal("noHalStkk", rowData.NO_HAL_STKK);
    setVal("noBukuStkk", rowData.NO_BUKU_STKK);
    setVal("statusPengukuhan", rowData.STATUS_PENGUKUHAN);
    setVal("tglPengukuhan", rowData.TANGGAL_PENGUKUHAN);
  } else if (type === "SERTIFIKASI") {
    setVal("perusahaan", rowData.NAMA_PERUSAHAAN);
    setVal("namaKapal", rowData.NAMA_KAPAL);
    setVal("ukuran", rowData.UKURAN_GT);
    setVal("callSign", rowData.CALL_SIGN);
    setVal("bahan", rowData.BAHAN_KAPAL);
    setVal("keterangan", rowData.KETERANGAN);
    setVal("jenisSertifikat", rowData.JENIS_SERTIFIKAT);
    setVal("tglTerbit", rowData.TANGGAL_TERBIT);
    setVal("tglBerlaku", rowData.TANGGAL_MASA_BERLAKU);
    setVal("daerahPelayaran", rowData.DAERAH_PELAYARAN);
    setVal("noSertifikat", rowData.NOMOR_SERTIFIKAT);
    setVal("kodeBilling", rowData.KODE_BILLING);
    setVal("pemeriksa", rowData.NAMA_PEMERIKSA);
  } else if (type === "SERVICE") {
    setVal("namaPenyediaJasa", rowData.NAMA_PENYEDIA_JASA);
    setVal("namaKapal", rowData.NAMA_KAPAL);
    setVal("tglValidasi", rowData.TANGGAL_VALIDASI_SERVICE_REPORT);

    const jenisStr = rowData.JENIS_ALAT_YANG_DISERVICE || "";
    const jumlahStr = rowData.JUMLAH || "";
    const jumlahArr = jumlahStr.split("\n");

    if (jenisStr.includes("LIFERAFT")) { const ck = form.querySelector('[name="check_liferaft_1"]'); if (ck) ck.checked = true; }
    if (jenisStr.includes("FIRE EXTINGUISHER")) { const ck = form.querySelector('[name="check_fe_1"]'); if (ck) ck.checked = true; }

    updateServiceQty(1);

    let idx = 0;
    const lrInput = form.querySelector('[name="jumlah_LIFERAFT_1"]');
    if (lrInput && jenisStr.includes("LIFERAFT")) { lrInput.value = jumlahArr[idx] || 0; lrInput.disabled = true; idx++; }
    const feInput = form.querySelector('[name="jumlah_FE_1"]');
    if (feInput && jenisStr.includes("FIRE EXTINGUISHER")) { feInput.value = jumlahArr[idx] || 0; feInput.disabled = true; }

    form.querySelectorAll('[type="checkbox"]').forEach((c) => (c.disabled = true));
  }

  const allInputs = form.querySelectorAll("input, select");
  allInputs.forEach((i) => (i.disabled = true));

  const btnSaveOriginal = document.getElementById(`btn-save-${type}`);
  if(btnSaveOriginal) btnSaveOriginal.classList.add("hidden");

  let btnUnlock = document.getElementById(`btn-unlock-${type}`);
  if (!btnUnlock) {
    const btnContainer = btnSaveOriginal.parentNode; 
    btnUnlock = document.createElement("button");
    btnUnlock.type = "button";
    btnUnlock.id = `btn-unlock-${type}`;
    btnUnlock.className = "btn-edit-mode";
    btnUnlock.innerHTML = '<i class="fa fa-pencil-alt"></i> UBAH DATA';
    btnUnlock.onclick = () => enableEditMode(type);
    btnContainer.insertBefore(btnUnlock, btnSaveOriginal);
  }
  btnUnlock.classList.remove("hidden");

  const btnCancel = document.getElementById(`btn-cancel-${type}`);
  if(btnCancel) btnCancel.classList.remove("hidden");

  let btnUpdate = document.getElementById(`btn-update-${type}`);
  if (btnUpdate) btnUpdate.classList.add("hidden");

  showPopup("Mode Edit (Terkunci). Klik 'Ubah Data' untuk mengedit.", "info");
}

function enableEditMode(type) {
  const formId = type === "SHSK" ? "formSHSK" : type === "SERTIFIKASI" ? "formSertifikasi" : "formService";
  const form = document.getElementById(formId);
  const allInputs = form.querySelectorAll("input, select");
  
  allInputs.forEach((i) => (i.disabled = false));
  document.getElementById(`btn-unlock-${type}`).classList.add("hidden");

  let btnUpdate = document.getElementById(`btn-update-${type}`);
  if (!btnUpdate) {
    const btnUnlock = document.getElementById(`btn-unlock-${type}`);
    const btnContainer = btnUnlock.parentNode;
    btnUpdate = document.createElement("button");
    btnUpdate.id = `btn-update-${type}`;
    btnUpdate.className = "btn-gold-save";
    btnUpdate.style.background = "var(--neon-blue)";
    btnUpdate.innerHTML = '<i class="fa fa-save"></i> SIMPAN PERUBAHAN';
    btnUpdate.onclick = () => handleBulkSubmit(type);
    btnContainer.insertBefore(btnUpdate, btnUnlock);
  }
  btnUpdate.classList.remove("hidden");
  showPopup("Form Terbuka. Silakan edit.", "success");
}

function cancelEdit(type) {
  const formId = type === "SHSK" ? "formSHSK" : type === "SERTIFIKASI" ? "formSertifikasi" : "formService";
  const form = document.getElementById(formId);
  form.reset();
  renderBulkForm(type);

  document.getElementById(`btn-save-${type}`).classList.remove("hidden");
  document.getElementById(`btn-cancel-${type}`).classList.add("hidden");

  const btnUnlock = document.getElementById(`btn-unlock-${type}`);
  if (btnUnlock) btnUnlock.classList.add("hidden");

  const btnUpdate = document.getElementById(`btn-update-${type}`);
  if (btnUpdate) btnUpdate.classList.add("hidden");

  showSection(`${type.toLowerCase()}-data`);
}

// ====================================================================
// 9. TRIPLE EXPORT (DIRECT DOWNLOAD NO BLANK TAB)
// ====================================================================

async function exportTriple(type) {
  const btn = event.currentTarget;
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Processing...';
  btn.disabled = true;
  showPopup("Menyiapkan Laporan...", "info");

  const filters = {};
  if (type === "SHSK") {
    filters.bulan = document.getElementById("filterSHSKBulan").value;
    filters.tahun = document.getElementById("filterSHSKTahun").value;
    filters.search = document.getElementById("searchSHSK").value;
  } else if (type === "SERTIFIKASI") {
    filters.bulan = document.getElementById("filterSertBulan").value;
    filters.tahun = document.getElementById("filterSertTahun").value;
    filters.jenis = document.getElementById("filterSertJenis").value;
    filters.daerah = document.getElementById("filterSertDaerah").value;
    filters.search = document.getElementById("searchSertifikasi").value;
  } else if (type === "SERVICE") {
    filters.bulan = document.getElementById("filterServiceBulan").value;
    filters.tahun = document.getElementById("filterServiceTahun").value;
    filters.search = document.getElementById("searchService").value;
  }

  try {
    const res = await postData({ action: "exportTripleFile", type: type, filters: filters });
    if (res.status === "SUCCESS" && res.files) {
      showPopup("Laporan Siap! Mengunduh...", "success");
      
      // LOGIKA BARU: DOWNLOAD TANPA NEW TAB (BYPASS POPUP BLOCKER)
      res.files.forEach((f, index) => {
        if (f.url) {
           setTimeout(() => {
             const a = document.createElement('a');
             a.href = f.url;
             a.setAttribute('download', ''); // Trigger Direct Download
             a.style.display = 'none';
             document.body.appendChild(a);
             a.click();
             document.body.removeChild(a);
           }, index * 1500); // Jeda 1.5 detik per file biar ga dianggap spam
        }
      });

    } else { showPopup(res.message || "Gagal export", "error"); }
  } catch (e) { showPopup("Gagal koneksi", "error"); }

  btn.innerHTML = originalHtml;
  btn.disabled = false;
}

// TABLE LOGIC
let rawData = { SHSK: [], SERTIFIKASI: [], SERVICE: [] };
let filteredData = { SHSK: [], SERTIFIKASI: [], SERVICE: [] };
let currentPage = { SHSK: 1, SERTIFIKASI: 1, SERVICE: 1 };
const ROWS_PER_PAGE = 10;

async function loadData(type) {
  let tbodyId;
  if (type === "SHSK") tbodyId = "tbody-shsk";
  else if (type === "SERTIFIKASI") tbodyId = "tbody-sertifikasi";
  else if (type === "SERVICE") tbodyId = "tbody-service";

  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = '<tr><td colspan="16" style="text-align:center;">Sedang Memuat Data...</td></tr>';

  let action = "";
  if (type === "SHSK") action = "getDataSHSK";
  else if (type === "SERTIFIKASI") action = "getDataSertifikasi";
  else if (type === "SERVICE") action = "getDataService";

  const res = await postData({ action: action });
  if (res.status === "SUCCESS") {
    rawData[type] = res.data.reverse();
    filteredData[type] = rawData[type];
    currentPage[type] = 1;
    
    // --- POPULATE SMART SEARCH DATALIST ---
    let keyName = "";
    if(type === "SHSK") keyName = "PEMILIK";
    else if(type === "SERTIFIKASI") keyName = "NAMA_PERUSAHAAN";
    else if(type === "SERVICE") keyName = "NAMA_PENYEDIA_JASA";
    
    if(keyName) updateCompanyDatalist(rawData[type], keyName);
    
    renderTable(type);
    if (type === "SERTIFIKASI") populateFilterOptions(rawData[type]);
  } else { tbody.innerHTML = `<tr><td colspan="16" style="text-align:center;color:red">${res.message}</td></tr>`; }
}

function populateFilterOptions(data) {
  const select = document.getElementById("filterSertJenis");
  if (!select) return;
  const unique = [...new Set(data.map((item) => item.JENIS_SERTIFIKAT))].filter(Boolean).sort();
  let html = '<option value="">Semua Jenis</option>';
  unique.forEach((t) => (html += `<option value="${t}">${t}</option>`));
  select.innerHTML = html;
}

function applyFilter(type) {
  const filters = {};
  if (type === "SHSK") {
    filters.bulan = document.getElementById("filterSHSKBulan").value;
    filters.tahun = document.getElementById("filterSHSKTahun").value;
    filters.search = document.getElementById("searchSHSK").value.toUpperCase();
  } else if (type === "SERTIFIKASI") {
    filters.bulan = document.getElementById("filterSertBulan").value;
    filters.tahun = document.getElementById("filterSertTahun").value;
    filters.jenis = document.getElementById("filterSertJenis").value;
    filters.daerah = document.getElementById("filterSertDaerah").value.toUpperCase();
    filters.search = document.getElementById("searchSertifikasi").value.toUpperCase();
  } else if (type === "SERVICE") {
    filters.bulan = document.getElementById("filterServiceBulan").value;
    filters.tahun = document.getElementById("filterServiceTahun").value;
    filters.search = document.getElementById("searchService").value.toUpperCase();
  }

  filteredData[type] = rawData[type].filter((row) => {
    let pass = true;
    let dateStr = "";
    if (type === "SHSK") dateStr = row["TANGGAL_PENGUKUHAN"];
    else if (type === "SERTIFIKASI") dateStr = row["TANGGAL_TERBIT"];
    else if (type === "SERVICE") dateStr = row["TANGGAL_VALIDASI_SERVICE_REPORT"];

    const d = new Date(dateStr);
    if (filters.tahun && d.getFullYear().toString() !== filters.tahun) pass = false;
    if (filters.bulan && (d.getMonth() + 1).toString() !== filters.bulan) pass = false;

    if (type === "SERTIFIKASI") {
      if (filters.jenis && row["JENIS_SERTIFIKAT"] !== filters.jenis) pass = false;
      if (filters.daerah && !String(row["DAERAH_PELAYARAN"]).toUpperCase().includes(filters.daerah)) pass = false;
    }
    if (filters.search) {
      const rowText = Object.values(row).join(" ").toUpperCase();
      if (!rowText.includes(filters.search)) pass = false;
    }
    return pass;
  });

  currentPage[type] = 1;
  renderTable(type);
  showPopup(`Filter diterapkan: ${filteredData[type].length} data ditemukan.`, "info");
}

function renderTable(type) {
  let tbodyId = "";
  if (type === "SHSK") tbodyId = "tbody-shsk";
  else if (type === "SERTIFIKASI") tbodyId = "tbody-sertifikasi";
  else if (type === "SERVICE") tbodyId = "tbody-service";

  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = "";
  const start = (currentPage[type] - 1) * ROWS_PER_PAGE;
  const pageData = filteredData[type].slice(start, start + ROWS_PER_PAGE);
  if (pageData.length === 0) { tbody.innerHTML = '<tr><td colspan="16" style="text-align:center;">Data Tidak Ditemukan</td></tr>'; return; }

  pageData.forEach((row, i) => {
    const rowStr = encodeURIComponent(JSON.stringify(row));
    let tr = `<tr><td>${start + i + 1}</td>`;

    if (type === "SHSK") {
      tr += `<td>${row["NAMA_KAPAL"]}</td><td>${row["TONASE_GT"]}</td><td>${row["TANDA_PENDAFTARAN"]}</td>
             <td>${row["PEMILIK"]}</td><td>${row["TEMPAT_STKK"]}</td><td>${formatDate(row["TANGGAL_STKK"])}</td>
             <td>${row["NO_URUT_STKK"]}</td><td>${row["NO_HAL_STKK"]}</td><td>${row["NO_BUKU_STKK"]}</td>
             <td>${row["STATUS_PENGUKUHAN"]}</td><td>${formatDate(row["TANGGAL_PENGUKUHAN"])}</td>`;
    } else if (type === "SERTIFIKASI") {
      tr += `<td>${row["NAMA_PERUSAHAAN"]}</td><td>${row["NAMA_KAPAL"]}</td><td>${row["UKURAN_GT"]}</td>
             <td>${row["CALL_SIGN"]}</td><td>${row["BAHAN_KAPAL"]}</td><td>${row["KETERANGAN"]}</td>
             <td>${row["JENIS_SERTIFIKAT"]}</td><td>${formatDate(row["TANGGAL_TERBIT"])}</td>
             <td>${formatDate(row["TANGGAL_MASA_BERLAKU"])}</td><td>${row["DAERAH_PELAYARAN"] || "-"}</td>
             <td>${row["NOMOR_SERTIFIKAT"]}</td><td>${row["KODE_BILLING"]}</td><td>${row["NAMA_PEMERIKSA"]}</td>`;
    } else if (type === "SERVICE") {
      const jenisTampil = String(row["JENIS_ALAT_YANG_DISERVICE"]).replace(/\n/g, "<br>");
      const jumlahTampil = String(row["JUMLAH"]).replace(/\n/g, "<br>");
      tr += `<td>${row["NAMA_PENYEDIA_JASA"]}</td><td>${row["NAMA_KAPAL"]}</td><td style="text-align:left;">${jenisTampil}</td><td style="text-align:center;">${jumlahTampil}</td><td>${formatDate(row["TANGGAL_VALIDASI_SERVICE_REPORT"])}</td>`;
    }

    tr += `<td><div style="display:flex; justify-content:center; gap:5px;">
             <button class="btn-act btn-view" onclick="window.open('${row["LINK_FOLDER"]}', '_blank')"><i class="fa fa-folder-open"></i></button>
             <button class="btn-act btn-edit" onclick="editData('${type}', '${rowStr}')"><i class="fa fa-pencil-alt"></i></button>
             <button class="btn-act btn-del" onclick="prepareDelete('${type}', '${rowStr}')"><i class="fa fa-trash"></i></button>
           </div></td></tr>`;
    tbody.innerHTML += tr;
  });
  document.getElementById(`page-info-${type}`).innerText = `Hal ${currentPage[type]}`;
}

function prevPage(t) { if (currentPage[t] > 1) { currentPage[t]--; renderTable(t); } }
function nextPage(t) { if (currentPage[t] * ROWS_PER_PAGE < filteredData[t].length) { currentPage[t]++; renderTable(t); } }

// ====================================================================
// DELETE HANDLER (DENGAN ANIMASI LOADING)
// ====================================================================
let pendingDelete = null;

function prepareDelete(type, rowDataStr) {
  const rowData = JSON.parse(decodeURIComponent(rowDataStr));
  pendingDelete = { type: type, noUrut: rowData.NO_URUT || rowData["NO URUT"], folderUrl: rowData.LINK_FOLDER };
  document.getElementById("modal-delete").classList.remove("hidden");
}

function closeDeleteModal() {
  document.getElementById("modal-delete").classList.add("hidden");
  pendingDelete = null;
}

async function executeDelete() {
  if (!pendingDelete) return;
  const btnConfirm = document.querySelector("#modal-delete .btn-confirm-logout");
  const originalHtml = btnConfirm.innerHTML; 

  btnConfirm.innerHTML = '<i class="fa fa-spinner fa-spin"></i> MENGHAPUS...';
  btnConfirm.disabled = true;
  btnConfirm.style.opacity = "0.7";
  btnConfirm.style.cursor = "not-allowed";

  let action = "";
  if (pendingDelete.type === "SHSK") action = "deleteSHSK";
  else if (pendingDelete.type === "SERTIFIKASI") action = "deleteSertifikasi";
  else if (pendingDelete.type === "SERVICE") action = "deleteService";

  try {
      const res = await postData({ action: action, noUrut: pendingDelete.noUrut });
      if (res.status === "SUCCESS") {
          showPopup("Data Berhasil Dihapus Selamanya!", "success");
          loadData(pendingDelete.type);
          if(typeof updateChartFilter === "function") updateChartFilter(currentFilter);
      } else { showPopup("Gagal menghapus: " + res.message, "error"); }
  } catch (error) { showPopup("Gagal koneksi ke server.", "error"); }

  btnConfirm.innerHTML = originalHtml;
  btnConfirm.disabled = false;
  btnConfirm.style.opacity = "1";
  btnConfirm.style.cursor = "pointer";
  closeDeleteModal();
}

// ====================================================================
// PENGGUNA DASHBOARD
// ====================================================================
let penggunaFiles = [];

function initPenggunaDashboard() {
  const u = JSON.parse(localStorage.getItem("user"));
  if (!u) { window.location.href = "index.html"; return; }
  if (document.getElementById("nav-user-name")) document.getElementById("nav-user-name").innerText = u.nama;
  if (document.getElementById("nav-company-name")) document.getElementById("nav-company-name").innerText = u.extra || "PERUSAHAAN";
  if (document.getElementById("mob-user-name")) document.getElementById("mob-user-name").innerText = u.nama;
  if (document.getElementById("mob-company-name")) document.getElementById("mob-company-name").innerText = u.extra || "PERUSAHAAN";
  fetchPenggunaFiles(u.extra);
}

async function fetchPenggunaFiles(c) {
  const dropdownTahun = document.getElementById("reqTahun");
  dropdownTahun.innerHTML = "<option>Sedang memuat data...</option>";
  dropdownTahun.disabled = true;

  try {
    const res = await postData({ action: "getDropdownData", perusahaan: c });
    if (res.status === "SUCCESS") {
      penggunaFiles = res.data;
      if (penggunaFiles.length > 0) { populateYear(); } 
      else { dropdownTahun.innerHTML = '<option value="">Data Tidak Ditemukan</option>'; showPopup("Belum ada arsip untuk perusahaan Anda.", "info"); }
    } else { dropdownTahun.innerHTML = '<option value="">Gagal Memuat</option>'; showPopup("Gagal mengambil data server.", "error"); }
  } catch (e) { dropdownTahun.innerHTML = '<option value="">Error Koneksi</option>'; }
}

function populateYear() {
  const s = document.getElementById("reqTahun");
  const y = [...new Set(penggunaFiles.map((i) => i.tahun))].sort().reverse();
  s.innerHTML = '<option value="">-- Pilih Tahun --</option>';
  y.forEach((v) => { if (v && v !== "-") s.innerHTML += `<option value="${v}">${v}</option>`; });
  s.disabled = false;
}

window.filterMonth = function () {
  const y = document.getElementById("reqTahun").value;
  const s = document.getElementById("reqBulan");
  s.innerHTML = '<option value="">-- Pilih Bulan --</option>';
  document.getElementById("reqKapal").innerHTML = '<option value="">-- Pilih Tahun Terlebih Dahulu --</option>';
  if (!y) { s.disabled = true; return; }
  const m = [...new Set(penggunaFiles.filter((i) => i.tahun == y).map((i) => i.bulan))].sort((a, b) => a - b);
  m.forEach((v) => (s.innerHTML += `<option value="${v}">${getMonthName(v)}</option>`));
  s.disabled = false;
};

window.filterShip = function () {
  const y = document.getElementById("reqTahun").value;
  const m = document.getElementById("reqBulan").value;
  const s = document.getElementById("reqKapal");
  s.innerHTML = '<option value="">-- Pilih Kapal --</option>';
  if (!m) { s.disabled = true; return; }
  const ships = [...new Set(penggunaFiles.filter((i) => i.tahun == y && i.bulan == m).map((i) => i.kapal))];
  ships.forEach((v) => (s.innerHTML += `<option value="${v}">${v}</option>`));
  s.disabled = false;
};

window.filterType = function () {
  const y = document.getElementById("reqTahun").value;
  const m = document.getElementById("reqBulan").value;
  const sh = document.getElementById("reqKapal").value;
  const s = document.getElementById("reqJenis");
  s.innerHTML = "";
  if (!sh) { s.disabled = true; return; }
  const docs = penggunaFiles.filter((i) => i.tahun == y && i.bulan == m && i.kapal == sh);
  if (docs.length === 0) { s.innerHTML = "<option>Tidak ada dokumen</option>"; } 
  else { docs.forEach((v) => (s.innerHTML += `<option value="${v.link}">${v.jenis}</option>`)); }
  s.disabled = false;
};

// --- FUNGSI KIRIM EMAIL (MULTI-SELECT SUPPORT) ---
window.handleRequestSubmit = async function (e) {
  e.preventDefault();
  const s = document.getElementById("reqJenis");
  const opts = Array.from(s.selectedOptions);
  
  if (opts.length === 0 || s.value === "") { 
      showPopup("Silakan pilih minimal satu dokumen!", "error"); 
      return; 
  }

  const jenisList = opts.map(o => o.text);
  const sampleLink = s.value; 

  const u = JSON.parse(localStorage.getItem("user"));
  const btn = document.getElementById("btnKirimReq");
  const originalText = btn.innerText;
  
  btn.innerText = "MENGIRIM...";
  btn.disabled = true;

  await postData({ 
      action: "sendReportEmail", 
      email: u.id, 
      namaUser: u.nama, 
      perusahaan: u.extra, 
      kapal: document.getElementById("reqKapal").value, 
      jenis: jenisList, 
      tahun: document.getElementById("reqTahun").value, 
      bulan: getMonthName(document.getElementById("reqBulan").value), 
      link: sampleLink 
  });

  showPopup("Link download telah dikirim ke email Anda!", "success");
  btn.innerText = originalText;
  btn.disabled = false;
};

function getMonthName(i) {
  const m = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  return m[i - 1] || i;
}
