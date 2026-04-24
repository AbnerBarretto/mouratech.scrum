(() => {
  const STORAGE_KEY = "beloEventosMockUser";

  const getUser = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    applyAuthUI();
    window.location.href = "index.html";
  };

  const renderProfileDropdown = (dropdown, user) => {
    if (!user) {
      return;
    }

    dropdown.innerHTML = `
      <a href="meuperfil.html" class="block px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50">Meu perfil</a>
      <a href="comunidade.html" class="block px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50">Minhas comunidades</a>
      <button type="button" data-auth-logout class="w-full text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50">Sair</button>
    `;

    const logoutButton = dropdown.querySelector("[data-auth-logout]");
    if (logoutButton) {
      logoutButton.addEventListener("click", logout);
    }
  };

  const applyAuthUI = () => {
    const user = getUser();

    document.querySelectorAll("[data-auth-enter]").forEach((element) => {
      element.classList.toggle("hidden", Boolean(user));
    });

    document.querySelectorAll("[data-auth-profile]").forEach((element) => {
      element.classList.toggle("hidden", !user);
    });

    document.querySelectorAll("[data-auth-user-name]").forEach((element) => {
      element.textContent = "";
      element.classList.add("hidden");
    });

    document.querySelectorAll("[data-auth-dropdown]").forEach((dropdown) => {
      renderProfileDropdown(dropdown, user);
    });
  };

  window.BeloEventosAuth = {
    storageKey: STORAGE_KEY,
    getUser,
    logout,
    applyAuthUI,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyAuthUI);
  } else {
    applyAuthUI();
  }
})();
