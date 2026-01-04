/* ====================================================================
   SCRIPT.JS - FINAL FIX (LOGIN LOGIC & AUTO RESET)
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
  // DURASI NOTIFIKASI LEBIH LAMA (3 Detik)
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
    return { status: "ERROR", message: "Koneksi Terputus/Gagal" };
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
// 3. AUTHENTICATION (LOGIKA LOGIN DIPERBAIKI)
// ====================================================================

async function handleLogin(e, role) {
  if (e) e.preventDefault();
  
  // 1. TENTUKAN ID YANG DIPAKAI (SESUAIKAN DENGAN HTML KAMU)
  let inputId, inputPass, btnId;
  
  if (role === 'PETUGAS') {
      inputId = 'nip';
      passId = 'passPetugas';
      btnId = 'btnSubmitPetugas';
  } else {
      inputId = 'email';
      passId = 'passPengguna';
      btnId = 'btnSubmitPengguna';
  }

  const idElem = document.getElementById(inputId);
  const passElem = document.getElementById(passId);
  const btnElem = document.getElementById(btnId);

  // Pastikan elemen ditemukan (Debugging)
  if (!idElem || !passElem || !btnElem) {
      console.error("Elemen form tidak ditemukan! Cek ID HTML.");
      showPopup("Error Sistem: Elemen Form Hilang", "error");
      return;
  }

  // Ambil value dan bersihkan spasi (TRIM)
  const idValue = idElem.value.trim();
  const passValue = passElem.value.trim(); // Password jangan di-trim kalau ada spasi sengaja, tapi biasanya user typo spasi

  if (!idValue || !passValue) { 
      showPopup("Data tidak lengkap.", "error"); 
      return; 
  }
  
  // 2. UI LOADING (TOMBOL MUTER)
  const originalText = btnElem.innerHTML;
  btnElem.innerHTML = '<i class="fa fa-spinner fa-spin"></i> MEMPROSES...';
  btnElem.disabled = true;
  btnElem.style.opacity = "0.7";

  showPopup("Sedang Masuk...", "info");
  
  try {
    // 3. KIRIM DATA KE BACKEND
    const res = await postData({ 
        action: "login", 
        role: role, 
        id: idValue, 
        password: passValue // Kirim password asli (yang diketik)
    });
    
    // 4. CEK HASIL
    if (res.status === "SUCCESS") {
      // --- LOGIN SUKSES ---
      localStorage.setItem("user", JSON.stringify(res.data));
      showPopup(`Login Berhasil! Halo ${res.data.nama}`, "success");
      
      // Redirect setelah 2 detik
      setTimeout(() => { 
          window.location.href = role === "PETUGAS" ? "petugas.html" : "pengguna.html"; 
      }, 2000);

    } else { 
      // --- LOGIN GAGAL (RESET & NOTIFIKASI) ---
      showPopup("Login Gagal: " + res.message, "error"); 
      
      // RESET FORM (Sesuai Permintaan)
      idElem.value = "";
      passElem.value = "";
      idElem.focus(); // Arahkan kursor kembali ke ID
      
      // KEMBALIKAN TOMBOL
      btnElem.innerHTML = originalText;
      btnElem.disabled = false;
      btnElem.style.opacity = "1";
    }

  } catch (error) { 
    // --- ERROR KONEKSI ---
    showPopup("Gagal koneksi ke server.", "error");
    
    // KEMBALIKAN TOMBOL
    btnElem.innerHTML = originalText;
    btnElem.disabled = false;
    btnElem.style.opacity = "1";
  }
}

function logout() { document.getElementById("modal-logout").classList.remove("hidden"); }
function closeLogoutModal() { document.getElementById("modal-logout").classList.add("hidden"); }
function confirmLogout() { localStorage.removeItem("user"); window.location.href = "index.html"; }

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
// 4. INIT PAGE
// ====================================================================

document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector(".dashboard-page")) {
      initPenggunaDashboard();
      initAutoLogout();
  } else if (document.querySelector(".petugas-page")) {
      loadProfilePetugas();
      // Auto select filter tahun
      const activeFilter = document.querySelector('.filter-btn.active');
      updateChartFilter("year", activeFilter); 
      renderBulkForm('SHSK'); 
      renderBulkForm('SERTIFIKASI'); 
      initAutoLogout();
  }
});

// SIDEBAR & MENU FUNCTIONS (Fixed Logic)
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

function toggleSubmenu(id) { 
    const target = document.getElementById(id);
    const isOpen = target.classList.contains("show");
    
    // Tutup semua submenu lain
    document.querySelectorAll(".submenu-container").forEach(el => el.classList.remove("show"));
    document.querySelectorAll(".menu-item").forEach(el => el.classList.remove("open"));

    // Jika tadi tertutup, buka yg diklik
    if(!isOpen) {
        target.classList.add("show");
        const trigger = target.previousElementSibling; 
        if(trigger) trigger.classList.add("open");
    }
}

window.toggleAccordion = function(headerElement) {
    const item = headerElement.closest('.accordion-item');
    if (item) item.classList.toggle("open");
}

// ====================================================================
// 5. CHART UI
// ====================================================================
let barChartInstance=null;let doughnutChartInstance=null;let currentFilter="year";function updateChartFilter(p,b){currentFilter=p;document.querySelectorAll(".filter-btn").forEach(btn=>btn.classList.remove("active"));if(b)b.classList.add("active");initCharts(p)}async function initCharts(p="year"){if(!document.getElementById("barChart"))return;const r=await postData({action:"getDashboardStats",period:p});let d={year:new Date().getFullYear(),totalYear:0,labels:[],counts:[]};if(r.status==="SUCCESS")d=r.data;const t=document.querySelector(".chart-card h3 i.fa-bullseye");if(t&&t.parentNode)t.parentNode.innerHTML=`<i class="fa fa-bullseye" style="color: var(--gold)"></i> Target ${d.year}`;const tot=2040;const s=tot-d.totalYear;const ti=document.querySelector(".target-info");if(ti)ti.innerHTML=`<span><i class="fa fa-circle" style="color: #eee"></i> Sisa: <b>${s.toLocaleString()}</b></span><span><i class="fa fa-circle" style="color: #00c853"></i> Terbit: <b>${d.totalYear.toLocaleString()}</b></span>`;const cb=document.getElementById("barChart").getContext("2d");if(barChartInstance)barChartInstance.destroy();barChartInstance=new Chart(cb,{type:"bar",data:{labels:d.labels,datasets:[{label:"Arsip",data:d.counts,backgroundColor:"rgba(10, 25, 47, 0.8)",borderColor:"rgba(10, 25, 47, 1)",borderWidth:1,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});const cd=document.getElementById("doughnutChart").getContext("2d");if(doughnutChartInstance)doughnutChartInstance.destroy();doughnutChartInstance=new Chart(cd,{type:"doughnut",data:{labels:["Tercapai","Sisa"],datasets:[{data:[d.totalYear,s<0?0:s],backgroundColor:["#00c853","#eee"],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:"75%",plugins:{legend:{display:false}}}})}

// ====================================================================
// 6. PROFILE & BULK INPUT
// ====================================================================
function loadProfilePetugas(){const u=JSON.parse(localStorage.getItem("user"));if(!u){window.location.href="index.html";return}if(document.getElementById("nav-name"))document.getElementById("nav-name").innerText=u.nama;if(document.getElementById("sidebar-name"))document.getElementById("sidebar-name").innerText=u.nama;if(document.getElementById("sidebar-nip"))document.getElementById("sidebar-nip").innerText="NIP. "+(u.id||"-");if(document.getElementById("dash-name"))document.getElementById("dash-name").innerText=u.nama.split(" ")[0];if(document.getElementById("sidebar-role"))document.getElementById("sidebar-role").innerText=u.extra||"PETUGAS";const i=document.getElementById("sidebar-initial");if(i&&u.foto){i.innerHTML=`<img src="${u.foto}" class="profile-img-fit">`;i.style.border="2px solid var(--gold)"}}
function renderBulkForm(t){const c=document.getElementById(t==='SHSK'?'bulkCountSHSK':'bulkCountSertifikasi');const con=document.getElementById(`bulk-container-${t}`);if(!con||!c)return;const n=parseInt(c.value);con.innerHTML="";for(let i=1;i<=n;i++){let h=`<div class="data-wrapper" style="margin-bottom:30px;border:2px solid var(--navy);border-radius:10px;overflow:hidden;"><div style="background:var(--navy);color:#fff;padding:10px 15px;font-weight:bold;"><i class="fa fa-ship"></i> DATA KE-${i}</div><div style="padding:15px;background:#fff;"><input type="hidden" name="noUrut_${i}"><input type="hidden" name="oldFolderUrl_${i}">`;if(t==='SHSK'){h+=`<div class="accordion-item open"><div class="accordion-header" onclick="toggleAccordion(this)"><span>1. Informasi Kapal</span> <i class="fa fa-chevron-down"></i></div><div class="accordion-body" style="display:block;"><div class="grid-form"><label>Nama Kapal <input type="text" name="namaKapal_${i}" class="form-control" style="text-transform:uppercase"></label><label>Tonase <input type="text" name="tonase_${i}" class="form-control"></label><label>Tanda Pendaftaran <input type="text" name="tandaPendaftaran_${i}" class="form-control"></label><label>Pemilik <input type="text" name="pemilik_${i}" class="form-control" style="text-transform:uppercase"></label></div></div></div><div class="accordion-item"><div class="accordion-header" onclick="toggleAccordion(this)"><span>2. Penerbitan STKK</span> <i class="fa fa-chevron-down"></i></div><div class="accordion-body"><div class="grid-form"><label>Tempat STKK <input type="text" name="tempatStkk_${i}" class="form-control"></label><label>Tgl STKK <input type="date" name="tglStkk_${i}" class="form-control"></label><label>No Urut <input type="text" name="noUrutStkk_${i}" class="form-control"></label><label>No Hal <input type="text" name="noHalStkk_${i}" class="form-control"></label><label>No Buku <input type="text" name="noBukuStkk_${i}" class="form-control"></label></div></div></div><div class="accordion-item"><div class="accordion-header" onclick="toggleAccordion(this)"><span>3. Pengukuhan</span> <i class="fa fa-chevron-down"></i></div><div class="accordion-body"><div class="grid-form"><label>Status <input type="text" name="statusPengukuhan_${i}" class="form-control" style="text-transform:uppercase"></label><label>Tgl Pengukuhan <input type="date" name="tglPengukuhan_${i}" class="form-control"></label></div></div></div><div class="accordion-item"><div class="accordion-header" onclick="toggleAccordion(this)"><span>4. Upload Dokumen</span> <i class="fa fa-chevron-down"></i></div><div class="accordion-body"><div class="grid-form"><label>Permohonan <input type="file" name="permohonan_${i}"></label><label>STKK <input type="file" name="stkk_${i}"></label><label>Grosse <input type="file" name="grosse_${i}"></label><label>Surat Ukur <input type="file" name="ukur_${i}"></label><label>PNBP <input type="file" name="pnbp_${i}"></label></div></div></div>`}else{h+=`<div class="accordion-item open"><div class="accordion-header" onclick="toggleAccordion(this)"><span>1. Informasi Kapal</span> <i class="fa fa-chevron-down"></i></div><div class="accordion-body" style="display:block;"><div class="grid-form"><label>Perusahaan <input type="text" name="perusahaan_${i}" class="form-control" style="text-transform:uppercase"></label><label>Nama Kapal <input type="text" name="namaKapal_${i}" class="form-control" style="text-transform:uppercase"></label><label>Ukuran (GT) <input type="text" name="ukuran_${i}" class="form-control"></label><label>Call Sign <input type="text" name="callSign_${i}" class="form-control"></label><label>Bahan <input type="text" name="bahan_${i}" class="form-control"></label><label>Daerah Pelayaran <select name="daerahPelayaran_${i}" class="form-control"><option value="">-- Pilih --</option><option value="SEMUA LAUTAN">SEMUA LAUTAN</option><option value="PERAIRAN INDONESIA">PERAIRAN INDONESIA</option><option value="LOKAL">LOKAL</option><option value="TERBATAS">TERBATAS</option><option value="AREA PELABUHAN">AREA PELABUHAN</option></select></label><label>Keterangan <select name="keterangan_${i}" class="form-control"><option value="">(Kosong)</option><option value="DOCKING">DOCKING</option></select></label></div></div></div><div class="accordion-item"><div class="accordion-header" onclick="toggleAccordion(this)"><span>2. Data Sertifikat</span> <i class="fa fa-chevron-down"></i></div><div class="accordion-body"><div class="grid-form"><label>Jenis Sertifikat <select name="jenisSertifikat_${i}" class="form-control"><option value="">-- Pilih Jenis --</option><option value="SEA TRIAL">SEA TRIAL</option><option value="KONSTRUKSI">KONSTRUKSI</option><option value="PERLENGKAPAN">PERLENGKAPAN</option><option value="RADIO">RADIO</option><option value="ENDORS KONSTRUKSI">ENDORS KONSTRUKSI</option><option value="ENDORS PERLENGKAPAN">ENDORS PERLENGKAPAN</option><option value="ENDORS RADIO">ENDORS RADIO</option><option value="GARIS MUAT">GARIS MUAT</option><option value="KESELAMATAN KLM">KESELAMATAN KLM</option><option value="KESELAMATAN MOORING">KESELAMATAN MOORING</option><option value="IMDG">IMDG</option><option value="SNPP">SNPP</option><option value="ENDORS SNPP">ENDORS SNPP</option><option value="IOPP">IOPP</option><option value="ENDORS IOPP">ENDORS IOPP</option><option value="ISPP">ISPP</option><option value="ENDORS ISPP">ENDORS ISPP</option><option value="IAPP">IAPP</option><option value="ENDORS IAPP">ENDORS IAPP</option><option value="BALLAST WATER MANAGEMENT">BALLAST WATER MANAGEMENT</option><option value="ANTIFOULING">ANTIFOULING</option><option value="DOC">DOC</option><option value="ENDORS DOC">ENDORS DOC</option><option value="SMC">SMC</option><option value="SMC INTERMEDIATE">SMC INTERMEDIATE</option><option value="PENGESAHAN GAMBAR KAPAL">PENGESAHAN GAMBAR KAPAL</option><option value="LIFE RAFT">LIFE RAFT</option><option value="FIRE EXTINGUISHER">FIRE EXTINGUISHER</option></select></label><label>Tgl Terbit <input type="date" name="tglTerbit_${i}" class="form-control"></label><label>Masa Berlaku <input type="date" name="tglBerlaku_${i}" class="form-control"></label><label>No Sertifikat <input type="text" name="noSertifikat_${i}" class="form-control"></label><label>Kode Billing <input type="text" name="kodeBilling_${i}" class="form-control"></label></div></div></div><div class="accordion-item"><div class="accordion-header" onclick="toggleAccordion(this)"><span>3. Pemeriksa</span> <i class="fa fa-chevron-down"></i></div><div class="accordion-body"><div class="grid-form"><label>Nama Pemeriksa <select name="pemeriksa_${i}" class="form-control"><option value="">-- Pilih Pemeriksa --</option><option value="BUSTANUL ARIFIN, S.A.P.">BUSTANUL ARIFIN, S.A.P.</option><option value="HARNO SIAGIAN, A.Md">HARNO SIAGIAN, A.Md</option><option value="ANTON SUJARWADI, S.Si.T, M.M.">ANTON SUJARWADI, S.Si.T, M.M.</option></select></label></div></div></div><div class="accordion-item"><div class="accordion-header" onclick="toggleAccordion(this)"><span>4. Upload Dokumen</span> <i class="fa fa-chevron-down"></i></div><div class="accordion-body"><div class="grid-form"><label>Permohonan <input type="file" name="permohonan_${i}"></label><label>Evaluasi <input type="file" name="evaluasi_${i}"></label><label>Laporan Pemeriksaan <input type="file" name="laporan_pemeriksaan_${i}"></label><label>Sertifikat <input type="file" name="sertifikat_${i}"></label><label>Surat Tugas <input type="file" name="surat_tugas_${i}"></label><label>PNBP <input type="file" name="pnbp_${i}"></label><label>Foto/Dokumentasi <input type="file" name="foto_${i}"></label></div></div></div>`}h+=`</div></div>`;con.innerHTML+=h}}
async function handleBulkSubmit(t){const f=document.getElementById(t==='SHSK'?'formSHSK':'formSertifikasi');const c=parseInt(document.getElementById(t==='SHSK'?'bulkCountSHSK':'bulkCountSertifikasi').value);const b=document.getElementById(`btn-save-${t}`);const ot=b.innerHTML;b.innerHTML='<i class="fa fa-spinner fa-spin"></i> MEMPROSES...';b.disabled=true;showPopup("Sedang menyimpan data...","info");const it=[];const ff=t==='SHSK'?['permohonan','stkk','grosse','ukur','pnbp']:['permohonan','evaluasi','laporan_pemeriksaan','sertifikat','surat_tugas','pnbp','foto'];for(let i=1;i<=c;i++){const id={};const inps=f.querySelectorAll(`[name$="_${i}"]`);let hd=false;inps.forEach(k=>{const ky=k.name.replace(`_${i}`,'');if(k.type!=='file'){id[ky]=k.value.toUpperCase();if(ky==='namaKapal'&&k.value.trim()!=="")hd=true}});if(!hd)continue;id.files=[];for(const fld of ff){const fi=f.querySelector(`[name="${fld}_${i}"]`);if(fi&&fi.files.length>0){const fl=fi.files[0];const rd=new FileReader();await new Promise(r=>{rd.onload=e=>{id.files.push({jenis:fld,ext:fl.name.split('.').pop(),data:e.target.result});r()};rd.readAsDataURL(fl)})}}it.push(id)}if(it.length===0){showPopup("Form masih kosong!","error");b.innerHTML=ot;b.disabled=false;return}let a=t==='SHSK'?'uploadBulkSHSK':'uploadBulkSertifikasi';if(it.length===1&&it[0].noUrut){a=t==='SHSK'?'updateSHSK':'updateSertifikasi';Object.assign(it[0],{action:a});const r=await postData(it[0]);handleResponse(r,t,f,ot,b,true);return}const r=await postData({action:a,items:it});handleResponse(r,t,f,ot,b,false)}
function handleResponse(r,t,f,bt,be,ed){be.innerHTML=bt;be.disabled=false;if(r.status==="SUCCESS"){showPopup(ed?"Data Diperbarui!":"Data Berhasil Disimpan!","success");f.reset();renderBulkForm(t);if(ed)cancelEdit(t);loadData(t);updateChartFilter(currentFilter)}else{showPopup("Gagal: "+r.message,"error")}}
function editData(t,rs){const r=JSON.parse(decodeURIComponent(rs));const fi=t==='SHSK'?'formSHSK':'formSertifikasi';showSection(`${t.toLowerCase()}-input`);const cs=document.getElementById(t==='SHSK'?'bulkCountSHSK':'bulkCountSertifikasi');cs.value="1";renderBulkForm(t);const f=document.getElementById(fi);const sv=(n,v)=>{const e=f.querySelector(`[name="${n}_1"]`);if(e){if(e.type==='date')e.value=formatDateForInput(v);else e.value=v;e.disabled=true}};if(t==='SHSK'){sv('noUrut',r.NO_URUT);sv('oldFolderUrl',r.LINK_FOLDER);sv('namaKapal',r.NAMA_KAPAL);sv('tonase',r.TONASE_GT);sv('tandaPendaftaran',r.TANDA_PENDAFTARAN);sv('pemilik',r.PEMILIK);sv('tempatStkk',r.TEMPAT_STKK);sv('tglStkk',r.TANGGAL_STKK);sv('noUrutStkk',r.NO_URUT_STKK);sv('noHalStkk',r.NO_HAL_STKK);sv('noBukuStkk',r.NO_BUKU_STKK);sv('statusPengukuhan',r.STATUS_PENGUKUHAN);sv('tglPengukuhan',r.TANGGAL_PENGUKUHAN)}else{sv('noUrut',r.NO_URUT);sv('oldFolderUrl',r.LINK_FOLDER);sv('perusahaan',r.NAMA_PERUSAHAAN);sv('namaKapal',r.NAMA_KAPAL);sv('ukuran',r.UKURAN_GT);sv('callSign',r.CALL_SIGN);sv('bahan',r.BAHAN_KAPAL);sv('keterangan',r.KETERANGAN);sv('jenisSertifikat',r.JENIS_SERTIFIKAT);sv('tglTerbit',r.TANGGAL_TERBIT);sv('tglBerlaku',r.TANGGAL_MASA_BERLAKU);sv('daerahPelayaran',r.DAERAH_PELAYARAN);sv('noSertifikat',r.NOMOR_SERTIFIKAT);sv('kodeBilling',r.KODE_BILLING);sv('pemeriksa',r.NAMA_PEMERIKSA)}const ai=f.querySelectorAll('input, select');ai.forEach(i=>i.disabled=true);document.getElementById(`btn-save-${t}`).classList.add("hidden");let bu=document.getElementById(`btn-unlock-${t}`);if(!bu){const bc=document.querySelector(`#btn-container-${t}`)||f.querySelector('.form-actions');bu=document.createElement('button');bu.type='button';bu.id=`btn-unlock-${t}`;bu.className='btn-edit-mode';bu.innerHTML='<i class="fa fa-pencil-alt"></i> UBAH DATA';bu.onclick=()=>enableEditMode(t);bc.insertBefore(bu,bc.firstChild)}bu.classList.remove("hidden");document.getElementById(`btn-cancel-${t}`).classList.remove("hidden");let bup=document.getElementById(`btn-update-${t}`);if(bup)bup.classList.add("hidden");showPopup("Mode Edit (Terkunci). Klik 'Ubah Data' untuk mengedit.","info")}
function enableEditMode(t){const f=document.getElementById(t==='SHSK'?'formSHSK':'formSertifikasi');const ai=f.querySelectorAll('input, select');ai.forEach(i=>i.disabled=false);document.getElementById(`btn-unlock-${t}`).classList.add("hidden");let bup=document.getElementById(`btn-update-${t}`);if(!bup){const bc=document.querySelector(`#btn-container-${t}`)||f.querySelector('.form-actions');bup=document.createElement('button');bup.id=`btn-update-${t}`;bup.className='btn-gold-save';bup.style.background='var(--neon-blue)';bup.innerHTML='<i class="fa fa-save"></i> SIMPAN PERUBAHAN';bup.onclick=()=>handleBulkSubmit(t);bc.insertBefore(bup,bc.firstChild)}bup.classList.remove("hidden");showPopup("Form Terbuka. Silakan edit.","success")}
function cancelEdit(t){const f=document.getElementById(t==='SHSK'?'formSHSK':'formSertifikasi');f.reset();renderBulkForm(t);document.getElementById(`btn-save-${t}`).classList.remove("hidden");document.getElementById(`btn-cancel-${t}`).classList.add("hidden");const bu=document.getElementById(`btn-unlock-${t}`);if(bu)bu.classList.add("hidden");const bup=document.getElementById(`btn-update-${t}`);if(bup)bup.classList.add("hidden");showSection(`${t.toLowerCase()}-data`)}
async function exportTriple(t){const b=event.currentTarget;const oh=b.innerHTML;b.innerHTML='<i class="fa fa-spinner fa-spin"></i> Processing...';b.disabled=true;showPopup("Menyiapkan 3 File Laporan...","info");const f={};if(t==='SHSK'){f.bulan=document.getElementById('filterSHSKBulan').value;f.tahun=document.getElementById('filterSHSKTahun').value;f.search=document.getElementById('searchSHSK').value}else{f.bulan=document.getElementById('filterSertBulan').value;f.tahun=document.getElementById('filterSertTahun').value;f.jenis=document.getElementById('filterSertJenis').value;f.daerah=document.getElementById('filterSertDaerah').value;f.search=document.getElementById('searchSertifikasi').value}try{const r=await postData({action:"exportTripleFile",type:t,filters:f});if(r.status==="SUCCESS"&&r.files){showPopup("Laporan Siap! Mengunduh...","success");r.files.forEach(x=>{if(x.url)window.open(x.url,'_blank')})}else{showPopup(r.message||"Gagal export","error")}}catch(e){showPopup("Gagal koneksi","error")}b.innerHTML=oh;b.disabled=false}
let rawData={SHSK:[],SERTIFIKASI:[]};let filteredData={SHSK:[],SERTIFIKASI:[]};let currentPage={SHSK:1,SERTIFIKASI:1};const ROWS_PER_PAGE=10;async function loadData(t){const tb=document.getElementById(t==="SHSK"?"tbody-shsk":"tbody-sertifikasi");tb.innerHTML='<tr><td colspan="16" style="text-align:center;">Sedang Memuat Data...</td></tr>';const r=await postData({action:t==="SHSK"?"getDataSHSK":"getDataSertifikasi"});if(r.status==="SUCCESS"){rawData[t]=r.data.reverse();filteredData[t]=rawData[t];currentPage[t]=1;renderTable(t);if(t==='SERTIFIKASI')populateFilterOptions(rawData[t])}else{tb.innerHTML=`<tr><td colspan="16" style="text-align:center;color:red">${r.message}</td></tr>`}}function populateFilterOptions(d){const s=document.getElementById('filterSertJenis');if(!s)return;const u=[...new Set(d.map(i=>i.JENIS_SERTIFIKAT))].filter(Boolean).sort();let h='<option value="">Semua Jenis</option>';u.forEach(t=>h+=`<option value="${t}">${t}</option>`);s.innerHTML=h}function applyFilter(t){const f={};if(t==='SHSK'){f.bulan=document.getElementById('filterSHSKBulan').value;f.tahun=document.getElementById('filterSHSKTahun').value;f.search=document.getElementById('searchSHSK').value.toUpperCase()}else{f.bulan=document.getElementById('filterSertBulan').value;f.tahun=document.getElementById('filterSertTahun').value;f.jenis=document.getElementById('filterSertJenis').value;f.daerah=document.getElementById('filterSertDaerah').value.toUpperCase();f.search=document.getElementById('searchSertifikasi').value.toUpperCase()}filteredData[t]=rawData[t].filter(r=>{let p=true;const ds=t==='SHSK'?r['TANGGAL_PENGUKUHAN']:r['TANGGAL_TERBIT'];const d=new Date(ds);if(f.tahun&&d.getFullYear().toString()!==f.tahun)p=false;if(f.bulan&&(d.getMonth()+1).toString()!==f.bulan)p=false;if(t==='SERTIFIKASI'){if(f.jenis&&r['JENIS_SERTIFIKAT']!==f.jenis)p=false;if(f.daerah&&!String(r['DAERAH_PELAYARAN']).toUpperCase().includes(f.daerah))p=false}if(f.search){const rt=Object.values(r).join(" ").toUpperCase();if(!rt.includes(f.search))p=false}return p});currentPage[t]=1;renderTable(t);showPopup(`Filter diterapkan: ${filteredData[t].length} data ditemukan.`,"info")}function renderTable(t){const tb=document.getElementById(t==="SHSK"?"tbody-shsk":"tbody-sertifikasi");tb.innerHTML="";const st=(currentPage[t]-1)*ROWS_PER_PAGE;const pd=filteredData[t].slice(st,st+ROWS_PER_PAGE);if(pd.length===0){tb.innerHTML='<tr><td colspan="16" style="text-align:center;">Data Tidak Ditemukan</td></tr>';return}pd.forEach((r,i)=>{const rs=encodeURIComponent(JSON.stringify(r));let tr=`<tr><td>${st+i+1}</td>`;if(t==="SHSK"){tr+=`<td>${r["NAMA_KAPAL"]}</td><td>${r["TONASE_GT"]}</td><td>${r["TANDA_PENDAFTARAN"]}</td><td>${r["PEMILIK"]}</td><td>${r["TEMPAT_STKK"]}</td><td>${formatDate(r["TANGGAL_STKK"])}</td><td>${r["NO_URUT_STKK"]}</td><td>${r["NO_HAL_STKK"]}</td><td>${r["NO_BUKU_STKK"]}</td><td>${r["STATUS_PENGUKUHAN"]}</td><td>${formatDate(r["TANGGAL_PENGUKUHAN"])}</td>`}else{tr+=`<td>${r["NAMA_PERUSAHAAN"]}</td><td>${r["NAMA_KAPAL"]}</td><td>${r["UKURAN_GT"]}</td><td>${r["CALL_SIGN"]}</td><td>${r["BAHAN_KAPAL"]}</td><td>${r["KETERANGAN"]}</td><td>${r["JENIS_SERTIFIKAT"]}</td><td>${formatDate(r["TANGGAL_TERBIT"])}</td><td>${formatDate(r["TANGGAL_MASA_BERLAKU"])}</td><td>${r["DAERAH_PELAYARAN"]||"-"}</td><td>${r["NOMOR_SERTIFIKAT"]}</td><td>${r["KODE_BILLING"]}</td><td>${r["NAMA_PEMERIKSA"]}</td>`}tr+=`<td><div style="display:flex;justify-content:center;gap:5px;"><button class="btn-act btn-view" onclick="window.open('${r["LINK_FOLDER"]}','_blank')"><i class="fa fa-folder-open"></i></button><button class="btn-act btn-edit" onclick="editData('${t}','${rs}')"><i class="fa fa-pencil-alt"></i></button><button class="btn-act btn-del" onclick="prepareDelete('${t}','${rs}')"><i class="fa fa-trash"></i></button></div></td></tr>`;tb.innerHTML+=tr});document.getElementById(`page-info-${t}`).innerText=`Hal ${currentPage[t]}`}function prevPage(t){if(currentPage[t]>1){currentPage[t]--;renderTable(t)}}function nextPage(t){if(currentPage[t]*ROWS_PER_PAGE<filteredData[t].length){currentPage[t]++;renderTable(t)}}let pendingDelete=null;function prepareDelete(t,s){const r=JSON.parse(decodeURIComponent(s));pendingDelete={type:t,noUrut:r.NO_URUT||r["NO URUT"]};document.getElementById("modal-delete").classList.remove("hidden")}function closeDeleteModal(){document.getElementById("modal-delete").classList.add("hidden")}async function executeDelete(){if(!pendingDelete)return;await postData({action:pendingDelete.type==="SHSK"?"deleteSHSK":"deleteSertifikasi",noUrut:pendingDelete.noUrut});closeDeleteModal();loadData(pendingDelete.type)}
let pFiles=[];function initPenggunaDashboard(){const u=JSON.parse(localStorage.getItem("user"));if(!u){window.location.href="index.html";return}if(document.getElementById("nav-user-name"))document.getElementById("nav-user-name").innerText=u.nama;if(document.getElementById("nav-company-name"))document.getElementById("nav-company-name").innerText=u.extra||"PERUSAHAAN";if(document.getElementById("mob-user-name"))document.getElementById("mob-user-name").innerText=u.nama;if(document.getElementById("mob-company-name"))document.getElementById("mob-company-name").innerText=u.extra||"PERUSAHAAN";if(document.getElementById("email-display-text"))document.getElementById("email-display-text").innerText=u.id;fetchPenggunaFiles(u.extra)}async function fetchPenggunaFiles(c){const r=await postData({action:"getDropdownData",perusahaan:c});if(r.status==="SUCCESS"){pFiles=r.data;populateYear()}}function populateYear(){const s=document.getElementById("reqTahun");const y=[...new Set(pFiles.map(i=>i.tahun))].sort().reverse();s.innerHTML='<option value="">-- Pilih --</option>';y.forEach(v=>{if(v)s.innerHTML+=`<option value="${v}">${v}</option>`})}window.filterMonth=function(){const y=document.getElementById("reqTahun").value;const s=document.getElementById("reqBulan");s.innerHTML='<option value="">-- Pilih --</option>';if(!y)return;const m=[...new Set(pFiles.filter(i=>i.tahun==y).map(i=>i.bulan))].sort((a,b)=>a-b);m.forEach(v=>s.innerHTML+=`<option value="${v}">${getMonthName(v)}</option>`);s.disabled=false}window.filterShip=function(){const y=document.getElementById("reqTahun").value;const m=document.getElementById("reqBulan").value;const s=document.getElementById("reqKapal");s.innerHTML='<option value="">-- Pilih --</option>';if(!m)return;const ships=[...new Set(pFiles.filter(i=>i.tahun==y&&i.bulan==m).map(i=>i.kapal))];ships.forEach(v=>s.innerHTML+=`<option value="${v}">${v}</option>`);s.disabled=false}window.filterType=function(){const y=document.getElementById("reqTahun").value;const m=document.getElementById("reqBulan").value;const sh=document.getElementById("reqKapal").value;const s=document.getElementById("reqJenis");s.innerHTML='<option value="">-- Pilih Dokumen --</option>';if(!sh)return;const docs=pFiles.filter(i=>i.tahun==y&&i.bulan==m&&i.kapal==sh);docs.forEach(v=>s.innerHTML+=`<option value="${v.link}">${v.jenis}</option>`);s.disabled=false}window.handleRequestSubmit=async function(e){e.preventDefault();const s=document.getElementById("reqJenis");const opts=Array.from(s.selectedOptions);if(opts.length===0){alert("Pilih dokumen!");return}const t=opts.map(o=>o.text);const l=s.value;const u=JSON.parse(localStorage.getItem("user"));document.getElementById("btnKirimReq").innerText="MENGIRIM...";await postData({action:"sendReportEmail",email:u.id,namaUser:u.nama,perusahaan:u.extra,kapal:document.getElementById("reqKapal").value,jenis:t,tahun:document.getElementById("reqTahun").value,bulan:getMonthName(document.getElementById("reqBulan").value),link:l});showPopup("Terkirim!","success");document.getElementById("btnKirimReq").innerText="KIRIM DOKUMEN"}
function getMonthName(i){const m=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];return m[i-1]||i}
