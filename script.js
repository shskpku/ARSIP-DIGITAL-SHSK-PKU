/* ====================================================================
   SCRIPT.JS - SHSK PEKANBARU (FULL VERSION - NO ABBREVIATION)
   Fitur: 
   1. Login UX (Auto Reset, Loading, Name Notification)
   2. Sidebar Accordion (Satu buka, yang lain tutup)
   3. Bulk Input Form Lengkap (Section & Dropdown)
   4. Profil Pengguna & Petugas (Auto Load)
   5. Chart & Filter Dashboard
   6. Triple Export & Smart Filter
   ==================================================================== */

// ⚠️ PASTE URL WEB APP (DEPLOYMENT BARU) KAMU DI SINI
const API_URL = "https://script.google.com/macros/s/AKfycbwo5j74mC6sMx4NPlfrFRIVkLT5tTgfFU5rPymDjRzjPjcDKwgjaVXVhkGa6tkVwK_mFA/exec"; 

// ====================================================================
// 1. UTILITIES & HELPER
// ====================================================================

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

  // Tampilkan popup selama 4 detik
  setTimeout(() => popup.classList.add("show"), 10);
  setTimeout(() => popup.classList.remove("show"), 4000);
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
    return { status: "ERROR", message: "Koneksi Terputus. Cek internet Anda." };
  }
}

// ====================================================================
// 2. AUTO LOGOUT & SESSION
// ====================================================================

let idleTime = 0;
function resetIdleTimer() { idleTime = 0; }

function initAutoLogout() {
  // Cek setiap 1 menit
  setInterval(() => {
    idleTime++;
    if (idleTime >= 60) { // 60 menit = 1 jam
      // Panggil fungsi logout yang memunculkan modal
      logout(); 
    }
  }, 60000); 

  // Reset timer jika ada aktivitas
  window.onmousemove = resetIdleTimer;
  window.onkeypress = resetIdleTimer;
  window.onclick = resetIdleTimer;
  window.onscroll = resetIdleTimer;
}

// ====================================================================
// 3. AUTHENTICATION (LOGIN, LOGOUT, OTP)
// ====================================================================

async function handleLogin(e, role) {
  if (e) e.preventDefault();
  
  // Definisi ID berdasarkan index.html kamu
  let idInputId, passInputId, btnId;
  
  if (role === 'PETUGAS') {
      idInputId = 'nip';
      passInputId = 'passPetugas';
      btnId = 'btnSubmitPetugas';
  } else {
      idInputId = 'email';
      passInputId = 'passPengguna';
      btnId = 'btnSubmitPengguna';
  }

  const idInput = document.getElementById(idInputId);
  const passInput = document.getElementById(passInputId);
  const btn = document.getElementById(btnId);

  // Validasi Input
  if (!idInput || !passInput || !idInput.value || !passInput.value) { 
      showPopup("Data login tidak lengkap.", "error"); 
      return; 
  }
  
  // Simpan state tombol asli
  const originalText = btn.innerHTML; 
  
  // Ubah ke Loading State
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> MEMPROSES...';
  btn.disabled = true;
  btn.style.opacity = "0.7";

  showPopup("Sedang memverifikasi...", "info");
  
  try {
    const res = await postData({ 
        action: "login", 
        role: role, 
        id: idInput.value, 
        password: passInput.value 
    });
    
    if (res.status === "SUCCESS") {
      // --- LOGIN SUKSES ---
      localStorage.setItem("user", JSON.stringify(res.data));
      showPopup(`Login Berhasil! Selamat datang, ${res.data.nama}`, "success");
      
      // Delay 3 Detik agar user sempat membaca pesan sukses
      setTimeout(() => { 
          window.location.href = role === "PETUGAS" ? "petugas.html" : "pengguna.html"; 
      }, 3000);

    } else { 
      // --- LOGIN GAGAL ---
      showPopup(res.message, "error"); 
      
      // 1. Reset Tombol ke semula
      btn.innerHTML = originalText;
      btn.disabled = false;
      btn.style.opacity = "1";

      // 2. Kosongkan Password & ID
      passInput.value = "";
      idInput.value = ""; 
      
      // 3. Fokuskan kursor kembali ke ID
      idInput.focus();
    }

  } catch (error) { 
    // --- ERROR KONEKSI ---
    showPopup("Gagal terhubung ke server.", "error");
    
    // Reset Tombol
    btn.innerHTML = originalText;
    btn.disabled = false;
    btn.style.opacity = "1";
  }
}

// Fungsi Logout (Munculkan Modal)
function logout() { 
    const modal = document.getElementById("modal-logout");
    if(modal) modal.classList.remove("hidden"); 
}

// Tutup Modal Logout
function closeLogoutModal() { 
    const modal = document.getElementById("modal-logout");
    if(modal) modal.classList.add("hidden"); 
}

