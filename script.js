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
    y = 0;

  if (lastNumberStr && lastNumberStr.includes(suffix)) {
    try {
      const parts = lastNumberStr.split("/");
      x = parseInt(parts[1]) || 1;
      y = parseInt(parts[2]) || 0;
    } catch (e) {}
  }

  let totalY = y + offset;
  let addX = Math.floor((totalY - 1) / 25);
  let finalX = x + addX;
  let finalY = totalY - addX * 25;

  // FORMATTER: Tambah 0 di depan
  const pad = (num) => num.toString().padStart(2, "0");

  return `AL.531/${pad(finalX)}/${pad(finalY)}/${suffix}`;
}

// FETCH NOMOR DARI SERVER SAAT BUKA MENU EXIBHITUM

async function initExibhitumNumber() {
  try {
    const res = await postData({ action: "getNextExibNumber" });
    if (res.status === "SUCCESS") {
      let x = parseInt(res.startX);
      let y = parseInt(res.startY);
      let year = res.year;
      // SIMPAN DATA KE GLOBAL VARIABLE
      cachedLastNumber = `AL.531/${x}/${y}/KSOP.PKU/${year}`;
      console.log("Nomor Start dari Server:", cachedLastNumber);

      // TRIGGER UPDATE PERTAMA KALI (Biar kalau ada checkbox yg default checked langsung keisi)
      updateExibhitumForms();
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
  // Kalau kosong, kembalikan kosong
  if (!dateStr || dateStr === "-" || dateStr === "") return "";

  const s = String(dateStr).trim();

  // KASUS 1: Format dari Sheet (dd/mm/yyyy) -> misal: 12/01/2026
  // Kita harus ubah jadi yyyy-mm-dd biar Form Edit mau membacanya
  if (s.includes("/")) {
    const parts = s.split("/");
    // parts[0]=12, parts[1]=01, parts[2]=2026
    if (parts.length === 3) {
      // Balik jadi Tahun-Bulan-Tanggal
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  // KASUS 2: Format Text Indo (12 Januari 2026) - Jaga-jaga data lama
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

  if (s.includes(" ")) {
    const parts = s.split(" ");
    if (parts.length >= 3) {
      const monthStr = parts[1].replace(/[^a-zA-Z]/g, "");
      const month = monthsIndo[monthStr] || "01";
      // Balik jadi Tahun-Bulan-Tanggal
      return `${parts[2]}-${month}-${parts[0].padStart(2, "0")}`;
    }
  }

  // KASUS 3: Format ISO Default
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return "";
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
// FITUR 1: MONITORING CONTROLLER
// ====================================================================
let monitoringDataCache = []; // Simpan data biar pagination ngebut
let debounceTimer;

function debouncedMonitoringLoad() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        loadMonitoringData(1);
    }, 500); // Tunggu 0.5 detik setelah ngetik baru load
}

async function loadMonitoringData(page = 1) {
    const tbody = document.getElementById("tbody-monitoring");
    if (!tbody) return;

    // Ambil nilai filter
    const bulan = document.getElementById("monFilterBulan").value;
    const tahun = document.getElementById("monFilterTahun").value;
    const search = document.getElementById("monSearch").value;

    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;"><i class="fa fa-spinner fa-spin"></i> Memproses Data Pelayanan...</td></tr>';

    try {
        const res = await postData({
            action: "getMonitoringData",
            bulan: bulan, // Jika kosong "", backend akan kirim semua
            tahun: tahun, // Jika kosong "", backend akan kirim semua
            search: search
        });

        if (res.status === "SUCCESS") {
            monitoringDataCache = res.data; 
            renderMonitoringTable(page);
        } else {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Gagal memuat data.</td></tr>';
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Error koneksi ke database.</td></tr>';
    }
}

function renderMonitoringTable(page) {
    const tbody = document.getElementById("tbody-monitoring");
    tbody.innerHTML = "";

    const limit = 10;
    const start = (page - 1) * limit;
    const end = start + limit;
    const pageData = monitoringDataCache.slice(start, end);

    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Tidak ada data layanan ditemukan.</td></tr>';
        document.getElementById("pagination-MONITORING").innerHTML = "";
        return;
    }

    let lastYear = null;
    let lastMonth = null;
    const monthNames = ["", "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];

    pageData.forEach((row, i) => {
        // 1. Cek Separator TAHUN
        if (lastYear !== null && row.tahun !== lastYear) {
            tbody.innerHTML += `<tr class="row-separator-year"><td colspan="9">BATAS TAHUN ${lastYear} KE ${row.tahun}</td></tr>`;
        }
        
        // 2. Cek Separator BULAN (Hanya jika dalam tahun yg sama atau ganti tahun)
        // Reset lastMonth kalau ganti tahun
        if (row.tahun !== lastYear) lastMonth = null; 

        if (lastMonth !== null && row.bulan !== lastMonth) {
            tbody.innerHTML += `<tr class="row-separator-month"><td colspan="9">DATA BULAN ${monthNames[row.bulan]}</td></tr>`;
        }

        const tr = `
            <tr>
                <td>${start + i + 1}</td>
                <td>${row.tahun}</td>
                <td>${monthNames[row.bulan]}</td>
                <td style="font-weight:600; text-align:left;">${row.perusahaan}</td>
                <td>${row.shsk}</td>
                <td>${row.sert}</td>
                <td>${row.psh}</td>
                <td>${row.exib}</td>
                <td>${row.total}</td>
            </tr>
        `;
        tbody.innerHTML += tr;

        lastYear = row.tahun;
        lastMonth = row.bulan;
    });

    renderPagination("MONITORING", monitoringDataCache.length, page, limit);
}

// ====================================================================
// FITUR 2: AUTO LOGOUT FORCE (1 JAM) - SILENT KILLER
// ====================================================================
const INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 1 Jam (Ubah ke 10000 kalau mau tes 10 detik)
const STORAGE_KEY_ACTIVITY = "shsk_last_activity";

function initAutoLogout() {
    // 1. Cek saat halaman dimuat: Apakah sudah expired?
    checkActivityStatus();

    // 2. Pasang pendengar gerakan
    // Setiap user gerak/klik, kita reset timer di LocalStorage
    ['click', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(evt => {
        document.addEventListener(evt, () => {
            resetActivityTimer();
        }, true);
    });

    // 3. Cek berkala tiap 1 menit (Jaga-jaga kalau browser didiamkan terbuka)
    setInterval(checkActivityStatus, 60000); 
}

function resetActivityTimer() {
    // Simpan waktu sekarang sebagai waktu terakhir aktif
    localStorage.setItem(STORAGE_KEY_ACTIVITY, Date.now());
}

function checkActivityStatus() {
    const lastActive = localStorage.getItem(STORAGE_KEY_ACTIVITY);
    
    // Kalau belum pernah login/aktif, set sekarang
    if (!lastActive) {
        resetActivityTimer();
        return;
    }

    const diff = Date.now() - parseInt(lastActive);

    // 🔥 LOGIKA TENDANGAN MAUT 🔥
    if (diff > INACTIVITY_LIMIT_MS) {
        forceLogout();
    }
}

function forceLogout() {
    // Hapus data sesi
    localStorage.removeItem("shsk_user");
    localStorage.removeItem(STORAGE_KEY_ACTIVITY);
    
    // Redirect langsung (Tanpa Ba-Bi-Bu)
    window.location.href = "index.html"; 
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
// INITIALIZATION
// ====================================================================
document.addEventListener("DOMContentLoaded", () => {
  // 1. Init Auto Logout (PENTING)
  initAutoLogout(); 
  resetActivityTimer();   
  initSmartSearch();

  // 2. Cek Halaman Dashboard User
  if (document.querySelector(".dashboard-page")) {
    initPenggunaDashboard();
  } 
  // 3. Cek Halaman Petugas
  else if (document.querySelector(".petugas-page")) {
    loadProfilePetugas();
    updateSidebarCounts();
    
    // Init Grafik Filter
    if (document.querySelector(".filter-btn.active"))
      updateChartFilter("year", document.querySelector(".filter-btn.active"));
    
    if (document.getElementById("chartExibhitum"))
      updateExibChart("year", document.querySelector(".filter-btn-ex.active"), "ex");
    
    if (document.getElementById("chartPengesahan"))
      updateExibChart("year", document.querySelector(".filter-btn-psh.active"), "psh");
    
    initAnnualReportUI();
    renderBulkForm("SHSK");
    renderBulkForm("SERTIFIKASI");
    renderBulkForm("SERVICE");
    renderBulkForm("EXIBHITUM");
  }
});

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("show");
  document.getElementById("sidebar-overlay").classList.toggle("active");
}

// ====================================================================
// NAVIGASI SIDEBAR (SHOW SECTION & TOGGLE SUBMENU)
// ====================================================================
function showSection(id, el) {
  // 1. SEMBUNYIKAN SEMUA HALAMAN KONTEN
  document.querySelectorAll(".main-content > div").forEach((d) => d.classList.add("hidden"));
  
  // 2. MUNCULKAN HALAMAN TARGET
  const targetSection = document.getElementById(`sec-${id}`);
  if (targetSection) {
    targetSection.classList.remove("hidden");
  }

  // 3. RESET MENU (Matikan semua lampu active)
  document.querySelectorAll(".menu-item, .submenu-item").forEach((m) => m.classList.remove("active"));
  document.querySelectorAll(".menu-item").forEach((m) => {
    m.classList.remove("parent-active");
    m.classList.remove("open");
  });
  document.querySelectorAll(".submenu-container").forEach((c) => c.classList.remove("show"));

  // 4. NYALAKAN MENU YANG DIKLIK
  if (el) {
    el.classList.add("active");
    if (el.classList.contains("submenu-item")) {
      const container = el.closest(".submenu-container");
      if (container) {
        container.classList.add("show");
        const parentMenu = container.previousElementSibling;
        if (parentMenu) {
          parentMenu.classList.add("parent-active");
          parentMenu.classList.add("open");
        }
      }
    }
  }

  // ============================================================
  // 🔥 LOGIKA PEMANGGIL DATA OTOMATIS 🔥
  // ============================================================
  
  // A. Jika Klik Menu MONITORING
  if (id === "monitoring") {
      // Pastikan filter visual diset ke "Semua" agar sinkron dengan data yang muncul
      const fBul = document.getElementById("monFilterBulan");
      const fTah = document.getElementById("monFilterTahun");
      const fSea = document.getElementById("monSearch");
      
      if(fBul) fBul.value = "";
      if(fTah) fTah.value = "";
      if(fSea) fSea.value = "";
      
      // Langsung panggil data (Load data mentah/tanpa filter)
      loadMonitoringData(1); 
  } 
  // B. Jika Klik Menu DATA ARSIP LAINNYA
  else if (id.includes("data")) {
      const type = id.includes("shsk") ? "SHSK" : 
                   id.includes("sertifikasi") ? "SERTIFIKASI" : 
                   id.includes("service") ? "SERVICE" : "EXIBHITUM";
      loadData(type);
  }

  // AUTO CLOSE SIDEBAR (Khusus tampilan Mobile)
  if (window.innerWidth <= 768) {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    if (sidebar && sidebar.classList.contains("show")) {
      sidebar.classList.remove("show");
      if (overlay) overlay.classList.remove("active");
    }
  }
}


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
    const labels = [
      "DECK",
      "MESIN",
      "ORB",
      "ORB TK. II",
      "RADIO",
      "SAMPAH",
      "BALLAST",
    ];
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
    packetModeState[index] = null;
    checkboxes.forEach((cb) => {
      cb.checked = false;
      cb.disabled = false;
    });
  } else {
    packetModeState[index] = mode;
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

      if (packetCerts.includes(cert)) return;
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

// ====================================================================
// CORE: GENERATOR NOMOR URUT EXIBHITUM
// ====================================================================
window.updateExibhitumForms = function () {
  // 1. Ambil Data Awal
  if (!cachedLastNumber) return;

  const parts = cachedLastNumber.split("/");
  // Format Baru: AL.531 / XX / YY / KSOP.PKU / 2026
  // index array:   0      1    2       3        4

  let currentX = parseInt(parts[1]);
  let currentY = parseInt(parts[2]);

  // Ambil tahun secara dinamis dari data terakhir, atau pakai tahun sekarang
  let currentYear = parts[4] || new Date().getFullYear();

  const countInput = document.getElementById("bulkCountExibhitum");
  const count = countInput ? parseInt(countInput.value) : 1;

  // URUTAN PATEN
  const bookTypes = [
    "DECK",
    "MESIN",
    "ORB",
    "ORB TK. II",
    "RADIO",
    "SAMPAH",
    "BALLAST",
  ];

  // Fungsi Helper Penomoran (FORMAT BARU DENGAN GARIS MIRING)
  const getNextAndIncrement = () => {
    const pad = (num) => num.toString().padStart(2, "0");

    // 🔥 PERUBAHAN ADA DI SINI (Ganti titik jadi garis miring) 🔥
    const numStr = `AL.531/${pad(currentX)}/${pad(
      currentY
    )}/KSOP.PKU/${currentYear}`;

    currentY++;
    if (currentY > 25) {
      currentX++;
      currentY = 1;
    }
    return numStr;
  };

  // 2. LOOP SETIAP FORM (Form 1, Form 2, dst)
  for (let i = 1; i <= count; i++) {
    const container = document.getElementById(`dynamic-nomor-${i}`);
    if (!container) continue;

    let htmlPsh = "";
    let htmlEx = "";

    // FASE 1: PENGESAHAN
    bookTypes.forEach((b) => {
      const ck = document.querySelector(`input[name="check_PSH_${b}_${i}"]`);
      if (ck && ck.checked) {
        const nomer = getNextAndIncrement();
        htmlPsh += `
            <div style="margin-bottom:8px;">
                <label style="font-size:11px; font-weight:bold; color:#ff9f43; display:block; margin-bottom:2px;">${b}</label>
                <input type="text" name="nomorSurat_PSH.${b}_${i}" class="form-control" value="${nomer}" style="font-size:12px; padding:6px; font-weight:bold;">
            </div>`;
      }
    });

    // FASE 2: EXIBHITUM
    bookTypes.forEach((b) => {
      const ck = document.querySelector(`input[name="check_EX_${b}_${i}"]`);
      if (ck && ck.checked) {
        const nomer = getNextAndIncrement();
        htmlEx += `
            <div style="margin-bottom:8px;">
                <label style="font-size:11px; font-weight:bold; color:var(--neon-blue); display:block; margin-bottom:2px;">${b}</label>
                <input type="text" name="nomorSurat_EX.${b}_${i}" class="form-control" value="${nomer}" style="font-size:12px; padding:6px; font-weight:bold;">
            </div>`;
      }
    });

    // Update Tampilan
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
  }
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
    } else if (type === "EXIBHITUM") {
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
                        ${[
                          "DECK",
                          "MESIN",
                          "ORB",
                          "ORB TK. II",
                          "RADIO",
                          "SAMPAH",
                          "BALLAST",
                        ]
                          .map(
                            (b) => `
                          <label class="book-checkbox">
                          <input type="checkbox" name="check_PSH_${b}_${i}" value="PSH. ${b}" onchange="updateExibhitumForms()">
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
                      ${[
                        "DECK",
                        "MESIN",
                        "ORB",
                        "ORB TK. II",
                        "RADIO",
                        "SAMPAH",
                        "BALLAST",
                      ]
                        .map(
                          (b) => `
                        <label class="book-checkbox">
                        <input type="checkbox" name="check_EX_${b}_${i}" value="EX. ${b}" onchange="updateExibhitumForms()">
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
    html += `</div>`;
    container.innerHTML += html;
    if (type === "EXIBHITUM") {
      initExibhitumNumber();
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
          jenisBukuArray.push(cb.value);
        });

        // --- AMBIL NOMOR SURAT ---
        const nomorSuratArray = [];
        jenisBukuArray.forEach((jb) => {
          let safeName = jb.replace(". ", ".");
          const inputNomor = form.querySelector(
            `input[name="nomorSurat_${safeName}_${i}"]`
          );
          if (inputNomor) {
            nomorSuratArray.push(inputNomor.value);
          } else {
            nomorSuratArray.push("");
          }
        });

        // Simpan ke Object Data
        itemData.jenisBukuArray = jenisBukuArray;
        itemData.nomorSuratArray = nomorSuratArray;

        // Gabungan string untuk kompatibilitas tampilan tabel lama
        itemData.jenisBuku = jenisBukuArray.join("\n");
        itemData.nomorSurat = nomorSuratArray.join("\n");

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
// 1. FUNGSI EDIT DATA
// ====================================================================
function editData(type, rowDataStr) {
  const rowData = JSON.parse(decodeURIComponent(rowDataStr));
  const noUrut = rowData["NO_URUT"] || rowData["NO"];

  // 🔥 KHUSUS EXIBHITUM PAKAI SMART EDIT 🔥
  if (type === "EXIBHITUM") {
    openSmartEditModal(noUrut);
    return;
  }
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

    //  PAKSA LOCK SEMUA CHECKBOX DI AWAL
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
    //  LOCK CHECKBOX SERVICE
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
    //  LOCK CHECKBOX EXIBHITUM
    form
      .querySelectorAll('[type="checkbox"]')
      .forEach((c) => (c.disabled = true));
  }

  // 4. FINAL LOCK: KUNCI SEMUA INPUT (TERMASUK TEXT & SELECT)
  const allInputs = form.querySelectorAll("input, select, textarea");
  allInputs.forEach((i) => {
    i.disabled = true;
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
    btnUnlock.onclick = () => enableEditMode(type);
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

  //  INI MANTRA PEMBUKA GEMBOKNYA:
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
  iframe.style.display = "none";
  iframe.src = url;
  document.body.appendChild(iframe);

  // Hapus iframe setelah 1 menit (bersih-bersih memori)
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 60000);
}

let rawData = { SHSK: [], SERTIFIKASI: [], SERVICE: [], EXIBHITUM: [] };
let filteredData = { SHSK: [], SERTIFIKASI: [], SERVICE: [], EXIBHITUM: [] };
let currentPage = { SHSK: 1, SERTIFIKASI: 1, SERVICE: 1, EXIBHITUM: 1 };

// ====================================================================
// FUNGSI LOAD DATA (UPDATE: SORTING EXIBHITUM DESCENDING)
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

    let dateKey = "";
    if (type === "SHSK") dateKey = "TANGGAL_PENGUKUHAN";
    else if (type === "SERTIFIKASI") dateKey = "TANGGAL_TERBIT";
    else if (type === "SERVICE") dateKey = "TANGGAL_VALIDASI_SERVICE_REPORT";
    else if (type === "EXIBHITUM") dateKey = "TANGGAL";

    // --- SORTING LOGIC UPDATE ---
    data.sort((a, b) => {
      // 1. Primary: Tanggal (Newest First)
      const dateA = new Date(a[dateKey]);
      const dateB = new Date(b[dateKey]);

      // Kalau tanggal beda, urutkan berdasarkan tanggal
      if (type !== "EXIBHITUM") {
        if (dateA > dateB) return -1;
        if (dateA < dateB) return 1;
      }

      // 2. Secondary
      if (type === "EXIBHITUM") {
        const getVal = (str) => {
          try {
            let parts = String(str).split("/");
            return parseInt(parts[1]) * 1000 + parseInt(parts[2]);
          } catch (e) {
            return 0;
          }
        };

        return getVal(b["PENOMORAN"]) - getVal(a["PENOMORAN"]);
      } else {
        const noA = parseInt(a["NO_URUT"]) || 0;
        const noB = parseInt(b["NO_URUT"]) || 0;
        return noA - noB;
      }
    });

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

  const limit = type === "EXIBHITUM" ? 25 : 10;
  const start = (currentPage[type] - 1) * limit;
  const pageData = filteredData[type].slice(start, start + limit);

  if (pageData.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="16" style="text-align:center;">Data Tidak Ditemukan</td></tr>';
    return;
  }

  pageData.forEach((row, i) => {
    const rowStr = encodeURIComponent(JSON.stringify(row));
    // Ambil ID Unik (NO_URUT)
    const uniqueId = row["NO_URUT"] || row["NO URUT"] || row["NO"];

    let tr = `<tr>`;

    // 🔥 TAMBAHAN: KOLOM CHECKBOX (Default Hidden) 🔥
    tr += `<td class="col-check hidden">
             <input type="checkbox" class="bulk-check" value="${uniqueId}" onchange="updateDeleteCount('${type}')">
           </td>`;

    tr += `<td>${start + i + 1}</td>`;

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
// FUNGSI PAGINATION (SUPPORT MONITORING)
// ====================================================================
function renderPagination(type, totalCustom = null, pageCustom = null, limitCustom = null) {
  const container = document.getElementById(`pagination-${type}`);
  if (!container) return;

  // Deteksi limit: Exibhitum 25, Monitoring 10, Lainnya 10
  const limit = limitCustom || (type === "EXIBHITUM" ? 25 : 10);
  
  // Deteksi Data Source
  const totalRows = totalCustom !== null ? totalCustom : filteredData[type].length;
  const current = pageCustom !== null ? pageCustom : currentPage[type];
  const totalPages = Math.ceil(totalRows / limit);

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  // Tentukan Fungsi Navigasi: Monitoring pakai 'loadMonitoringData', sisanya 'goToPage'
  const funcName = type === "MONITORING" ? "loadMonitoringData" : "goToPage";

  let html = "";
  const prevDisabled = current === 1 ? "disabled" : "";
  html += `<button class="page-btn nav-btn" ${prevDisabled} onclick="${funcName}('${type}', ${current - 1})"><i class="fa fa-chevron-left"></i></button>`;

  const delta = 2;
  const range = [];
  const rangeWithDots = [];
  let l;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= current - delta && i <= current + delta)) {
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
      html += `<button class="page-btn ${activeClass}" onclick="${funcName}('${type}', ${i})">${i}</button>`;
    }
  });

  const nextDisabled = current === totalPages ? "disabled" : "";
  html += `<button class="page-btn nav-btn" ${nextDisabled} onclick="${funcName}('${type}', ${current + 1})"><i class="fa fa-chevron-right"></i></button>`;
  html += `<span style="margin-left:10px; font-size:12px; color:#666;"><b>${totalRows}</b> Data</span>`;

  container.innerHTML = html;
}


// FUNGSI PINDAH HALAMAN
function goToPage(type, pageNum) {
  // Kalau yang dipanggil Monitoring, oper ke fungsinya sendiri
  if(type === 'MONITORING') {
      loadMonitoringData(pageNum);
      return;
  }

  const limit = type === "EXIBHITUM" ? 25 : 10;
  const totalRows = filteredData[type].length;
  const totalPages = Math.ceil(totalRows / limit);

  if (pageNum < 1 || pageNum > totalPages) return;

  currentPage[type] = pageNum;
  renderTable(type);
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
    setTimeout(() => {
      console.log("Welcome to SHSK Digital System");
    }, 3500);
  }
}

function openLoginModal() {
  const modal = document.getElementById("login-modal-overlay");
  if (modal) {
    modal.classList.remove("hidden");
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
      postData({ action: "getDataSertifikasi" }),
      postData({ action: "getDataSHSK" }),
      postData({ action: "getDataService" }),
      postData({ action: "getDataExibhitum" }),
    ])
      .then((results) => {
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
      })
      .catch((err) => {
        console.error("Gagal Auto-Sync:", err);
      });
  }
});

