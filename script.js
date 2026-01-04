/* ====================================================================
   SCRIPT.JS - THE ULTIMATE MASTER FILE (FULL VERSION)
   Fitur: Login UI Reset, Bulk Input Lengkap, Sidebar Accordion, 
   Edit Lock, Profil Lengkap, & Triple Export.
   ==================================================================== */

// ⚠️ PASTE URL WEB APP KAMU DI SINI
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

  popup.classList.add("show");
  // Durasi notifikasi 3 detik
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

// ====================================================================
// 2. AUTO LOGOUT & SESSION
// ====================================================================

let idleTime = 0;
function resetIdleTimer() { idleTime = 0; }

function initAutoLogout() {
  setInterval(() => {
    idleTime++;
    if (idleTime >= 60) { // 60 menit
      logout();
    }
  }, 60000); 

  window.onmousemove = resetIdleTimer;
  window.onkeypress = resetIdleTimer;
  window.onclick = resetIdleTimer;
  window.onscroll = resetIdleTimer;
}

// ====================================================================
// 3. AUTHENTICATION & LOGIN UI HANDLER
// ====================================================================

async function handleLogin(e, role) {
  if (e) e.preventDefault();
  
  // 1. Definisikan ID elemen berdasarkan role
  let inputIdStr, inputPassStr, btnIdStr;
  
  if (role === 'PETUGAS') {
      inputIdStr = 'nip';
      inputPassStr = 'passPetugas';
      btnIdStr = 'btnSubmitPetugas';
  } else {
      inputIdStr = 'email';
      inputPassStr = 'passPengguna';
      btnIdStr = 'btnSubmitPengguna';
  }

  const inputIdElem = document.getElementById(inputIdStr);
  const inputPassElem = document.getElementById(inputPassStr);
  const btnElem = document.getElementById(btnIdStr);

  // Safety check
  if(!inputIdElem || !inputPassElem || !btnElem) return;

  const userId = inputIdElem.value.trim();
  const password = inputPassElem.value.trim();
  
  if (!userId || !password) { 
      showPopup("Data tidak lengkap.", "error"); 
      return; 
  }
  
  // 2. UI Loading State
  const originalText = btnElem.innerHTML;
  btnElem.innerHTML = '<i class="fa fa-spinner fa-spin"></i> MEMPROSES...';
  btnElem.disabled = true;
  btnElem.style.opacity = "0.7";

  showPopup("Sedang Masuk...", "info");
  
  try {
    // 3. Request ke Backend
    const res = await postData({ 
        action: "login", 
        role: role, 
        id: userId, 
        password: password 
    });
    
    // 4. Handle Response
    if (res.status === "SUCCESS") {
      // --- SUKSES ---
      localStorage.setItem("user", JSON.stringify(res.data));
      showPopup(`Login Berhasil! Halo ${res.data.nama}`, "success");
      
      // Simpan Remember Me (Logic Sederhana)
      if (role === 'PETUGAS' && document.getElementById('checkPetugas').checked) {
          localStorage.setItem('shsk_nip', userId);
      } else if (role === 'PETUGAS') {
          localStorage.removeItem('shsk_nip');
      }

      if (role === 'PENGGUNA' && document.getElementById('checkPengguna').checked) {
          localStorage.setItem('shsk_email', userId);
      } else if (role === 'PENGGUNA') {
          localStorage.removeItem('shsk_email');
      }

      // Redirect
      setTimeout(() => { 
          window.location.href = role === "PETUGAS" ? "petugas.html" : "pengguna.html"; 
      }, 2000);

    } else { 
      // --- GAGAL (RESET INPUT) ---
      showPopup(res.message, "error"); 
      
      // Reset Form sesuai permintaan
      inputIdElem.value = "";
      inputPassElem.value = "";
      
      // Kembalikan Tombol
      btnElem.innerHTML = originalText;
      btnElem.disabled = false;
      btnElem.style.opacity = "1";

      // Fokuskan kursor kembali
      inputIdElem.focus();
    }

  } catch (error) { 
    showPopup("Gagal koneksi.", "error");
    // Reset Tombol
    btnElem.innerHTML = originalText;
    btnElem.disabled = false;
    btnElem.style.opacity = "1";
  }
}