// Konfirmasi Logout (Aksi Nyata)
function confirmLogout() { 
    localStorage.removeItem("user"); 
    window.location.href = "index.html"; 
}

// --- OTP & Reset Password ---

async function requestOTP() {
  const email = document.getElementById("reset-email").value;
  if (!email) { showPopup("Masukkan email terlebih dahulu!", "error"); return; }
  
  showPopup("Mengirim kode OTP...", "info");
  const res = await postData({ action: "sendOTP", email: email });
  
  if (res.status === "SUCCESS") {
    showPopup("Kode OTP berhasil dikirim ke email!", "success");
    document.getElementById("step-email").classList.add("hidden");
    document.getElementById("step-otp").classList.remove("hidden");
  } else {
    showPopup(res.message, "error");
  }
}

async function verifyOTP() {
  const email = document.getElementById("reset-email").value;
  const otp = document.getElementById("reset-otp").value;
  if (!otp) { showPopup("Masukkan kode OTP!", "error"); return; }
  
  const res = await postData({ action: "verifyOTP", email: email, otp: otp });
  
  if (res.status === "SUCCESS") {
    showPopup("OTP Valid! Silakan buat password baru.", "success");
    document.getElementById("step-otp").classList.add("hidden");
    document.getElementById("step-newpass").classList.remove("hidden");
  } else {
    showPopup(res.message, "error");
  }
}

async function resetPasswordFinal() {
  const email = document.getElementById("reset-email").value;
  const newPass = document.getElementById("reset-newpass").value;
  if (!newPass) { showPopup("Masukkan password baru!", "error"); return; }
  
  showPopup("Menyimpan password baru...", "info");
  const res = await postData({ action: "resetPasswordFinal", email: email, newPassword: newPass });
  
  if (res.status === "SUCCESS") {
    showPopup("Password berhasil diubah! Silakan login.", "success");
    setTimeout(() => window.location.href = "index.html", 2000); // Redirect ke login
  } else {
    showPopup(res.message, "error");
  }
}

// ====================================================================
// 4. PAGE INITIALIZATION & NAVIGATION
// ====================================================================

document.addEventListener("DOMContentLoaded", () => {
  // Cek kita ada di halaman mana
  if (document.querySelector(".dashboard-page")) {
      // Halaman Pengguna
      initPenggunaDashboard();
      initAutoLogout();
  } else if (document.querySelector(".petugas-page")) {
      // Halaman Petugas
      loadProfilePetugas();
      
      // Set default filter chart ke 'Tahun Ini'
      const defaultBtn = document.querySelector('.filter-btn.active');
      updateChartFilter("year", defaultBtn); 
      
      // Render Form Bulk Input
      renderBulkForm('SHSK'); 
      renderBulkForm('SERTIFIKASI'); 
      
      initAutoLogout();
  }
});

// Toggle Sidebar Mobile
function toggleSidebar() { 
    const s = document.getElementById("sidebar"); 
    const o = document.getElementById("sidebar-overlay"); 
    s.classList.toggle("show"); 
    o.classList.toggle("active"); 
}

// Navigasi Halaman Utama (Dashboard/SHSK/Sertifikasi)
function showSection(id, el) { 
    // Sembunyikan semua section
    document.querySelectorAll(".main-content > div").forEach(d => d.classList.add("hidden")); 
    
    // Munculkan section yang dipilih
    const target = document.getElementById(`sec-${id}`);
    if(target) target.classList.remove("hidden"); 
    
    // Atur class active pada menu sidebar
    document.querySelectorAll(".menu-item").forEach(m => m.classList.remove("active"));
    if(el) el.classList.add("active");

    // Jika masuk ke halaman data, load datanya
    if(id.includes("data")) {
        loadData(id.includes("shsk") ? "SHSK" : "SERTIFIKASI");
    }

    // Auto Close Sidebar di Mobile setelah klik menu
    if (window.innerWidth <= 900) {
        const s = document.getElementById("sidebar");
        const o = document.getElementById("sidebar-overlay");
        if (s.classList.contains("show")) {
            s.classList.remove("show");
            o.classList.remove("active");
        }
    }
}

// Sidebar Accordion Logic (Satu Buka, Lain Tutup)
function toggleSubmenu(id) { 
    const targetSubmenu = document.getElementById(id);
    const isCurrentlyOpen = targetSubmenu.classList.contains("show");

    // 1. Reset: Tutup semua submenu lain
    document.querySelectorAll(".submenu-container").forEach(el => el.classList.remove("show"));
    // 2. Reset: Hapus class 'open' (rotasi panah) dari semua menu item
    document.querySelectorAll(".menu-item.has-submenu").forEach(el => el.classList.remove("open"));

    // 3. Jika submenu target tadi tertutup, sekarang BUKA
    if (!isCurrentlyOpen) {
        targetSubmenu.classList.add("show");
        
        // Cari elemen pemicu (menu item di atasnya) untuk nambah class open
        const trigger = targetSubmenu.previousElementSibling;
        if (trigger && trigger.classList.contains('menu-item')) {
            trigger.classList.add("open");
        }
    }
}

