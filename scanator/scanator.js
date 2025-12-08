// =========================
// PROTECȚIE LOGIN + ROL
// =========================
const user = JSON.parse(localStorage.getItem("currentUser"));
const token = localStorage.getItem("authToken");

if (!token || !user || (user.tip !== "scanator" && user.tip !== "supervizor")) {
    window.location.href = "index.html";
}

document.getElementById("userDisplay").textContent =
    "Conectat ca: " + user.nume;


// =========================
// VARIABILE GLOBALE
// =========================
let nomenclator = [];
let scanariCurente = [];
let currentPage = 1;
let listaAfisata = [];
const itemsPerPage = 5;

let currentArieId = localStorage.getItem("arieId")
    ? parseInt(localStorage.getItem("arieId"))
    : null;

const zonaStatus = document.getElementById("zonaStatus");
const scanInput = document.getElementById("scanInput");
const scanModeSelect = document.getElementById("scanMode");
const viewModeSelect = document.getElementById("viewMode");
const logoutBtn = document.getElementById("logoutBtn");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");
const istoricBody = document.getElementById("istoricBody");
const clearZoneBtn = document.getElementById("clearZoneBtn");


// =========================
// AFIȘARE ZONA CURENTĂ
// =========================
function updateZonaDisplay() {
    const zona = localStorage.getItem("zonaCurenta");
    zonaStatus.textContent = "Zona: " + (zona || "neselectată");
}
updateZonaDisplay();


// =========================
// ÎNCĂRCARE NOMENCLATOR
// =========================
document.getElementById("loadingPopup").style.display = "flex";

fetch("http://localhost:8081/api/nomenclator/all")
    .then(r => r.json())
    .then(data => {
        nomenclator = data;

        document.getElementById("loadingPopup").style.display = "none";
        const loadedMsg = document.getElementById("loadedMessage");
        loadedMsg.style.display = "block";
        setTimeout(() => (loadedMsg.style.display = "none"), 2000);
    })
    .catch(err => {
        document.getElementById("loadingPopup").style.display = "none";
        alert("Eroare la încărcarea nomenclatorului!");
        console.error(err);
    });


// =========================
// ÎNCĂRCARE SCANĂRI DIN DB
// =========================
async function loadScanariPentruArie() {
    if (!currentArieId) {
        scanariCurente = [];
        renderIstoric();
        return;
    }

    try {
        const r = await fetch(`http://localhost:8081/api/scanari/arie/${currentArieId}`);
        scanariCurente = await r.json();
    } catch (err) {
        console.error(err);
        alert("Eroare la încărcarea scanărilor din baza de date!");
        scanariCurente = [];
    }

    renderIstoric();
}


// =========================
// RENDER ISTORIC + PAGINARE
// =========================
function renderIstoric() {
    const zona = localStorage.getItem("zonaCurenta");
    const viewMode = viewModeSelect.value;

    istoricBody.innerHTML = "";
    pageInfo.textContent = "";

    if (!zona || !currentArieId) {
        istoricBody.innerHTML = `
            <tr><td colspan="4" style="text-align:center;">Nicio zonă selectată</td></tr>`;
        return;
    }

    if (scanariCurente.length === 0) {
        istoricBody.innerHTML = `
            <tr><td colspan="4" style="text-align:center;">Nicio scanare în zona ${zona}</td></tr>`;
        return;
    }

    const sortate = [...scanariCurente].sort(
        (a, b) => b.timestamp - a.timestamp
    );

    if (viewMode === "normal") {
        listaAfisata = sortate;
    } else {
        const grupate = {};
        sortate.forEach(item => {
            if (!grupate[item.cod]) {
                grupate[item.cod] = {
                    cod: item.cod,
                    denumire: item.denumire,
                    cantitate: 0,
                    ultimaData: item.timestamp
                };
            }

            grupate[item.cod].cantitate += item.cantitate;

            if (item.timestamp > grupate[item.cod].ultimaData) {
                grupate[item.cod].ultimaData = item.timestamp;
            }
        });

        listaAfisata = Object.values(grupate).sort(
            (a, b) => b.ultimaData - a.ultimaData
        );
    }

    const totalPages = Math.ceil(listaAfisata.length / itemsPerPage) || 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;

    listaAfisata.slice(start, end).forEach(item => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${item.cod}</td>
            <td>${item.denumire}</td>
            <td class="qty-cell">${item.cantitate}</td>
        `;
        istoricBody.appendChild(row);
    });

    pageInfo.textContent = `Pagina ${currentPage} / ${totalPages}`;
}


// =========================
// VALIDARE ARIE
// =========================
async function seteazaZona(text) {
    const codArie = text.replace("--", "");

    try {
        const r = await fetch(`http://localhost:8081/api/arii/check/${codArie}`);
        const data = await r.json();

        if (data.status === "INVALID") return alert("⛔ Arie invalidă!");
        if (data.status === "DEMAPATA") return alert("❌ Arie demapate!");

        if (data.scanator && data.scanator !== user.nume) {
            return alert(`⚠ Aria este începută deja de: ${data.scanator}`);
        }

        localStorage.setItem("zonaCurenta", text);
        localStorage.setItem("arieId", data.id);
        currentArieId = data.id;

        updateZonaDisplay();
        currentPage = 1;

        await loadScanariPentruArie();
        alert("Zonă validată: " + text);

    } catch (err) {
        console.error(err);
        alert("Eroare la validarea ariei.");
    }
}