// ====================================================================
// NAVIGASI SIDEBAR (SHOW SECTION & TOGGLE SUBMENU)
// ====================================================================

function showSection(id, el) {
  document.querySelectorAll(".main-content > div").forEach((d) => d.classList.add("hidden"));
  const targetSection = document.getElementById(`sec-${id}`);
  if (targetSection) targetSection.classList.remove("hidden");

  // Bersih-bersih menu aktif
  document.querySelectorAll(".menu-item, .submenu-item").forEach((m) => m.classList.remove("active"));
  document.querySelectorAll(".menu-item").forEach((m) => {
    m.classList.remove("parent-active");
    m.classList.remove("open");
  });
  document.querySelectorAll(".submenu-container").forEach((c) => c.classList.remove("show"));

  if (el) {
    el.classList.add("active");
    if (el.classList.contains("submenu-item")) {
      const container = el.closest(".submenu-container");
      if (container) {
        container.classList.add("show");
        const parentMenu = container.previousElementSibling;
        if (parentMenu) {
          parentMenu.classList.add("parent-active");
          parentMenu.classList.add("open");
        }
      }
    }
  }

  // --- 🔥 LOGIKA AUTO LOAD DATA 🔥 ---
  if (id === "monitoring") {
      // Reset filter ke default saat menu diklik
      if(document.getElementById("monFilterBulan")) document.getElementById("monFilterBulan").value = "";
      if(document.getElementById("monFilterTahun")) document.getElementById("monFilterTahun").value = "";
      if(document.getElementById("monSearch")) document.getElementById("monSearch").value = "";
      
      // Load data otomatis (Muncul semua)
      loadMonitoringData(1); 
  } 
  else if (id.includes("data")) {
      const type = id.includes("shsk") ? "SHSK" : 
                   id.includes("sertifikasi") ? "SERTIFIKASI" : 
                   id.includes("service") ? "SERVICE" : "EXIBHITUM";
      loadData(type);
  }

  // Mobile sidebar auto-close
  if (window.innerWidth <= 768) {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    if (sidebar && sidebar.classList.contains("show")) {
      sidebar.classList.remove("show");
      if (overlay) overlay.classList.remove("active");
    }
  }
}

