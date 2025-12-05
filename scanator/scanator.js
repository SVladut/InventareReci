// =========================
// PROTECȚIE LOGIN + ROL
// =========================
const user = JSON.parse(localStorage.getItem("currentUser"));
const token = localStorage.getItem("authToken"));

if (!token || !user || user.rol !== "scanator") {
    window.location.href = "index.html";
}

document.getElementById("userDisplay").textContent =
    "Conectat ca: " + user.nume;

// =========================
// VARIABILE GLOBALE
// =========================
let nomenclator = [];
let currentPage = 1;
const itemsPerPage = 5;
let listaAfisata = [];

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
fetch("nomenclator.json")
    .then(r => r.json())
    .then(data => { nomenclator = data; })
    .catch(() => alert("Eroare la încărcarea nomenclatorului!"));

// =========================
// SALVARE PRODUS
// =========================
function salveazaProdus(cod, cantitate) {
    const zona = localStorage.getItem("zonaCurenta");

    if (!zona) {
        alert("Scanați mai întâi o zonă (ex: --A001)");
        return;
    }

    // VALIDARE EAN-13
    if (!/^\d{13}$/.test(cod)) {
        alert("Cod de bare invalid! Trebuie să aibă EXACT 13 cifre.");
        return;
    }

    // VALIDARE EXISTENȚĂ ÎN NOMENCLATOR
    const produs = nomenclator.find(p => p.cod === cod);
    if (!produs) {
        alert("Cod INVALID sau INEXISTENT în nomenclator: " + cod);
        return;
    }

    let inventar = JSON.parse(localStorage.getItem("inventarLocal")) || [];
    let existente = inventar.filter(i => i.zona === zona && i.cod === cod);

    let cantitateExistenta = existente.reduce((sum, x) => sum + x.cantitate, 0);
    let nouTotal = cantitateExistenta + cantitate;

    if (nouTotal < 0) {
        alert("Cantitatea cumulată pe acest cod ar deveni negativă!");
        return;
    }

    let intrare = {
        zona,
        cod,
        denumire: produs.denumire,
        cantitate,
        data: new Date().toLocaleString()
    };

    inventar.push(intrare);
    localStorage.setItem("inventarLocal", JSON.stringify(inventar));

    currentPage = 1;
    afiseazaIstoric();
}

// =========================
// AFIȘARE ISTORIC
// =========================
function afiseazaIstoric() {
    const zona = localStorage.getItem("zonaCurenta");
    const viewMode = viewModeSelect.value;

    istoricBody.innerHTML = "";
    pageInfo.textContent = "";

    if (!zona) {
        istoricBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Nicio zonă selectată</td></tr>`;
        return;
    }

    let inventar = JSON.parse(localStorage.getItem("inventarLocal")) || [];
    let filtrate = inventar.filter(i => i.zona === zona);

    if (filtrate.length === 0) {
        istoricBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Nicio scanare în această zonă</td></tr>`;
        return;
    }

    filtrate.sort((a, b) => new Date(b.data) - new Date(a.data));

    if (viewMode === "normal") {
        listaAfisata = filtrate;
    } else {
        const grup = {};
        filtrate.forEach(i => {
            if (!grup[i.cod]) grup[i.cod] = { cod: i.cod, denumire: i.denumire, cantitate: 0 };
            grup[i.cod].cantitate += i.cantitate;
        });
        listaAfisata = Object.values(grup);
    }

    const totalPages = Math.ceil(listaAfisata.length / itemsPerPage);
    if (!totalPages) return;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    listaAfisata.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
        .forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${item.cod}</td>
                <td>${item.denumire}</td>
                <td class="qty-cell">${item.cantitate}</td>`;
            istoricBody.appendChild(row);
        });

    pageInfo.textContent = `Pagina ${currentPage} / ${totalPages}`;
}

// =========================
// SCANARE — ACCEPTĂ ENTER, DONE, GO, NEXT, OK
// =========================
scanInput.addEventListener("keydown", function (e) {

    const enterKeys = ["Enter", "Done", "Go", "OK", "Next"];

    if (!enterKeys.includes(e.key)) return;  // compatibil mobil

    const text = scanInput.value.trim();
    scanInput.value = "";

    if (!text) return;

    // COD DE ZONĂ
    if (text.startsWith("--") && text.length >= 4) {
        localStorage.setItem("zonaCurenta", text);
        updateZonaDisplay();
        currentPage = 1;
        afiseazaIstoric();
        alert("Zonă setată: " + text);
        return;
    }

    // NU EXISTĂ ZONĂ
    if (!localStorage.getItem("zonaCurenta")) {
        alert("Scanați mai întâi o zonă (ex: --A001)");
        return;
    }

    const mode = scanModeSelect.value;

    if (mode === "individual") {
        salveazaProdus(text, 1);
        return;
    }

    if (mode === "multiplu") {
        let cant = prompt("Introduceți cantitatea (poate fi negativă):");
        if (cant === null) return;
        cant = parseInt(cant);
        if (isNaN(cant)) {
            alert("Cantitate invalidă!");
            return;
        }
        salveazaProdus(text, cant);
    }
});

// =========================
// PAGINARE
// =========================
prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) { currentPage--; afiseazaIstoric(); }
});
nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(listaAfisata.length / itemsPerPage);
    if (currentPage < totalPages) { currentPage++; afiseazaIstoric(); }
});

// =========================
// SCHIMBARE MODURI
// =========================
viewModeSelect.addEventListener("change", () => { currentPage = 1; afiseazaIstoric(); });
scanModeSelect.addEventListener("change", afiseazaIstoric);

// =========================
// LOGOUT
// =========================
logoutBtn.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "index.html";
});

// =========================
// CLEAR ZONA
// =========================
clearZoneBtn.addEventListener("click", () => {
    localStorage.removeItem("zonaCurenta");
    updateZonaDisplay();
    currentPage = 1;
    afiseazaIstoric();
    scanInput.value = "";
});

// =========================
// INIT
// =========================
afiseazaIstoric();
scanInput.focus();
