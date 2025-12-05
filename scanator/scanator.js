// =========================
// PROTECȚIE LOGIN + ROL
// =========================
const user = JSON.parse(localStorage.getItem("currentUser"));
const token = localStorage.getItem("authToken");

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
let listaAfisata = []; // lista finală (după filtrare + sortare)

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

// =========================
updateZonaDisplay();

// =========================
// ÎNCĂRCARE NOMENCLATOR
// =========================
fetch("nomenclator.json")
    .then(r => r.json())
    .then(data => {
        nomenclator = data;
        console.log("Nomenclator încărcat:", nomenclator);
    })
    .catch(err => {
        alert("Eroare la încărcarea nomenclatorului!");
        console.error(err);
    });

// =========================
// SALVARE PRODUS
// =========================
function salveazaProdus(cod, cantitate) {
    const zona = localStorage.getItem("zonaCurenta");

    if (!zona) {
        alert("Trebuie să scanați mai întâi o zonă (ex: --A001)");
        return;
    }

    if (!cod) {
        alert("Introduceți codul produsului!");
        return;
    }

        if (!/^\d{13}$/.test(cod)) {
        alert("Cod de bare invalid! Trebuie să aibă EXACT 13 cifre.");
        return;
    }

    // Validare cod nomenclator
    const produs = nomenclator.find(p => p.cod === cod);

    if (!produs) {
        alert("Cod INVALID sau INEXISTENT în nomenclator: " + cod);
        return;
    }

    // ================================
    // CALCUL CANTITATE EXISTENTĂ
    // ================================
    let inventar = JSON.parse(localStorage.getItem("inventarLocal")) || [];

    // filtrăm toate intrările pentru acest cod în zona curentă
    let existente = inventar.filter(
        (x) => x.zona === zona && x.cod === cod
    );

    // suma deja scanată
    let cantitateExistenta = existente.reduce((sum, x) => sum + x.cantitate, 0);

    // ================================
    // VALIDARE CANTITATE NEGATIVĂ
    // ================================
    let nouTotal = cantitateExistenta + cantitate;

    if (nouTotal < 0) {
        alert(
            `Eroare: cantitatea cumulată pe acest cod ar deveni ${nouTotal}.\n` +
            `Nu puteți avea cantitate negativă!`
        );
        return;
    }

    // ================================
    // SALVARE
    // ================================
    const intrare = {
        zona,
        cod,
        denumire: produs.denumire,
        cantitate,
        data: new Date().toLocaleString()
    };

    inventar.push(intrare);
    localStorage.setItem("inventarLocal", JSON.stringify(inventar));

    // Refresh UI
    currentPage = 1;
    afiseazaIstoric();
}

// =========================
// AFIȘARE ISTORIC + PAGINARE
// =========================
function afiseazaIstoric() {
    const zona = localStorage.getItem("zonaCurenta");
    const viewMode = viewModeSelect.value;

    istoricBody.innerHTML = "";
    pageInfo.textContent = "";

    if (!zona) {
        istoricBody.innerHTML =
            `<tr><td colspan="4" style="text-align:center;">Nicio zonă selectată</td></tr>`;
        return;
    }

    let inventar = JSON.parse(localStorage.getItem("inventarLocal")) || [];
    let filtrate = inventar.filter(i => i.zona === zona);

    if (filtrate.length === 0) {
        istoricBody.innerHTML =
            `<tr><td colspan="4" style="text-align:center;">Nicio scanare în zona ${zona}</td></tr>`;
        return;
    }

    // sortare desc după dată
    filtrate.sort((a, b) => new Date(b.data) - new Date(a.data));

    if (viewMode === "normal") {
        listaAfisata = filtrate;
    } else if (viewMode === "cumulat") {
        const grupate = {};

        filtrate.forEach(item => {
            if (!grupate[item.cod]) {
                grupate[item.cod] = {
                    cod: item.cod,
                    denumire: item.denumire,
                    cantitate: 0,
                    ultimaData: item.data
                };
            }

            grupate[item.cod].cantitate += item.cantitate;

            if (new Date(item.data) > new Date(grupate[item.cod].ultimaData)) {
                grupate[item.cod].ultimaData = item.data;
            }
        });

        listaAfisata = Object.values(grupate).sort(
            (a, b) => new Date(b.ultimaData) - new Date(a.ultimaData)
        );
    } else {
        listaAfisata = filtrate;
    }

    const totalItems = listaAfisata.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages === 0) {
        istoricBody.innerHTML =
            `<tr><td colspan="4" style="text-align:center;">Nicio înregistrare</td></tr>`;
        return;
    }

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginaProduse = listaAfisata.slice(start, end);

    paginaProduse.forEach(item => {
        const row = document.createElement("tr");

        if (viewMode === "normal") {
            row.innerHTML = `
                <td>${item.cod}</td>
                <td>${item.denumire}</td>
                 <td class="qty-cell">${item.cantitate}</td>
            `;
        } else {
            row.innerHTML = `
                <td>${item.cod}</td>
                <td>${item.denumire}</td>
                 <td class="qty-cell">${item.cantitate}</td>
            `;
        }

        istoricBody.appendChild(row);
    });

    pageInfo.textContent = `Pagina ${currentPage} / ${totalPages}`;
}