// 2. FUNGSI BUKA/TUTUP LACI SUBMENU (TANPA PINDAH HALAMAN)
function toggleSubmenu(id) {
  const submenu = document.getElementById(id);
  if (!submenu) return;

  const parentMenu = submenu.previousElementSibling; // Tombol Bapaknya

  // Aksi Buka/Tutup (Toggle)
  submenu.classList.toggle("show"); // Buka/Tutup Laci
  if (parentMenu) {
    parentMenu.classList.toggle("open"); // Putar Panah
  }
}

// ====================================================================
// FUNGSI ACCORDION (BUKA/TUTUP FORM INPUT)
// ====================================================================
function toggleAccordion(element) {
  // Element adalah header yang diklik
  // Parent-nya adalah div class="accordion-item"
  const item = element.parentElement;

  // Toggle class 'open' (CSS akan menangani display: block/none)
  item.classList.toggle("open");
}

// ====================================================================
// FITUR 1: BULK DELETE (HAPUS MASSAL)
// ====================================================================
let isDeleteMode = false;

function toggleDeleteMode(type) {
  isDeleteMode = !isDeleteMode;
  const btn = document.getElementById(`btn-mode-hapus-${type}`);
  const confirmBtn = document.getElementById(`btn-confirm-hapus-${type}`);

  // Toggle Kolom Checkbox di Tabel
  const checkCols = document.querySelectorAll(
    "#table-" + type.toLowerCase() + " .col-check"
  );

  if (isDeleteMode) {
    btn.innerHTML = '<i class="fa fa-times"></i> Batal';
    btn.style.background = "#666";
    confirmBtn.classList.remove("hidden");
    checkCols.forEach((el) => el.classList.remove("hidden"));
  } else {
    btn.innerHTML = '<i class="fa fa-check-square"></i> Mode Hapus';
    btn.style.background = "#555";
    confirmBtn.classList.add("hidden");
    checkCols.forEach((el) => el.classList.add("hidden"));
    // Uncheck semua
    document
      .querySelectorAll(".bulk-check")
      .forEach((cb) => (cb.checked = false));
    updateDeleteCount(type);
  }
}

