// ======================================================
// 🔐 PROTECȚIE LOGIN – doar supervizorul poate intra
// ======================================================
const user = JSON.parse(localStorage.getItem("currentUser"));
const token = localStorage.getItem("authToken");

if (!token || !user || user.tip !== "supervizor") {
    window.location.href = "index.html";
}

// ======================================================
// REINCARCARE PE PAGINA CURENTA
// ======================================================
window.addEventListener("DOMContentLoaded", () => {
    const lastPage = localStorage.getItem("lastSupervisorPage") || "inventariere";

    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById("page-" + lastPage).classList.add("active");

    // dacă pagina restaurată e mapare sau demapare → încărcăm tabelul
    if (lastPage === "mapare") applyFilters();
    if (lastPage === "demapare") loadDemapareTable();
});



// ======================================================
// 🔄 VARIABILE GLOBALE
// ======================================================
let ariiCache = [];
let filteredArii = [];
let currentPage = 1;
let pageSize = 20;


// ======================================================
// 📌 BUTOANE MENIU – schimbă paginile
// ======================================================
document.querySelectorAll(".menu-btn").forEach(btn => {
    btn.addEventListener("click", () => {

        const pageName = btn.dataset.page;

        // 🔥 Redirect supervizor → scanator (inventariere)
        if (pageName === "inventariere") {
            window.location.href = "dashboard_scanator.html";
            return;
        }

        // 🔥 Salvăm pagina curentă, astfel încât la refresh să rămână deschisă
        localStorage.setItem("lastSupervisorPage", pageName);

        // 🔥 Schimbăm pagina activă
        document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
        document.getElementById("page-" + pageName).classList.add("active");

        // 🔥 Când intrăm pe pagina MAPARE → reafișăm tabelul
        if (pageName === "mapare") {
            applyFilters(); 
        }

        // 🔥 Când intrăm pe DEMAPARE → încărcăm tabelul de arii demapate
        if (pageName === "demapare") {
            loadDemapareTable();
        }

        // 🔥 Când intrăm pe STATISTICI → încărcăm graficele
        if (pageName === "stats") {
            loadStats();
        }
    });
});

// =============================
// RESTAURARE PAGINĂ LA REFRESH
// =============================
window.addEventListener("DOMContentLoaded", () => {
    let lastPage = localStorage.getItem("lastSupervisorPage");

    // dacă nu există nimic salvat → default pagina de inventariere
    if (!lastPage) lastPage = "inventariere";

    // ascundem toate paginile
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));

    // afișăm pagina salvată
    const activePage = document.getElementById("page-" + lastPage);
    if (activePage) activePage.classList.add("active");

    // încărcăm automat componentele aferente paginii
    if (lastPage === "mapare") applyFilters();
    if (lastPage === "demapare") loadDemapareTable();
    if (lastPage === "stats") loadStats();
});


// ======================================================
// 🚪 LOGOUT
// ======================================================
document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    window.location.href = "index.html";
});


// ======================================================
// 🗂 ADĂUGARE INTERVAL DE ARII
// ======================================================
document.getElementById("btnAddArie").addEventListener("click", async () => {
    const start = parseInt(document.getElementById("codStart").value);
    const end = parseInt(document.getElementById("codEnd").value);
    const tip = document.getElementById("tipArie").value;

    if (isNaN(start) || isNaN(end)) {
        alert("Introduceți un interval valid!");
        return;
    }
    if (start > end) {
        alert("Start nu poate fi mai mare decât End.");
        return;
    }

    const payload = { start, end, tip };

    try {
        const resp = await fetch("https://recisrlmicro.onrender.com/api/arii/add-interval", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload)
        });

        alert(await resp.text());

        // 🔥 reîncarcă ariile după mapare
        await loadArii();
        applyFilters(); // dacă sunt pe mapare
        loadDemapareTable(); // dacă sunt pe demapare

    } catch (err) {
        alert("Eroare la mapare!");
        console.error(err);
    }
});


// ======================================================
// 📥 ÎNCĂRCARE ARII DIN BACKEND
// ======================================================
async function loadArii() {
    try {
        const r = await fetch("https://recisrlmicro.onrender.com/api/arii");
        ariiCache = await r.json();

        applyFilters();  // pentru pagina de mapare
        
        // 👇 dacă deja ne aflăm pe pagina de demapare, reîncarcă tabelul
        if (document.getElementById("page-demapare").classList.contains("active")) {
            loadDemapareTable();
        }

    } catch (e) {
        console.error(e);
        alert("Nu s-au putut încărca ariile!");
    }
}



