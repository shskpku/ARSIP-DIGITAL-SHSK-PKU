/* ====================================================================
   SCRIPT.JS - FRONTEND LOGIC (MASTER FINAL PRODUCTION)
   ==================================================================== */

// ⚠️ PASTE URL WEB APP (DEPLOYMENT BARU) KAMU DI SINI
const API_URL =
  "https://script.google.com/macros/s/AKfycbwo5j74mC6sMx4NPlfrFRIVkLT5tTgfFU5rPymDjRzjPjcDKwgjaVXVhkGa6tkVwK_mFA/exec";

// ====================================================================
// 1. UTILITIES & HELPER
// ====================================================================

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

  setTimeout(() => popup.classList.add("show"), 10);
  setTimeout(() => popup.classList.remove("show"), 3000);
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
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
// 2. AUTHENTICATION & OTP
// ====================================================================

async function handleLogin(e, role, passwordInput, callbackError) {
  if (e) e.preventDefault();
  let userId =
    role === "PETUGAS"
      ? document.getElementById("nip").value
      : document.getElementById("email").value;
  if (!userId || !passwordInput) {
    showPopup("Data login tidak lengkap.", "error");
    return;
  }

  showPopup("Sedang Masuk...", "info");
  try {
    const res = await postData({
      action: "login",
      role: role,
      id: userId,
      password: passwordInput,
    });
    if (res.status === "SUCCESS") {
      localStorage.setItem("user", JSON.stringify(res.data));
      showPopup(`Login Berhasil! Halo ${res.data.nama}`, "success");
      setTimeout(() => {
        window.location.href =
          role === "PETUGAS" ? "petugas.html" : "pengguna.html";
      }, 1500);
    } else {
      showPopup(res.message, "error");
    }
  } catch (error) {
    showPopup("Gagal koneksi.", "error");
  }
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
// 3. PAGE INITIALIZATION
// ====================================================================

document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector(".dashboard-page")) initPenggunaDashboard();
  else if (document.querySelector(".petugas-page")) {
    loadProfilePetugas();
    updateChartFilter("year");
    setupAccordions();
  }
});

// ====================================================================
// 4. LOGIC DASHBOARD PETUGAS (DENGAN FIX JABATAN)
// ====================================================================

function loadProfilePetugas() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  if (document.getElementById("nav-name"))
    document.getElementById("nav-name").innerText = user.nama;
  if (document.getElementById("sidebar-name"))
    document.getElementById("sidebar-name").innerText = user.nama;
  if (document.getElementById("sidebar-nip"))
    document.getElementById("sidebar-nip").innerText =
      "NIP. " + (user.id || "-");
  if (document.getElementById("dash-name"))
    document.getElementById("dash-name").innerText = user.nama.split(" ")[0];

  // --- INI BARIS PENTING UNTUK JABATAN! ---
  if (document.getElementById("sidebar-role")) {
    document.getElementById("sidebar-role").innerText = user.extra || "PETUGAS";
  }

  const sbInitial = document.getElementById("sidebar-initial");
  if (sbInitial && user.foto && user.foto !== "") {
    sbInitial.innerHTML = `<img src="${user.foto}" class="profile-img-fit">`;
    sbInitial.style.border = "2px solid var(--gold)";
  }
}

// --- CHARTS (REALTIME FILTER) ---
let barChartInstance = null;
let doughnutChartInstance = null;
let currentFilter = "year";

function updateChartFilter(period) {
  currentFilter = period;
  document
    .querySelectorAll(".filter-btn")
    .forEach((btn) => btn.classList.remove("active"));
  const btns = document.querySelectorAll(".filter-btn");
  if (period === "today" && btns[0]) btns[0].classList.add("active");
  else if (period === "week" && btns[1]) btns[1].classList.add("active");
  else if (period === "month" && btns[2]) btns[2].classList.add("active");
  else if (btns[3]) btns[3].classList.add("active");
  initCharts(period);
}