// Global Accordion Function (Untuk Form Bulk Input)
window.toggleAccordion = function(headerElement) {
    const item = headerElement.closest('.accordion-item');
    if (item) {
        item.classList.toggle("open");
    }
}

// ====================================================================
// 5. CHART & DASHBOARD STATISTICS
// ====================================================================

let barChartInstance = null;
let doughnutChartInstance = null;
let currentFilter = "year";

function updateChartFilter(period, btnElement) {
  currentFilter = period;
  
  // Hapus active dari semua tombol filter
  document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.remove("active");
  });

  // Tambahkan active ke tombol yang diklik
  if (btnElement) {
      btnElement.classList.add("active");
  } else {
      // Fallback selector jika dipanggil manual
      const targetBtn = Array.from(document.querySelectorAll(".filter-btn")).find(b => b.innerText.toLowerCase().includes(period === 'year' ? 'tahun' : period === 'month' ? 'bulan' : period === 'week' ? 'minggu' : 'hari'));
      if(targetBtn) targetBtn.classList.add("active");
  }

  // Load ulang chart
  initCharts(period);
}

async function initCharts(p = "year") {
  if (!document.getElementById("barChart")) return;
  
  const res = await postData({ action: "getDashboardStats", period: p });
  let d = { year: new Date().getFullYear(), totalYear: 0, labels: [], counts: [] };
  
  if (res.status === "SUCCESS") d = res.data;

  // Update Judul Target
  const titleEl = document.querySelector(".chart-card h3 i.fa-bullseye");
  if(titleEl && titleEl.parentNode) titleEl.parentNode.innerHTML = `<i class="fa fa-bullseye" style="color: var(--gold)"></i> Target ${d.year}`;
  
  // Hitung Target
  const totalTarget = 2040;
  const sisa = totalTarget - d.totalYear;
  
  // Update Info Text
  const targetInfo = document.querySelector(".target-info");
  if(targetInfo) {
      targetInfo.innerHTML = `
        <span><i class="fa fa-circle" style="color: #eee"></i> Sisa: <b>${sisa.toLocaleString()}</b></span>
        <span><i class="fa fa-circle" style="color: #00c853"></i> Terbit: <b>${d.totalYear.toLocaleString()}</b></span>
      `;
  }

  // Render Bar Chart
  const ctxBar = document.getElementById("barChart").getContext("2d");
  if (barChartInstance) barChartInstance.destroy();
  barChartInstance = new Chart(ctxBar, {
    type: "bar",
    data: {
      labels: d.labels,
      datasets: [{
        label: "Arsip",
        data: d.counts,
        backgroundColor: "rgba(10, 25, 47, 0.8)",
        borderColor: "rgba(10, 25, 47, 1)",
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });

  // Render Doughnut Chart
  const ctxD = document.getElementById("doughnutChart").getContext("2d");
  if (doughnutChartInstance) doughnutChartInstance.destroy();
  doughnutChartInstance = new Chart(ctxD, {
    type: "doughnut",
    data: {
      labels: ["Tercapai", "Sisa"],
      datasets: [{
        data: [d.totalYear, sisa < 0 ? 0 : sisa],
        backgroundColor: ["#00c853", "#eee"],
        borderWidth: 0,
      }],
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: "75%", plugins: { legend: { display: false } } }
  });
}

// ====================================================================
// 6. PROFILE DATA (PETUGAS & PENGGUNA)
// ====================================================================

function loadProfilePetugas() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) { window.location.href = "index.html"; return; }

  if (document.getElementById("nav-name")) document.getElementById("nav-name").innerText = user.nama;
  if (document.getElementById("sidebar-name")) document.getElementById("sidebar-name").innerText = user.nama;
  
  // Tampilkan NIP (dari user.id)
  if (document.getElementById("sidebar-nip")) document.getElementById("sidebar-nip").innerText = "NIP. " + (user.id || "-");
  
  if (document.getElementById("dash-name")) document.getElementById("dash-name").innerText = user.nama.split(" ")[0];
  if (document.getElementById("sidebar-role")) document.getElementById("sidebar-role").innerText = user.extra || "PETUGAS";

  const sbInitial = document.getElementById("sidebar-initial");
  if (sbInitial && user.foto) {
    sbInitial.innerHTML = `<img src="${user.foto}" class="profile-img-fit">`;
    sbInitial.style.border = "2px solid var(--gold)";
  }
}

let penggunaFiles = [];
function initPenggunaDashboard() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) { window.location.href = "index.html"; return; }
    
    // Isi Data Profil Pengguna
    if(document.getElementById("nav-user-name")) document.getElementById("nav-user-name").innerText = user.nama;
    if(document.getElementById("nav-company-name")) document.getElementById("nav-company-name").innerText = user.extra || "PERUSAHAAN";
    
    if(document.getElementById("mob-user-name")) document.getElementById("mob-user-name").innerText = user.nama;
    if(document.getElementById("mob-company-name")) document.getElementById("mob-company-name").innerText = user.extra || "PERUSAHAAN";
    
    if(document.getElementById("email-display-text")) document.getElementById("email-display-text").innerText = user.id; // Email ada di user.id
    
    // Ambil Data File untuk Dropdown
    fetchPenggunaFiles(user.extra); 
}

