document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("nume").value.trim();
    const password = document.getElementById("parola").value.trim();
    const errorMsg = document.getElementById("errorMsg");

    try {
        const response = await fetch("http://localhost:8081/api/users/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nume: username, parola: password })
        });

        const data = await response.json();

        if (data.error) {
            errorMsg.textContent = data.error;
            errorMsg.style.display = "block";
            return;
        }

        // Salvăm token + user
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("currentUser", JSON.stringify(data.user));

        // redirect în funcție de rol
        if (data.user.tip === "supervizor") {
            window.location.href = "dashboard_supervizor.html";
        } else {
            window.location.href = "dashboard_scanator.html";
        }

    } catch (err) {
        errorMsg.textContent = "Eroare de server!";
        errorMsg.style.display = "block";
        console.error(err);
    }
});
