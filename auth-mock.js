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

    const profilePage = user.role === "admin" ? "adminperfil.html" : "meuperfil.html";

    dropdown.innerHTML = `
      <a href="${profilePage}#dados-pessoais" class="block px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50">Alterar dados</a>
      <a href="${profilePage}" class="block px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50">Meu perfil</a>
      <a href="comunidade.html" class="block px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50">Minhas comunidades</a>
      <button type="button" data-auth-logout class="w-full text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50">Sair</button>
    `;

    const logoutButton = dropdown.querySelector("[data-auth-logout]");
    if (logoutButton) {
      logoutButton.addEventListener("click", logout);
    }
  };

  const renderProfileButton = (profileContainer, user) => {
    if (!user) return;

    const btn = profileContainer.querySelector("[data-auth-btn]");
    if (!btn) return;

    if (user.role === "admin") {
      btn.className =
        "bg-yellow-400 hover:bg-yellow-300 text-blue-900 font-bold px-6 py-2 rounded-full text-sm transition-all shadow-md active:scale-95 cursor-pointer";
      btn.innerHTML = "Admin";
    } else {
      btn.className =
        "w-10 h-10 rounded-full bg-blue-800 border-2 border-yellow-400 flex items-center justify-center overflow-hidden cursor-pointer";
      btn.innerHTML = '<i data-lucide="user" class="text-white w-5 h-5"></i>';
      // Re-render lucide icons for the new button
      if (window.lucide) {
        window.lucide.createIcons({ nodes: [btn] });
      }
    }
  };

  const applyAuthUI = () => {
    const user = getUser();

    document.querySelectorAll("[data-auth-enter]").forEach((element) => {
      element.classList.toggle("hidden", Boolean(user));
    });

    document.querySelectorAll("[data-auth-profile]").forEach((element) => {
      element.classList.toggle("hidden", !user);
      if (user) {
        renderProfileButton(element, user);
      }
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