async function initCharts(period = "year") {
  if (!document.getElementById("barChart")) return;

  const res = await postData({ action: "getDashboardStats", period: period });

  let chartData = {
    year: new Date().getFullYear(),
    totalYear: 0,
    labels: [],
    counts: [],
  };
  if (res.status === "SUCCESS") chartData = res.data;

  const targetElement = document.querySelector(".chart-card h3 i.fa-bullseye");
  if (targetElement && targetElement.parentNode)
    targetElement.parentNode.innerHTML = `<i class="fa fa-bullseye" style="color: var(--gold)"></i> Target ${chartData.year}`;

  const totalTarget = 2040;
  const sisaTarget = totalTarget - chartData.totalYear;
  if (document.querySelector(".target-info span:nth-child(1) b"))
    document.querySelector(".target-info span:nth-child(1) b").innerText =
      sisaTarget.toLocaleString();
  if (document.querySelector(".target-info span:nth-child(2) b"))
    document.querySelector(".target-info span:nth-child(2) b").innerText =
      chartData.totalYear.toLocaleString();
  if (document.querySelector(".chart-card strong"))
    document.querySelector(".chart-card strong").innerText =
      totalTarget.toLocaleString();

  const ctxBar = document.getElementById("barChart").getContext("2d");
  if (barChartInstance) barChartInstance.destroy();
  barChartInstance = new Chart(ctxBar, {
    type: "bar",
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: "Arsip Masuk",
          data: chartData.counts,
          backgroundColor: "rgba(10, 25, 47, 0.8)",
          borderColor: "rgba(10, 25, 47, 1)",
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
      plugins: { legend: { display: false } },
    },
  });

  const ctxDoughnut = document.getElementById("doughnutChart").getContext("2d");
  if (doughnutChartInstance) doughnutChartInstance.destroy();
  doughnutChartInstance = new Chart(ctxDoughnut, {
    type: "doughnut",
    data: {
      labels: ["Tercapai", "Sisa Target"],
      datasets: [
        {
          data: [chartData.totalYear, sisaTarget < 0 ? 0 : sisaTarget],
          backgroundColor: ["#00c853", "#eee"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "75%",
      plugins: { legend: { display: false } },
    },
  });
}

// --- CRUD HANDLER ---
let rawData = { SHSK: [], SERTIFIKASI: [] };
let filteredData = { SHSK: [], SERTIFIKASI: [] };
let currentPage = { SHSK: 1, SERTIFIKASI: 1 };
const ROWS_PER_PAGE = 10;

async function handleSubmit(type) {
  const formId = type === "SHSK" ? "formSHSK" : "formSertifikasi";
  const form = document.getElementById(formId);
  if (!form) return;

  const noUrutVal = form.querySelector('[name="noUrut"]').value;
  const isUpdate = noUrutVal !== "";
  const actionType = isUpdate
    ? type === "SHSK"
      ? "updateSHSK"
      : "updateSertifikasi"
    : type === "SHSK"
    ? "uploadSHSK"
    : "uploadSertifikasi";

  const activeBtn = form.querySelector(
    'button:not(.hidden)[type="submit"], button:not(.hidden).btn-edit-mode'
  );
  const btnSubmit = activeBtn || form.querySelector(".btn-gold-save");
  const originalText = btnSubmit.innerHTML;
  btnSubmit.innerHTML = '<i class="fa fa-spinner fa-spin"></i> MEMPROSES...';
  btnSubmit.disabled = true;

  showPopup(
    isUpdate ? "Sedang memperbarui data..." : "Sedang menyimpan data...",
    "info"
  );

  const formData = new FormData(form);
  const payload = { action: actionType, files: [] };
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") payload[key] = value.toUpperCase();
  }

  const fileInputs =
    type === "SHSK"
      ? ["permohonan", "stkk", "grosse", "ukur", "pnbp"]
      : [
          "permohonan",
          "evaluasi",
          "laporan_pemeriksaan",
          "sertifikat",
          "surat_tugas",
          "pnbp",
          "foto",
        ];
  for (const inputName of fileInputs) {
    const fileInput = form.querySelector(`[name="${inputName}"]`);
    if (fileInput && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      await new Promise((resolve) => {
        reader.onload = (e) => {
          payload.files.push({
            jenis: inputName,
            ext: file.name.split(".").pop(),
            data: e.target.result,
          });
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
  }

  const res = await postData(payload);
  btnSubmit.innerHTML = originalText;
  btnSubmit.disabled = false;

  if (res.status === "SUCCESS") {
    showPopup(
      isUpdate ? "Data berhasil diperbarui!" : "Data berhasil disimpan!",
      "success"
    );
    form.reset();
    form.querySelector('[name="noUrut"]').value = "";
    if (isUpdate) cancelEdit(type);
    updateChartFilter(currentFilter);
  } else {
    showPopup("Gagal: " + res.message, "error");
  }
}

function editData(type, rowDataStr) {
  const rowData = JSON.parse(decodeURIComponent(rowDataStr));
  const formId = type === "SHSK" ? "formSHSK" : "formSertifikasi";
  const form = document.getElementById(formId);
  showSection(`${type.toLowerCase()}-input`);

  const getVal = (key1, key2) => rowData[key1] || rowData[key2] || "";

  if (type === "SHSK") {
    form.querySelector('[name="noUrut"]').value = getVal("NO_URUT", "NO URUT");
    form.querySelector('[name="oldFolderUrl"]').value = rowData.LINK_FOLDER;
    form.querySelector('[name="namaKapal"]').value = rowData.NAMA_KAPAL;
    form.querySelector('[name="tonase"]').value = rowData.TONASE_GT;
    form.querySelector('[name="tandaPendaftaran"]').value =
      rowData.TANDA_PENDAFTARAN;
    form.querySelector('[name="pemilik"]').value = rowData.PEMILIK;
    form.querySelector('[name="tempatStkk"]').value = rowData.TEMPAT_STKK;
    form.querySelector('[name="tglStkk"]').value = formatDateForInput(
      rowData.TANGGAL_STKK
    );
    form.querySelector('[name="noUrutStkk"]').value = rowData.NO_URUT_STKK;
    form.querySelector('[name="noHalStkk"]').value = rowData.NO_HAL_STKK;
    form.querySelector('[name="noBukuStkk"]').value = rowData.NO_BUKU_STKK;
    form.querySelector('[name="statusPengukuhan"]').value =
      rowData.STATUS_PENGUKUHAN;
    form.querySelector('[name="tglPengukuhan"]').value = formatDateForInput(
      rowData.TANGGAL_PENGUKUHAN
    );
  } else {
    form.querySelector('[name="noUrut"]').value = getVal("NO_URUT", "NO URUT");
    form.querySelector('[name="oldFolderUrl"]').value = rowData.LINK_FOLDER;
    form.querySelector('[name="perusahaan"]').value = rowData.NAMA_PERUSAHAAN;
    form.querySelector('[name="namaKapal"]').value = rowData.NAMA_KAPAL;
    form.querySelector('[name="ukuran"]').value = rowData.UKURAN_GT;
    form.querySelector('[name="callSign"]').value = rowData.CALL_SIGN;
    form.querySelector('[name="bahan"]').value = rowData.BAHAN_KAPAL;
    form.querySelector('[name="daerahPelayaran"]').value =
      rowData.DAERAH_PELAYARAN;
    form.querySelector('[name="keterangan"]').value = rowData.KETERANGAN;
    form.querySelector('[name="jenisSertifikat"]').value =
      rowData.JENIS_SERTIFIKAT;
    form.querySelector('[name="tglTerbit"]').value = formatDateForInput(
      rowData.TANGGAL_TERBIT
    );
    form.querySelector('[name="tglBerlaku"]').value = formatDateForInput(
      rowData.TANGGAL_MASA_BERLAKU
    );
    form.querySelector('[name="noSertifikat"]').value =
      rowData.NOMOR_SERTIFIKAT;
    form.querySelector('[name="kodeBilling"]').value = rowData.KODE_BILLING;
    form.querySelector('[name="pemeriksa"]').value = rowData.NAMA_PEMERIKSA;
  }

  toggleFormInputs(form, true);
  document.getElementById(`btn-save-${type}`).classList.add("hidden");
  const btnUnlock = document.getElementById(`btn-unlock-${type}`);
  const btnCancel = document.getElementById(`btn-cancel-${type}`);
  btnUnlock.classList.remove("hidden");
  btnUnlock.innerHTML = '<i class="fa fa-pencil-alt"></i> UBAH DATA';
  btnUnlock.onclick = function () {
    enableEditMode(type);
  };
  btnCancel.classList.remove("hidden");
  showPopup("Mode Edit: Data dimuat (Terkunci)", "info");
}

function enableEditMode(type) {
  const formId = type === "SHSK" ? "formSHSK" : "formSertifikasi";
  const form = document.getElementById(formId);
  toggleFormInputs(form, false);
  const btnUnlock = document.getElementById(`btn-unlock-${type}`);
  btnUnlock.innerHTML = '<i class="fa fa-save"></i> SIMPAN PERUBAHAN';
  btnUnlock.onclick = function () {
    handleSubmit(type);
  };
  showPopup("Form Terbuka. Silakan edit.", "info");
}

function cancelEdit(type) {
  const formId = type === "SHSK" ? "formSHSK" : "formSertifikasi";
  const form = document.getElementById(formId);
  form.reset();
  form.querySelector('[name="noUrut"]').value = "";
  toggleFormInputs(form, false);
  document.getElementById(`btn-save-${type}`).classList.remove("hidden");
  document.getElementById(`btn-unlock-${type}`).classList.add("hidden");
  document.getElementById(`btn-cancel-${type}`).classList.add("hidden");
  showSection(`${type.toLowerCase()}-data`);
}

function toggleFormInputs(form, disabled) {
  const inputs = form.querySelectorAll("input, select, textarea");
  inputs.forEach((input) => {
    if (input.type !== "hidden") input.disabled = disabled;
  });
}

// --- TABLE & LOADING ---
async function loadData(type) {
  const tbody = document.getElementById(
    type === "SHSK" ? "tbody-shsk" : "tbody-sertifikasi"
  );
  tbody.innerHTML =
    '<tr><td colspan="16" style="text-align:center;">Sedang Memuat Data...</td></tr>';
  const res = await postData({
    action: type === "SHSK" ? "getDataSHSK" : "getDataSertifikasi",
  });
  if (res.status === "SUCCESS") {
    rawData[type] = res.data.reverse();
    filteredData[type] = rawData[type];
    currentPage[type] = 1;
    renderTable(type);
  } else {
    tbody.innerHTML = `<tr><td colspan="16" style="text-align:center;color:red">${res.message}</td></tr>`;
  }
}

function renderTable(type, data = null) {
  const tbody = document.getElementById(
    type === "SHSK" ? "tbody-shsk" : "tbody-sertifikasi"
  );
  tbody.innerHTML = "";
  const sourceData = data || filteredData[type];
  const start = (currentPage[type] - 1) * ROWS_PER_PAGE;
  const pageData = sourceData.slice(start, start + ROWS_PER_PAGE);
  if (pageData.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="16" style="text-align:center;">Data Tidak Ditemukan</td></tr>';
    return;
  }

  pageData.forEach((row, i) => {
    const idData = row["NO_URUT"] || row["NO URUT"] || row["No Urut"] || "-";
    const rowStr = encodeURIComponent(JSON.stringify(row));
    let tr = `<tr><td>${start + i + 1}</td>`;
    if (type === "SHSK") {
      tr += `<td>${idData}</td><td>${row["NAMA_KAPAL"]}</td><td>${
        row["TONASE_GT"]
      }</td><td>${row["TANDA_PENDAFTARAN"]}</td><td>${row["PEMILIK"]}</td><td>${
        row["TEMPAT_STKK"]
      }</td><td>${formatDate(row["TANGGAL_STKK"])}</td><td>${
        row["NO_URUT_STKK"]
      }</td><td>${row["NO_HAL_STKK"]}</td><td>${row["NO_BUKU_STKK"]}</td><td>${
        row["STATUS_PENGUKUHAN"]
      }</td><td>${formatDate(row["TANGGAL_PENGUKUHAN"])}</td>`;
    } else {
      tr += `<td>${idData}</td><td>${row["NAMA_PERUSAHAAN"]}</td><td>${
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
    }
    tr += `<td><div style="display:flex; justify-content:center; gap:5px;">
                  <button class="btn-act btn-view" title="Lihat File" onclick="window.open('${row["LINK_FOLDER"]}', '_blank')"><i class="fa fa-folder-open"></i></button>
                  <button class="btn-act btn-edit" title="Edit Data" onclick="editData('${type}', '${rowStr}')"><i class="fa fa-pencil-alt"></i></button>
                  <button class="btn-act btn-del" onclick="prepareDelete('${type}', '${rowStr}')"><i class="fa fa-trash"></i></button>
               </div></td></tr>`;
    tbody.innerHTML += tr;
  });
  const pageInfo = document.getElementById(`page-info-${type}`);
  if (pageInfo) pageInfo.innerText = `Hal ${currentPage[type]}`;
}

function prevPage(type) {
  if (currentPage[type] > 1) {
    currentPage[type]--;
    renderTable(type);
  }
}
function nextPage(type) {
  if (currentPage[type] * ROWS_PER_PAGE < filteredData[type].length) {
    currentPage[type]++;
    renderTable(type);
  }
}
function applyFilter(type) {
  const inputId = type === "SHSK" ? "searchSHSK" : "searchSertifikasi";
  const searchText = document.getElementById(inputId).value.toUpperCase();
  filteredData[type] = rawData[type].filter((row) =>
    Object.values(row).join(" ").toUpperCase().includes(searchText)
  );
  currentPage[type] = 1;
  renderTable(type);
}

// --- DELETE & EXPORT ---
let pendingDelete = null;
function prepareDelete(type, rowDataStr) {
  try {
    const rowData = JSON.parse(decodeURIComponent(rowDataStr));
    const noUrut =
      rowData["NO_URUT"] || rowData["NO URUT"] || rowData["No Urut"];
    const folderUrl = rowData["LINK_FOLDER"];
    if (!noUrut) {
      showPopup("Error: ID Data tidak ditemukan.", "error");
      return;
    }
    pendingDelete = { type, noUrut, folderUrl };
    document.getElementById("modal-delete").classList.remove("hidden");
  } catch (e) {
    showPopup("Error proses data.", "error");
  }
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
  const originalText = btnConfirm.innerText;
  btnConfirm.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Menghapus...';
  btnConfirm.disabled = true;

  const { type, noUrut, folderUrl } = pendingDelete;
  let folderId = "";
  try {
    if (folderUrl && folderUrl.includes("/folders/"))
      folderId = folderUrl.split("/folders/")[1].split("?")[0];
  } catch (e) {}

  const res = await postData({
    action: type === "SHSK" ? "deleteSHSK" : "deleteSertifikasi",
    noUrut: noUrut,
    folderId: folderId,
  });
  if (res.status === "SUCCESS") {
    showPopup("Data dihapus!", "success");
    closeDeleteModal();
    loadData(type);
    updateChartFilter(currentFilter);
  } else {
    showPopup("Gagal hapus.", "error");
  }
  btnConfirm.innerHTML = originalText;
  btnConfirm.disabled = false;
}

async function exportExcel(type) {
  const btn = document.querySelector(".btn-export");
  const originalText = btn ? btn.innerHTML : "Export";
  if (btn) {
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Proses...';
    btn.disabled = true;
  }
  showPopup("Menyusun laporan...", "info");
  try {
    const res = await postData({ action: "exportExcel", type: type });
    if (res.status === "SUCCESS") {
      showPopup("Laporan siap!", "success");
      window.open(res.url, "_blank");
    } else {
      showPopup("Gagal: " + res.message, "error");
    }
  } catch (e) {
    showPopup("Gagal koneksi.", "error");
  }
  if (btn) {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// --- SHARED UI ---
function toggleSidebar() {
  const sb = document.getElementById("sidebar");
  const ov = document.getElementById("sidebar-overlay");
  if (sb) sb.classList.toggle("show");
  if (ov) ov.classList.toggle("active");
}
function showSection(id, element) {
  document
    .querySelectorAll(".main-content > div")
    .forEach((d) => d.classList.add("hidden"));
  const target = document.getElementById("sec-" + id);
  if (target) target.classList.remove("hidden");
  document
    .querySelectorAll(".menu-item")
    .forEach((m) => m.classList.remove("active"));
  if (element) element.classList.add("active");
  if (id.includes("data"))
    loadData(id.includes("shsk") ? "SHSK" : "SERTIFIKASI");
  if (window.innerWidth <= 900) toggleSidebar();
}
function toggleSubmenu(id) {
  const sub = document.getElementById(id);
  if (!sub) return;
  const arrow = sub.previousElementSibling.querySelector(".arrow-icon");
  if (sub.classList.contains("show")) {
    sub.classList.remove("show");
    if (arrow) arrow.style.transform = "rotate(0deg)";
  } else {
    sub.classList.add("show");
    if (arrow) arrow.style.transform = "rotate(180deg)";
  }
}
function setupAccordions() {
  window.toggleAccordion = function (h) {
    h.parentElement.classList.toggle("open");
  };
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

// --- DASHBOARD USER ---
let penggunaFiles = [];
function initPenggunaDashboard() {
  const userStr = localStorage.getItem("user");
  if (!userStr) {
    window.location.href = "index.html";
    return;
  }
  const user = JSON.parse(userStr);

  const ids = [
    "nav-user-name",
    "mob-user-name",
    "nav-company-name",
    "mob-company-name",
    "email-display-text",
  ];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      if (id.includes("name")) el.innerText = user.nama;
      if (id.includes("company")) el.innerText = user.extra;
      if (id.includes("email")) el.innerText = user.id;
    }
  });

  fetchPenggunaFiles(user.extra);
}

async function fetchPenggunaFiles(companyName) {
  const reqYear = document.getElementById("reqTahun");
  if (!reqYear) return;
  reqYear.innerHTML = "<option>Sedang memuat...</option>";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "getDropdownData",
        perusahaan: companyName,
      }),
    });
    const result = await res.json();
    if (result.status === "SUCCESS") {
      penggunaFiles = result.data;
      populateYear();
    } else {
      reqYear.innerHTML = "<option>Data tidak ditemukan</option>";
    }
  } catch (e) {
    reqYear.innerHTML = "<option>Gagal memuat</option>";
  }
}

function populateYear() {
  const reqYear = document.getElementById("reqTahun");
  const years = [...new Set(penggunaFiles.map((item) => item.tahun))]
    .sort()
    .reverse();
  reqYear.innerHTML = '<option value="">-- Pilih Tahun --</option>';
  years.forEach((y) => {
    if (y) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.innerText = y;
      reqYear.appendChild(opt);
    }
  });
  resetDropdowns(["reqBulan", "reqKapal", "reqJenis"]);
}

window.filterMonth = function () {
  const year = document.getElementById("reqTahun").value;
  const reqMonth = document.getElementById("reqBulan");
  resetDropdowns(["reqBulan", "reqKapal", "reqJenis"]);
  if (!year) return;
  const months = [
    ...new Set(
      penggunaFiles.filter((i) => i.tahun == year).map((i) => i.bulan)
    ),
  ].sort((a, b) => a - b);
  reqMonth.innerHTML = '<option value="">-- Pilih Bulan --</option>';
  months.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.innerText = getMonthName(m);
    reqMonth.appendChild(opt);
  });
  reqMonth.disabled = false;
};
window.filterShip = function () {
  const year = document.getElementById("reqTahun").value;
  const month = document.getElementById("reqBulan").value;
  const reqShip = document.getElementById("reqKapal");
  resetDropdowns(["reqKapal", "reqJenis"]);
  if (!month) return;
  const ships = [
    ...new Set(
      penggunaFiles
        .filter((i) => i.tahun == year && i.bulan == month)
        .map((i) => i.kapal)
    ),
  ];
  reqShip.innerHTML = '<option value="">-- Pilih Kapal --</option>';
  ships.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.innerText = s;
    reqShip.appendChild(opt);
  });
  reqShip.disabled = false;
};
window.filterType = function () {
  const year = document.getElementById("reqTahun").value;
  const month = document.getElementById("reqBulan").value;
  const ship = document.getElementById("reqKapal").value;
  const reqType = document.getElementById("reqJenis");
  resetDropdowns(["reqJenis"]);
  if (!ship) return;
  const types = penggunaFiles.filter(
    (i) => i.tahun == year && i.bulan == month && i.kapal == ship
  );
  reqType.innerHTML = '<option value="">-- Pilih Dokumen --</option>';
  types.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.link;
    opt.innerText = t.jenis;
    reqType.appendChild(opt);
  });
  reqType.disabled = false;
};
window.handleRequestSubmit = async function (e) {
  e.preventDefault();
  const btn = document.getElementById("btnKirimReq");
  const linkFile = document.getElementById("reqJenis").value;
  const user = JSON.parse(localStorage.getItem("user"));
  if (!linkFile) {
    showPopup("Pilih dokumen dulu!", "error");
    return;
  }
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> MENGIRIM...';
  btn.disabled = true;

  const payload = {
    action: "sendReportEmail",
    email: user.id,
    namaUser: user.nama,
    perusahaan: user.extra,
    kapal: document.getElementById("reqKapal").value,
    jenis: document.getElementById("reqJenis").selectedOptions[0].innerText,
    tahun: document.getElementById("reqTahun").value,
    bulan: getMonthName(document.getElementById("reqBulan").value),
    link: linkFile,
  };
  try {
    const res = await postData(payload);
    if (res.status === "SUCCESS") {
      showPopup("Berhasil! Cek email Anda.", "success");
      document.getElementById("reqKapal").value = "";
    } else {
      showPopup("Gagal mengirim email.", "error");
    }
  } catch (err) {
    showPopup("Error koneksi.", "error");
  }
  btn.innerHTML = '<i class="fa fa-paper-plane"></i> KIRIM LINK KE EMAIL SAYA';
  btn.disabled = false;
};
function resetDropdowns(ids) {
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = '<option value="">-- Pilih --</option>';
      el.disabled = true;
    }
  });
}
function getMonthName(idx) {
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
  return months[idx - 1] || idx;
}