// ======================================================
// 🔎 FILTRARE + STATUS REAL
// ======================================================
function applyFilters() {
    const cod = document.getElementById("filterCod").value.trim().toLowerCase();
    const tip = document.getElementById("filterTip").value;
    const status = document.getElementById("filterStatus").value;

    let processed = ariiCache.map(a => {
        let realStatus = a.status;

        if (realStatus === "MAPATA" && a.cantitate === 0)
            realStatus = "INITIAL";

        if (realStatus === "DEMAPATA" && a.cantitate > 0)
            realStatus = "NOTOK";

        return { ...a, realStatus };
    });

    filteredArii = processed.filter(a =>
        (cod === "" || a.cod.toLowerCase().includes(cod)) &&
        (tip === "" || a.tip === tip) &&
        (status === "" || a.realStatus === status)
    );

    currentPage = 1;
    renderPage();
}


// ======================================================
// 📄 RANDARE PAGINĂ TABEL
// ======================================================
function renderPage() {
    const tbody = document.getElementById("ariiTable");
    tbody.innerHTML = "";

    let start = (currentPage - 1) * pageSize;
    let end = start + pageSize;
    let pageItems = filteredArii.slice(start, end);

    pageItems.forEach(a => {
        tbody.innerHTML += `
            <tr>
                <td>${a.cod}</td>
                <td>${a.tip}</td>
                <td>${a.scanator ?? "-"}</td>
                <td>${a.cantitate}</td>
                <td>
                    <span class="status-badge status-${a.realStatus.toLowerCase()}">
                        ${a.realStatus}
                    </span>
                </td>
            </tr>
        `;
    });

    const totalPages = Math.ceil(filteredArii.length / pageSize);
    document.getElementById("pageInfo").textContent =
        `Pagina ${currentPage} / ${totalPages}`;

    document.getElementById("prevPage").disabled = currentPage === 1;
    document.getElementById("nextPage").disabled = currentPage >= totalPages;
}


// ======================================================
// ⏪⏩ PAGINARE
// ======================================================
document.getElementById("prevPage").addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        renderPage();
    }
});

document.getElementById("nextPage").addEventListener("click", () => {
    const totalPages = Math.ceil(filteredArii.length / pageSize);
    if (currentPage < totalPages) {
        currentPage++;
        renderPage();
    }
});

document.getElementById("pageSize").addEventListener("change", e => {
    pageSize = parseInt(e.target.value);
    currentPage = 1;
    renderPage();
});


// ======================================================
// 📱 SIDEBAR RESPONSIVE
// ======================================================
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");

if (window.innerWidth < 900) {
    sidebar.classList.add("hidden");
}

menuToggle.onclick = () => {
    sidebar.classList.toggle("hidden");
    sidebar.classList.toggle("show");
};


// ======================================================
// ⏱️ INITIALIZARE
// ======================================================
document.getElementById("filterCod").addEventListener("input", applyFilters);
document.getElementById("filterTip").addEventListener("change", applyFilters);
document.getElementById("filterStatus").addEventListener("change", applyFilters);