function logout() { 
    document.getElementById("modal-logout").classList.remove("hidden"); 
}

function closeLogoutModal() { 
    document.getElementById("modal-logout").classList.add("hidden"); 
}

function confirmLogout() { 
    localStorage.removeItem("user"); 
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
  if (document.querySelector(".dashboard-page")) {
      initPenggunaDashboard();
      initAutoLogout();
  } else if (document.querySelector(".petugas-page")) {
      loadProfilePetugas();
      // Set default filter chart
      const defaultBtn = document.querySelector('.filter-btn.active');
      updateChartFilter("year", defaultBtn); 
      
      renderBulkForm('SHSK'); 
      renderBulkForm('SERTIFIKASI'); 
      initAutoLogout();
  }
});

function toggleSidebar() { 
    const s = document.getElementById("sidebar"); 
    const o = document.getElementById("sidebar-overlay"); 
    s.classList.toggle("show"); 
    o.classList.toggle("active"); 
}

function showSection(id, el) { 
    document.querySelectorAll(".main-content > div").forEach(d => d.classList.add("hidden")); 
    document.getElementById(`sec-${id}`).classList.remove("hidden"); 
    
    document.querySelectorAll(".menu-item").forEach(m => m.classList.remove("active"));
    if(el) el.classList.add("active");

    if(id.includes("data")) loadData(id.includes("shsk") ? "SHSK" : "SERTIFIKASI");

    // Close sidebar on mobile
    if (window.innerWidth <= 900) {
        const s = document.getElementById("sidebar");
        const o = document.getElementById("sidebar-overlay");
        if (s.classList.contains("show")) {
            s.classList.remove("show");
            o.classList.remove("active");
        }
    }
}

// FUNGSI ACCORDION MENU (Satu Buka, Lain Tutup)
function toggleSubmenu(id) { 
    const target = document.getElementById(id);
    const isOpen = target.classList.contains("show");
    
    // 1. Reset semua submenu (Tutup semua)
    document.querySelectorAll(".submenu-container").forEach(el => el.classList.remove("show"));
    document.querySelectorAll(".menu-item").forEach(el => el.classList.remove("open"));

    // 2. Buka yang diklik (jika tadi tertutup)
    if(!isOpen) {
        target.classList.add("show");
        const trigger = target.previousElementSibling; 
        if(trigger) trigger.classList.add("open");
    }
}

// FUNGSI ACCORDION FORM (Global)
window.toggleAccordion = function(headerElement) {
    const item = headerElement.closest('.accordion-item');
    if (item) item.classList.toggle("open");
}

// ====================================================================
// 5. CHART UI
// ====================================================================

let barChartInstance = null;
let doughnutChartInstance = null;
let currentFilter = "year";

function updateChartFilter(period, btnElement) {
  currentFilter = period;
  document.querySelectorAll(".filter-btn").forEach((btn) => btn.classList.remove("active"));
  
  if (btnElement) {
      btnElement.classList.add("active");
  } else {
      // Fallback selector
      const targetBtn = Array.from(document.querySelectorAll(".filter-btn")).find(b => b.innerText.toLowerCase().includes(period === 'year' ? 'tahun' : period === 'month' ? 'bulan' : period === 'week' ? 'minggu' : 'hari'));
      if(targetBtn) targetBtn.classList.add("active");
  }
  initCharts(period);
}