async function fetchPenggunaFiles(company) {
  const res = await postData({ action: "getDropdownData", perusahaan: company });
  if (res.status === "SUCCESS") {
      penggunaFiles = res.data; 
      populateYear(); 
  }
}

// ====================================================================
// 7. BULK INPUT ENGINE (RENDER FORM LENGKAP)
// ====================================================================

function renderBulkForm(type) {
    const countSelect = document.getElementById(type === 'SHSK' ? 'bulkCountSHSK' : 'bulkCountSertifikasi');
    const container = document.getElementById(`bulk-container-${type}`);
    if(!container || !countSelect) return;

    const count = parseInt(countSelect.value);
    container.innerHTML = ""; 

    for(let i = 1; i <= count; i++) {
        let html = `
        <div class="data-wrapper" style="margin-bottom:30px; border:2px solid var(--navy); border-radius:10px; overflow:hidden;">
            <div style="background:var(--navy); color:#fff; padding:10px 15px; font-weight:bold;">
                <i class="fa fa-ship"></i> DATA KE-${i}
            </div>
            <div style="padding:15px; background:#fff;">
                <input type="hidden" name="noUrut_${i}">
                <input type="hidden" name="oldFolderUrl_${i}">
        `;

        if(type === 'SHSK') {
            // === FORM SHSK LENGKAP ===
            html += `
            <div class="accordion-item open">
                <div class="accordion-header" onclick="toggleAccordion(this)"><span>1. Informasi Kapal</span> <i class="fa fa-chevron-down"></i></div>
                <div class="accordion-body" style="display:block;">
                    <div class="grid-form">
                        <label>Nama Kapal <input type="text" name="namaKapal_${i}" class="form-control" style="text-transform:uppercase"></label>
                        <label>Tonase <input type="text" name="tonase_${i}" class="form-control"></label>
                        <label>Tanda Pendaftaran <input type="text" name="tandaPendaftaran_${i}" class="form-control"></label>
                        <label>Pemilik <input type="text" name="pemilik_${i}" class="form-control" style="text-transform:uppercase"></label>
                    </div>
                </div>
            </div>
            <div class="accordion-item">
                <div class="accordion-header" onclick="toggleAccordion(this)"><span>2. Penerbitan STKK</span> <i class="fa fa-chevron-down"></i></div>
                <div class="accordion-body">
                    <div class="grid-form">
                        <label>Tempat STKK <input type="text" name="tempatStkk_${i}" class="form-control"></label>
                        <label>Tgl STKK <input type="date" name="tglStkk_${i}" class="form-control"></label>
                        <label>No Urut <input type="text" name="noUrutStkk_${i}" class="form-control"></label>
                        <label>No Hal <input type="text" name="noHalStkk_${i}" class="form-control"></label>
                        <label>No Buku <input type="text" name="noBukuStkk_${i}" class="form-control"></label>
                    </div>
                </div>
            </div>
            <div class="accordion-item">
                <div class="accordion-header" onclick="toggleAccordion(this)"><span>3. Pengukuhan</span> <i class="fa fa-chevron-down"></i></div>
                <div class="accordion-body">
                    <div class="grid-form">
                        <label>Status <input type="text" name="statusPengukuhan_${i}" class="form-control" style="text-transform:uppercase"></label>
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
            </div>
            `;
        } else {
            // === FORM SERTIFIKASI LENGKAP ===
            html += `
            <div class="accordion-item open">
                <div class="accordion-header" onclick="toggleAccordion(this)"><span>1. Informasi Kapal</span> <i class="fa fa-chevron-down"></i></div>
                <div class="accordion-body" style="display:block;">
                    <div class="grid-form">
                        <label>Perusahaan <input type="text" name="perusahaan_${i}" class="form-control" style="text-transform:uppercase"></label>
                        <label>Nama Kapal <input type="text" name="namaKapal_${i}" class="form-control" style="text-transform:uppercase"></label>
                        <label>Ukuran (GT) <input type="text" name="ukuran_${i}" class="form-control"></label>
                        <label>Call Sign <input type="text" name="callSign_${i}" class="form-control"></label>
                        <label>Bahan <input type="text" name="bahan_${i}" class="form-control"></label>
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
                            <select name="jenisSertifikat_${i}" class="form-control">
                                <option value="">-- Pilih Jenis --</option>
                                <option value="SEA TRIAL">SEA TRIAL</option>
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
                                <option value="LIFE RAFT">LIFE RAFT</option>
                                <option value="FIRE EXTINGUISHER">FIRE EXTINGUISHER</option>
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
                                <option value="BUSTANUL ARIFIN, S.A.P.">BUSTANUL ARIFIN, S.A.P.</option>
                                <option value="HARNO SIAGIAN, A.Md">HARNO SIAGIAN, A.Md</option>
                                <option value="ANTON SUJARWADI, S.Si.T, M.M.">ANTON SUJARWADI, S.Si.T, M.M.</option>
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
            </div>
            `;
        }

        html += `</div></div>`; 
        container.innerHTML += html;
    }
}