document.getElementById("btnDemapare").addEventListener("click", async () => {
    const start = parseInt(document.getElementById("demStart").value);
    const end = parseInt(document.getElementById("demEnd").value);

    if (isNaN(start) || isNaN(end)) {
        alert("Introduceți interval valid!");
        return;
    }

    const payload = { start, end };

    const r = await fetch("https://recisrlmicro.onrender.com/api/arii/demapare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    alert(await r.text());
    loadArii();
});


document.getElementById("demFilterCod").addEventListener("input", loadDemapareTable);
document.getElementById("demFilterTip").addEventListener("change", loadDemapareTable);
document.getElementById("demFilterStatus").addEventListener("change", loadDemapareTable);

function loadDemapareTable() {
    const cod = demFilterCod.value.trim().toLowerCase();
    const tip = demFilterTip.value;
    const status = demFilterStatus.value;

    const tbody = document.getElementById("demapareTable");
    tbody.innerHTML = "";

    let processed = ariiCache.map(a => {
        let realStatus = a.status;

        if (realStatus === "DEMAPATA" && a.cantitate > 0)
            realStatus = "NOTOK";

        return { ...a, realStatus };
    });

    let filtered = processed.filter(a =>
        (a.status === "DEMAPATA" || a.realStatus === "NOTOK") &&
        (cod === "" || a.cod.toLowerCase().includes(cod)) &&
        (tip === "" || a.tip === tip) &&
        (status === "" || a.realStatus === status)
    );

    filtered.forEach(a => {
        tbody.innerHTML += `
            <tr>
                <td>${a.cod}</td>
                <td>${a.tip}</td>
                <td>${a.scanator ?? "-"}</td>
                <td>${a.cantitate}</td>
                <td>
                    <span class="status-badge status-${a.realStatus.toLowerCase()}">
                        ${a.realStatus}
                    </span>
                </td>
            </tr>
        `;
    });
}


document.querySelectorAll(".menu-btn").forEach(btn => {
    btn.addEventListener("click", () => {

        if (btn.dataset.page === "inventariere") {
            window.location.href = "dashboard_scanator.html";
            return;
        }

        // SALVĂM PAGINA CURENTĂ
        localStorage.setItem("lastSupervisorPage", btn.dataset.page);

        document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
        const page = document.getElementById("page-" + btn.dataset.page);
        page.classList.add("active");

        if (btn.dataset.page === "demapare") {
            loadDemapareTable();
        }
        if (btn.dataset.page === "mapare") {
            applyFilters();
        }
    });
});

let pieChart, barChart;

async function loadStats() {
    // 1️⃣ estimarea totalului de produse
    const statsConfig = await fetch("stats.json").then(r => r.json());
    const estimatedTotal = Number(statsConfig.totalProduseEstimate) || 0;

    // 2️⃣ statistici reale din backend
    const backendStats = await fetch("https://recisrlmicro.onrender.com/api/arii/stats")
        .then(r => r.json());

    const {
        totalArii,
        initiale,
        mapate,
        scannedOk,
        demapate,
        notOk,
        totalProduseScanate
    } = backendStats;

    const scanate = Number(totalProduseScanate) || 0;

    // 3️⃣ calcul corect pentru ARII (fără demapate!)
    const totalAriiRelevante = Number(initiale) + Number(scannedOk) + demapate;

    const progresAriiCount = Number(scannedOk) + Number(demapate) - Number(notOk);
    const ramaseAriiCount  = Number(initiale) + Number(notOk);

    const pctScanateArii = totalAriiRelevante > 0
        ? ((progresAriiCount / totalAriiRelevante) * 100).toFixed(2)
        : "0.00";

    const pctRamaseArii = totalAriiRelevante > 0
        ? ((ramaseAriiCount / totalAriiRelevante) * 100).toFixed(2)
        : "0.00";

    // 4️⃣ actualizăm UI – ARII
    document.getElementById("statTotalArii").textContent    = totalAriiRelevante;
    document.getElementById("statScanOk").textContent       = scannedOk;
    document.getElementById("statInitiale").textContent     = initiale;
    document.getElementById("statDemapate").textContent     = demapate;
    document.getElementById("statNotOk").textContent        = notOk;

    const elPctOk = document.getElementById("statAriiScanatePct");
    if (elPctOk) elPctOk.textContent = pctScanateArii;

    const elPctRamase = document.getElementById("statAriiRamasePct");
    if (elPctRamase) elPctRamase.textContent = pctRamaseArii;

    // 5️⃣ Produse – fără plafon 100%
    let progress = estimatedTotal > 0
        ? (scanate / estimatedTotal) * 100
        : 0;

    const progressRounded = Number(progress.toFixed(2));

    document.getElementById("statProdScanate").textContent  = scanate;
    document.getElementById("statProdEstimate").textContent = estimatedTotal;
    document.getElementById("statProdProgress").textContent = progressRounded;

    const fill = document.getElementById("progressFill");
    if (fill) {
        const fillWidth = Math.max(0, Math.min(progressRounded, 100));
        fill.style.width = fillWidth + "%";
    }

    // 6️⃣ grafice
    renderCharts(
        { initiale, scannedOk, demapate, notOk },
        progressRounded,
        scanate,
        estimatedTotal
    );
}



function renderCharts(areaStats, progressPercent, scanate, estimate) {
    const ctxPie = document.getElementById("pieArii").getContext("2d");
    const ctxBar = document.getElementById("barProduse").getContext("2d");

    if (pieChart) pieChart.destroy();
    if (barChart) barChart.destroy();

    // === PIE: starea ariilor ===
    pieChart = new Chart(ctxPie, {
        type: "pie",
        data: {
            labels: ["Scanate OK", "Inițiale", "Demapate", "Not OK"],
            datasets: [{
                data: [
                    areaStats.scannedOk,
                    areaStats.initiale,
                    areaStats.demapate,
                    areaStats.notOk
                ],
                backgroundColor: [
                    "#16a34a", // OK
                    "#facc15", // INITIAL
                    "#e11d48", // DEMAPATA
                    "#f97316"  // NOTOK
                ],
                borderWidth: 2,
                borderColor: "#ffffff"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: window.innerWidth < 768 ? "bottom" : "right",
                    labels: {
                        padding: 14,
                        font: {
                            size: window.innerWidth < 768 ? 11 : 14
                        }
                    }
                }
            },
            animation: {
                duration: 900,
                easing: "easeOutQuart"
            }
        }
    });

    // === BAR: progres inventariere (poate fi > 100%) ===
    // alegem o axă Y adaptivă: minim 100, dar crește dacă progresul e mare
    const maxY = Math.max(100, Math.ceil(progressPercent / 50) * 50 || 100);

    barChart = new Chart(ctxBar, {
        type: "bar",
        data: {
            labels: ["Progres inventariere (%)"],
            datasets: [{
                data: [progressPercent],
                backgroundColor: "#2563eb",
                borderRadius: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: maxY,
                    grid: { color: "#e5e7eb" },
                    ticks: {
                        callback: value => value + "%"
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => ctx.parsed.y.toFixed(2) + "%"
                    }
                }
            },
            animation: {
                duration: 800,
                easing: "easeOutBack"
            }
        }
    });
}

// opțional: pe resize refacem DOAR chart-urile, nu mai refacem fetch-urile
window.addEventListener("resize", () => {
    if (document.getElementById("page-stats").classList.contains("active")) {
        loadStats();
    }
});



// ===========================
// ⭐ DETALII ARIE
// ===========================
const arieInput = document.getElementById("arieInput");

arieInput.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;

    const text = arieInput.value.trim();
    arieInput.value = "";

    if (!text) return;

    const cod = text.replace("--", "");

    await loadArieDetails(cod);
});


