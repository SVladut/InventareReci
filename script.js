// ==========================
// LISTA DE UTILIZATORI MANUALI
// ==========================
// Aici adaugi/modifici utilizatori după cum vrei.
// Exemplu:
//    { nume: "admin", parola: "admin123" },

const users = [
    { nume: "admin", parola: "admin123", rol: "supervizor" },
    { nume: "x", parola: "x", rol: "scanator" },
];



// ==========================
// FUNCTIE LOGIN
// ==========================
document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const username = document.getElementById("nume").value.trim();
    const password = document.getElementById("parola").value.trim();
    const errorMsg = document.getElementById("errorMsg");

    const found = users.find(u => u.nume === username && u.parola === password);

    if (!found) {
        errorMsg.textContent = "Utilizator sau parolă greșite.";
        errorMsg.style.display = "block";
        return;
    }

    // generăm token
    const token = crypto.randomUUID();

    localStorage.setItem("authToken", token);
    localStorage.setItem("currentUser", JSON.stringify(found));

    // REDIRECT în funcție de rol
    if (found.rol === "supervizor") {
        window.location.href = "dashboard_supervizor.html";
    } else {
        window.location.href = "dashboard_scanator.html";
    }
});