function updateDeleteCount(type) {
  const count = document.querySelectorAll(
    "#table-" + type.toLowerCase() + " .bulk-check:checked"
  ).length;
  document.getElementById(`count-hapus-${type}`).innerText = count;
}

async function executeBulkDelete(type) {
  const checked = document.querySelectorAll(
    "#table-" + type.toLowerCase() + " .bulk-check:checked"
  );
  if (checked.length === 0) return showPopup("Pilih data dulu!", "error");

  if (!confirm(`Yakin hapus ${checked.length} data ini? Permanen lho!`)) return;

  const ids = Array.from(checked).map((cb) => cb.value);
  const btn = document.getElementById(`btn-confirm-hapus-${type}`);
  const oriText = btn.innerHTML;

  btn.innerHTML = "Menghapus...";
  btn.disabled = true;

  try {
    const res = await postData({
      action: "deleteBulkData",
      type: type,
      ids: ids,
    });
    if (res.status === "SUCCESS") {
      showPopup("Data berhasil dihapus!", "success");
      toggleDeleteMode(type); // Keluar mode hapus
      loadData(type); // Refresh tabel
      updateSidebarCounts();
    } else {
      showPopup("Gagal: " + res.message, "error");
    }
  } catch (e) {
    showPopup("Error koneksi", "error");
  }

  btn.innerHTML = oriText;
  btn.disabled = false;
}