// ===========================
// 📌 FUNCȚIE PRINCIPALĂ
// ===========================
async function loadArieDetails(cod) {
    try {
        // 1️⃣ validăm aria
        const checkResp = await fetch(`https://recisrlmicro.onrender.com/api/arii/check/${cod}`);
        const arieData = await checkResp.json();

        if (arieData.status === "INVALID") {
            alert("Arie inexistentă!");
            return;
        }

        const arieId = arieData.id;

        // 2️⃣ luăm toate ariile ca să aflăm tipul & detalii
        const allArii = await fetch("https://recisrlmicro.onrender.com/api/arii").then(r => r.json());
        const aria = allArii.find(a => a.id === arieId);

        if (!aria) {
            alert("Aria a fost găsită în check(), dar nu apare în lista completă.");
            return;
        }

        // afișăm info arie
        document.getElementById("dArieCod").textContent = aria.cod;
        document.getElementById("dArieTip").textContent = aria.tip;
        document.getElementById("dArieScanator").textContent = aria.scanator ?? "-";
        document.getElementById("dArieTotalCant").textContent = aria.cantitate ?? 0;

        document.getElementById("arieInfo").style.display = "block";

        // 3️⃣ luăm scanările grupate
        const grouped = await fetch(`https://recisrlmicro.onrender.com/api/scanari/arie/${arieId}/grouped`)
            .then(r => r.json());

        const tbody = document.getElementById("arieScanariTable");
        tbody.innerHTML = "";

        grouped.forEach(row => {
            tbody.innerHTML += `
                <tr>
                    <td>${row.cod}</td>
                    <td>${row.denumire}</td>
                    <td>${row.cantitate}</td>
                </tr>
            `;
        });

        document.getElementById("arieListaScanari").style.display = "block";

    } catch (error) {
        console.error("Eroare detalii arie:", error);
        alert("Eroare la preluarea detaliilor ariei.");
    }
}


loadArii();