async function initCharts(p = "year") {
  if (!document.getElementById("barChart")) return;
  const res = await postData({ action: "getDashboardStats", period: p });
  let d = { year: new Date().getFullYear(), totalYear: 0, labels: [], counts: [] };
  if (res.status === "SUCCESS") d = res.data;

  const titleEl = document.querySelector(".chart-card h3 i.fa-bullseye");
  if(titleEl && titleEl.parentNode) titleEl.parentNode.innerHTML = `<i class="fa fa-bullseye" style="color: var(--gold)"></i> Target ${d.year}`;
  
  const total = 2040;
  const sisa = total - d.totalYear;
  
  const targetInfo = document.querySelector(".target-info");
  if(targetInfo) {
      targetInfo.innerHTML = `
        <span><i class="fa fa-circle" style="color: #eee"></i> Sisa: <b>${sisa.toLocaleString()}</b></span>
        <span><i class="fa fa-circle" style="color: #00c853"></i> Terbit: <b>${d.totalYear.toLocaleString()}</b></span>
      `;
  }

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
// 6. PROFILE PETUGAS
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
}

// ====================================================================
// 7. BULK INPUT ENGINE (STRUKTUR LENGKAP & SECTION)
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
            // FORM SERTIFIKASI LENGKAP
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

    let action = type === 'SHSK' ? 'uploadBulkSHSK' : 'uploadBulkSertifikasi';
    if(items.length === 1 && items[0].noUrut) {
        action = type === 'SHSK' ? 'updateSHSK' : 'updateSertifikasi';
        Object.assign(items[0], {action: action}); 
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
        if(isEdit) cancelEdit(type);
        loadData(type);
        updateChartFilter(currentFilter);
    } else {
        showPopup("Gagal: " + res.message, "error");
    }
}

// ====================================================================
// 8. EDIT DATA & LOCK MECHANISM
// ====================================================================