// ====================================================================
// FITUR 2: SMART BATCH EDIT (DOMINO EFFECT)
// ====================================================================

async function openSmartEditModal(noUrut) {
  showPopup("Mengambil data satu kapal...", "info");

  // Panggil Backend: Ambil semua data dengan ID Batch yang sama
  const res = await postData({ action: "getBatchExibhitum", noUrut: noUrut });

  if (res.status === "SUCCESS") {
    const rows = res.data;
    if (rows.length === 0) return showPopup("Data tidak ditemukan", "error");

    const first = rows[0];

    // 1. Isi Data Umum
    document.getElementById("smart-id-batch").value = noUrut;
    document.getElementById("smart-date").value = formatDateForInput(
      first.TANGGAL
    );
    document.getElementById("smart-company").value = first.PERUSAHAAN;
    document.getElementById("smart-ship").value = first.NAMA_KAPAL;
    document.getElementById("smart-pup").value = first.PUP;

    // 2. Render List Buku
    const container = document.getElementById("smart-list-container");
    container.innerHTML = "";

    // Urutkan biar PSH diatas, EX dibawah
    rows.sort((a, b) => {
      const isAEx = a.JENIS_BUKU.includes("EX");
      const isBEx = b.JENIS_BUKU.includes("EX");
      return isAEx - isBEx;
    });

    rows.forEach((r) => {
      const jenis = r.JENIS_BUKU;
      const nomor = r.PENOMORAN;
      const isPsh = jenis.includes("PSH") || jenis.includes("PENGESAHAN");

      // Style beda buat PSH dan EX biar gampang liatnya
      const bg = isPsh ? "#fff3e0" : "#e3f2fd";
      const icon = isPsh ? "fa-stamp" : "fa-book";
      const color = isPsh ? "#ef6c00" : "#1565c0";

      container.innerHTML += `
                <div style="display:flex; align-items:center; gap:10px; padding:10px; background:${bg}; border-radius:6px; margin-bottom:8px; border:1px solid #ddd;">
                    <div style="width:30px; text-align:center; color:${color};"><i class="fa ${icon}"></i></div>
                    <div style="flex:1;">
                        <div style="font-weight:bold; font-size:12px; color:#555;">${jenis}</div>
                        <input type="text" class="form-control smart-item-input" 
                               data-jenis="${jenis}" 
                               value="${nomor}" 
                               style="width:100%; font-family:monospace; font-weight:bold; margin-top:2px;">
                    </div>
                </div>
            `;
    });

    document.getElementById("modal-smart-edit").classList.remove("hidden");
  } else {
    showPopup("Gagal ambil data.", "error");
  }
}

