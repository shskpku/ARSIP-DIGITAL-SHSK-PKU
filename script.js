/* ====================================================================
   SCRIPT.JS - ULTIMATE MASTER (V13.1)
   ==================================================================== */

// ---- API URL GOOGLE APPSCRIPT ---
const API_URL =
  "https://script.google.com/macros/s/AKfycbwo5j74mC6sMx4NPlfrFRIVkLT5tTgfFU5rPymDjRzjPjcDKwgjaVXVhkGa6tkVwK_mFA/exec";

// --- DATABASE LIST SERTIFIKAT (LENGKAP) ---
const CERT_LIST = [
  "KONSTRUKSI",
  "PERLENGKAPAN",
  "RADIO",
  "ENDORS KONSTRUKSI",
  "ENDORS PERLENGKAPAN",
  "ENDORS RADIO",
  "GARIS MUAT",
  "SNPP",
  "ENDORS SNPP",
  "IOPP",
  "ENDORS IOPP",
  "ISPP",
  "ENDORS ISPP",
  "IAPP",
  "ENDORS IAPP",
  "ANTIFOULING",
  "BALLAST WATER MANAGEMENT",
  "KESELAMATAN KLM",
  "KESELAMATAN MOORING",
  "DOC",
  "ENDORS DOC",
  "SMC",
  "SMC INTERMEDIATE",
  "IMDG",
  "PENGESAHAN GAMBAR",
];

// Database Kode Surat Default
const CERT_CODES = {
  KONSTRUKSI: "AL.501",
  PERLENGKAPAN: "AL.501",
  RADIO: "AL.502",
  "ENDORS KONSTRUKSI": "AL.501",
  "ENDORS PERLENGKAPAN": "AL.501",
  "ENDORS RADIO": "AL.502",
  "GARIS MUAT": "AL.509",
  "KESELAMATAN KLM": "AL.501",
  "KESELAMATAN MOORING": "AL.501",
  IMDG: "AL.503",
  SNPP: "AL.601",
  "ENDORS SNPP": "AL.601",
  IOPP: "AL.602",
  "ENDORS IOPP": "AL.602",
  ISPP: "AL.602",
  "ENDORS ISPP": "AL.602",
  IAPP: "AL.602",
  "ENDORS IAPP": "AL.602",
  "BALLAST WATER MANAGEMENT": "AL.601",
  "ENDORS BALLAST WATER MANAGEMENT": "AL.601",
  ANTIFOULING: "AL.601",
  DOC: "AL.602",
  "ENDORS DOC": "AL.602",
  SMC: "AL.602",
  "SMC INTERMEDIATE": "AL.602",
  NTR: "SPECIAL",
  "OIL BARGE": "SPECIAL",
};
// GLOBAL VARIABLE UNTUK NOMOR SURAT
let cachedLastNumber = null;

// FUNGSI GENERATOR NOMOR VERSI JS (MIRROR BACKEND)
function generateNextNumberJS(lastNumberStr, offset = 1) {
  const currentYear = new Date().getFullYear();
  const suffix = `KSOP.PKU.${currentYear}`;
  let x = 1,
    y = 0; // Default

  if (lastNumberStr && lastNumberStr.includes(suffix)) {
    try {
      const parts = lastNumberStr.split("/");
      x = parseInt(parts[1]) || 1;
      y = parseInt(parts[2]) || 0;
    } catch (e) {}
  }

  // Tambahkan Offset (Urutan ke berapa yang sedang diklik)
  let totalY = y + offset;

  // Logika Rotasi /25
  // Rumus Matematika biar X nambah tiap kelipatan 25
  let addX = Math.floor((totalY - 1) / 25);
  let finalX = x + addX;
  let finalY = totalY - addX * 25;

  return `AL.531/${finalX}/${finalY}/${suffix}`;
}

// FETCH NOMOR DARI SERVER SAAT BUKA MENU EXIBHITUM
// ======================================================
// FITUR BARU: AUTO NUMBER EXIBHITUM (LIVE CALCULATION)
// Mengambil Start X/Y dari server, lalu loop sesuai jumlah input
// ======================================================
async function initExibhitumNumber() {
  try {
    // 1. Minta Data Start Number (X & Y) dari Server
    // Pastikan action di Code.gs namanya "getNextExibNumber"
    const res = await postData({ action: "getNextExibNumber" });

    if (res.status === "SUCCESS") {
      let x = parseInt(res.startX); // Bundel
      let y = parseInt(res.startY); // Urut
      let year = res.year;

      // Ambil jumlah form yang sedang aktif (misal 10)
      const countInput = document.getElementById("bulkCountExibhitum");
      const count = countInput ? parseInt(countInput.value) : 1;

      // 2. LOOPING KE SETIAP FORM INPUT
      for (let i = 0; i < count; i++) {
        const container = document.getElementById(`dynamic-nomor-${i}`);

        if (container) {
          // --- GENERATE NOMOR UNTUK PENGESAHAN (KIRI) ---
          const pshX = x;
          const pshY = y;
          const valPsh = `AL.531/${pshX}/${pshY}/KSOP.PKU.${year}`;

          // Increment logic: Kalau y > 25, reset y=1, x nambah 1
          y++;
          if (y > 25) {
            x++;
            y = 1;
          }

          // --- GENERATE NOMOR UNTUK EXIBHITUM (KANAN) ---
          const exX = x;
          const exY = y;
          const valEx = `AL.531/${exX}/${exY}/KSOP.PKU.${year}`;

          // Increment lagi untuk persiapan baris selanjutnya (loop i+1)
          y++;
          if (y > 25) {
            x++;
            y = 1;
          }

          // RENDER HTML KE DALAM CONTAINER
          container.innerHTML = `
             <div class="exib-grid-wrapper" style="display:grid; grid-template-columns: 1fr 1fr; gap: 25px;">
                <div class="group-psh">
                   <label style="font-size:12px; color:var(--gold); font-weight:bold;">NO. PENGESAHAN</label>
                   <input type="text" name="nomor_PSH_${i}" class="form-control" 
                          value="${valPsh}" readonly> 
                   </div>

                <div class="group-ex">
                   <label style="font-size:12px; color:var(--neon-blue); font-weight:bold;">NO. EXIBHITUM</label>
                   <input type="text" name="nomor_EX_${i}" class="form-control" 
                          value="${valEx}" readonly>
                </div>
             </div>
            `;
        }
      }
      console.log("Auto Number Exibhitum Berhasil Di-generate!");
    }
  } catch (error) {
    console.log("Gagal ambil nomor otomatis", error);
  }
}

let globalCompanySet = new Set();
let globalMaterialSet = new Set();
let packetModeState = {};

// ====================================================================
// 1. UTILITIES & HELPER
// ====================================================================

function speakWelcome(namaLengkap) {
  if (!("speechSynthesis" in window)) return;
  if (sessionStorage.getItem("welcome_played")) return;

  const runSpeech = () => {
    window.speechSynthesis.cancel();
    let rawName = namaLengkap.split(",")[0].trim().split(" ")[0];
    let nickName =
      rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
    const text = `Selamat datang, ${nickName}, di era digitalisasi arsip, Seksi SHSK, KSOP Kelas 2 Pekanbaru`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    let voices = window.speechSynthesis.getVoices();
    const setVoice = () => {
      voices = window.speechSynthesis.getVoices();
      const indoVoice = voices.find(
        (v) => v.lang === "id-ID" || v.name.includes("Indonesia")
      );
      if (indoVoice) utterance.voice = indoVoice;
      window.speechSynthesis.speak(utterance);
      sessionStorage.setItem("welcome_played", "true");
    };

    if (voices.length === 0) window.speechSynthesis.onvoiceschanged = setVoice;
    else setVoice();
  };

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    const unlockAudio = () => {
      runSpeech();
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
      document.removeEventListener("scroll", unlockAudio);
    };
    document.addEventListener("click", unlockAudio);
    document.addEventListener("touchstart", unlockAudio);
    document.addEventListener("scroll", unlockAudio);
  } else {
    runSpeech();
  }
}

function showPopup(message, type = "info") {
  const popup = document.getElementById("app-notification");
  if (!popup) {
    alert(message);
    return;
  }
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
  if (/[a-zA-Z]/.test(dateStr) && !dateStr.includes("T")) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = ("0" + d.getDate()).slice(-2);
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateForInput(dateStr) {
  if (!dateStr || dateStr === "-") return "";
  const monthsIndo = {
    Januari: "01",
    Februari: "02",
    Maret: "03",
    April: "04",
    Mei: "05",
    Juni: "06",
    Juli: "07",
    Agustus: "08",
    September: "09",
    Oktober: "10",
    November: "11",
    Desember: "12",
  };
  if (dateStr.includes(" ")) {
    const parts = dateStr.split(" ");
    if (parts.length === 3) {
      const m = monthsIndo[parts[1]] || "01";
      return `${parts[2]}-${m}-${parts[0]}`;
    }
  }
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

function initSmartSearch() {
  if (!document.getElementById("companyList")) {
    const dl = document.createElement("datalist");
    dl.id = "companyList";
    document.body.appendChild(dl);
  }
  if (!document.getElementById("materialList")) {
    const dl2 = document.createElement("datalist");
    dl2.id = "materialList";
    document.body.appendChild(dl2);
  }
}

function updateSmartData(dataArray, type) {
  dataArray.forEach((item) => {
    let compKey = "";
    if (type === "SHSK") compKey = "PEMILIK";
    else if (type === "SERTIFIKASI") compKey = "NAMA_PERUSAHAAN";
    else if (type === "SERVICE") compKey = "NAMA_PENYEDIA_JASA";
    else if (type === "EXIBHITUM") compKey = "PERUSAHAAN";

    if (compKey && item[compKey])
      globalCompanySet.add(item[compKey].trim().toUpperCase());

    if (type === "SERTIFIKASI" && item["BAHAN_KAPAL"]) {
      globalMaterialSet.add(item["BAHAN_KAPAL"].trim().toUpperCase());
    }
  });

  const dlComp = document.getElementById("companyList");
  if (dlComp) {
    dlComp.innerHTML = "";
    globalCompanySet.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      dlComp.appendChild(opt);
    });
  }

  // Update DOM Material List
  const dlMat = document.getElementById("materialList");
  if (dlMat) {
    dlMat.innerHTML = "";
    globalMaterialSet.forEach((mat) => {
      const opt = document.createElement("option");
      opt.value = mat;
      dlMat.appendChild(opt);
    });
  }
}

// ====================================================================
// 2. DASHBOARD & ANNUAL REPORT LOGIC
// ====================================================================

function initAnnualReportUI() {
  const container = document.querySelector(".chart-grid");
  if (!container) return;
  const annualHTML = `
        <div class="annual-report-card" style="grid-column: 1 / -1;">
            <div class="annual-title"><i class="fa fa-chart-line"></i> REKAPITULASI TAHUNAN</div>
            <div class="annual-subtitle">IKK 54 Persentase Pelayanan Dibidang Kelaiklautan Kapal</div>
            <div class="annual-filter-row">
                <div class="annual-form-group"><label>Bulan Awal</label><select id="repStartMonth" class="form-control"><option value="1">Januari</option><option value="2">Februari</option><option value="3">Maret</option><option value="4">April</option><option value="5">Mei</option><option value="6">Juni</option><option value="7">Juli</option><option value="8">Agustus</option><option value="9">September</option><option value="10">Oktober</option><option value="11">November</option><option value="12">Desember</option></select></div>
                <div class="annual-form-group"><label>Bulan Akhir</label><select id="repEndMonth" class="form-control"><option value="12" selected>Desember</option><option value="1">Januari</option><option value="2">Februari</option><option value="3">Maret</option><option value="4">April</option><option value="5">Mei</option><option value="6">Juni</option><option value="7">Juli</option><option value="8">Agustus</option><option value="9">September</option><option value="10">Oktober</option><option value="11">November</option></select></div>
                <div class="annual-form-group"><label>Tahun</label><select id="repYear" class="form-control"></select></div>
                <div class="annual-form-group"><label>&nbsp;</label><button class="btn-annual-export" onclick="handleAnnualReport(this)"><i class="fa fa-file-export"></i> EXPORT LAPORAN</button></div>
            </div>
        </div>`;
  container.insertAdjacentHTML("afterend", annualHTML);
  const yearSelect = document.getElementById("repYear");
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= 2020; y--) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.text = y;
    yearSelect.appendChild(opt);
  }
}

async function handleAnnualReport(btn) {
  const startM = document.getElementById("repStartMonth").value;
  const endM = document.getElementById("repEndMonth").value;
  const year = document.getElementById("repYear").value;
  if (parseInt(startM) > parseInt(endM)) {
    showPopup("Bulan Awal > Akhir!", "error");
    return;
  }
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> PROCESSING...';
  btn.disabled = true;
  try {
    const res = await postData({
      action: "exportAnnualReport",
      startMonth: startM,
      endMonth: endM,
      year: year,
    });
    if (res.status === "SUCCESS" && res.url) {
      showPopup("Laporan Tahunan Siap!", "success");
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = res.url;
        a.setAttribute("download", "");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, 1000);
    } else {
      showPopup(res.message || "Gagal.", "error");
    }
  } catch (e) {
    showPopup("Error Koneksi.", "error");
  }
  btn.innerHTML = originalText;
  btn.disabled = false;
}