// =========================
// EVENT: SCANARE PE ENTER
// =========================
scanInput.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;  // rulăm doar la ENTER

    const text = this.value.trim();
    this.value = "";  // curățăm inputul imediat

    if (!text) return;

    // =====================================================
    // 1. Dacă este cod de zonă (ex: --A001)
    // =====================================================
    if (text.startsWith("--") && text.length >= 4) {
        localStorage.setItem("zonaCurenta", text);
        updateZonaDisplay();
        currentPage = 1;
        afiseazaIstoric();
        alert("Zonă setată: " + text);
        return;
    }

    // =====================================================
    // 2. Dacă nu există zonă -> nu permitem scanare produs
    // =====================================================
    if (!localStorage.getItem("zonaCurenta")) {
        alert("Trebuie să scanați mai întâi o zonă (ex: --A001)");
        return;
    }

    // =====================================================
    // 3. Detectăm modul de scanare
    // =====================================================
    const mode = scanModeSelect.value;

    // =====================================================
    // MOD INDIVIDUAL → adaugă 1
    // =====================================================
    if (mode === "individual") {
        salveazaProdus(text, 1);
        return;
    }

    // =====================================================
    // MOD MULTIPLU → cerem cantitate (poate fi negativă)
    // =====================================================
    if (mode === "multiplu") {
        let cant = prompt(
            "Introduceți cantitatea pentru codul: " + text + 
            "\n(Puteți folosi și valori negative)"
        );

        if (cant === null) return; // dacă apasă Cancel

        cant = parseInt(cant);

        // validăm doar că este număr întreg (negativ sau pozitiv)
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
    if (currentPage > 1) {
        currentPage--;
        afiseazaIstoric();
    }
});

nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(listaAfisata.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        afiseazaIstoric();
    }
});

// Schimbare mod afișare / scanare
viewModeSelect.addEventListener("change", () => {
    currentPage = 1;
    afiseazaIstoric();
});

scanModeSelect.addEventListener("change", () => {
    // doar reafișăm, nu schimbă datele
    afiseazaIstoric();
});

// =========================
// LOGOUT
// =========================
logoutBtn.addEventListener("click", () => {
    window.location.href = "index.html";
});

// =========================
// INIT
// =========================
afiseazaIstoric();
scanInput.focus();



// =========================
// OUT ZONA
// =========================
clearZoneBtn.addEventListener("click", () => {
    localStorage.removeItem("zonaCurenta");
    updateZonaDisplay();
    currentPage = 1;

    // Resetăm tabelul la mesajul „Nicio zonă”
    afiseazaIstoric();

    // Focus pe input pentru a scana zona nouă
    scanInput.value = "";
    scanInput.focus();
});