function closeSmartEdit() {
  document.getElementById("modal-smart-edit").classList.add("hidden");
}

async function saveSmartBatch() {
  const id = document.getElementById("smart-id-batch").value;
  const btn = event.currentTarget;
  const oriText = btn.innerHTML;

  // Ambil Data Umum
  const common = {
    tanggal: document.getElementById("smart-date").value,
    perusahaan: document.getElementById("smart-company").value,
    namaKapal: document.getElementById("smart-ship").value,
    pup: document.getElementById("smart-pup").value,
  };

  // Ambil Data Nomor (Array)
  const items = [];
  document.querySelectorAll(".smart-item-input").forEach((inp) => {
    items.push({
      jenis: inp.dataset.jenis,
      nomor: inp.value,
    });
  });

  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> MEMPROSES DOMINO...';
  btn.disabled = true;

  try {
    // KIRIM KE BACKEND (LOGIKA DOMINO ADA DI SANA)
    const res = await postData({
      action: "updateSmartBatchExibhitum",
      noUrut: id,
      common: common,
      items: items,
    });

    if (res.status === "SUCCESS") {
      showPopup(
        "SUKSES! Data terupdate & nomor lain telah digeser.",
        "success"
      );
      closeSmartEdit();
      loadData("EXIBHITUM");
    } else {
      showPopup("Gagal: " + res.message, "error");
    }
  } catch (e) {
    showPopup("Error Server", "error");
  }

  btn.innerHTML = oriText;
  btn.disabled = false;
}
// --- END SCRIPT.JS V15.3 ---