async function handleBulkSubmit(type) {
    const form = document.getElementById(type === 'SHSK' ? 'formSHSK' : 'formSertifikasi');
    const count = parseInt(document.getElementById(type === 'SHSK' ? 'bulkCountSHSK' : 'bulkCountSertifikasi').value);
    const btnSave = document.getElementById(`btn-save-${type}`);
    const originalText = btnSave.innerHTML;
    
    // Loading State
    btnSave.innerHTML = '<i class="fa fa-spinner fa-spin"></i> MEMPROSES...';
    btnSave.disabled = true;
    showPopup("Sedang menyimpan data...", "info");

    const items = [];
    const fileFields = type === 'SHSK' 
        ? ['permohonan', 'stkk', 'grosse', 'ukur', 'pnbp'] 
        : ['permohonan', 'evaluasi', 'laporan_pemeriksaan', 'sertifikat', 'surat_tugas', 'pnbp', 'foto'];

    for (let i = 1; i <= count; i++) {
        const itemData = {};
        const inputs = form.querySelectorAll(`[name$="_${i}"]`);
        
        let hasData = false;
        
        inputs.forEach(input => {
            const key = input.name.replace(`_${i}`, ''); 
            if(input.type !== 'file') {
                itemData[key] = input.value.toUpperCase();
                if(key === 'namaKapal' && input.value.trim() !== "") hasData = true;
            }
        });

        if(!hasData) continue; 

        // Handle Files
        itemData.files = [];
        for (const field of fileFields) {
            const fileInput = form.querySelector(`[name="${field}_${i}"]`);
            if (fileInput && fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const reader = new FileReader();
                await new Promise(resolve => {
                    reader.onload = e => {
                        itemData.files.push({
                            jenis: field,
                            ext: file.name.split('.').pop(),
                            data: e.target.result
                        });
                        resolve();
                    };
                    reader.readAsDataURL(file);
                });
            }
        }
        items.push(itemData);
    }

    if(items.length === 0) {
        showPopup("Form masih kosong!", "error");
        btnSave.innerHTML = originalText;
        btnSave.disabled = false;
        return;
    }

    // Logic Update vs Upload
    let action = type === 'SHSK' ? 'uploadBulkSHSK' : 'uploadBulkSertifikasi';
    
    // Jika 1 item dan ada No Urut, berarti Update
    if(items.length === 1 && items[0].noUrut) {
        action = type === 'SHSK' ? 'updateSHSK' : 'updateSertifikasi';
        Object.assign(items[0], {action: action}); 
        
        const res = await postData(items[0]);
        handleResponse(res, type, form, originalText, btnSave, true);
        return;
    }

    // Bulk Upload
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
        if(isEdit) cancelEdit(type);
        loadData(type);
        updateChartFilter(currentFilter);
    } else {
        showPopup("Gagal: " + res.message, "error");
    }
}

// ====================================================================
// 8. EDIT DATA & LOCKING (EDIT TERKUNCI DULU)
// ====================================================================

