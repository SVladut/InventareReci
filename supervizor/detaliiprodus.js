// ======================================================
// 🔍 DETALII PRODUS – API BASED
// ======================================================

const produsInput = document.getElementById("produsInput");
const produsInfo = document.getElementById("produsInfo");
const produsListaScanari = document.getElementById("produsListaScanari");

const pCod = document.getElementById("pCod");
const pDenumire = document.getElementById("pDenumire");
const pTotal = document.getElementById("pTotal");

const produsScanariTable = document.getElementById("produsScanariTable");

const prodPrev = document.getElementById("prodPrev");
const prodNext = document.getElementById("prodNext");
const prodPageInfo = document.getElementById("prodPageInfo");

let pRezultate = [];
let pCurrentPage = 1;
const pItemsPerPage = 10;

// ======================================================
// 📥 Scanare produs (ENTER, DONE, SEND)
// ======================================================
produsInput.addEventListener("keydown", async (e) => {
    const accept = ["Enter", "Done", "Send", "Go"];
    if (!accept.includes(e.key)) return;

    const cod = produsInput.value.trim();
    produsInput.value = "";

    if (!/^\d{13}$/.test(cod)) {
        alert("Cod invalid! Trebuie EXACT 13 cifre.");
        return;
    }

    await loadProductDetails(cod);
});


// ======================================================
// 📌 FUNCȚIE PRINCIPALĂ
// ======================================================
async function loadProductDetails(cod) {
    try {
        // 1️⃣ verificăm în nomenclator
        const check = await fetch(`https://recisrlmicro.onrender.com/api/nomenclator/${cod}`);
        
        if (!check.ok) {
            alert("Cod inexistent în nomenclator!");
            return;
        }

        const produs = await check.json();

        pCod.textContent = cod;
        pDenumire.textContent = produs.denumire;
        produsInfo.style.display = "block";


        // 2️⃣ obținem toate scanările pentru produs
        const scanResp = await fetch(`https://recisrlmicro.onrender.com/api/scanari/produs/${cod}`);
        const scanari = await scanResp.json();

        if (scanari.length === 0) {
            produsListaScanari.style.display = "block";
            produsScanariTable.innerHTML =
                `<tr><td colspan="3" style="text-align:center;">Produsul nu a fost inventariat în nicio zonă</td></tr>`;
            pTotal.textContent = 0;
            prodPageInfo.textContent = "";
            return;
        }

        // 3️⃣ grupăm corect pe zonă + user
        const grouped = {};

        scanari.forEach(s => {
            const key = `${s.zona}_${s.user}`;
            if (!grouped[key]) {
                grouped[key] = { zona: s.zona, user: s.user, cantitate: 0 };
            }
            grouped[key].cantitate += s.cantitate;
        });

        pRezultate = Object.values(grouped);

        // 4️⃣ calcul total
        pTotal.textContent = pRezultate.reduce((s, x) => s + x.cantitate, 0);

        pCurrentPage = 1;
        produsListaScanari.style.display = "block";

        renderProdusTable();

    } catch (err) {
        console.error("Eroare detalii produs:", err);
        alert("Eroare la preluarea datelor produsului.");
    }
}


// ======================================================
// 📄 Render tabel + paginare
// ======================================================
function renderProdusTable() {

    produsScanariTable.innerHTML = "";

    const totalPages = Math.ceil(pRezultate.length / pItemsPerPage);
    if (pCurrentPage > totalPages) pCurrentPage = totalPages;
    if (pCurrentPage < 1) pCurrentPage = 1;

    const start = (pCurrentPage - 1) * pItemsPerPage;
    const pageItems = pRezultate.slice(start, start + pItemsPerPage);

    pageItems.forEach(item => {
        produsScanariTable.innerHTML += `
            <tr>
                <td>${item.zona}</td>
                <td>${item.user}</td>
                <td class="qty-cell">${item.cantitate}</td>
            </tr>
        `;
    });

    prodPageInfo.textContent = `Pagina ${pCurrentPage} / ${totalPages}`;
}


// ======================================================
// ⏪⏩ Pagini
// ======================================================
prodPrev.addEventListener("click", () => {
    if (pCurrentPage > 1) {
        pCurrentPage--;
        renderProdusTable();
    }
});

prodNext.addEventListener("click", () => {
    const totalPages = Math.ceil(pRezultate.length / pItemsPerPage);
    if (pCurrentPage < totalPages) {
        pCurrentPage++;
        renderProdusTable();
    }
});