// =========================
// SALVARE PRODUS ÎN BACKEND
// =========================
async function salveazaProdus(cod, cantitate) {
    if (!currentArieId) {
        alert("Trebuie să scanați mai întâi o zonă (ex: --100)");
        return;
    }

    if (!/^\d{13}$/.test(cod)) {
        alert("Cod invalid! Trebuie EXACT 13 cifre.");
        return;
    }

    const produs = nomenclator.find(p => p.cod === cod);
    if (!produs) {
        alert("Cod INEXISTENT în nomenclator: " + cod);
        return;
    }

    // Cantitate existentă pe cod (din scanările curente)
    const cantitateExistenta = scanariCurente
        .filter(s => s.cod === cod)
        .reduce((s, x) => s + x.cantitate, 0);

    if (cantitateExistenta + cantitate < 0) {
        alert("Cantitatea cumulată nu poate deveni negativă!");
        return;
    }

    // ================================
    // 1️⃣ UPDATE INSTANT ÎN UI
    // ================================
    const fakeScan = {
        cod: cod,
        denumire: produs.denumire,
        cantitate: cantitate,
        timestamp: new Date().toISOString()
    };

    scanariCurente.unshift(fakeScan); // adaugă la început
    renderIstoric();                  // actualizare imediată


    // ================================
    // 2️⃣ TRIMITEM REAL CĂTRE SERVER
    // ================================
    const payload = {
        arieId: currentArieId,
        cod: cod,
        denumire: produs.denumire,
        cantitate: cantitate,
        userNume: user.nume
    };

    try {
        const r = await fetch("http://localhost:8081/api/scanari/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!r.ok) {
            alert("Eroare la salvarea în server!");
            // opțional: remove fake scan if server fails
            return;
        }

        // ================================
        // 3️⃣ SINCRONIZARE CU SERVER
        // ================================
        await loadScanariPentruArie();

    } catch (err) {
        console.error(err);
        alert("Server offline sau eroare de rețea!");
    }
}


// =========================
// SCANARE PE ENTER
// =========================
scanInput.addEventListener("keydown", async function (e) {
    if (e.key !== "Enter") return;

    const text = scanInput.value.trim();
    scanInput.value = "";

    if (!text) return;

    // scanare arie
    if (text.startsWith("--")) return await seteazaZona(text);

    if (!currentArieId) {
        alert("Scanați o zonă înainte!");
        return;
    }

    if (scanModeSelect.value === "individual") {
        await salveazaProdus(text, 1);
    } else {
        let cant = prompt("Introduceți cantitatea:");
        if (cant === null) return;
        cant = parseInt(cant);

        if (isNaN(cant)) return alert("Cantitate invalidă");

        await salveazaProdus(text, cant);
    }
});


// =========================
// PAGINARE
// =========================
prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        renderIstoric();
    }
});

nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(listaAfisata.length / itemsPerPage) || 1;
    if (currentPage < totalPages) {
        currentPage++;
        renderIstoric();
    }
});

viewModeSelect.addEventListener("change", () => {
    currentPage = 1;
    renderIstoric();
});


// =========================
// CLEAR ZONĂ
// =========================
clearZoneBtn.addEventListener("click", () => {
    localStorage.removeItem("zonaCurenta");
    localStorage.removeItem("arieId");

    currentArieId = null;
    scanariCurente = [];
    currentPage = 1;

    updateZonaDisplay();
    renderIstoric();

    scanInput.focus();
});


// =========================
// LOGOUT
// =========================
logoutBtn.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "index.html";
});


// =========================
// INIT
// =========================
(async function init() {
    if (currentArieId && localStorage.getItem("zonaCurenta")) {
        await loadScanariPentruArie();
    } else {
        renderIstoric();
    }

    scanInput.focus();
})();


document.addEventListener("DOMContentLoaded", () => {
  const deleteBtn = document.getElementById("deleteAreaBtn");
  const zonaStatus = document.getElementById("zonaStatus");
  const istoricBody = document.getElementById("istoricBody");

  deleteBtn.addEventListener("click", async () => {
    const zonaText = zonaStatus.textContent.trim();
    const zonaCurenta = zonaText.replace("Zona:", "").trim();

    if (!zonaCurenta || zonaCurenta === "neselectată") {
      alert("Nu este selectată nicio zonă.");
      return;
    }

    // ✅ Ceri parola utilizatorului
    const parola = prompt("Introdu parola pentru ștergere (cod 3919):");
    if (parola === null) return; // utilizatorul a apăsat „Cancel”

    if (parola.trim() !== "3919") {
      alert("Parolă incorectă. Ștergerea a fost anulată.");
      return;
    }

    // confirmare finală
    const confirmare = confirm(`Sigur dorești să ștergi toate produsele din zona "${zonaCurenta}"?`);
    if (!confirmare) return;

    try {
      document.getElementById("loadingPopup").style.display = "flex";

      // 🔹 trimite parola la backend (pentru validare server-side)
      const response = await fetch(`http://localhost:8081/api/inventar/zone/${zonaCurenta}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parola }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          alert("Parolă greșită! Nu s-a efectuat ștergerea.");
        } else {
          alert("Eroare la ștergerea produselor.");
        }
        return;
      }

      istoricBody.innerHTML = "";
      zonaStatus.textContent = "Zona: neselectată";
      alert(`Produsele din zona "${zonaCurenta}" au fost șterse.`);
    } catch (err) {
      console.error(err);
      alert("A apărut o eroare la ștergere.");
    } finally {
      document.getElementById("loadingPopup").style.display = "none";
    }
  });
});