function editData(type, rowDataStr) {
    const rowData = JSON.parse(decodeURIComponent(rowDataStr));
    const formId = type === 'SHSK' ? 'formSHSK' : 'formSertifikasi';
    
    showSection(`${type.toLowerCase()}-input`);
    
    // Reset jumlah form ke 1
    const countSelect = document.getElementById(type === 'SHSK' ? 'bulkCountSHSK' : 'bulkCountSertifikasi');
    countSelect.value = "1";
    renderBulkForm(type); 

    const form = document.getElementById(formId);
    
    // Helper function untuk isi nilai
    const setVal = (name, val) => {
        const el = form.querySelector(`[name="${name}_1"]`);
        if(el) {
             if(el.type === 'date') el.value = formatDateForInput(val);
             else el.value = val;
             el.disabled = true; // KUNCI INPUT SAAT PERTAMA LOAD
        }
    };

    if(type === 'SHSK') {
        setVal('noUrut', rowData.NO_URUT);
        setVal('oldFolderUrl', rowData.LINK_FOLDER);
        setVal('namaKapal', rowData.NAMA_KAPAL);
        setVal('tonase', rowData.TONASE_GT);
        setVal('tandaPendaftaran', rowData.TANDA_PENDAFTARAN);
        setVal('pemilik', rowData.PEMILIK);
        setVal('tempatStkk', rowData.TEMPAT_STKK);
        setVal('tglStkk', rowData.TANGGAL_STKK);
        setVal('noUrutStkk', rowData.NO_URUT_STKK);
        setVal('noHalStkk', rowData.NO_HAL_STKK);
        setVal('noBukuStkk', rowData.NO_BUKU_STKK);
        setVal('statusPengukuhan', rowData.STATUS_PENGUKUHAN);
        setVal('tglPengukuhan', rowData.TANGGAL_PENGUKUHAN);
    } else {
        setVal('noUrut', rowData.NO_URUT);
        setVal('oldFolderUrl', rowData.LINK_FOLDER);
        setVal('perusahaan', rowData.NAMA_PERUSAHAAN);
        setVal('namaKapal', rowData.NAMA_KAPAL);
        setVal('ukuran', rowData.UKURAN_GT);
        setVal('callSign', rowData.CALL_SIGN);
        setVal('bahan', rowData.BAHAN_KAPAL);
        setVal('keterangan', rowData.KETERANGAN);
        setVal('jenisSertifikat', rowData.JENIS_SERTIFIKAT);
        setVal('tglTerbit', rowData.TANGGAL_TERBIT);
        setVal('tglBerlaku', rowData.TANGGAL_MASA_BERLAKU);
        setVal('daerahPelayaran', rowData.DAERAH_PELAYARAN);
        setVal('noSertifikat', rowData.NOMOR_SERTIFIKAT);
        setVal('kodeBilling', rowData.KODE_BILLING);
        setVal('pemeriksa', rowData.NAMA_PEMERIKSA);
    }

    // Kunci semua input select
    const allInputs = form.querySelectorAll('input, select');
    allInputs.forEach(i => i.disabled = true);

    // Sembunyikan tombol simpan biasa
    document.getElementById(`btn-save-${type}`).classList.add("hidden");
    
    // Tampilkan tombol UNLOCK
    let btnUnlock = document.getElementById(`btn-unlock-${type}`);
    if(!btnUnlock) {
        const btnContainer = document.querySelector(`#btn-container-${type}`) || form.querySelector('.form-actions');
        btnUnlock = document.createElement('button');
        btnUnlock.type = 'button'; 
        btnUnlock.id = `btn-unlock-${type}`;
        btnUnlock.className = 'btn-edit-mode';
        btnUnlock.innerHTML = '<i class="fa fa-pencil-alt"></i> UBAH DATA';
        btnUnlock.onclick = () => enableEditMode(type);
        btnContainer.insertBefore(btnUnlock, btnContainer.firstChild);
    }
    btnUnlock.classList.remove("hidden");
    
    // Tampilkan tombol Batal
    document.getElementById(`btn-cancel-${type}`).classList.remove("hidden");
    
    // Sembunyikan tombol Update (sampai di-unlock)
    let btnUpdate = document.getElementById(`btn-update-${type}`);
    if(btnUpdate) btnUpdate.classList.add("hidden");

    showPopup("Mode Edit (Terkunci). Klik 'Ubah Data' untuk mengedit.", "info");
}

function enableEditMode(type) {
    const form = document.getElementById(type === 'SHSK' ? 'formSHSK' : 'formSertifikasi');
    const allInputs = form.querySelectorAll('input, select');
    allInputs.forEach(i => i.disabled = false); // BUKA KUNCI

    document.getElementById(`btn-unlock-${type}`).classList.add("hidden");
    
    let btnUpdate = document.getElementById(`btn-update-${type}`);
    if(!btnUpdate) {
        const btnContainer = document.querySelector(`#btn-container-${type}`) || form.querySelector('.form-actions');
        btnUpdate = document.createElement('button');
        btnUpdate.id = `btn-update-${type}`;
        btnUpdate.className = 'btn-gold-save';
        btnUpdate.style.background = 'var(--neon-blue)';
        btnUpdate.innerHTML = '<i class="fa fa-save"></i> SIMPAN PERUBAHAN';
        btnUpdate.onclick = () => handleBulkSubmit(type);
        btnContainer.insertBefore(btnUpdate, btnContainer.firstChild);
    }
    btnUpdate.classList.remove("hidden");
    showPopup("Form Terbuka. Silakan edit.", "success");
}

function cancelEdit(type) {
    const form = document.getElementById(type === 'SHSK' ? 'formSHSK' : 'formSertifikasi');
    form.reset();
    renderBulkForm(type); 
    
    document.getElementById(`btn-save-${type}`).classList.remove("hidden");
    document.getElementById(`btn-cancel-${type}`).classList.add("hidden");
    
    const btnUnlock = document.getElementById(`btn-unlock-${type}`);
    if(btnUnlock) btnUnlock.classList.add("hidden");
    
    const btnUpdate = document.getElementById(`btn-update-${type}`);
    if(btnUpdate) btnUpdate.classList.add("hidden");
    
    showSection(`${type.toLowerCase()}-data`);
}