function editData(type, rowDataStr) {
    const rowData = JSON.parse(decodeURIComponent(rowDataStr));
    const formId = type === 'SHSK' ? 'formSHSK' : 'formSertifikasi';
    
    showSection(`${type.toLowerCase()}-input`);
    
    const countSelect = document.getElementById(type === 'SHSK' ? 'bulkCountSHSK' : 'bulkCountSertifikasi');
    countSelect.value = "1";
    renderBulkForm(type); 

    const form = document.getElementById(formId);
    
    const setVal = (name, val) => {
        const el = form.querySelector(`[name="${name}_1"]`);
        if(el) {
             if(el.type === 'date') el.value = formatDateForInput(val);
             else el.value = val;
             el.disabled = true; // LOCK
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

    // LOCK INPUTS
    const allInputs = form.querySelectorAll('input, select');
    allInputs.forEach(i => i.disabled = true);

    // UI BUTTONS
    document.getElementById(`btn-save-${type}`).classList.add("hidden");
    
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
    
    document.getElementById(`btn-cancel-${type}`).classList.remove("hidden");
    
    let btnUpdate = document.getElementById(`btn-update-${type}`);
    if(btnUpdate) btnUpdate.classList.add("hidden");

    showPopup("Mode Edit (Terkunci). Klik 'Ubah Data' untuk mengedit.", "info");
}

function enableEditMode(type) {
    const form = document.getElementById(type === 'SHSK' ? 'formSHSK' : 'formSertifikasi');
    const allInputs = form.querySelectorAll('input, select');
    allInputs.forEach(i => i.disabled = false); 

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
// 9. TRIPLE EXPORT, TABLE, PENGGUNA DASHBOARD
// ====================================================================

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

// TABLE LOGIC
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
  } else { tbody.innerHTML = `<tr><td colspan="16" style="text-align:center;color:red">${res.message}</td></tr>`; }
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

// DELETE
let pendingDelete = null;
function prepareDelete(t,s){ const r=JSON.parse(decodeURIComponent(s)); pendingDelete={type:t,noUrut:r.NO_URUT||r["NO URUT"]}; document.getElementById("modal-delete").classList.remove("hidden"); }
function closeDeleteModal(){ document.getElementById("modal-delete").classList.add("hidden"); }
async function executeDelete(){ if(!pendingDelete)return; await postData({action:pendingDelete.type==="SHSK"?"deleteSHSK":"deleteSertifikasi",noUrut:pendingDelete.noUrut}); closeDeleteModal(); loadData(pendingDelete.type); }

// PENGGUNA DASHBOARD
let penggunaFiles=[];
function initPenggunaDashboard(){ 
    const u=JSON.parse(localStorage.getItem("user")); 
    if(!u){window.location.href="index.html";return;} 
    if(document.getElementById("nav-user-name")) document.getElementById("nav-user-name").innerText=u.nama;
    if(document.getElementById("nav-company-name")) document.getElementById("nav-company-name").innerText=u.extra||"PERUSAHAAN";
    if(document.getElementById("mob-user-name")) document.getElementById("mob-user-name").innerText=u.nama;
    if(document.getElementById("mob-company-name")) document.getElementById("mob-company-name").innerText=u.extra||"PERUSAHAAN";
    if(document.getElementById("email-display-text")) document.getElementById("email-display-text").innerText=u.id;
    fetchPenggunaFiles(u.extra); 
}
async function fetchPenggunaFiles(c){ const r=await postData({action:"getDropdownData",perusahaan:c}); if(r.status==="SUCCESS"){penggunaFiles=r.data; populateYear();} }
function populateYear(){ const s=document.getElementById("reqTahun"); const y=[...new Set(penggunaFiles.map(i=>i.tahun))].sort().reverse(); s.innerHTML='<option value="">-- Pilih --</option>'; y.forEach(v=>{if(v)s.innerHTML+=`<option value="${v}">${v}</option>`}); }
window.filterMonth=function(){ const y=document.getElementById("reqTahun").value; const s=document.getElementById("reqBulan"); s.innerHTML='<option value="">-- Pilih --</option>'; if(!y)return; const m=[...new Set(penggunaFiles.filter(i=>i.tahun==y).map(i=>i.bulan))].sort((a,b)=>a-b); m.forEach(v=>s.innerHTML+=`<option value="${v}">${getMonthName(v)}</option>`); s.disabled=false; }
window.filterShip=function(){ const y=document.getElementById("reqTahun").value; const m=document.getElementById("reqBulan").value; const s=document.getElementById("reqKapal"); s.innerHTML='<option value="">-- Pilih --</option>'; if(!m)return; const ships=[...new Set(penggunaFiles.filter(i=>i.tahun==y && i.bulan==m).map(i=>i.kapal))]; ships.forEach(v=>s.innerHTML+=`<option value="${v}">${v}</option>`); s.disabled=false; }
window.filterType=function(){ const y=document.getElementById("reqTahun").value; const m=document.getElementById("reqBulan").value; const sh=document.getElementById("reqKapal").value; const s=document.getElementById("reqJenis"); s.innerHTML='<option value="">-- Pilih Dokumen --</option>'; if(!sh)return; const docs=penggunaFiles.filter(i=>i.tahun==y && i.bulan==m && i.kapal==sh); docs.forEach(v=>s.innerHTML+=`<option value="${v.link}">${v.jenis}</option>`); s.disabled=false; }
window.handleRequestSubmit=async function(e){ e.preventDefault(); const s=document.getElementById("reqJenis"); const opts=Array.from(s.selectedOptions); if(opts.length===0){alert("Pilih dokumen!");return;} const t=opts.map(o=>o.text); const l=s.value; const u=JSON.parse(localStorage.getItem("user")); document.getElementById("btnKirimReq").innerText="MENGIRIM..."; await postData({action:"sendReportEmail",email:u.id,namaUser:u.nama,perusahaan:u.extra,kapal:document.getElementById("reqKapal").value,jenis:t,tahun:document.getElementById("reqTahun").value,bulan:getMonthName(document.getElementById("reqBulan").value),link:l}); showPopup("Terkirim!","success"); document.getElementById("btnKirimReq").innerText="KIRIM DOKUMEN"; }
function getMonthName(i){const m=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];return m[i-1]||i;}
