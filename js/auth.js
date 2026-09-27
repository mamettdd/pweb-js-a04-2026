document.addEventListener("DOMContentLoaded", () => {
    // 1. Cek Session (Jika sudah login, langsung ke katalog)
    const existingUser = localStorage.getItem("user_name");
    if (existingUser) {
        window.location.href = "index.html";
        return;
    }

    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const errorMessage = document.getElementById("error-message");
    const loadingState = document.getElementById("loading");
    const btnLogin = document.getElementById("btnLogin");

    // Fungsi Utama Login
    async function handleLogin() {
        const username = usernameInput ? usernameInput.value.trim() : "";
        const password = passwordInput ? passwordInput.value.trim() : "";

        if (!username || !password) {
            showError("Username dan password wajib diisi!");
            return;
        }

        showLoading(true);
        hideError();

        try {
            const response = await fetch("https://dummyjson.com/users");
            if (!response.ok) throw new Error("Gagal mengambil data user dari API.");

            const data = await response.json();
            
            // Cari user di API
            const validUser = data.users.find(
                u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
            );

            if (validUser) {
                localStorage.setItem("user_name", validUser.firstName);
                window.location.href = "index.html";
            } else {
                showError("Username atau password salah!");
            }
        } catch (err) {
            showError("Terjadi kesalahan: " + err.message);
        } finally {
            showLoading(false);
        }
    }

    function showError(msg) {
        if (errorMessage) {
            errorMessage.textContent = msg;
            errorMessage.style.display = "block";
        }
    }

    function hideError() {
        if (errorMessage) errorMessage.style.display = "none";
    }

    function showLoading(isLoading) {
        if (loadingState) loadingState.style.display = isLoading ? "flex" : "none";
        if (btnLogin) {
            btnLogin.disabled = isLoading;
            btnLogin.style.opacity = isLoading ? "0.6" : "1";
        }
    }

    // Event Listener Klik Tombol Login
    if (btnLogin) {
        btnLogin.addEventListener("click", (e) => {
            e.preventDefault();
            handleLogin();
        });
    }

    // Event Listener Tekan Enter di Input
    [usernameInput, passwordInput].forEach(input => {
        if (input) {
            input.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    handleLogin();
                }
            });
        }
    });
});