// ====================================================================
// 2.5 AUTO LOGOUT & SESSION
// ====================================================================
let idleTime = 0;
function resetIdleTimer() {
  idleTime = 0;
}
function initAutoLogout() {
  setInterval(() => {
    idleTime++;
    if (idleTime >= 60) logout();
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
    inputIdStr = "nip";
    inputPassStr = "passPetugas";
    btnIdStr = "btnSubmitPetugas";
  } else {
    inputIdStr = "email";
    inputPassStr = "passPengguna";
    btnIdStr = "btnSubmitPengguna";
  }
  const userId = document.getElementById(inputIdStr).value.trim();
  const password = document.getElementById(inputPassStr).value.trim();
  const btnElem = document.getElementById(btnIdStr);
  if (!userId || !password) {
    showPopup("Data tidak lengkap.", "error");
    return;
  }
  const originalText = btnElem.innerHTML;
  btnElem.innerHTML = '<i class="fa fa-spinner fa-spin"></i> MEMPROSES...';
  btnElem.disabled = true;
  try {
    const res = await postData({
      action: "login",
      role: role,
      id: userId,
      password: password,
    });
    if (res.status === "SUCCESS") {
      localStorage.setItem("user", JSON.stringify(res.data));
      sessionStorage.removeItem("welcome_played");
      showPopup(`Login Berhasil! Halo ${res.data.nama}`, "success");
      setTimeout(() => {
        window.location.href =
          role === "PETUGAS" ? "petugas.html" : "pengguna.html";
      }, 1500);
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
  if (!nama || !email || !password || !perusahaan) {
    showPopup("Harap isi semua kolom!", "error");
    return;
  }
  const originalText = btn.innerText;
  btn.innerText = "MEMPROSES...";
  btn.disabled = true;
  try {
    const res = await postData({
      action: "register",
      nama: nama,
      email: email,
      password: password,
      perusahaan: perusahaan,
    });
    if (res.status === "SUCCESS") {
      showPopup("Pendaftaran Berhasil! Silakan Login", "success");
      setTimeout(() => {
        window.location.href = "index.html";
      }, 2000);
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

function logout() {
  document.getElementById("modal-logout").classList.remove("hidden");
}
function closeLogoutModal() {
  document.getElementById("modal-logout").classList.add("hidden");
}
function confirmLogout() {
  localStorage.removeItem("user");
  sessionStorage.removeItem("welcome_played");
  window.location.href = "index.html";
}

async function requestOTP() {
  const email = document.getElementById("reset-email").value;
  if (!email) {
    showPopup("Masukkan email dulu!", "error");
    return;
  }
  showPopup("Mengirim kode OTP...", "info");
  const res = await postData({ action: "sendOTP", email: email });
  if (res.status === "SUCCESS") {
    showPopup("Kode OTP terkirim ke email!", "success");
    document.getElementById("step-email").classList.add("hidden");
    document.getElementById("step-otp").classList.remove("hidden");
  } else {
    showPopup(res.message, "error");
  }
}

async function verifyOTP() {
  const email = document.getElementById("reset-email").value;
  const otp = document.getElementById("reset-otp").value;
  if (!otp) {
    showPopup("Masukkan OTP!", "error");
    return;
  }
  const res = await postData({ action: "verifyOTP", email: email, otp: otp });
  if (res.status === "SUCCESS") {
    showPopup("OTP Benar!", "success");
    document.getElementById("step-otp").classList.add("hidden");
    document.getElementById("step-newpass").classList.remove("hidden");
  } else {
    showPopup(res.message, "error");
  }
}

async function resetPasswordFinal() {
  const email = document.getElementById("reset-email").value;
  const newPass = document.getElementById("reset-newpass").value;
  if (!newPass) {
    showPopup("Masukkan password baru!", "error");
    return;
  }
  showPopup("Menyimpan password...", "info");
  const res = await postData({
    action: "resetPasswordFinal",
    email: email,
    newPassword: newPass,
  });
  if (res.status === "SUCCESS") {
    showPopup("Sukses! Silakan login.", "success");
    setTimeout(() => window.location.reload(), 2000);
  } else {
    showPopup(res.message, "error");
  }
}

// ====================================================================
// 4. PAGE INITIALIZATION & NAVIGATION
// ====================================================================
document.addEventListener("DOMContentLoaded", () => {
  initSmartSearch();
  if (document.querySelector(".dashboard-page")) {
    initPenggunaDashboard();
    initAutoLogout();
  } else if (document.querySelector(".petugas-page")) {
    loadProfilePetugas();
    updateSidebarCounts();
    if (document.querySelector(".filter-btn.active"))
      updateChartFilter("year", document.querySelector(".filter-btn.active"));
    if (document.getElementById("chartExibhitum"))
      updateExibChart(
        "year",
        document.querySelector(".filter-btn-ex.active"),
        "ex"
      );
    if (document.getElementById("chartPengesahan"))
      updateExibChart(
        "year",
        document.querySelector(".filter-btn-psh.active"),
        "psh"
      );
    initAnnualReportUI();
    renderBulkForm("SHSK");
    renderBulkForm("SERTIFIKASI");
    renderBulkForm("SERVICE");
    renderBulkForm("EXIBHITUM");
    initAutoLogout();
  }
});

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("show");
  document.getElementById("sidebar-overlay").classList.toggle("active");
}

function showSection(id, el) {
  document
    .querySelectorAll(".main-content > div")
    .forEach((d) => d.classList.add("hidden"));
  document.getElementById(`sec-${id}`).classList.remove("hidden");
  document
    .querySelectorAll(".menu-item")
    .forEach((m) => m.classList.remove("active"));
  if (el) el.classList.add("active");

  if (id.includes("data")) {
    const type = id.includes("shsk")
      ? "SHSK"
      : id.includes("sertifikasi")
      ? "SERTIFIKASI"
      : id.includes("service")
      ? "SERVICE"
      : "EXIBHITUM";
    loadData(type);
  }

  if (id === "dashboard") {
    document.querySelectorAll(".submenu-container").forEach((el) => {
      el.classList.remove("show");
      if (el.previousElementSibling)
        el.previousElementSibling.classList.remove("open");
    });
  }
}

function toggleSubmenu(id) {
  document.querySelectorAll(".submenu-container").forEach((el) => {
    if (el.id !== id) {
      el.classList.remove("show");
      if (el.previousElementSibling)
        el.previousElementSibling.classList.remove("open");
    }
  });

  const t = document.getElementById(id);
  t.classList.toggle("show");
  if (t.previousElementSibling)
    t.previousElementSibling.classList.toggle("open");
}

window.toggleAccordion = function (headerElement) {
  // Cari elemen bapaknya (accordion-item)
  const item = headerElement.closest(".accordion-item");

  // Toggle class 'open' (Kalau ada dihapus, kalau gak ada ditambah)
  item.classList.toggle("open");

  // Variasi Icon Panah (Opsional: Biar panahnya muter)
  const icon = headerElement.querySelector("i.fa-chevron-down");
  if (icon) {
    if (item.classList.contains("open")) {
      icon.style.transform = "rotate(180deg)";
    } else {
      icon.style.transform = "rotate(0deg)";
    }
  }
};

// ====================================================================
// 5. CHART UI
// ====================================================================
let barChartInstance = null;
let doughnutChartInstance = null;
let exChartInstance = null;
let pshChartInstance = null;
let currentFilter = "year";

function updateChartFilter(period, btnElement) {
  currentFilter = period;
  document
    .querySelectorAll(".filter-btn")
    .forEach((btn) => btn.classList.remove("active"));
  if (btnElement) btnElement.classList.add("active");
  initCharts(period);
}

async function initCharts(p = "year") {
  if (!document.getElementById("barChart")) return;
  const res = await postData({ action: "getDashboardStats", period: p });
  let d = {
    year: new Date().getFullYear(),
    totalYear: 0,
    breakdown: { shsk: 0, sert: 0, serv: 0 },
    labels: [],
    datasets: { shsk: [], sert: [], serv: [] },
  };
  if (res.status === "SUCCESS") d = res.data;

  const titleEl = document.querySelector(".chart-card h3 i.fa-bullseye");
  if (titleEl && titleEl.parentNode)
    titleEl.parentNode.innerHTML = `<i class="fa fa-bullseye" style="color: var(--gold)"></i> Target ${d.year}`;
  const sisa = 2040 - d.totalYear;
  const targetInfo = document.querySelector(".target-info");
  if (targetInfo)
    targetInfo.innerHTML = `<div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center; font-size:12px;"><span><i class="fa fa-circle" style="color: #ffd700"></i> Status Hukum: <b>${d.breakdown.shsk}</b></span><span><i class="fa fa-circle" style="color: #0a192f"></i> Sertifikasi: <b>${d.breakdown.sert}</b></span><span><i class="fa fa-circle" style="color: #00c853"></i> ILR & PMK: <b>${d.breakdown.serv}</b></span></div>`;

  const ctxBar = document.getElementById("barChart").getContext("2d");
  if (barChartInstance) barChartInstance.destroy();
  barChartInstance = new Chart(ctxBar, {
    type: "bar",
    data: {
      labels: d.labels,
      datasets: [
        {
          label: "Status Hukum",
          data: d.datasets.shsk,
          backgroundColor: "rgba(255, 215, 0, 0.8)",
          borderColor: "rgba(255, 215, 0, 1)",
          borderWidth: 1,
          borderRadius: 3,
        },
        {
          label: "Sertifikasi",
          data: d.datasets.sert,
          backgroundColor: "rgba(10, 25, 47, 0.8)",
          borderColor: "rgba(10, 25, 47, 1)",
          borderWidth: 1,
          borderRadius: 3,
        },
        {
          label: "ILR & PMK",
          data: d.datasets.serv,
          backgroundColor: "rgba(0, 200, 83, 0.8)",
          borderColor: "rgba(0, 200, 83, 1)",
          borderWidth: 1,
          borderRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true, position: "bottom" } },
      scales: { y: { beginAtZero: true } },
    },
  });

  const ctxD = document.getElementById("doughnutChart").getContext("2d");
  if (doughnutChartInstance) doughnutChartInstance.destroy();
  doughnutChartInstance = new Chart(ctxD, {
    type: "doughnut",
    data: {
      labels: ["Status Hukum", "Sertifikasi", "ILR & PMK", "Sisa Target"],
      datasets: [
        {
          data: [
            d.breakdown.shsk,
            d.breakdown.sert,
            d.breakdown.serv,
            sisa < 0 ? 0 : sisa,
          ],
          backgroundColor: ["#ffd700", "#0a192f", "#00c853", "#eee"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: { legend: { display: false } },
    },
  });
}

async function updateExibChart(period, btn, type) {
  if (type === "ex")
    document
      .querySelectorAll(".filter-btn-ex")
      .forEach((b) => b.classList.remove("active"));
  else
    document
      .querySelectorAll(".filter-btn-psh")
      .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  const res = await postData({ action: "getDashboardStats", period: period });
  if (res.status === "SUCCESS") {
    const d = res.data;
    const labels = ["DECK", "MESIN", "OIL", "SAMPAH", "GMDSS"];
    const dataSet =
      type === "ex" ? d.datasets.exibhitum : d.datasets.pengesahan;
    const color =
      type === "ex" ? "rgba(0, 243, 255, 0.7)" : "rgba(255, 159, 67, 0.7)";
    const canvasId = type === "ex" ? "chartExibhitum" : "chartPengesahan";
    const ctx = document.getElementById(canvasId).getContext("2d");
    if (type === "ex" && exChartInstance) exChartInstance.destroy();
    if (type === "psh" && pshChartInstance) pshChartInstance.destroy();
    const chartConfig = {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Jumlah Buku",
            data: dataSet,
            backgroundColor: color,
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    };
    if (type === "ex") exChartInstance = new Chart(ctx, chartConfig);
    else pshChartInstance = new Chart(ctx, chartConfig);
  }
}

// ====================================================================
// 6. PROFILE PETUGAS
// ====================================================================
function loadProfilePetugas() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  document.getElementById("nav-name").innerText = user.nama;
  document.getElementById("sidebar-name").innerText = user.nama;
  document.getElementById("sidebar-nip").innerText = "NIP. " + (user.id || "-");
  document.getElementById("dash-name").innerText = user.nama.split(" ")[0];
  document.getElementById("sidebar-role").innerText = user.extra || "PETUGAS";
  if (user.foto) {
    document.getElementById(
      "sidebar-initial"
    ).innerHTML = `<img src="${user.foto}" class="profile-img-fit">`;
    document.getElementById("sidebar-initial").style.border =
      "2px solid var(--gold)";
  }
  speakWelcome(user.nama);
}
// ====================================================================
// FITUR: UPDATE SIDEBAR BADGE COUNT
// ====================================================================
async function updateSidebarCounts() {
  try {
    const res = await postData({ action: "getAllTotalCounts" });
    if (res.status === "SUCCESS") {
      const d = res.data;

      // Helper animasii
      const setBadge = (id, count) => {
        const el = document.getElementById(id);
        if (el) {
          el.innerText = count;
          el.classList.add("badge-bump"); // Efek membal
          setTimeout(() => el.classList.remove("badge-bump"), 300);
        }
      };

      setBadge("badge-shsk", d.SHSK);
      setBadge("badge-sertifikasi", d.SERTIFIKASI);
      setBadge("badge-service", d.SERVICE);
      setBadge("badge-exibhitum", d.EXIBHITUM);
    }
  } catch (e) {
    console.log("Gagal update badge count");
  }
}

// ====================================================================
// 7. BULK INPUT ENGINE (UPDATED: HYBRID PACKET & UI FIX)
// ====================================================================

window.togglePacketMode = function (index, mode, btn) {
  const parent = btn.parentNode.parentNode; // Naik ke parent container tombol
  const isAlreadyActive = btn.classList.contains("active");

  // Reset semua tombol paket di baris ini
  parent
    .querySelectorAll(".btn-packet")
    .forEach((b) => b.classList.remove("active"));

  const checkboxes = document.querySelectorAll(
    `input[name="cert_select_${index}"]`
  );

  if (isAlreadyActive) {
    packetModeState[index] = null; // Matikan Paket
    // Enable semua checkbox
    checkboxes.forEach((cb) => {
      cb.checked = false;
      cb.disabled = false;
    });
  } else {
    packetModeState[index] = mode; // Set Mode Baru
    btn.classList.add("active");

    // Tentukan target sertifikat berdasarkan mode
    let targets = [];
    if (mode === "NTR") targets = ["KONSTRUKSI", "PERLENGKAPAN", "RADIO"];
    else if (mode === "OB") targets = ["KONSTRUKSI", "PERLENGKAPAN"];
    else if (mode === "ENDORS_NTR")
      targets = ["ENDORS KONSTRUKSI", "ENDORS PERLENGKAPAN", "ENDORS RADIO"];
    else if (mode === "ENDORS_OB")
      targets = ["ENDORS KONSTRUKSI", "ENDORS PERLENGKAPAN"];

    // Centang otomatis & kunci checkbox target
    checkboxes.forEach((cb) => {
      if (targets.includes(cb.value)) {
        cb.checked = true;
        cb.disabled = true;
      } else {
        cb.disabled = false;
      }
    });
  }
  renderCertForms(index);
};

window.renderCertForms = function (index) {
  const container = document.getElementById(`dynamic-cert-forms-${index}`);
  const selectedCerts = Array.from(
    document.querySelectorAll(`input[name="cert_select_${index}"]:checked`)
  ).map((c) => c.value);

  if (selectedCerts.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:20px; color:#aaa; border:2px dashed #ddd; border-radius:10px;">Belum ada sertifikat yang dipilih.</div>`;
    return;
  }

  let html = "";
  const currentYear = new Date().getFullYear();
  const currentMode = packetModeState[index];

  // --- 1. RENDER FORM PAKET (SHARED SECTION) ---
  if (currentMode) {
    let title = "";
    let packetCerts = [];

    // Tentukan Judul & Isi Paket
    if (currentMode === "NTR") {
      title = "PAKET NTR";
      packetCerts = ["KONSTRUKSI", "PERLENGKAPAN", "RADIO"];
    } else if (currentMode === "OB") {
      title = "PAKET OIL BARGE";
      packetCerts = ["KONSTRUKSI", "PERLENGKAPAN"];
    } else if (currentMode === "ENDORS_NTR") {
      title = "PAKET ENDORS NTR";
      packetCerts = [
        "ENDORS KONSTRUKSI",
        "ENDORS PERLENGKAPAN",
        "ENDORS RADIO",
      ];
    } else if (currentMode === "ENDORS_OB") {
      title = "PAKET ENDORS OIL BARGE";
      packetCerts = ["ENDORS KONSTRUKSI", "ENDORS PERLENGKAPAN"];
    }

    html += `
        <div class="shared-form-section">
            <div style="font-weight:bold; color:var(--navy); margin-bottom:10px; border-bottom:1px solid var(--gold); padding-bottom:5px;">
                <i class="fa fa-box-open"></i> FORMULIR ${title}
            </div>
            <div class="grid-form">
                <label>Kode Billing (Shared) <input type="text" name="billing_shared_${index}" class="form-control" placeholder="1 Kode untuk semua"></label>
                <label>Masa Berlaku (Shared) <input type="date" name="berlaku_shared_${index}" class="form-control"></label>
            </div>
            <div class="grid-form" style="margin-top:10px;">
                <label>Upload Permohonan (1 File) <div class="file-dropzone"><input type="file" name="permohonan_shared_${index}" onchange="handleFileSelect(this)"><div class="dropzone-content"><i class="fa fa-cloud-upload-alt dropzone-icon"></i><span class="dropzone-text">Pilih File...</span></div></div></label>
                <label>Upload Laporan (1 File) <div class="file-dropzone"><input type="file" name="laporan_shared_${index}" onchange="handleFileSelect(this)"><div class="dropzone-content"><i class="fa fa-cloud-upload-alt dropzone-icon"></i><span class="dropzone-text">Pilih File...</span></div></div></label>
                <label>Upload Bukti Billing <div class="file-dropzone"><input type="file" name="bukti_billing_shared_${index}" onchange="handleFileSelect(this)"><div class="dropzone-content"><i class="fa fa-receipt dropzone-icon"></i><span class="dropzone-text">Pilih File...</span></div></div></label>
            </div>
        </div>
    `;

    // Loop Item Paket (Hanya Upload Sertifikat & No Sert)
    selectedCerts.forEach((cert) => {
      if (packetCerts.includes(cert)) {
        let defaultNo = cert.includes("RADIO") ? "AL.502" : "AL.501";
        html += `
                <div class="cert-dynamic-card">
                    <span class="cert-card-badge">${cert}</span>
                    <div class="grid-form">
                        <label>Nomor Sertifikat <input type="text" name="no_sert_${cert}_${index}" class="form-control" value="${defaultNo}///KSOP.PKU/${currentYear}"></label>
                        <label>File Sertifikat <div class="file-dropzone"><input type="file" name="file_sert_${cert}_${index}" onchange="handleFileSelect(this)"><div class="dropzone-content"><i class="fa fa-file-pdf dropzone-icon"></i><span class="dropzone-text">Upload...</span></div></div></label>
                    </div>
                </div>
            `;
      }
    });
  }

  // --- 2. RENDER FORM ECERAN (SISANYA) ---
  selectedCerts.forEach((cert) => {
    // Cek apakah sertifikat ini termasuk dalam paket yang sedang aktif
    if (currentMode) {
      let packetCerts = [];
      if (currentMode === "NTR")
        packetCerts = ["KONSTRUKSI", "PERLENGKAPAN", "RADIO"];
      else if (currentMode === "OB")
        packetCerts = ["KONSTRUKSI", "PERLENGKAPAN"];
      else if (currentMode === "ENDORS_NTR")
        packetCerts = [
          "ENDORS KONSTRUKSI",
          "ENDORS PERLENGKAPAN",
          "ENDORS RADIO",
        ];
      else if (currentMode === "ENDORS_OB")
        packetCerts = ["ENDORS KONSTRUKSI", "ENDORS PERLENGKAPAN"];

      if (packetCerts.includes(cert)) return; // Skip yang sudah di-handle oleh paket
    }

    let defaultNo =
      CERT_CODES[cert] && CERT_CODES[cert] !== "SPECIAL"
        ? CERT_CODES[cert]
        : "";
    html += `
            <div class="cert-dynamic-card" style="border-left-color:#ff9f43;">
                <span class="cert-card-badge" style="background:#ff9f43;">${cert} (ECERAN)</span>
                <div class="grid-form">
                    <label>Nomor Sertifikat <input type="text" name="no_sert_${cert}_${index}" class="form-control" value="${defaultNo}///KSOP.PKU/${currentYear}"></label>
                    <label>Masa Berlaku <input type="date" name="berlaku_${cert}_${index}" class="form-control"></label>
                    <label>Kode Billing <input type="text" name="billing_${cert}_${index}" class="form-control"></label>
                </div>
                <div class="grid-form" style="margin-top:10px;">
                    <label>Permohonan <div class="file-dropzone"><input type="file" name="permohonan_${cert}_${index}" onchange="handleFileSelect(this)"><div class="dropzone-content"><i class="fa fa-cloud-upload-alt dropzone-icon"></i><span class="dropzone-text">Upload...</span></div></div></label>
                    <label>Laporan Pemeriksaan <div class="file-dropzone"><input type="file" name="laporan_${cert}_${index}" onchange="handleFileSelect(this)"><div class="dropzone-content"><i class="fa fa-file-medical-alt dropzone-icon"></i><span class="dropzone-text">Upload...</span></div></div></label>
                    <label>Bukti Billing <div class="file-dropzone"><input type="file" name="bukti_billing_${cert}_${index}" onchange="handleFileSelect(this)"><div class="dropzone-content"><i class="fa fa-receipt dropzone-icon"></i><span class="dropzone-text">Upload...</span></div></div></label>
                    <label>Sertifikat <div class="file-dropzone"><input type="file" name="file_sert_${cert}_${index}" onchange="handleFileSelect(this)"><div class="dropzone-content"><i class="fa fa-file-pdf dropzone-icon"></i><span class="dropzone-text">Upload...</span></div></div></label>
                </div>
            </div>
      `;
  });

  container.innerHTML = html;
};

window.updateExibhitumForms = function (currentIndex) {
  // 1. Kumpulkan SEMUA Checkbox yang aktif di SELURUH Form (Bukan cuma index ini)
  // Tujuannya biar urutannya nyambung dari Form #1 ke Form #2 dst.
  const allForms = document.querySelectorAll(".bulk-card");

  let globalSequence = 0; // Urutan global dimulai dari 0 (nanti ditambah lastNum)

  allForms.forEach((card, idx) => {
    const i = idx + 1; // Index form (1, 2, 3...)
    const container = document.getElementById(`dynamic-nomor-${i}`);
    if (!container) return;

    const books = ["DECK", "MESIN", "OIL", "SAMPAH", "GMDSS"];
    let pshList = [];
    let exList = [];

    // Cek Pengesahan (Prioritas 1)
    books.forEach((b) => {
      const ck = document.querySelector(`input[name="check_PSH_${b}_${i}"]`);
      if (ck && ck.checked)
        pshList.push({ name: b, code: `PSH. ${b}`, key: `PSH.${b}` });
    });

    // Cek Exibhitum (Prioritas 2)
    books.forEach((b) => {
      const ck = document.querySelector(`input[name="check_EX_${b}_${i}"]`);
      if (ck && ck.checked)
        exList.push({ name: b, code: `EX. ${b}`, key: `EX.${b}` });
    });

    // Render HTML
    let htmlPsh = "";
    let htmlEx = "";

    // GENERATOR NOMOR PENGESAHAN
    pshList.forEach((item) => {
      globalSequence++; // Nambah antrian
      const nomorLive = generateNextNumberJS(cachedLastNumber, globalSequence);
      htmlPsh += `
            <div style="margin-bottom:8px;">
                <label style="font-size:11px; font-weight:bold; color:#ff9f43; display:block; margin-bottom:2px;">${item.name}</label>
                <input type="text" name="nomorSurat_${item.key}_${i}" class="form-control" value="${nomorLive}" style="font-size:12px; padding:6px; font-weight:bold;">
            </div>`;
    });

    // GENERATOR NOMOR EXIBHITUM
    exList.forEach((item) => {
      globalSequence++; // Nambah antrian
      const nomorLive = generateNextNumberJS(cachedLastNumber, globalSequence);
      htmlEx += `
            <div style="margin-bottom:8px;">
                <label style="font-size:11px; font-weight:bold; color:var(--neon-blue); display:block; margin-bottom:2px;">${item.name}</label>
                <input type="text" name="nomorSurat_${item.key}_${i}" class="form-control" value="${nomorLive}" style="font-size:12px; padding:6px; font-weight:bold;">
            </div>`;
    });

    // Update Tampilan Container
    if (htmlEx === "" && htmlPsh === "") {
      container.innerHTML =
        "<div style='text-align:center; padding:10px; color:#aaa; font-style:italic;'>Belum ada buku yang dipilih.</div>";
    } else {
      container.innerHTML = `
        <div class="service-options-container" style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
            <div style="background:#fff8f0; padding:12px; border-radius:8px; border:1px dashed #ff9f43;">
                <div style="font-size:12px; font-weight:bold; color:#ff9f43; margin-bottom:10px; text-align:center; border-bottom:1px solid #ffe0b2; padding-bottom:5px;">PENGESAHAN</div>
                ${
                  htmlPsh ||
                  '<div style="text-align:center; font-size:11px; color:#aaa; margin-top:10px;">- Kosong -</div>'
                }
            </div>
            <div style="background:#f0f8ff; padding:12px; border-radius:8px; border:1px dashed var(--neon-blue);">
                <div style="font-size:12px; font-weight:bold; color:var(--neon-blue); margin-bottom:10px; text-align:center; border-bottom:1px solid #cceeff; padding-bottom:5px;">EXIBHITUM</div>
                ${
                  htmlEx ||
                  '<div style="text-align:center; font-size:11px; color:#aaa; margin-top:10px;">- Kosong -</div>'
                }
            </div>
        </div>`;
    }
  });
};

window.updateServiceQty = function (i) {
  const container = document.getElementById(`qty-container-${i}`);
  const liferaftCheck = document.querySelector(
    `input[name="check_liferaft_${i}"]`
  );
  const feCheck = document.querySelector(`input[name="check_fe_${i}"]`);
  let html = "";
  if (liferaftCheck && liferaftCheck.checked)
    html += `<label>Jumlah LIFERAFT <input type="number" name="jumlah_LIFERAFT_${i}" class="form-control" placeholder="0"></label>`;
  if (feCheck && feCheck.checked)
    html += `<label>Jumlah FIRE EXTINGUISHER <input type="number" name="jumlah_FE_${i}" class="form-control" placeholder="0"></label>`;
  container.innerHTML = html ? `<div class="grid-form">${html}</div>` : "";
};

window.handleFileSelect = function (input) {
  const dz = input.closest(".file-dropzone");
  const txt = dz.querySelector(".dropzone-text");
  const icon = dz.querySelector(".dropzone-icon");
  if (input.files && input.files[0]) {
    dz.classList.add("has-file");
    txt.innerText = input.files[0].name.substring(0, 15) + "...";
    icon.className = "fa fa-check-circle dropzone-icon";
  } else {
    dz.classList.remove("has-file");
    txt.innerText = "Pilih File...";
    icon.className = "fa fa-cloud-upload-alt dropzone-icon";
  }
};

// ====================================================================
// FUNGSI RENDER FORM (PERBAIKAN V13.2)
// ====================================================================
function renderBulkForm(type) {
  let countSelectId, containerId;
  if (type === "SHSK") {
    countSelectId = "bulkCountSHSK";
    containerId = "bulk-container-SHSK";
  } else if (type === "SERTIFIKASI") {
    countSelectId = "bulkCountSertifikasi";
    containerId = "bulk-container-SERTIFIKASI";
  } else if (type === "SERVICE") {
    countSelectId = "bulkCountService";
    containerId = "bulk-container-SERVICE";
  } else if (type === "EXIBHITUM") {
    countSelectId = "bulkCountExibhitum";
    containerId = "bulk-container-EXIBHITUM";
  }

  const countSelect = document.getElementById(countSelectId);
  const container = document.getElementById(containerId);
  if (!container || !countSelect) return;
  const count = parseInt(countSelect.value);
  container.innerHTML = "";

  for (let i = 1; i <= count; i++) {
    // UI: Add 'bulk-card' class for styling
    let html = `
    <div class="bulk-card">
        <div class="bulk-number-badge">#${i}</div>
        <input type="hidden" name="noUrut_${i}"><input type="hidden" name="oldFolderUrl_${i}">
    `;

    if (type === "SHSK") {
      html += `
      <div class="accordion-item">
        <div class="accordion-header" onclick="toggleAccordion(this)"><span>Informasi Kapal</span> <i class="fa fa-chevron-down"></i></div>
        <div class="accordion-body"><div class="grid-form"><label>Nama Kapal <input type="text" name="namaKapal_${i}" class="form-control" style="text-transform:uppercase" list="companyList"></label><label>Tonase <input type="text" name="tonase_${i}" class="form-control"></label><label>Tanda Pendaftaran <input type="text" name="tandaPendaftaran_${i}" class="form-control" style="text-transform:uppercase"></label><label>Pemilik <input type="text" name="pemilik_${i}" class="form-control" style="text-transform:uppercase" list="companyList"></label></div></div>
      </div>
      <div class="accordion-item"> <div class="accordion-header" onclick="toggleAccordion(this)"><span>Dokumen & Upload</span> <i class="fa fa-chevron-down"></i></div>
        <div class="accordion-body"> <div class="grid-form"><label>Tempat STKK <input type="text" name="tempatStkk_${i}" class="form-control" style="text-transform:uppercase"></label><label>Tgl STKK <input type="date" name="tglStkk_${i}" class="form-control"></label><label>No Urut <input type="text" name="noUrutStkk_${i}" class="form-control"></label><label>No Hal <input type="text" name="noHalStkk_${i}" class="form-control"></label><label>No Buku <input type="text" name="noBukuStkk_${i}" class="form-control"></label></div>
            <div class="grid-form" style="margin-top:10px;"><label>Jenis Dokumen <select name="statusPengukuhan_${i}" class="form-control">
                <option value="">-- Pilih --</option>
                <option value="SURAT UKUR DALAM NEGERI">SURAT UKUR DALAM NEGERI</option>
                <option value="SURAT UKUR DALAM NEGERI SEMENTARA">SURAT UKUR DALAM NEGERI SEMENTARA</option>
                <option value="SURAT UKUR INTERNASIONAL">SURAT UKUR INTERNASIONAL</option>
                <option value="SURAT UKUR INTERNASIONAL SEMENTARA">SURAT UKUR INTERNASIONAL SEMENTARA</option>
                <option value="SALINAN SURAT UKUR">SALINAN SURAT UKUR</option>
                <option value="DAFTAR UKUR">DAFTAR UKUR</option>
                <option value="PAS BESAR">PAS BESAR</option>
                <option value="PAS BESAR SEMENTARA">PAS BESAR SEMENTARA</option>
                <option value="PAS BESAR ENDORSTMENT">PAS BESAR ENDORSTMENT</option>
                <option value="SURAT LAUT ENDORSTMENT">SURAT LAUT ENDORSTMENT</option>
                <option value="PAS KECIL">PAS KECIL</option>
                <option value="PAS KECIL ENDORSTMENT">PAS KECIL ENDORSTMENT</option>
                <option value="PENDAFTARAN KAPAL">PENDAFTARAN KAPAL</option>
                <option value="SURAT KET. STATUS HUKUM">SURAT KET. STATUS HUKUM</option>
                <option value="SURAT KET. PENGHAPUSAN KAPAL">SURAT KET. PENGHAPUSAN KAPAL</option>
                <option value="HALAMAN TAMBAHAN">HALAMAN TAMBAHAN</option>
                <option value="BALIKNAMA KAPAL">BALIKNAMA KAPAL</option>
                <option value="HIPOTEK KAPAL">HIPOTEK KAPAL</option>
                <option value="ROYA HIPOTEK KAPAL">ROYA HIPOTEK KAPAL</option>
            </select></label><label>Tgl Pengukuhan <input type="date" name="tglPengukuhan_${i}" class="form-control"></label></div>
            <div class="grid-form" style="margin-top:10px;">
                <label>Permohonan <div class="file-dropzone"><input type="file" name="permohonan_${i}" onchange="handleFileSelect(this)"><div class="dropzone-content"><i class="fa fa-cloud-upload-alt dropzone-icon"></i><span class="dropzone-text">Upload</span></div></div></label>
                <label>STKK <div class="file-dropzone"><input type="file" name="stkk_${i}" onchange="handleFileSelect(this)"><div class="dropzone-content"><i class="fa fa-cloud-upload-alt dropzone-icon"></i><span class="dropzone-text">Upload</span></div></div></label>
                <label>Grosse <div class="file-dropzone"><input type="file" name="grosse_${i}" onchange="handleFileSelect(this)"><div class="dropzone-content"><i class="fa fa-cloud-upload-alt dropzone-icon"></i><span class="dropzone-text">Upload</span></div></div></label>
                <label>Surat Ukur <div class="file-dropzone"><input type="file" name="ukur_${i}" onchange="handleFileSelect(this)"><div class="dropzone-content"><i class="fa fa-cloud-upload-alt dropzone-icon"></i><span class="dropzone-text">Upload</span></div></div></label>
                <label>PNBP <div class="file-dropzone"><input type="file" name="pnbp_${i}" onchange="handleFileSelect(this)"><div class="dropzone-content"><i class="fa fa-cloud-upload-alt dropzone-icon"></i><span class="dropzone-text">Upload</span></div></div></label>
            </div>
        </div>
      </div>`;
    } else if (type === "SERTIFIKASI") {
      html += `
        <div class="accordion-item">
            <div class="accordion-header" onclick="toggleAccordion(this)"><span>1. Informasi Kapal</span> <i class="fa fa-chevron-down"></i></div>
            <div class="accordion-body">
                <div class="grid-form">
                    <label>Nama Perusahaan <input type="text" name="perusahaan_${i}" class="form-control" style="text-transform:uppercase" list="companyList"></label>
                    <label>Nama Kapal <input type="text" name="namaKapal_${i}" class="form-control" style="text-transform:uppercase"></label>
                    <label>Call Sign <input type="text" name="callSign_${i}" class="form-control" style="text-transform:uppercase"></label>
                    <label>Bahan Kapal <input type="text" name="bahan_${i}" class="form-control" style="text-transform:uppercase" list="materialList"></label>
                    <label>Ukuran (GT) <input type="text" name="ukuran_${i}" class="form-control"></label>
                    <label>Daerah Pelayaran <select name="daerahPelayaran_${i}" class="form-control">
                        <option value="">-- Pilih --</option>
                        <option value="SEMUA LAUTAN">SEMUA LAUTAN</option>
                        <option value="PERAIRAN INDONESIA">PERAIRAN INDONESIA</option>
                        <option value="LOKAL">LOKAL</option>
                        <option value="TERBATAS">TERBATAS</option>
                        <option value="PELABUHAN">PELABUHAN</option>
                    </select></label>
                    <label>Tanggal Terbit <input type="date" name="tglTerbit_${i}" class="form-control"></label>
                    <label>Pemeriksa <select name="pemeriksa_${i}" class="form-control">
                        <option value="">-- Pilih --</option>
                        <option value="ANTON SUJARWADI, S.Si.T, M.M.">ANTON SUJARWADI, S.Si.T, M.M.</option>
                        <option value="HARNO SIAGIAN, A.Md">HARNO SIAGIAN, A.Md</option>
                        <option value="BUSTANUL ARIFIN, S.A.P.">BUSTANUL ARIFIN, S.A.P.</option>
                    </select></label>
                    <label>Keterangan <select name="keterangan_${i}" class="form-control">
                        <option value="">- Pilih -</option>
                        <option value=""></option>
                        <option value="DOCKING">DOCKING</option>
                        <option value="1 X PELAYARAN">1 X PELAYARAN</option>
                    </select></label>
                </div>
                <div style="margin-top:15px; border-top:1px dashed #ccc; padding-top:10px;">
                    <label style="font-weight:bold; font-size:12px;">Upload Shared (1 File untuk Semua):</label>
                    <div class="grid-form" style="margin-top:5px;">
                        <label>Evaluasi <div class="file-dropzone"><input type="file" name="evaluasi_${i}" onchange="handleFileSelect(this)"><div class="dropzone-content"><i class="fa fa-cloud-upload-alt dropzone-icon"></i><span class="dropzone-text">Upload</span></div></div></label>
                        <label>Surat Tugas <div class="file-dropzone"><input type="file" name="surat_tugas_${i}" onchange="handleFileSelect(this)"><div class="dropzone-content"><i class="fa fa-cloud-upload-alt dropzone-icon"></i><span class="dropzone-text">Upload</span></div></div></label>
                        <label>Foto <div class="file-dropzone"><input type="file" name="foto_${i}" multiple onchange="handleFileSelect(this)"><div class="dropzone-content"><i class="fa fa-cloud-upload-alt dropzone-icon"></i><span class="dropzone-text">Upload</span></div></div></label>
                    </div>
                </div>
            </div>
        </div>

        <div class="accordion-item">
            <div class="accordion-header" onclick="toggleAccordion(this)"><span>2. Pilih Jenis Sertifikat</span> <i class="fa fa-chevron-down"></i></div>
            <div class="accordion-body">
                <div class="packet-btn-group" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <div class="btn-packet ntr" onclick="togglePacketMode(${i}, 'NTR', this)">
                        <i class="fa fa-layer-group"></i> PAKET NTR
                    </div>
                    <div class="btn-packet ob" onclick="togglePacketMode(${i}, 'OB', this)">
                        <i class="fa fa-ship"></i> PAKET OIL BARGE
                    </div>
                    <div class="btn-packet ntr" onclick="togglePacketMode(${i}, 'ENDORS_NTR', this)">
                        <i class="fa fa-check-double"></i> ENDORS NTR
                    </div>
                    <div class="btn-packet ob" onclick="togglePacketMode(${i}, 'ENDORS_OB', this)">
                        <i class="fa fa-oil-can"></i> ENDORS OB
                    </div>
                </div>
                
                <div class="cert-grid-container" style="margin-top:15px;">
                    ${CERT_LIST.map(
                      (cert) => `
                        <label class="cert-check-card">
                            <input type="checkbox" name="cert_select_${i}" value="${cert}" onchange="renderCertForms(${i})">
                            <div class="cert-card-ui">${cert}</div>
                        </label>
                    `
                    ).join("")}
                </div>
            </div>
        </div>
        <div id="dynamic-cert-forms-${i}" style="margin-top:20px;"></div>`;
    } else if (type === "SERVICE") {
      html += `
        <div class="accordion-item">
            <div class="accordion-header" onclick="toggleAccordion(this)"><span>Info Service</span> <i class="fa fa-chevron-down"></i></div>
            <div class="accordion-body">
                <div class="grid-form"><label>Penyedia Jasa <input type="text" name="namaPenyediaJasa_${i}" class="form-control" list="companyList" style="text-transform:uppercase"></label><label>Nama Kapal <input type="text" name="namaKapal_${i}" class="form-control" style="text-transform:uppercase"></label><label>Tanggal Validasi <input type="date" name="tglValidasi_${i}" class="form-control"></label></div>
                <div class="service-selection-box">
                    <label class="form-label-bold">Pilih Jenis Alat Keselamatan:</label>
                    <div class="service-options-container">
                        <label class="tool-checkbox-card">
                            <input type="checkbox" name="check_liferaft_${i}" value="LIFERAFT" onchange="updateServiceQty(${i})">
                            <div class="tool-card-design"><div class="tool-icon"><i class="fa fa-life-ring"></i></div><span class="tool-text">1. LIFERAFT</span></div>
                        </label>
                        <label class="tool-checkbox-card">
                            <input type="checkbox" name="check_fe_${i}" value="FIRE EXTINGUISHER" onchange="updateServiceQty(${i})">
                            <div class="tool-card-design"><div class="tool-icon"><i class="fa fa-fire-extinguisher"></i></div><span class="tool-text">2. FIRE EXTINGUISHER</span></div>
                        </label>
                    </div>
                    <div id="qty-container-${i}" class="qty-dynamic-area"></div>
                </div>
            </div>
        </div>
        <div class="accordion-item">
            <div class="accordion-header" onclick="toggleAccordion(this)"><span>Upload Dokumen</span> <i class="fa fa-chevron-down"></i></div>
            <div class="accordion-body">
                <div class="grid-form">
                    <label>Permohonan <div class="file-dropzone"><input type="file" name="permohonan_${i}" onchange="handleFileSelect(this)"><div class="dropzone-content"><i class="fa fa-cloud-upload-alt dropzone-icon"></i><span class="dropzone-text">Upload</span></div></div></label>
                    <label>STKK <div class="file-dropzone"><input type="file" name="stkk_${i}" onchange="handleFileSelect(this)"><div class="dropzone-content"><i class="fa fa-cloud-upload-alt dropzone-icon"></i><span class="dropzone-text">Upload</span></div></div></label>
                    <label>Sertifikat ILR/PMK <div class="file-dropzone"><input type="file" name="sertifikat_${i}" onchange="handleFileSelect(this)"><div class="dropzone-content"><i class="fa fa-cloud-upload-alt dropzone-icon"></i><span class="dropzone-text">Upload</span></div></div></label>
                </div>
            </div>
        </div>`;
    } // 4. EXIBHITUM (FIX UI: PENGESAHAN DI KIRI, EXIBHITUM DI KANAN)
    else if (type === "EXIBHITUM") {
      html += `
        <div class="accordion-item">
            <div class="accordion-header" onclick="toggleAccordion(this)"><span>Data Exibhitum</span> <i class="fa fa-chevron-down"></i></div>
            <div class="accordion-body">
                <div class="grid-form"><label>Tanggal <input type="date" name="tanggal_${i}" class="form-control"></label><label>Perusahaan <input type="text" name="perusahaan_${i}" class="form-control" list="companyList" style="text-transform:uppercase"></label><label>Nama Kapal <input type="text" name="namaKapal_${i}" class="form-control" style="text-transform:uppercase"></label><label>PUP <input type="text" name="pup_${i}" class="form-control"></label></div>
            </div>
        </div>
        
        <div class="accordion-item">
            <div class="accordion-header" onclick="toggleAccordion(this)"><span>Pilih Buku</span> <i class="fa fa-chevron-down"></i></div>
            <div class="accordion-body">
                <div class="service-selection-box">
                    <div class="exib-grid-wrapper" style="display:grid; grid-template-columns: 1fr 1fr; gap: 25px;">
                        
                        <div class="group-psh">
                            <span class="group-label"><i class="fa fa-stamp"></i> PENGESAHAN</span>
                            <div class="book-grid-container">
                                ${["DECK", "MESIN", "OIL", "SAMPAH", "GMDSS"]
                                  .map(
                                    (b) => `
                                    <label class="book-checkbox">
                                        <input type="checkbox" name="check_PSH_${b}_${i}" value="PSH. ${b}" onchange="updateExibhitumForms(${i})">
                                        <div class="book-ui">${b}</div>
                                    </label>
                                `
                                  )
                                  .join("")}
                            </div>
                        </div>

                        <div class="group-ex">
                            <span class="group-label"><i class="fa fa-book"></i> EXIBHITUM</span>
                            <div class="book-grid-container">
                                ${["DECK", "MESIN", "OIL", "SAMPAH", "GMDSS"]
                                  .map(
                                    (b) => `
                                    <label class="book-checkbox">
                                        <input type="checkbox" name="check_EX_${b}_${i}" value="EX. ${b}" onchange="updateExibhitumForms(${i})">
                                        <div class="book-ui">${b}</div>
                                    </label>
                                `
                                  )
                                  .join("")}
                            </div>
                        </div>

                    </div>
                </div>
                <div id="dynamic-nomor-${i}" style="margin-top:15px;"></div>
            </div>
        </div>

        <div class="accordion-item">
            <div class="accordion-header" onclick="toggleAccordion(this)"><span>Upload Dokumen</span> <i class="fa fa-chevron-down"></i></div>
            <div class="accordion-body">
                <div class="grid-form">
                    <label>Permohonan <div class="file-dropzone"><input type="file" name="permohonan_${i}" onchange="handleFileSelect(this)"><div class="dropzone-content"><i class="fa fa-cloud-upload-alt dropzone-icon"></i><span class="dropzone-text">Upload</span></div></div></label>
                    <label>Billing <div class="file-dropzone"><input type="file" name="billing_${i}" onchange="handleFileSelect(this)"><div class="dropzone-content"><i class="fa fa-cloud-upload-alt dropzone-icon"></i><span class="dropzone-text">Upload</span></div></div></label>
                </div>
            </div>
        </div>`;
    }
    html += `</div>`; // Close Bulk Card
    container.innerHTML += html;
    if (type === "EXIBHITUM") {
      initExibhitumNumber(); // <--- PANGGIL DI SINI
    }
  }
}

async function handleBulkSubmit(type) {
  let formId, countId, btnId;
  if (type === "SHSK") {
    formId = "formSHSK";
    countId = "bulkCountSHSK";
    btnId = "btn-save-SHSK";
  } else if (type === "SERTIFIKASI") {
    formId = "formSertifikasi";
    countId = "bulkCountSertifikasi";
    btnId = "btn-save-SERTIFIKASI";
  } else if (type === "SERVICE") {
    formId = "formService";
    countId = "bulkCountService";
    btnId = "btn-save-SERVICE";
  } else if (type === "EXIBHITUM") {
    formId = "formExibhitum";
    countId = "bulkCountExibhitum";
    btnId = "btn-save-EXIBHITUM";
  }

  // Cek tombol mana yang aktif (Tombol Update atau Save)
  let btnSave = document.getElementById(`btn-update-${type}`);
  if (!btnSave || btnSave.classList.contains("hidden")) {
    btnSave = document.getElementById(btnId);
  }

  const form = document.getElementById(formId);
  const count = parseInt(document.getElementById(countId).value);
  const originalText = btnSave.innerHTML;

  btnSave.innerHTML = '<i class="fa fa-spinner fa-spin"></i> MEMPROSES...';
  btnSave.disabled = true;
  showPopup("Sedang menyimpan data...", "info");

  const items = [];

  // --- LOOPING PENGAMBILAN DATA ---
  for (let i = 1; i <= count; i++) {
    const itemData = {};
    let hasData = false;

    // Helper File
    const getFile = (name) => {
      const el = form.querySelector(`[name="${name}"]`);
      return el && el.files.length > 0 ? el.files[0] : null;
    };
    const read = (file) =>
      new Promise((resolve) => {
        const r = new FileReader();
        r.onload = (e) =>
          resolve({ ext: file.name.split(".").pop(), data: e.target.result });
        r.readAsDataURL(file);
      });

    // 1. SERTIFIKASI
    if (type === "SERTIFIKASI") {
      const inputs = form.querySelectorAll(`[name$="_${i}"]`);
      const globalData = {};
      inputs.forEach((input) => {
        const key = input.name.replace(`_${i}`, "");
        if (
          input.type !== "file" &&
          !key.startsWith("no_sert") &&
          !key.startsWith("billing") &&
          !key.startsWith("berlaku") &&
          !key.startsWith("cert_select")
        ) {
          globalData[key] = input.value.toUpperCase();
          if (key === "namaKapal" && input.value.trim() !== "") hasData = true;
        }
      });
      if (!hasData) continue;

      const selectedCerts = Array.from(
        form.querySelectorAll(`input[name="cert_select_${i}"]:checked`)
      ).map((c) => c.value);
      const isPacket = packetModeState[i];

      const sharedFiles = [];
      const fEval = getFile(`evaluasi_${i}`);
      if (fEval)
        sharedFiles.push({ jenis: "evaluasi", ...(await read(fEval)) });
      const fTugas = getFile(`surat_tugas_${i}`);
      if (fTugas)
        sharedFiles.push({ jenis: "surat_tugas", ...(await read(fTugas)) });
      const fFoto = form.querySelector(`[name="foto_${i}"]`);
      if (fFoto && fFoto.files.length > 0) {
        for (let x = 0; x < fFoto.files.length; x++)
          sharedFiles.push({
            jenis: `FOTO ${x + 1}`,
            ...(await read(fFoto.files[x])),
          });
      }

      for (const cert of selectedCerts) {
        let rowItem = {
          ...globalData,
          jenisSertifikat: cert,
          files: [...sharedFiles],
        };

        // PENTING: Ambil No Urut buat cek Edit/Baru
        rowItem.noUrut = form.querySelector(`[name="noUrut_${i}"]`).value;
        rowItem.oldFolderUrl = form.querySelector(
          `[name="oldFolderUrl_${i}"]`
        ).value;

        let packetCerts = [];
        if (isPacket === "NTR")
          packetCerts = ["KONSTRUKSI", "PERLENGKAPAN", "RADIO"];
        else if (isPacket === "OB")
          packetCerts = ["KONSTRUKSI", "PERLENGKAPAN"];
        else if (isPacket === "ENDORS_NTR")
          packetCerts = [
            "ENDORS KONSTRUKSI",
            "ENDORS PERLENGKAPAN",
            "ENDORS RADIO",
          ];
        else if (isPacket === "ENDORS_OB")
          packetCerts = ["ENDORS KONSTRUKSI", "ENDORS PERLENGKAPAN"];

        if (isPacket && packetCerts.includes(cert)) {
          rowItem.kodeBilling = form.querySelector(
            `[name="billing_shared_${i}"]`
          ).value;
          rowItem.tglBerlaku = form.querySelector(
            `[name="berlaku_shared_${i}"]`
          ).value;
          rowItem.noSertifikat = form.querySelector(
            `[name="no_sert_${cert}_${i}"]`
          ).value;
          const fPerm = getFile(`permohonan_shared_${i}`);
          if (fPerm)
            rowItem.files.push({ jenis: "permohonan", ...(await read(fPerm)) });
          const fLap = getFile(`laporan_shared_${i}`);
          if (fLap)
            rowItem.files.push({
              jenis: "laporan_pemeriksaan",
              ...(await read(fLap)),
            });
          const fBilling = getFile(`bukti_billing_shared_${i}`);
          if (fBilling)
            rowItem.files.push({
              jenis: "bukti_billing",
              ...(await read(fBilling)),
            });
        } else {
          rowItem.kodeBilling = form.querySelector(
            `[name="billing_${cert}_${i}"]`
          ).value;
          rowItem.tglBerlaku = form.querySelector(
            `[name="berlaku_${cert}_${i}"]`
          ).value;
          rowItem.noSertifikat = form.querySelector(
            `[name="no_sert_${cert}_${i}"]`
          ).value;
          const fPerm = getFile(`permohonan_${cert}_${i}`);
          if (fPerm)
            rowItem.files.push({ jenis: "permohonan", ...(await read(fPerm)) });
          const fLap = getFile(`laporan_${cert}_${i}`);
          if (fLap)
            rowItem.files.push({
              jenis: "laporan_pemeriksaan",
              ...(await read(fLap)),
            });
          const fBilling = getFile(`bukti_billing_${cert}_${i}`);
          if (fBilling)
            rowItem.files.push({
              jenis: "bukti_billing",
              ...(await read(fBilling)),
            });
        }
        const fSert = getFile(`file_sert_${cert}_${i}`);
        if (fSert)
          rowItem.files.push({ jenis: "sertifikat", ...(await read(fSert)) });
        items.push(rowItem);
      }
    }

    // 2. SHSK
    else if (type === "SHSK") {
      const inputs = form.querySelectorAll(`[name$="_${i}"]`);
      inputs.forEach((input) => {
        const key = input.name.replace(`_${i}`, "");
        if (input.type !== "file") {
          itemData[key] = input.value.toUpperCase();
          if (key === "namaKapal" && input.value.trim() !== "") hasData = true;
        }
      });
      if (!hasData) continue;
      itemData.files = [];
      const fPerm = getFile(`permohonan_${i}`);
      if (fPerm)
        itemData.files.push({ jenis: "permohonan", ...(await read(fPerm)) });
      const fStkk = getFile(`stkk_${i}`);
      if (fStkk) itemData.files.push({ jenis: "stkk", ...(await read(fStkk)) });
      const fGrosse = getFile(`grosse_${i}`);
      if (fGrosse)
        itemData.files.push({ jenis: "grosse", ...(await read(fGrosse)) });
      const fUkur = getFile(`ukur_${i}`);
      if (fUkur)
        itemData.files.push({ jenis: "surat_ukur", ...(await read(fUkur)) });
      const fPnbp = getFile(`pnbp_${i}`);
      if (fPnbp) itemData.files.push({ jenis: "pnbp", ...(await read(fPnbp)) });
      items.push(itemData);
    }

    // 3. SERVICE
    else if (type === "SERVICE") {
      const penyedia = form.querySelector(
        `[name="namaPenyediaJasa_${i}"]`
      ).value;
      if (penyedia.trim()) {
        itemData.namaPenyediaJasa = penyedia.toUpperCase();
        itemData.namaKapal = form
          .querySelector(`[name="namaKapal_${i}"]`)
          .value.toUpperCase();
        itemData.tglValidasi = form.querySelector(
          `[name="tglValidasi_${i}"]`
        ).value;
        itemData.noUrut = form.querySelector(`[name="noUrut_${i}"]`).value;
        itemData.oldFolderUrl = form.querySelector(
          `[name="oldFolderUrl_${i}"]`
        ).value;
        let jenisArr = [];
        let jumlahArr = [];
        if (form.querySelector(`[name="check_liferaft_${i}"]`).checked) {
          jenisArr.push("1. LIFERAFT");
          jumlahArr.push(
            form.querySelector(`[name="jumlah_LIFERAFT_${i}"]`).value
          );
        }
        if (form.querySelector(`[name="check_fe_${i}"]`).checked) {
          jenisArr.push("2. FIRE EXT");
          jumlahArr.push(form.querySelector(`[name="jumlah_FE_${i}"]`).value);
        }
        itemData.jenisAlat = jenisArr.join("\n");
        itemData.jumlah = jumlahArr.join("\n");
        itemData.files = [];
        const fPerm = getFile(`permohonan_${i}`);
        if (fPerm)
          itemData.files.push({ jenis: "permohonan", ...(await read(fPerm)) });
        const fStkk = getFile(`stkk_${i}`);
        if (fStkk)
          itemData.files.push({ jenis: "stkk", ...(await read(fStkk)) });
        const fSert = getFile(`sertifikat_${i}`);
        if (fSert)
          itemData.files.push({
            jenis: "sertifikat_ilr_pmk",
            ...(await read(fSert)),
          });
        items.push(itemData);
      }
    }

    // 4. EXIBHITUM
    else if (type === "EXIBHITUM") {
      const nama = form.querySelector(`[name="namaKapal_${i}"]`).value;

      if (nama.trim()) {
        itemData.namaKapal = nama.toUpperCase();
        itemData.tanggal = form.querySelector(`[name="tanggal_${i}"]`).value;
        itemData.perusahaan = form
          .querySelector(`[name="perusahaan_${i}"]`)
          .value.toUpperCase();
        itemData.pup = form.querySelector(`[name="pup_${i}"]`).value;

        // PENTING: Ambil No Urut untuk Edit Mode
        itemData.noUrut = form.querySelector(`[name="noUrut_${i}"]`).value;
        itemData.oldFolderUrl = form.querySelector(
          `[name="oldFolderUrl_${i}"]`
        ).value;

        // --- AMBIL CHECKBOX BUKU (SEBAGAI ARRAY) ---
        const jenisBukuArray = [];
        const checkedBoxes = form.querySelectorAll(
          `input[type="checkbox"][name*="_${i}"]:checked`
        );
        checkedBoxes.forEach((cb) => {
          jenisBukuArray.push(cb.value); // Misal: ["PSH. DECK LOG BOOK", "EX. OIL RECORD BOOK"]
        });

        // --- AMBIL NOMOR SURAT (JIKA ADA INPUT MANUAL/EDIT) ---
        // Kita simpan array input nomor surat yang sesuai dengan buku yang dipilih
        const nomorSuratArray = [];
        jenisBukuArray.forEach((jb) => {
          // Cari input name="nomorSurat_PSH.DECK LOG BOOK_1" (nama unik yang digenerate di updateExibhitumForms)
          // Perhatikan replace titik dan spasi harus sama dengan di fungsi updateExibhitumForms
          let safeName = jb.replace(". ", ".");
          const inputNomor = form.querySelector(
            `input[name="nomorSurat_${safeName}_${i}"]`
          );
          if (inputNomor) {
            nomorSuratArray.push(inputNomor.value);
          } else {
            nomorSuratArray.push(""); // Fallback kosong
          }
        });

        // Simpan ke Object Data
        itemData.jenisBukuArray = jenisBukuArray;
        itemData.nomorSuratArray = nomorSuratArray;

        // Gabungan string untuk kompatibilitas tampilan tabel lama (optional)
        itemData.jenisBuku = jenisBukuArray.join(", ");

        // Upload File
        itemData.files = [];
        const fPerm = getFile(`permohonan_${i}`);
        if (fPerm)
          itemData.files.push({ jenis: "permohonan", ...(await read(fPerm)) });
        const fBilling = getFile(`billing_${i}`);
        if (fBilling)
          itemData.files.push({ jenis: "billing", ...(await read(fBilling)) });

        items.push(itemData);
      }
    }
  }

  // ==========================================================
  // INI LOGIKA CERDASNYA: BARU vs EDIT
  // ==========================================================

  if (items.length === 0) {
    showPopup("Tidak ada data untuk disimpan.", "error");
    btnSave.innerHTML = originalText;
    btnSave.disabled = false;
    return;
  }

  // Cek ID Data (noUrut) pada item pertama
  const firstItem = items[0];
  const isEditMode = firstItem.noUrut && String(firstItem.noUrut).trim() !== "";

  let payload = {};

  if (isEditMode) {
    // --- UPDATE (TIMPA DATA LAMA) ---
    let action = "";
    if (type === "SHSK") action = "updateSHSK";
    else if (type === "SERTIFIKASI") action = "updateSertifikasi";
    else if (type === "SERVICE") action = "updateService";
    else if (type === "EXIBHITUM") action = "updateExibhitum";

    // Kirim sebagai single object
    payload = { action: action, ...firstItem };
    console.log("Mengirim Update:", payload);
  } else {
    // --- UPLOAD (BARIS BARU) ---
    let action = "";
    if (type === "SHSK") action = "uploadBulkSHSK";
    else if (type === "SERTIFIKASI") action = "uploadBulkSertifikasi";
    else if (type === "SERVICE") action = "uploadBulkService";
    else if (type === "EXIBHITUM") action = "uploadBulkExibhitum";

    // Kirim array items
    payload = { action: action, items: items };
    console.log("Mengirim Baru:", payload);
  }

  // --- KIRIM ---
  try {
    const res = await postData(payload);
    handleResponse(res, type, form, originalText, btnSave, isEditMode);
  } catch (e) {
    showPopup("Gagal koneksi ke server.", "error");
    btnSave.innerHTML = originalText;
    btnSave.disabled = false;
  }
}

function handleResponse(res, type, form, btnText, btnEl, isEdit) {
  btnEl.innerHTML = btnText;
  btnEl.disabled = false;

  if (res.status === "SUCCESS") {
    showPopup("Berhasil!", "success");
    form.reset();
    renderBulkForm(type);
    loadData(type);

    if (isEdit) {
      cancelEdit(type);
    }

    if (typeof updateChartFilter === "function") {
      updateChartFilter(currentFilter);
      updateSidebarCounts();

      // 2. Refresh Grafik Statistik Exibhitum (Jika ada)
      const btnEx = document.querySelector(".filter-btn-ex.active");
      if (btnEx) updateExibChart(currentFilter, btnEx, "ex");

      // 3. Refresh Grafik Statistik Pengesahan (Jika ada)
      const btnPsh = document.querySelector(".filter-btn-psh.active");
      if (btnPsh) updateExibChart(currentFilter, btnPsh, "psh");

      console.log("Grafik Dashboard Diperbarui Otomatis!");
    }
  } else {
    showPopup(res.message, "error");
  }
}

// ====================================================================
// 1. FUNGSI EDIT DATA (V13.7 - DEFAULT LOCKED / BUKA PAKAI TOMBOL)
// ====================================================================
function editData(type, rowDataStr) {
  const rowData = JSON.parse(decodeURIComponent(rowDataStr));
  let formId, countId;

  // 1. Buka Section Input
  if (type === "SHSK") {
    formId = "formSHSK";
    countId = "bulkCountSHSK";
  } else if (type === "SERTIFIKASI") {
    formId = "formSertifikasi";
    countId = "bulkCountSertifikasi";
  } else if (type === "SERVICE") {
    formId = "formService";
    countId = "bulkCountService";
  } else if (type === "EXIBHITUM") {
    formId = "formExibhitum";
    countId = "bulkCountExibhitum";
  }

  showSection(`${type.toLowerCase()}-input`);

  // 2. Reset Form ke Mode Single
  const countSelect = document.getElementById(countId);
  if (countSelect) countSelect.value = "1";
  renderBulkForm(type);

  const form = document.getElementById(formId);

  // Helper Isi Nilai
  const setVal = (name, val) => {
    const el = form.querySelector(`[name="${name}_1"]`);
    if (el) {
      let finalVal =
        val === undefined || val === null || val === "undefined" ? "" : val;
      if (el.type === "date") el.value = formatDateForInput(finalVal);
      else el.value = finalVal;
    }
  };

  // Helper Cari Data
  const getRowVal = (keys) => {
    for (let k of keys) if (rowData[k] !== undefined) return rowData[k];
    return "";
  };

  // 3. ISI DATA
  setVal("noUrut", getRowVal(["NO_URUT", "NO URUT", "NO"]));
  setVal("oldFolderUrl", rowData.LINK_FOLDER);

  if (type === "SHSK") {
    setVal("namaKapal", getRowVal(["NAMA_KAPAL"]));
    setVal("tonase", getRowVal(["TONASE_GT"]));
    setVal("tandaPendaftaran", getRowVal(["TANDA_PENDAFTARAN"]));
    setVal("pemilik", getRowVal(["PEMILIK"]));
    setVal("tempatStkk", getRowVal(["TEMPAT_STKK"]));
    setVal("tglStkk", getRowVal(["TANGGAL_STKK"]));
    setVal("noUrutStkk", getRowVal(["NO_URUT_STKK"]));
    setVal("noHalStkk", getRowVal(["NO_HAL_STKK"]));
    setVal("noBukuStkk", getRowVal(["NO_BUKU_STKK"]));
    setVal("statusPengukuhan", getRowVal(["STATUS_PENGUKUHAN"]));
    setVal("tglPengukuhan", getRowVal(["TANGGAL_PENGUKUHAN"]));
  } else if (type === "SERTIFIKASI") {
    setVal("perusahaan", getRowVal(["NAMA_PERUSAHAAN", "PERUSAHAAN"]));
    setVal("namaKapal", getRowVal(["NAMA_KAPAL"]));
    setVal("ukuran", getRowVal(["UKURAN_GT"]));
    setVal("callSign", getRowVal(["CALL_SIGN"]));
    setVal("bahan", getRowVal(["BAHAN_KAPAL"]));
    setVal("daerahPelayaran", getRowVal(["DAERAH_PELAYARAN"]));
    setVal("tglTerbit", getRowVal(["TANGGAL_TERBIT"]));
    setVal("pemeriksa", getRowVal(["NAMA_PEMERIKSA"]));
    setVal("keterangan", getRowVal(["KETERANGAN"]));

    // Checkbox Sertifikat
    const jenisSert = getRowVal(["JENIS_SERTIFIKAT", "JENIS"]);
    const certCheck = form.querySelector(
      `input[name="cert_select_1"][value="${jenisSert}"]`
    );

    if (certCheck) {
      certCheck.checked = true;
      renderCertForms(1);
      setVal(`no_sert_${jenisSert}`, getRowVal(["NOMOR_SERTIFIKAT"]));
      setVal(`berlaku_${jenisSert}`, getRowVal(["TANGGAL_MASA_BERLAKU"]));
      setVal(`billing_${jenisSert}`, getRowVal(["KODE_BILLING"]));
    }

    // 🔥 PERUBAHAN DI SINI: PAKSA LOCK SEMUA CHECKBOX DI AWAL 🔥
    form
      .querySelectorAll(`input[name="cert_select_1"]`)
      .forEach((c) => (c.disabled = true));
  } else if (type === "SERVICE") {
    setVal("namaPenyediaJasa", getRowVal(["NAMA_PENYEDIA_JASA"]));
    setVal("namaKapal", getRowVal(["NAMA_KAPAL"]));
    setVal("tglValidasi", getRowVal(["TANGGAL_VALIDASI_SERVICE_REPORT"]));

    const jenisStr = getRowVal(["JENIS_ALAT_YANG_DISERVICE"]) || "";
    const jumlahStr = getRowVal(["JUMLAH"]) || "";
    const jumlahArr = String(jumlahStr).split("\n");
    let idx = 0;

    if (jenisStr.includes("LIFERAFT")) {
      const ck = form.querySelector('[name="check_liferaft_1"]');
      if (ck) {
        ck.checked = true;
        updateServiceQty(1);
        const lrInput = form.querySelector('[name="jumlah_LIFERAFT_1"]');
        if (lrInput) {
          lrInput.value = jumlahArr[idx] || 0;
        }
        idx++;
      }
    }
    if (jenisStr.includes("FIRE EXTINGUISHER")) {
      const ck = form.querySelector('[name="check_fe_1"]');
      if (ck) {
        ck.checked = true;
        updateServiceQty(1);
        const feInput = form.querySelector('[name="jumlah_FE_1"]');
        if (feInput) {
          feInput.value = jumlahArr[idx] || 0;
        }
      }
    }
    // 🔥 LOCK CHECKBOX SERVICE 🔥
    form
      .querySelectorAll('[type="checkbox"]')
      .forEach((c) => (c.disabled = true));
  } else if (type === "EXIBHITUM") {
    setVal("tanggal", getRowVal(["TANGGAL"]));
    setVal("perusahaan", getRowVal(["PERUSAHAAN"]));
    setVal("namaKapal", getRowVal(["NAMA_KAPAL"]));
    setVal("pup", getRowVal(["PUP"]));

    const jb = getRowVal(["JENIS_BUKU"]) || "";
    const nomor = getRowVal(["PENOMORAN"]) || "";
    let prefix = "",
      bookType = "";
    if (jb.startsWith("EX")) {
      prefix = "EX";
      bookType = jb.replace("EX. ", "").trim();
    } else {
      prefix = "PSH";
      bookType = jb.replace("PSH. ", "").trim();
    }

    const targetCheck = form.querySelector(
      `input[name="check_${prefix}_${bookType}_1"]`
    );
    if (targetCheck) {
      targetCheck.checked = true;
      updateExibhitumForms(1);
      const noSuratInput = form.querySelector(
        `input[name="nomorSurat_${jb.replace(". ", ".")}_1"]`
      );
      if (noSuratInput) noSuratInput.value = nomor;
    }
    // 🔥 LOCK CHECKBOX EXIBHITUM 🔥
    form
      .querySelectorAll('[type="checkbox"]')
      .forEach((c) => (c.disabled = true));
  }

  // 4. FINAL LOCK: KUNCI SEMUA INPUT (TERMASUK TEXT & SELECT)
  const allInputs = form.querySelectorAll("input, select, textarea");
  allInputs.forEach((i) => {
    i.disabled = true; // SEMUA DIKUNCI MATI
  });

  // 5. SIAPKAN TOMBOL "UBAH DATA"
  const btnSaveOriginal = document.getElementById(`btn-save-${type}`);
  if (btnSaveOriginal) btnSaveOriginal.classList.add("hidden");

  let btnUnlock = document.getElementById(`btn-unlock-${type}`);
  if (!btnUnlock) {
    const btnContainer = btnSaveOriginal.parentNode;
    btnUnlock = document.createElement("button");
    btnUnlock.type = "button";
    btnUnlock.id = `btn-unlock-${type}`;
    btnUnlock.className = "btn-edit-mode";
    btnUnlock.innerHTML = '<i class="fa fa-pencil-alt"></i> UBAH DATA';
    btnUnlock.onclick = () => enableEditMode(type); // <--- INI YG BAKAL BUKA GEMBOK
    btnContainer.insertBefore(btnUnlock, btnSaveOriginal);
  }
  btnUnlock.classList.remove("hidden");

  const btnCancel = document.getElementById(`btn-cancel-${type}`);
  if (btnCancel) btnCancel.classList.remove("hidden");

  let btnUpdate = document.getElementById(`btn-update-${type}`);
  if (btnUpdate) btnUpdate.classList.add("hidden");

  showPopup("Mode Lihat Data (Terkunci). Klik 'UBAH DATA' untuk edit.", "info");
}
function enableEditMode(type) {
  let formId;
  if (type === "SHSK") formId = "formSHSK";
  else if (type === "SERTIFIKASI") formId = "formSertifikasi";
  else if (type === "SERVICE") formId = "formService";
  else if (type === "EXIBHITUM") formId = "formExibhitum";

  const form = document.getElementById(formId);

  // 🔥 INI MANTRA PEMBUKA GEMBOKNYA:
  // Membuka input text, select, DAN checkbox sekaligus
  const allInputs = form.querySelectorAll("input, select, textarea");
  allInputs.forEach((i) => (i.disabled = false));

  // Ganti Tombol
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

  showPopup("Form Terbuka. Silakan Edit.", "success");
}

function cancelEdit(type) {
  const formId =
    type === "SHSK"
      ? "formSHSK"
      : type === "SERTIFIKASI"
      ? "formSertifikasi"
      : type === "SERVICE"
      ? "formService"
      : "formExibhitum";
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
// FITUR: EXPORT (TEKNIK HIDDEN IFRAME - DIRECT DOWNLOAD)
// ====================================================================
async function exportTriple(type) {
  const btn = event.currentTarget;
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Generating...';
  btn.disabled = true;
  showPopup("Sedang membuat laporan... Mohon tunggu.", "info");

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
  } else if (type === "EXIBHITUM") {
    filters.bulan = document.getElementById("filterExibBulan").value;
    filters.tahun = document.getElementById("filterExibTahun").value;
    filters.search = document.getElementById("searchExibhitum").value;
  }

  try {
    const res = await postData({
      action: "exportTripleFile",
      type: type,
      filters: filters,
    });

    if (res.status === "SUCCESS" && res.files) {
      showPopup("Laporan Siap! Download dimulai...", "success");

      res.files.forEach((f, index) => {
        // Cek Error Backend
        if (f.error) {
          console.error(f.name + " Error: " + f.error);
          showPopup("Gagal: " + f.name, "error");
        }
        // Lakukan Download jika ada URL
        else if (f.url) {
          // JEDA 2 DETIK PER FILE (BIAR STABIL)
          setTimeout(() => {
            downloadDirectly(f.url);
            showPopup("Mendownload: " + f.name, "info");
          }, index * 2000);
        }
      });
    } else {
      showPopup(res.message || "Gagal export", "error");
    }
  } catch (e) {
    showPopup("Gagal koneksi", "error");
  }
  btn.innerHTML = originalHtml;
  btn.disabled = false;
}

// --- FUNGSI RAHASIA: DOWNLOAD LEWAT IFRAME ---
function downloadDirectly(url) {
  const iframe = document.createElement("iframe");
  iframe.style.display = "none"; // Sembunyikan
  iframe.src = url; // Tembak URL Download
  document.body.appendChild(iframe);

  // Hapus iframe setelah 1 menit (bersih-bersih memori)
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 60000);
}

let rawData = { SHSK: [], SERTIFIKASI: [], SERVICE: [], EXIBHITUM: [] };
let filteredData = { SHSK: [], SERTIFIKASI: [], SERVICE: [], EXIBHITUM: [] };
let currentPage = { SHSK: 1, SERTIFIKASI: 1, SERVICE: 1, EXIBHITUM: 1 };
const ROWS_PER_PAGE = 10;

// ====================================================================
// FUNGSI LOAD DATA (SMART SORTING: TANGGAL -> NAMA KAPAL)
// ====================================================================
async function loadData(type) {
  let tbodyId;
  if (type === "SHSK") tbodyId = "tbody-shsk";
  else if (type === "SERTIFIKASI") tbodyId = "tbody-sertifikasi";
  else if (type === "SERVICE") tbodyId = "tbody-service";
  else tbodyId = "tbody-exibhitum";

  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML =
    '<tr><td colspan="16" style="text-align:center;"><i class="fa fa-spinner fa-spin"></i> Sedang Memuat Data...</td></tr>';

  let action = "";
  if (type === "SHSK") action = "getDataSHSK";
  else if (type === "SERTIFIKASI") action = "getDataSertifikasi";
  else if (type === "SERVICE") action = "getDataService";
  else action = "getDataExibhitum";

  const res = await postData({ action: action });

  if (res.status === "SUCCESS") {
    let data = res.data;

    // --- LOGIKA SORTING FRONTEND ---
    let dateKey = "",
      nameKey = ""; // nameKey dipakai kalau date & no urut sama (jarang)

    if (type === "SHSK") dateKey = "TANGGAL_PENGUKUHAN";
    else if (type === "SERTIFIKASI") dateKey = "TANGGAL_TERBIT";
    else if (type === "SERVICE") dateKey = "TANGGAL_VALIDASI_SERVICE_REPORT";
    else if (type === "EXIBHITUM") dateKey = "TANGGAL";

    data.sort((a, b) => {
      // 1. PRIMARY: Tanggal (Terbaru di Atas / Descending)
      const dateA = new Date(a[dateKey]);
      const dateB = new Date(b[dateKey]);
      if (dateA > dateB) return -1;
      if (dateA < dateB) return 1;

      // 2. SECONDARY (KONDISIONAL)
      if (type === "EXIBHITUM") {
        // Khusus Exibhitum: Urutkan Nomor Surat (Numerik Ascending)
        const getVal = (str) => {
          try {
            let parts = str.split("/");
            return parseInt(parts[1]) * 1000 + parseInt(parts[2]);
          } catch (e) {
            return 0;
          }
        };
        // Pakai PENOMORAN
        return getVal(a["PENOMORAN"]) - getVal(b["PENOMORAN"]);
      } else {
        // Lainnya (Sertifikasi/SHSK): Urutkan NO_URUT (Ascending)
        // Biar Paket Kapal tetap nempel rapi
        const noA = parseInt(a["NO_URUT"]) || 0;
        const noB = parseInt(b["NO_URUT"]) || 0;
        return noA - noB;
      }
    });
    // ----------------------------------

    rawData[type] = data;
    filteredData[type] = rawData[type];
    currentPage[type] = 1;
    updateSmartData(rawData[type], type);
    renderTable(type);

    if (type === "SERTIFIKASI") populateFilterOptions(rawData[type]);
  } else {
    tbody.innerHTML = `<tr><td colspan="16" style="text-align:center;color:red">${res.message}</td></tr>`;
  }
}

function populateFilterOptions(data) {
  const select = document.getElementById("filterSertJenis");
  if (!select) return;
  const unique = [...new Set(data.map((item) => item.JENIS_SERTIFIKAT))]
    .filter(Boolean)
    .sort();
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
    filters.daerah = document
      .getElementById("filterSertDaerah")
      .value.toUpperCase();
    filters.search = document
      .getElementById("searchSertifikasi")
      .value.toUpperCase();
  } else if (type === "SERVICE") {
    filters.bulan = document.getElementById("filterServiceBulan").value;
    filters.tahun = document.getElementById("filterServiceTahun").value;
    filters.search = document
      .getElementById("searchService")
      .value.toUpperCase();
  } else if (type === "EXIBHITUM") {
    filters.bulan = document.getElementById("filterExibBulan").value;
    filters.tahun = document.getElementById("filterExibTahun").value;
    filters.search = document
      .getElementById("searchExibhitum")
      .value.toUpperCase();
  }

  filteredData[type] = rawData[type].filter((row) => {
    let pass = true;
    let dateStr = "";
    if (type === "SHSK") dateStr = row["TANGGAL_PENGUKUHAN"];
    else if (type === "SERTIFIKASI") dateStr = row["TANGGAL_TERBIT"];
    else if (type === "SERVICE")
      dateStr = row["TANGGAL_VALIDASI_SERVICE_REPORT"];
    else if (type === "EXIBHITUM") dateStr = row["TANGGAL"];
    const d = new Date(dateStr);
    if (filters.tahun && d.getFullYear().toString() !== filters.tahun)
      pass = false;
    if (filters.bulan && (d.getMonth() + 1).toString() !== filters.bulan)
      pass = false;
    if (type === "SERTIFIKASI") {
      if (filters.jenis && row["JENIS_SERTIFIKAT"] !== filters.jenis)
        pass = false;
      if (
        filters.daerah &&
        !String(row["DAERAH_PELAYARAN"]).toUpperCase().includes(filters.daerah)
      )
        pass = false;
    }
    if (filters.search) {
      const rowText = Object.values(row).join(" ").toUpperCase();
      if (!rowText.includes(filters.search)) pass = false;
    }
    return pass;
  });
  currentPage[type] = 1;
  renderTable(type);
  showPopup(
    `Filter diterapkan: ${filteredData[type].length} data ditemukan.`,
    "info"
  );
}

function renderTable(type) {
  let tbodyId = "";
  if (type === "SHSK") tbodyId = "tbody-shsk";
  else if (type === "SERTIFIKASI") tbodyId = "tbody-sertifikasi";
  else if (type === "SERVICE") tbodyId = "tbody-service";
  else tbodyId = "tbody-exibhitum";
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = "";
  const start = (currentPage[type] - 1) * ROWS_PER_PAGE;
  const pageData = filteredData[type].slice(start, start + ROWS_PER_PAGE);
  if (pageData.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="16" style="text-align:center;">Data Tidak Ditemukan</td></tr>';
    return;
  }

  pageData.forEach((row, i) => {
    const rowStr = encodeURIComponent(JSON.stringify(row));
    let tr = `<tr><td>${start + i + 1}</td>`;
    if (type === "SHSK") {
      tr += `<td>${row["NAMA_KAPAL"]}</td><td>${row["TONASE_GT"]}</td><td>${
        row["TANDA_PENDAFTARAN"]
      }</td><td>${row["PEMILIK"]}</td><td>${
        row["TEMPAT_STKK"]
      }</td><td>${formatDate(row["TANGGAL_STKK"])}</td><td>${
        row["NO_URUT_STKK"]
      }</td><td>${row["NO_HAL_STKK"]}</td><td>${row["NO_BUKU_STKK"]}</td><td>${
        row["STATUS_PENGUKUHAN"]
      }</td><td>${formatDate(row["TANGGAL_PENGUKUHAN"])}</td>`;
    } else if (type === "SERTIFIKASI") {
      tr += `<td>${row["NAMA_PERUSAHAAN"]}</td><td>${
        row["NAMA_KAPAL"]
      }</td><td>${row["UKURAN_GT"]}</td><td>${row["CALL_SIGN"]}</td><td>${
        row["BAHAN_KAPAL"]
      }</td><td>${row["KETERANGAN"]}</td><td>${
        row["JENIS_SERTIFIKAT"]
      }</td><td>${formatDate(row["TANGGAL_TERBIT"])}</td><td>${formatDate(
        row["TANGGAL_MASA_BERLAKU"]
      )}</td><td>${row["DAERAH_PELAYARAN"] || "-"}</td><td>${
        row["NOMOR_SERTIFIKAT"]
      }</td><td>${row["KODE_BILLING"]}</td><td>${row["NAMA_PEMERIKSA"]}</td>`;
    } else if (type === "SERVICE") {
      const jenisTampil = String(row["JENIS_ALAT_YANG_DISERVICE"]).replace(
        /\n/g,
        "<br>"
      );
      const jumlahTampil = String(row["JUMLAH"]).replace(/\n/g, "<br>");
      tr += `<td>${row["NAMA_PENYEDIA_JASA"]}</td><td>${
        row["NAMA_KAPAL"]
      }</td><td style="text-align:left;">${jenisTampil}</td><td style="text-align:center;">${jumlahTampil}</td><td>${formatDate(
        row["TANGGAL_VALIDASI_SERVICE_REPORT"]
      )}</td>`;
    } else if (type === "EXIBHITUM") {
      tr += `<td>${formatDate(
        row["TANGGAL"]
      )}</td><td style="text-align:left;">${
        row["PERUSAHAAN"]
      }</td><td style="text-align:left;">${
        row["JENIS_BUKU"]
      }</td><td style="text-align:left;">${row["NAMA_KAPAL"]}</td><td>${
        row["PENOMORAN"]
      }</td><td>${row["PUP"]}</td>`;
    }
    tr += `<td><div style="display:flex; justify-content:center; gap:5px;"><button class="btn-act btn-view" onclick="window.open('${row["LINK_FOLDER"]}', '_blank')"><i class="fa fa-folder-open"></i></button><button class="btn-act btn-edit" onclick="editData('${type}', '${rowStr}')"><i class="fa fa-pencil-alt"></i></button><button class="btn-act btn-del" onclick="prepareDelete('${type}', '${rowStr}')"><i class="fa fa-trash"></i></button></div></td></tr>`;
    tbody.innerHTML += tr;
  });
  renderPagination(type);
}
// ====================================================================
// FUNGSI PAGINATION (MODEL SMART: 1 ... 5 6 7 ... 10)
// ====================================================================
function renderPagination(type) {
  const container = document.getElementById(`pagination-${type}`);
  if (!container) return;

  const totalRows = filteredData[type].length;
  const totalPages = Math.ceil(totalRows / ROWS_PER_PAGE);
  const current = currentPage[type];

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = "";

  // PREV
  const prevDisabled = current === 1 ? "disabled" : "";
  html += `<button class="page-btn nav-btn" ${prevDisabled} onclick="goToPage('${type}', ${
    current - 1
  })"><i class="fa fa-chevron-left"></i></button>`;

  // DOTS LOGIC
  const delta = 2;
  const range = [];
  const rangeWithDots = [];
  let l;

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= current - delta && i <= current + delta)
    ) {
      range.push(i);
    }
  }

  for (let i of range) {
    if (l) {
      if (i - l === 2) rangeWithDots.push(l + 1);
      else if (i - l !== 1) rangeWithDots.push("...");
    }
    rangeWithDots.push(i);
    l = i;
  }

  rangeWithDots.forEach((i) => {
    if (i === "...") {
      html += `<span style="padding: 0 5px; color:#aaa;">...</span>`;
    } else {
      const activeClass = i === current ? "active" : "";
      html += `<button class="page-btn ${activeClass}" onclick="goToPage('${type}', ${i})">${i}</button>`;
    }
  });

  // NEXT
  const nextDisabled = current === totalPages ? "disabled" : "";
  html += `<button class="page-btn nav-btn" ${nextDisabled} onclick="goToPage('${type}', ${
    current + 1
  })"><i class="fa fa-chevron-right"></i></button>`;

  // INFO
  html += `<span style="margin-left:10px; font-size:12px; color:#666;"><b>${totalRows}</b> Data</span>`;

  container.innerHTML = html;
}

// FUNGSI PINDAH HALAMAN
function goToPage(type, pageNum) {
  const totalRows = filteredData[type].length;
  const totalPages = Math.ceil(totalRows / ROWS_PER_PAGE);

  if (pageNum < 1 || pageNum > totalPages) return;

  currentPage[type] = pageNum;
  renderTable(type); // Render ulang tabel dan pagination
}

let pendingDelete = null;
function prepareDelete(type, rowDataStr) {
  const rowData = JSON.parse(decodeURIComponent(rowDataStr));
  pendingDelete = {
    type: type,
    noUrut: rowData.NO_URUT || rowData["NO URUT"] || rowData["NO"],
    folderUrl: rowData.LINK_FOLDER,
  };
  document.getElementById("modal-delete").classList.remove("hidden");
}
function closeDeleteModal() {
  document.getElementById("modal-delete").classList.add("hidden");
  pendingDelete = null;
}
async function executeDelete() {
  if (!pendingDelete) return;
  const btnConfirm = document.querySelector(
    "#modal-delete .btn-confirm-logout"
  );
  const originalHtml = btnConfirm.innerHTML;
  btnConfirm.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
  btnConfirm.disabled = true;
  let action = "";
  if (pendingDelete.type === "SHSK") action = "deleteSHSK";
  else if (pendingDelete.type === "SERTIFIKASI") action = "deleteSertifikasi";
  else if (pendingDelete.type === "SERVICE") action = "deleteService";
  else action = "deleteExibhitum";
  try {
    const res = await postData({
      action: action,
      noUrut: pendingDelete.noUrut,
    });
    if (res.status === "SUCCESS") {
      showPopup("Data Berhasil Dihapus!", "success");
      loadData(pendingDelete.type);
      updateSidebarCounts();
      if (typeof updateChartFilter === "function")
        updateChartFilter(currentFilter);
    } else {
      showPopup("Gagal menghapus: " + res.message, "error");
    }
  } catch (error) {
    showPopup("Gagal koneksi.", "error");
  }
  btnConfirm.innerHTML = originalHtml;
  btnConfirm.disabled = false;
  closeDeleteModal();
}

let penggunaFiles = [];
function initPenggunaDashboard() {
  const u = JSON.parse(localStorage.getItem("user"));
  if (!u) {
    window.location.href = "index.html";
    return;
  }
  document.getElementById("nav-user-name").innerText = u.nama;
  document.getElementById("nav-company-name").innerText =
    u.extra || "PERUSAHAAN";
  document.getElementById("mob-user-name").innerText = u.nama;
  document.getElementById("mob-company-name").innerText =
    u.extra || "PERUSAHAAN";
  fetchPenggunaFiles(u.extra);
}
async function fetchPenggunaFiles(c) {
  const dropdownTahun = document.getElementById("reqTahun");
  dropdownTahun.innerHTML = "<option>Loading...</option>";
  dropdownTahun.disabled = true;
  try {
    const res = await postData({ action: "getDropdownData", perusahaan: c });
    if (res.status === "SUCCESS") {
      penggunaFiles = res.data;
      if (penggunaFiles.length > 0) {
        populateYear();
      } else {
        dropdownTahun.innerHTML =
          '<option value="">Data Tidak Ditemukan</option>';
        showPopup("Belum ada arsip.", "info");
      }
    } else {
      dropdownTahun.innerHTML = '<option value="">Gagal</option>';
      showPopup("Gagal data.", "error");
    }
  } catch (e) {
    dropdownTahun.innerHTML = '<option value="">Error</option>';
  }
}
function populateYear() {
  const s = document.getElementById("reqTahun");
  const y = [...new Set(penggunaFiles.map((i) => i.tahun))].sort().reverse();
  s.innerHTML = '<option value="">-- Pilih Tahun --</option>';
  y.forEach((v) => {
    if (v && v !== "-") s.innerHTML += `<option value="${v}">${v}</option>`;
  });
  s.disabled = false;
}
window.filterMonth = function () {
  const y = document.getElementById("reqTahun").value;
  const s = document.getElementById("reqBulan");
  s.innerHTML = '<option value="">-- Pilih Bulan --</option>';
  document.getElementById("reqKapal").innerHTML =
    '<option value="">-- Pilih Tahun Dulu --</option>';
  if (!y) {
    s.disabled = true;
    return;
  }
  const m = [
    ...new Set(penggunaFiles.filter((i) => i.tahun == y).map((i) => i.bulan)),
  ].sort((a, b) => a - b);
  m.forEach(
    (v) => (s.innerHTML += `<option value="${v}">${getMonthName(v)}</option>`)
  );
  s.disabled = false;
};
window.filterShip = function () {
  const y = document.getElementById("reqTahun").value;
  const m = document.getElementById("reqBulan").value;
  const s = document.getElementById("reqKapal");
  s.innerHTML = '<option value="">-- Pilih Kapal --</option>';
  if (!m) {
    s.disabled = true;
    return;
  }
  const ships = [
    ...new Set(
      penggunaFiles
        .filter((i) => i.tahun == y && i.bulan == m)
        .map((i) => i.kapal)
    ),
  ];
  ships.forEach((v) => (s.innerHTML += `<option value="${v}">${v}</option>`));
  s.disabled = false;
};
window.filterType = function () {
  const y = document.getElementById("reqTahun").value;
  const m = document.getElementById("reqBulan").value;
  const sh = document.getElementById("reqKapal").value;
  const s = document.getElementById("reqJenis");
  s.innerHTML = "";
  if (!sh) {
    s.disabled = true;
    return;
  }
  const docs = penggunaFiles.filter(
    (i) => i.tahun == y && i.bulan == m && i.kapal == sh
  );
  if (docs.length === 0) {
    s.innerHTML = "<option>Nihil</option>";
  } else {
    docs.forEach(
      (v) => (s.innerHTML += `<option value="${v.link}">${v.jenis}</option>`)
    );
  }
  s.disabled = false;
};
window.handleRequestSubmit = async function (e) {
  e.preventDefault();
  const s = document.getElementById("reqJenis");
  const opts = Array.from(s.selectedOptions);
  if (opts.length === 0 || s.value === "") {
    showPopup("Pilih dokumen!", "error");
    return;
  }
  const jenisList = opts.map((o) => o.text);
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
    link: sampleLink,
  });
  showPopup("Link terkirim!", "success");
  btn.innerText = originalText;
  btn.disabled = false;
};
function getMonthName(i) {
  const m = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  return m[i - 1] || i;
}

