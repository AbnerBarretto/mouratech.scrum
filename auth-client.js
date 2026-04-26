(() => {
   const resolveApiBases = () => {
    const configuredBase =
      window.BELOEVENTOS_API_BASE ||
      localStorage.getItem("beloEventosApiBase") ||
      "";
    const sanitizedConfiguredBase = configuredBase.replace(/\/+$/, "");
    if (sanitizedConfiguredBase) return [sanitizedConfiguredBase];

    const bases = [];
    const location = window.location || {};
    const host = (location.hostname || "").toLowerCase();
    const port = location.port || "";
    const protocol = (location.protocol && location.protocol.startsWith('http')) ? location.protocol : 'http:';
    const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "";

    // Se estivermos no Vite (5173) ou qualquer outra porta, a prioridade absoluta é o servidor na 3000
    if (host && port !== "3000") {
      bases.push(`${protocol}//${host}:3000/api`);
      if (isLocalHost) bases.push("http://localhost:3000/api");
    }

    const origin = (location.origin && location.origin !== "null") ? location.origin.replace(/\/+$/, "") : "";
    if (origin) {
      bases.push(origin + "/api");
    }

    // Fallbacks
    bases.push("http://localhost:3000/api");
    bases.push("http://127.0.0.1:3000/api");

    return Array.from(new Set(bases));
  };
  const API_BASES = resolveApiBases();
  const HAS_EXPLICIT_API_BASE =
    !!(window.BELOEVENTOS_API_BASE || localStorage.getItem("beloEventosApiBase"));
  const USER_STORAGE_KEY = "beloEventosUser";
  const LEGACY_USER_STORAGE_KEY = "beloEventosMockUser";
  const EVENTS_CACHE_KEY = "beloEventosCachedEvents";
  const PURCHASES_CACHE_KEY = "beloEventosCachedPurchases";
  const USERS_CACHE_KEY = "beloEventosCachedUsers";

  const parseJSON = async (response) => {
    try {
      return await response.json();
    } catch {
      return {};
    }
  };

  const saveUser = (user) => {
    if (!user) return;
    const value = JSON.stringify(user);
    localStorage.setItem(USER_STORAGE_KEY, value);
    // Keep legacy key for compatibility with older pages.
    localStorage.setItem(LEGACY_USER_STORAGE_KEY, value);
    window.dispatchEvent(
      new CustomEvent("beloEventosAuthChanged", { detail: user }),
    );
  };

  const clearUser = () => {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent("beloEventosAuthChanged", { detail: null }),
    );
  };

  const getStoredUser = () => {
    const raw =
      localStorage.getItem(USER_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_USER_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const getLocalEvents = () => {
    try {
      const cached = localStorage.getItem(EVENTS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    
    // Fallback para o arquivo estático se o cache estiver vazio
    if (Array.isArray(window.eventsData) && window.eventsData.length > 0) {
      return window.eventsData;
    }
    
    return [];
  };

  const saveLocalEvents = (events) => {
    if (!Array.isArray(events) || events.length === 0) return;
    localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(events));
  };

  const getLocalPurchases = () => {
    try {
      const cached = localStorage.getItem(PURCHASES_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return Array.isArray(window.purchasesData) ? window.purchasesData : [];
  };

  const saveLocalPurchases = (purchases) => {
    if (!Array.isArray(purchases)) return;
    localStorage.setItem(PURCHASES_CACHE_KEY, JSON.stringify(purchases));
  };

  const getLocalUsers = () => {
    try {
      const cached = localStorage.getItem(USERS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}

    if (Array.isArray(window.usersData)) return window.usersData;
    if (Array.isArray(window.usersData?.default)) return window.usersData.default;
    return [];
  };

  const saveLocalUsers = (users) => {
    if (!Array.isArray(users)) return;
    localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users));
  };

  const apiFetch = async (path, options = {}) => {
    const targets = API_BASES.map((base) => base + path);
    let lastConnectionError = null;

    for (let i = 0; i < API_BASES.length; i++) {
      const base = API_BASES[i];
      let response;
      try {
        response = await fetch(base + path, {
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
          },
          ...options,
        });
      } catch (err) {
        lastConnectionError = err;
        continue;
      }

      const payload = await parseJSON(response);
      if (response.ok) return payload;

      const canRetryAnotherBase =
        !HAS_EXPLICIT_API_BASE &&
        response.status === 404 &&
        i < API_BASES.length - 1;
      if (canRetryAnotherBase) continue;

      throw new Error(
        payload.message ||
          "Falha na comunicação com o servidor (HTTP " + response.status + ").",
      );
    }

    if (lastConnectionError || !targets.length) {
      throw new Error(
        "Nao foi possivel conectar ao backend. Enderecos tentados: " +
          targets.map((url) => url.replace(/\/api\/?.*$/, "/api")).join(", ") +
          ".",
      );
    }
    throw new Error("Falha na comunicação com o servidor.");
  };

  const auth = {
    getUser() {
      return getStoredUser();
    },

    logout() {
      clearUser();
      window.location.href = "index.html";
    },

    async login(email, password) {
      const normalizedEmail = String(email || "").trim().toLowerCase();
      const loginAliases =
        normalizedEmail === "admin@beloeventos"
          ? [normalizedEmail, "admin@beloeventos.com"]
          : [normalizedEmail];

      try {
        const data = await apiFetch("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: normalizedEmail, password }),
        });
        saveUser(data.user);
        return data;
      } catch (err) {
        const users = getLocalUsers();
        const user = users.find(
          (u) =>
            loginAliases.includes(String(u.email || "").trim().toLowerCase()) &&
            u.password === password,
        );
        if (!user) throw err;

        const { password: _, ...userWithoutPassword } = user;
        saveUser(userWithoutPassword);
        return { success: true, user: userWithoutPassword, local: true };
      }
    },

    async register(userData) {
      const normalizedEmail = String(userData?.email || "").trim().toLowerCase();

      try {
        const data = await apiFetch("/auth/register", {
          method: "POST",
          body: JSON.stringify({ ...userData, email: normalizedEmail }),
        });
        saveUser(data.user);
        return data;
      } catch (err) {
        const users = getLocalUsers();
        if (users.some((u) => String(u.email || "").trim().toLowerCase() === normalizedEmail)) {
          throw err;
        }

        const newUser = {
          id: "user-" + Date.now(),
          name: userData.name,
          email: normalizedEmail,
          password: userData.password,
          birthDate: userData.birthDate,
          role: "user",
          profileImage:
            "https://api.dicebear.com/7.x/pixel-art/svg?seed=" +
            encodeURIComponent(userData.name || normalizedEmail || "user"),
        };
        const nextUsers = [...users, newUser];
        saveLocalUsers(nextUsers);
        const { password: _, ...userWithoutPassword } = newUser;
        saveUser(userWithoutPassword);
        return { success: true, user: userWithoutPassword, local: true };
      }
    },

    async updateProfile(userData) {
      try {
        const data = await apiFetch("/auth/profile", {
          method: "PUT",
          body: JSON.stringify(userData),
        });
        saveUser(data.user);
        return data;
      } catch (err) {
        const storedUser = getStoredUser();
        const canFallbackToLocal =
          storedUser &&
          userData &&
          (!userData.id || userData.id === storedUser.id);

        if (!canFallbackToLocal) throw err;

        const mergedUser = {
          ...storedUser,
          name:
            typeof userData.name === "string" && userData.name.trim()
              ? userData.name.trim()
              : storedUser.name,
          email:
            typeof userData.email === "string" && userData.email.trim()
              ? userData.email.trim().toLowerCase()
              : storedUser.email,
          birthDate:
            typeof userData.birthDate === "string"
              ? userData.birthDate.trim()
              : storedUser.birthDate,
        };

        saveUser(mergedUser);
        return {
          success: true,
          user: mergedUser,
          local: true,
          message: "Perfil salvo localmente.",
        };
      }
    },

    async deleteUser(userId) {
      try {
        const data = await apiFetch(
          "/auth/profile/" + encodeURIComponent(userId),
          {
            method: "DELETE",
          },
        );
        clearUser();
        return data;
      } catch (err) {
        const users = getLocalUsers();
        const nextUsers = users.filter((u) => u.id !== userId);
        if (nextUsers.length === users.length) throw err;
        saveLocalUsers(nextUsers);
        clearUser();
        return { success: true, local: true };
      }
    },

    async savePurchase(purchaseData) {
      try {
        const data = await apiFetch("/purchases", {
          method: "POST",
          body: JSON.stringify(purchaseData),
        });
        if (data && data.purchase) {
          const localPurchases = getLocalPurchases();
          saveLocalPurchases([...localPurchases, data.purchase]);
        }
        window.dispatchEvent(new CustomEvent("beloEventosDataUpdated"));
        return data;
      } catch (err) {
        const purchase = {
          ...purchaseData,
          id: "buy-local-" + Date.now(),
          date: new Date().toISOString(),
        };
        const localPurchases = getLocalPurchases();
        saveLocalPurchases([...localPurchases, purchase]);
        window.dispatchEvent(new CustomEvent("beloEventosDataUpdated"));
        return { success: true, purchase, local: true };
      }
    },

    async fetchUserPurchases(userId) {
      const mergePurchases = (apiPurchases, localPurchases) => {
        const byId = new Map();
        [...localPurchases, ...apiPurchases].forEach((purchase) => {
          if (!purchase) return;
          const key = purchase.id || `${purchase.userId}-${purchase.eventId}-${purchase.date || ""}`;
          byId.set(key, purchase);
        });
        return Array.from(byId.values());
      };

      try {
        const apiPurchases = await apiFetch(
          "/purchases/user/" + encodeURIComponent(userId),
        );
        const localEvents = getLocalEvents();
        const localPurchases = getLocalPurchases()
          .filter((p) => p.userId === userId)
          .map((p) => ({
            ...p,
            event: p.event || localEvents.find((ev) => ev.id === p.eventId),
          }));
        return mergePurchases(
          Array.isArray(apiPurchases) ? apiPurchases : [],
          localPurchases,
        );
      } catch (err) {
        const localPurchases = getLocalPurchases();
        const localEvents = getLocalEvents();
        return localPurchases
          .filter((p) => p.userId === userId)
          .map((p) => ({
            ...p,
            event: localEvents.find((ev) => ev.id === p.eventId),
          }));
      }
    },

    async fetchEvents() {
      try {
        const events = await apiFetch("/events");
        saveLocalEvents(events);
        return events;
      } catch (err) {
        return getLocalEvents();
      }
    },

    async fetchPurchases() {
      try {
        const purchases = await apiFetch("/purchases");
        saveLocalPurchases(purchases);
        return purchases;
      } catch (err) {
        return getLocalPurchases();
      }
    },

    async fetchProfessionals() {
      return apiFetch("/professionals");
    },

    async apiFetch(path, options) {
      return apiFetch(path, options);
    },

    // Legacy aliases kept intentionally for backward compatibility.
    loginUserLocal(email, password) {
      return this.login(email, password);
    },

    registerUserLocal(userData) {
      return this.register(userData);
    },

    updateProfileLocal(userData) {
      return this.updateProfile(userData);
    },

    deleteUserLocal(userId) {
      return this.deleteUser(userId);
    },

    savePurchaseLocal(purchaseData) {
      return this.savePurchase(purchaseData);
    },
  };

  window.BeloEventosAuth = auth;

  const applyAuthUI = () => {
    const user = auth.getUser();

    document
      .querySelectorAll("[data-auth-enter]")
      .forEach((el) => el.classList.toggle("hidden", !!user));
    document
      .querySelectorAll("[data-auth-profile]")
      .forEach((el) => el.classList.toggle("hidden", !user));

    if (!user) return;

    const avatar =
      user.profileImage ||
      "https://api.dicebear.com/7.x/pixel-art/svg?seed=" +
        encodeURIComponent(user.name || user.email || "user");

    document.querySelectorAll("[data-auth-profile]").forEach((el) => {
      const btn = el.querySelector("[data-auth-btn]");
      if (btn) {
        btn.innerHTML =
          '<img src="' +
          avatar +
          '" alt="Perfil" class="w-full h-full object-cover" />';
      }

      // Se for admin, troca o link de "Meu Perfil" para "Dashboard"
      const profileLink = el.querySelector('a[href="meuperfil.html#dados-pessoais"]');
      if (profileLink) {
        if (user.role === 'admin') {
          profileLink.href = 'adminperfil.html';
          profileLink.textContent = 'Dashboard';
        } else {
          profileLink.href = 'meuperfil.html#dados-pessoais';
          profileLink.textContent = 'Meu Perfil';
        }
      }

      const logoutBtn = el.querySelector("[data-auth-logout-btn]");
      if (logoutBtn) {
        logoutBtn.onclick = auth.logout;
      }

      const nameTargets = el.querySelectorAll(
        "[data-auth-name], [data-auth-user-name]",
      );
      nameTargets.forEach((nameEl) => {
        nameEl.textContent = user.name || "Usuário";
      });
    });
  };

  auth.applyAuthUI = applyAuthUI;

  const initGlobalSearch = () => {
    const searchInput = document.getElementById("header-search-input");
    const dropdown = document.getElementById("header-search-dropdown");
    if (!searchInput || !dropdown) return;

    const normalizeText = (value) =>
      String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    const escapeHtml = (value) =>
      String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const uniqueById = (items) => {
      const byId = new Map();
      (Array.isArray(items) ? items : []).forEach((item) => {
        if (!item) return;
        const key = item.id || item.title || item.nome || JSON.stringify(item);
        if (!byId.has(key)) byId.set(key, item);
      });
      return Array.from(byId.values());
    };

    const scoreMatch = (haystack, needle) => {
      const index = haystack.indexOf(needle);
      return index === -1 ? Number.POSITIVE_INFINITY : index;
    };

    let debounceTimer;

    searchInput.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      const query = e.target.value.trim();

      if (!query) {
        dropdown.classList.add("hidden");
        dropdown.innerHTML = "";
        return;
      }

      debounceTimer = setTimeout(async () => {
        try {
          const apiEvents = await auth.fetchEvents();
          const localEvents = Array.isArray(window.eventsData)
            ? window.eventsData
            : [];
          const events = uniqueById([...(apiEvents || []), ...localEvents]);
          const normalizedQuery = normalizeText(query);

          const filteredEvents = events
            .map((ev) => {
              const searchableText = normalizeText(
                [
                  ev.title,
                  ev.city,
                  ev.badge,
                  ev.classification,
                  ev.heroDescription,
                  ev.mapLocation,
                  ...(Array.isArray(ev.about) ? ev.about : []),
                ].join(" "),
              );
              if (!searchableText.includes(normalizedQuery)) return null;
              return {
                type: "event",
                score: scoreMatch(searchableText, normalizedQuery),
                id: ev.id,
                title: ev.title || "Evento",
                subtitle: ev.city || "Belo Jardim",
                image:
                  ev.heroImage ||
                  "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=150",
                href: "evento.html?id=" + encodeURIComponent(ev.id || ""),
              };
            })
            .filter(Boolean);

          const results = filteredEvents
            .sort((a, b) => a.score - b.score || a.title.localeCompare(b.title))
            .slice(0, 20);

          if (results.length === 0) {
            dropdown.innerHTML = '<div class="p-3 text-sm text-slate-500 font-medium text-center">Nenhum resultado encontrado.</div>';
            dropdown.classList.remove("max-h-80", "overflow-y-auto", "pr-1", "custom-scrollbar");
          } else {
            dropdown.innerHTML = results
              .map(
                (item) => `
              <a href="${escapeHtml(item.href)}" class="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer mb-1 border-b border-slate-100 last:border-0 last:mb-0">
                <img src="${escapeHtml(item.image)}" class="w-10 h-10 object-cover rounded-md flex-shrink-0" alt="${escapeHtml(item.title)}">
                <div class="min-w-0">
                  <div class="text-sm font-bold text-slate-800 truncate uppercase tracking-tight leading-none">${escapeHtml(item.title)}</div>
                  <div class="text-[10px] text-slate-500 uppercase tracking-widest mt-1">${escapeHtml(item.subtitle)}</div>
                </div>
                <span class="ml-auto text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest bg-blue-50 text-blue-700">
                  Evento
                </span>
              </a>
            `,
              )
              .join("");

            if (results.length > 5) {
              dropdown.classList.add(
                "max-h-80",
                "overflow-y-auto",
                "pr-1",
                "custom-scrollbar",
              );
            } else {
              dropdown.classList.remove(
                "max-h-80",
                "overflow-y-auto",
                "pr-1",
                "custom-scrollbar",
              );
            }
          }
          dropdown.classList.remove("hidden");
        } catch (err) {
          console.error("Erro na busca:", err);
        }
      }, 300);
    });

    document.addEventListener("click", (e) => {
      if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add("hidden");
      }
    });
  };

  const initApp = () => {
    applyAuthUI();
    initGlobalSearch();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }

  window.addEventListener("beloEventosAuthChanged", applyAuthUI);
})();