// ====================================================================
// 9. DATA LOADING, FILTER & EXPORT
// ====================================================================

// --- EXPORT TRIPLE FILE ---
async function exportTriple(type) {
  const btn = event.currentTarget;
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Processing...';
  btn.disabled = true;
  showPopup("Menyiapkan 3 File Laporan...", "info");

  const filters = {};
  if(type === 'SHSK') {
      filters.bulan = document.getElementById('filterSHSKBulan').value;
      filters.tahun = document.getElementById('filterSHSKTahun').value;
      filters.search = document.getElementById('searchSHSK').value;
  } else {
      filters.bulan = document.getElementById('filterSertBulan').value;
      filters.tahun = document.getElementById('filterSertTahun').value;
      filters.jenis = document.getElementById('filterSertJenis').value;
      filters.daerah = document.getElementById('filterSertDaerah').value;
      filters.search = document.getElementById('searchSertifikasi').value;
  }

  try {
      const res = await postData({ action: "exportTripleFile", type: type, filters: filters });
      if (res.status === "SUCCESS" && res.files) {
          showPopup("Laporan Siap! Mengunduh...", "success");
          res.files.forEach(f => { if(f.url) window.open(f.url, '_blank'); });
      } else { showPopup(res.message || "Gagal export", "error"); }
  } catch (e) { showPopup("Gagal koneksi", "error"); }

  btn.innerHTML = originalHtml;
  btn.disabled = false;
}

// --- TABLE & FILTERING ---
let rawData = { SHSK: [], SERTIFIKASI: [] };
let filteredData = { SHSK: [], SERTIFIKASI: [] };
let currentPage = { SHSK: 1, SERTIFIKASI: 1 };
const ROWS_PER_PAGE = 10;

async function loadData(type) {
  const tbody = document.getElementById(type === "SHSK" ? "tbody-shsk" : "tbody-sertifikasi");
  tbody.innerHTML = '<tr><td colspan="16" style="text-align:center;">Sedang Memuat Data...</td></tr>';
  
  const res = await postData({ action: type === "SHSK" ? "getDataSHSK" : "getDataSertifikasi" });
  if (res.status === "SUCCESS") {
    rawData[type] = res.data.reverse();
    filteredData[type] = rawData[type];
    currentPage[type] = 1;
    renderTable(type);
    if(type === 'SERTIFIKASI') populateFilterOptions(rawData[type]);
  } else { 
    tbody.innerHTML = `<tr><td colspan="16" style="text-align:center;color:red">${res.message}</td></tr>`; 
  }
}

function populateFilterOptions(data) {
    const select = document.getElementById('filterSertJenis');
    if(!select) return;
    const unique = [...new Set(data.map(item => item.JENIS_SERTIFIKAT))].filter(Boolean).sort();
    let html = '<option value="">Semua Jenis</option>';
    unique.forEach(t => html += `<option value="${t}">${t}</option>`);
    select.innerHTML = html;
}

function applyFilter(type) {
    const filters = {};
    if(type === 'SHSK') {
        filters.bulan = document.getElementById('filterSHSKBulan').value;
        filters.tahun = document.getElementById('filterSHSKTahun').value;
        filters.search = document.getElementById('searchSHSK').value.toUpperCase();
    } else {
        filters.bulan = document.getElementById('filterSertBulan').value;
        filters.tahun = document.getElementById('filterSertTahun').value;
        filters.jenis = document.getElementById('filterSertJenis').value;
        filters.daerah = document.getElementById('filterSertDaerah').value.toUpperCase();
        filters.search = document.getElementById('searchSertifikasi').value.toUpperCase();
    }

    filteredData[type] = rawData[type].filter(row => {
        let pass = true;
        const dateStr = type === 'SHSK' ? row['TANGGAL_PENGUKUHAN'] : row['TANGGAL_TERBIT'];
        const d = new Date(dateStr);
        if(filters.tahun && d.getFullYear().toString() !== filters.tahun) pass = false;
        if(filters.bulan && (d.getMonth()+1).toString() !== filters.bulan) pass = false;

        if(type === 'SERTIFIKASI') {
            if(filters.jenis && row['JENIS_SERTIFIKAT'] !== filters.jenis) pass = false;
            if(filters.daerah && !String(row['DAERAH_PELAYARAN']).toUpperCase().includes(filters.daerah)) pass = false;
        }
        if(filters.search) {
            const rowText = Object.values(row).join(" ").toUpperCase();
            if(!rowText.includes(filters.search)) pass = false;
        }
        return pass;
    });

    currentPage[type] = 1;
    renderTable(type);
    showPopup(`Filter diterapkan: ${filteredData[type].length} data ditemukan.`, "info");
}