// ====================================================================
// NEW FEATURES: CINEMATIC INTRO & MODAL LOGIC
// ====================================================================
function initCinematic() {
  // Hanya jalankan animasi jika elemen intro ada
  const intro = document.getElementById("cinematic-intro");
  if (intro) {
    // Timer 3.5 detik untuk slide up (sesuai CSS)
    setTimeout(() => {
      // Intro akan hilang otomatis lewat CSS animation 'slideUp'
      // Tapi kita bisa tambahkan logika cleanup jika perlu
      console.log("Welcome to SHSK Digital System");
    }, 3500);
  }
}

function openLoginModal() {
  const modal = document.getElementById("login-modal-overlay");
  if (modal) {
    modal.classList.remove("hidden");
    // Optional: Reset form state saat dibuka
    document.getElementById("passPetugas").value = "";
    document.getElementById("passPengguna").value = "";
  }
}

function closeLoginModal() {
  const modal = document.getElementById("login-modal-overlay");
  if (modal) {
    modal.classList.add("hidden");
  }
}

// ====================================================================
// FITUR AUTO-SYNC: SINKRONISASI DROPDOWN OTOMATIS (SERVER KE DEVICE)
// ====================================================================
document.addEventListener("DOMContentLoaded", () => {
  // Hanya jalan di halaman Petugas (Dashboard Admin)
  if (document.querySelector(".petugas-page")) {
    console.log("🔄 Memulai Auto-Sync Database Dropdown...");

    // Jalankan fungsi sync secara paralel (Biar cepat)
    Promise.all([
      postData({ action: "getDataSertifikasi" }), // Ambil Perusahaan & Bahan
      postData({ action: "getDataSHSK" }), // Ambil Pemilik
      postData({ action: "getDataService" }), // Ambil Service Station
      postData({ action: "getDataExibhitum" }), // Ambil Perusahaan Exibhitum
    ])
      .then((results) => {
        // results[0] = Sertifikasi, results[1] = SHSK, dst...

        const [resSert, resSHSK, resServ, resExib] = results;

        // 1. Masukkan Data Sertifikasi (Perusahaan & Bahan Kapal)
        if (resSert.status === "SUCCESS")
          updateSmartData(resSert.data, "SERTIFIKASI");

        // 2. Masukkan Data SHSK (Pemilik)
        if (resSHSK.status === "SUCCESS") updateSmartData(resSHSK.data, "SHSK");

        // 3. Masukkan Data Service (Service Station)
        if (resServ.status === "SUCCESS")
          updateSmartData(resServ.data, "SERVICE");

        // 4. Masukkan Data Exibhitum (Perusahaan)
        if (resExib.status === "SUCCESS")
          updateSmartData(resExib.data, "EXIBHITUM");

        console.log("✅ Auto-Sync Selesai! Database Dropdown Siap Digunakan.");
        // Opsional: Tampilkan notifikasi kecil kalau mau
        // showPopup("Database Perusahaan Terupdate!", "success");
      })
      .catch((err) => {
        console.error("Gagal Auto-Sync:", err);
      });
  }
});

// --- END SCRIPT.JS V13.1 ---