function renderTable(type) {
  const tbody = document.getElementById(type === "SHSK" ? "tbody-shsk" : "tbody-sertifikasi");
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
    } else {
      tr += `<td>${row["NAMA_PERUSAHAAN"]}</td><td>${row["NAMA_KAPAL"]}</td><td>${row["UKURAN_GT"]}</td>
             <td>${row["CALL_SIGN"]}</td><td>${row["BAHAN_KAPAL"]}</td><td>${row["KETERANGAN"]}</td>
             <td>${row["JENIS_SERTIFIKAT"]}</td><td>${formatDate(row["TANGGAL_TERBIT"])}</td>
             <td>${formatDate(row["TANGGAL_MASA_BERLAKU"])}</td><td>${row["DAERAH_PELAYARAN"]||"-"}</td>
             <td>${row["NOMOR_SERTIFIKAT"]}</td><td>${row["KODE_BILLING"]}</td><td>${row["NAMA_PEMERIKSA"]}</td>`;
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

// --- DELETE ---
let pendingDelete = null;
function prepareDelete(t,s){ const r=JSON.parse(decodeURIComponent(s)); pendingDelete={type:t,noUrut:r.NO_URUT||r["NO URUT"]}; document.getElementById("modal-delete").classList.remove("hidden"); }
function closeDeleteModal(){ document.getElementById("modal-delete").classList.add("hidden"); }
async function executeDelete(){ if(!pendingDelete)return; await postData({action:pendingDelete.type==="SHSK"?"deleteSHSK":"deleteSertifikasi",noUrut:pendingDelete.noUrut}); closeDeleteModal(); loadData(pendingDelete.type); }

// ====================================================================
// 10. PENGGUNA DASHBOARD DROPDOWN LOGIC
// ====================================================================

function populateYear() {
    const s = document.getElementById("reqTahun");
    const y = [...new Set(penggunaFiles.map(i=>i.tahun))].sort().reverse();
    s.innerHTML = '<option value="">-- Pilih --</option>';
    y.forEach(v => { if(v) s.innerHTML += `<option value="${v}">${v}</option>`; });
}

window.filterMonth = function() {
    const y = document.getElementById("reqTahun").value;
    const s = document.getElementById("reqBulan");
    s.innerHTML = '<option value="">-- Pilih --</option>'; 
    if(!y) return;
    
    const m = [...new Set(penggunaFiles.filter(i=>i.tahun==y).map(i=>i.bulan))].sort((a,b)=>a-b);
    m.forEach(v => s.innerHTML += `<option value="${v}">${getMonthName(v)}</option>`);
    s.disabled = false;
}

window.filterShip = function() {
    const y = document.getElementById("reqTahun").value;
    const m = document.getElementById("reqBulan").value;
    const s = document.getElementById("reqKapal");
    s.innerHTML = '<option value="">-- Pilih --</option>';
    if(!m) return;
    
    const ships = [...new Set(penggunaFiles.filter(i=>i.tahun==y && i.bulan==m).map(i=>i.kapal))];
    ships.forEach(v => s.innerHTML += `<option value="${v}">${v}</option>`);
    s.disabled = false;
}

window.filterType = function() {
    const y = document.getElementById("reqTahun").value;
    const m = document.getElementById("reqBulan").value;
    const sh = document.getElementById("reqKapal").value;
    const s = document.getElementById("reqJenis");
    s.innerHTML = '<option value="">-- Pilih Dokumen --</option>';
    if(!sh) return;
    
    // Ambil data sesuai filter
    const docs = penggunaFiles.filter(i => i.tahun==y && i.bulan==m && i.kapal==sh);
    docs.forEach(v => s.innerHTML += `<option value="${v.link}">${v.jenis}</option>`);
    s.disabled = false;
}

window.handleRequestSubmit = async function(e) {
    e.preventDefault();
    const btn = document.getElementById("btnKirimReq");
    const select = document.getElementById("reqJenis");
    const opts = Array.from(select.selectedOptions);
    
    if(opts.length === 0) { alert("Pilih minimal satu dokumen!"); return; }
    
    const jenisList = opts.map(o => o.text); 
    const link = select.value; 
    const user = JSON.parse(localStorage.getItem("user"));
    
    btn.innerHTML = "MENGIRIM..."; 
    btn.disabled = true;
    
    const res = await postData({
        action: "sendReportEmail",
        email: user.id, 
        namaUser: user.nama, 
        perusahaan: user.extra,
        kapal: document.getElementById("reqKapal").value,
        jenis: jenisList,
        tahun: document.getElementById("reqTahun").value,
        bulan: getMonthName(document.getElementById("reqBulan").value),
        link: link
    });
    
    if(res.status === "SUCCESS") showPopup("Dokumen berhasil dikirim ke email!", "success");
    else showPopup("Gagal mengirim.", "error");
    
    btn.innerHTML = "KIRIM DOKUMEN"; 
    btn.disabled = false;
}

function getMonthName(i){ const m=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"]; return m[i-1]||i; }
