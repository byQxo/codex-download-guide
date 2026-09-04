(() => {
  const pets = Array.isArray(window.CODEX_PETS) ? window.CODEX_PETS : [];
  const page = document.querySelector("[data-pets-page]")?.getAttribute("data-pets-page") || "gallery";
  const detailRoot = document.querySelector("[data-pet-detail]");
  const galleryPanel = document.querySelector("[data-pet-gallery-panel]");
  const galleryRoot = document.querySelector("[data-pet-gallery]");
  const searchForm = document.querySelector("[data-pet-search-form]");
  const searchInput = document.querySelector("[data-pet-search-input]");
  const resultRoot = document.querySelector("[data-pet-gallery-result]");
  const paginationRoot = document.querySelector("[data-pet-pagination]");
  const pageSize = 24;

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const assetUrl = (value) => {
    const url = String(value || "");
    if (url.startsWith("/assets/images/pets/")) return url;
    if (url.startsWith("https://download.yudidc.cc/assets/images/pets/")) return url.replace("https://download.yudidc.cc", "");
    return url;
  };

  const getSelectedPetId = () => {
    const explicitId = detailRoot?.getAttribute("data-pet-id");
    if (explicitId) {
      return explicitId;
    }

    const params = new URLSearchParams(window.location.search);
    return (params.get("id") || params.get("pet") || "").trim();
  };

  const buildPetUrl = (petId) => `/pets/?id=${encodeURIComponent(petId)}`;

  const getPet = () => {
    const selectedId = getSelectedPetId();
    return pets.find((pet) => pet.id === selectedId) || null;
  };

  const buildGalleryUrl = ({ query = "", tag = "", targetPage = 1 } = {}) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (tag) params.set("tag", tag);
    if (targetPage > 1) params.set("page", String(targetPage));
    const search = params.toString();
    return search ? `/pets/?${search}` : "/pets/";
  };

  const setMetaContent = (selector, content) => {
    const element = document.querySelector(selector);
    if (element) {
      element.setAttribute("content", content);
    }
  };

  const setCanonical = (href) => {
    const element = document.querySelector('link[rel="canonical"]');
    if (element) {
      element.setAttribute("href", href);
    }
  };

  const setGalleryMeta = () => {
    document.title = "Codex Pets - 宠物列表";
    setMetaContent('meta[name="description"]', "Codex 宠物画廊，收集可安装到 Codex 的社区宠物。");
    setCanonical("https://download.yudidc.cc/pets/");
  };

  const setDetailMeta = (pet) => {
    document.title = `${pet.name} - Codex Pets`;
    setMetaContent('meta[name="description"]', `${pet.name} 是 Codex Pets 的像素宠物，可通过 ${pet.command} 安装。`);
    setCanonical(`https://download.yudidc.cc${buildPetUrl(pet.id)}`);
  };

  const renderTags = (tags = [], activeTag = "") => tags
    .map((tag) => {
      const isActive = tag === activeTag;
      return `<a class="pet-tag${isActive ? " is-active" : ""}" href="${escapeHtml(buildGalleryUrl({ tag }))}"${isActive ? ' aria-current="true"' : ""}>${escapeHtml(tag)}</a>`;
    })
    .join("");

  const renderSprite = (pet, state = {}) => {
    const y = Number.isFinite(state.y) ? state.y : 0;
    return `<span class="pet-sprite" style="background-image: url('${escapeHtml(assetUrl(pet.image))}'); background-position: 0 ${y}px;" aria-hidden="true"></span>`;
  };

  const getStateByName = (pet, name) => (pet.states || []).find((state) => state.name === name) || {};

  const renderStateCards = (pet) => {
    if (!Array.isArray(pet.states) || pet.states.length === 0) {
      return "";
    }

    return `
      <section class="states-panel" aria-labelledby="animation-states-title">
        <div class="states-head">
          <h2 id="animation-states-title">动画状态</h2>
        </div>
        <div class="states-grid">
          ${pet.states.map((state) => `
            <article class="state-card${state.active ? " is-active" : ""}">
              <span class="state-gif">GIF</span>
              <div class="state-preview">${renderSprite(pet, state)}</div>
              <h3>${escapeHtml(state.name)}</h3>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  };

  const getListUrl = () => {
    if (document.referrer) {
      try {
        const referrer = new URL(document.referrer);
        if (referrer.origin === window.location.origin && referrer.pathname === "/pets/") {
          return `${referrer.pathname}${referrer.search}`;
        }
      } catch {
        // Keep the plain gallery fallback below.
      }
    }

    return "/pets/";
  };

  const renderDetail = () => {
    if (!detailRoot) {
      return;
    }

    const pet = getPet();

    if (!pet) {
      document.title = "未找到宠物 - Codex Pets";
      detailRoot.innerHTML = `<section class="pet-panel pet-detail"><a class="back-link" href="/pets/" data-pet-back>← 返回宠物列表</a><h1 class="pet-title">未找到宠物</h1><p class="pet-description">这个宠物还没有加入收藏。</p></section>`;
      return;
    }

    setDetailMeta(pet);
    const command = escapeHtml(pet.command);

    detailRoot.innerHTML = `
      <a class="back-link" href="${escapeHtml(getListUrl())}" data-pet-back>← 返回宠物列表</a>
      <div class="pet-detail-layout">
        <section class="pet-panel pet-detail">
          <p class="pet-kicker"><span class="status-dot" aria-hidden="true"></span><span>id / <strong>${escapeHtml(pet.id)}</strong></span><span>·</span><span>by <strong>${escapeHtml(pet.creator)}</strong></span></p>
          <h1 class="pet-title">${escapeHtml(pet.name)}</h1>
          <p class="pet-description">${escapeHtml(pet.description)}</p>
          <div class="pet-tags" aria-label="宠物标签">${renderTags(pet.tags)}</div>
          <div class="pet-stage">
            ${renderSprite(pet)}
            <button class="walk-button" type="button" data-pet-preview="${escapeHtml(pet.id)}">预览</button>
          </div>
        </section>

        <aside class="pet-panel install-panel" aria-label="安装 ${escapeHtml(pet.name)}">
          <div class="install-row">
            <h2 class="install-title">安装到 Codex</h2>
            <p class="install-hint">让 Codex 安装这个宠物。</p>
          </div>
          <a class="install-primary" href="${escapeHtml(pet.installUrl)}" target="_blank" rel="noreferrer">>_ 在 Codex 中安装</a>
          <p class="command-label">终端安装命令</p>
          <div class="command-card">
            <div class="command-tabs"><strong>CLI</strong></div>
            <code class="command-line"><span class="prompt">$</span><span>${command}</span></code>
            <button class="copy-button" type="button" data-copy-command="${command}">复制</button>
          </div>
          <div class="pet-enable-tip">
            <strong>启用方式</strong>
            <p>执行命令下载后，打开 Codex 客户端顶部菜单栏：设置 → 外观，滚动到最下方的“宠物”，选中下载好的宠物即可。</p>
          </div>
          <div class="pet-meta">
            <div><span>清单</span><strong>${escapeHtml(pet.manifest)}</strong></div>
            <div><span>pet.json</span><strong>${escapeHtml(pet.jsonSize)}</strong></div>
            <div><span>精灵图</span><strong>${escapeHtml(pet.spriteSize)}</strong></div>
          </div>
        </aside>
      </div>
      ${renderStateCards(pet)}
    `;
  };

  const renderGallery = () => {
    if (!galleryRoot) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const query = (params.get("q") || "").trim();
    const activeTag = (params.get("tag") || "").trim();
    const requestedPage = Number.parseInt(params.get("page") || "1", 10);
    const normalizedQuery = query.toLowerCase();
    const filteredPets = pets.filter((pet) => {
      const matchesQuery = !normalizedQuery || [pet.id, pet.name, pet.creator, pet.description, ...(pet.tags || [])]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
      const matchesTag = !activeTag || (pet.tags || []).includes(activeTag);
      return matchesQuery && matchesTag;
    });
    const totalPages = Math.max(1, Math.ceil(filteredPets.length / pageSize));
    const currentPage = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), totalPages);
    const start = (currentPage - 1) * pageSize;
    const pagePets = filteredPets.slice(start, start + pageSize);

    if (searchInput instanceof HTMLInputElement) {
      searchInput.value = query;
    }

    if (resultRoot) {
      const startCount = filteredPets.length ? start + 1 : 0;
      const endCount = Math.min(start + pagePets.length, filteredPets.length);
      const filterLabel = [
        query ? `搜索 “${escapeHtml(query)}”` : "",
        activeTag ? `标签 “${escapeHtml(activeTag)}”` : ""
      ].filter(Boolean).join(" · ") || "全部宠物";
      resultRoot.innerHTML = `
        <span>${filterLabel}</span>
        <span class="gallery-result-actions">
          ${(query || activeTag) ? '<a class="filter-clear-link" href="/pets/">清除筛选</a>' : ""}
          <strong>${escapeHtml(startCount)}-${escapeHtml(endCount)} / ${escapeHtml(filteredPets.length)}</strong>
        </span>
      `;
    }

    if (filteredPets.length === 0) {
      galleryRoot.innerHTML = `
        <div class="pet-empty-state">
          <h2>没有找到宠物</h2>
          <p>换个名称、ID、作者或标签试试。</p>
        </div>
      `;
    } else {
      galleryRoot.innerHTML = pagePets.map((pet) => `
      <article class="pet-card">
        <a class="pet-card-media pet-card-link" href="${escapeHtml(buildPetUrl(pet.id))}" aria-label="查看 ${escapeHtml(pet.name)}">
          ${renderSprite(pet)}
        </a>
        <div class="pet-card-body">
          <p class="pet-kicker"><span class="status-dot" aria-hidden="true"></span><span>id / ${escapeHtml(pet.id)}</span></p>
          <h2><a class="pet-card-title-link" href="${escapeHtml(buildPetUrl(pet.id))}">${escapeHtml(pet.name)}</a></h2>
          <p>${escapeHtml(pet.description)}</p>
          <div class="pet-tags pet-card-tags" aria-label="${escapeHtml(pet.name)} 标签">${renderTags(pet.tags, activeTag)}</div>
        </div>
      </article>
    `).join("");
    }

    renderPagination({ query, activeTag, currentPage, totalPages });
  };

  const renderPagination = ({ query, activeTag, currentPage, totalPages }) => {
    if (!paginationRoot) {
      return;
    }

    if (totalPages <= 1) {
      paginationRoot.innerHTML = "";
      return;
    }

    const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
    const pageLinks = Array.from(pages)
      .filter((item) => item >= 1 && item <= totalPages)
      .sort((a, b) => a - b);
    const pieces = [];

    pageLinks.forEach((item, index) => {
      if (index > 0 && item - pageLinks[index - 1] > 1) {
        pieces.push(`<span class="pagination-ellipsis">...</span>`);
      }

      pieces.push(item === currentPage
        ? `<span class="pagination-link is-current" aria-current="page">${item}</span>`
        : `<a class="pagination-link" href="${escapeHtml(buildGalleryUrl({ query, tag: activeTag, targetPage: item }))}">${item}</a>`);
    });

    paginationRoot.innerHTML = `
      <a class="pagination-link pagination-prev${currentPage === 1 ? " is-disabled" : ""}" href="${escapeHtml(buildGalleryUrl({ query, tag: activeTag, targetPage: Math.max(1, currentPage - 1) }))}" aria-disabled="${currentPage === 1}">上一页</a>
      <div class="pagination-pages">${pieces.join("")}</div>
      <a class="pagination-link pagination-next${currentPage === totalPages ? " is-disabled" : ""}" href="${escapeHtml(buildGalleryUrl({ query, tag: activeTag, targetPage: Math.min(totalPages, currentPage + 1) }))}" aria-disabled="${currentPage === totalPages}">下一页</a>
    `;
  };

  const renderPage = () => {
    const hasQueryDetail = Boolean(getSelectedPetId());
    const isDetailPage = page === "detail" || hasQueryDetail;

    if (galleryPanel instanceof HTMLElement) {
      galleryPanel.hidden = isDetailPage;
    }

    if (detailRoot instanceof HTMLElement) {
      detailRoot.hidden = !isDetailPage;
    }

    if (isDetailPage) {
      renderDetail();
      return;
    }

    setGalleryMeta();
    renderGallery();
  };

  const bindGalleryControls = () => {
    if (!searchForm || !(searchInput instanceof HTMLInputElement)) {
      return;
    }

    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const params = new URLSearchParams(window.location.search);
      window.history.pushState({}, "", buildGalleryUrl({
        query: searchInput.value.trim(),
        tag: (params.get("tag") || "").trim(),
        targetPage: 1
      }));
      renderPage();
    });

    searchInput.addEventListener("input", () => {
      if (searchInput.value.trim()) {
        return;
      }

      if (window.location.search) {
        const params = new URLSearchParams(window.location.search);
        const tag = (params.get("tag") || "").trim();
        window.history.pushState({}, "", buildGalleryUrl({ tag }));
        renderPage();
      }
    });

    window.addEventListener("popstate", renderPage);
  };

  const bindCopy = () => {
    document.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-copy-command]");
      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      const command = button.getAttribute("data-copy-command") || "";

      try {
        await navigator.clipboard.writeText(command);
        button.textContent = "已复制";
        window.setTimeout(() => {
          button.textContent = "复制";
        }, 1400);
      } catch {
        button.textContent = command;
      }
    });
  };

  const bindPreview = () => {
    const pet = getPet();
    if (!pet || !detailRoot) {
      return;
    }

    let previewElement = null;
    let active = false;
    let lastX = 0;
    let lastY = 0;
    let stopTimer = 0;
    let previewButton = null;

    const states = {
      idle: getStateByName(pet, "待机"),
      right: getStateByName(pet, "向右跑"),
      left: getStateByName(pet, "向左跑"),
      jump: getStateByName(pet, "跳跃")
    };

    const setState = (state) => {
      if (!previewElement) {
        return;
      }

      const y = Number.isFinite(state.y) ? state.y : 0;
      previewElement.style.backgroundPositionY = `${y}px`;
      previewElement.style.backgroundPositionX = "0px";
    };

    const movePreview = (event) => {
      if (!active || !previewElement) {
        return;
      }

      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;

      previewElement.style.left = `${event.clientX}px`;
      previewElement.style.top = `${event.clientY}px`;

      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 2) {
        setState(dx > 0 ? states.right : states.left);
        previewElement.classList.add("is-moving");
      } else if (dy < -6) {
        setState(states.jump);
        previewElement.classList.add("is-moving");
      } else if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        setState(states.right);
        previewElement.classList.add("is-moving");
      }

      window.clearTimeout(stopTimer);
      stopTimer = window.setTimeout(() => {
        previewElement?.classList.remove("is-moving");
        setState(states.idle);
      }, 160);
    };

    const stopPreview = () => {
      active = false;
      window.clearTimeout(stopTimer);
      document.body.classList.remove("pet-preview-active");
      previewElement?.remove();
      previewElement = null;
      if (previewButton) {
        previewButton.textContent = "预览";
      }
      window.removeEventListener("pointermove", movePreview);
      window.removeEventListener("keydown", handleKeydown);
    };

    function handleKeydown(event) {
      if (event.key === "Escape") {
        stopPreview();
      }
    }

    const startPreview = (event) => {
      active = true;
      lastX = event.clientX || window.innerWidth / 2;
      lastY = event.clientY || window.innerHeight / 2;

      previewElement = document.createElement("span");
      previewElement.className = "pet-cursor-preview";
      previewElement.style.backgroundImage = `url('${pet.image}')`;
      previewElement.style.left = `${lastX}px`;
      previewElement.style.top = `${lastY}px`;
      setState(states.idle);

      document.body.append(previewElement);
      document.body.classList.add("pet-preview-active");
      window.addEventListener("pointermove", movePreview, { passive: true });
      window.addEventListener("keydown", handleKeydown);
    };

    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const button = event.target.closest("[data-pet-preview]");
      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      if (active) {
        stopPreview();
        button.textContent = "预览";
        return;
      }

      startPreview(event);
      previewButton = button;
      previewButton.textContent = "退出预览";
    });
  };

  const bindBackLink = () => {
    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const link = event.target.closest("[data-pet-back]");
      if (!(link instanceof HTMLAnchorElement)) {
        return;
      }

      if (page !== "detail" && window.location.pathname === "/pets/") {
        event.preventDefault();
        const target = new URL(link.href);
        window.history.pushState({}, "", `${target.pathname}${target.search}`);
        renderPage();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      if (document.referrer) {
        try {
          const referrer = new URL(document.referrer);
          if (referrer.origin === window.location.origin && referrer.pathname === "/pets/" && window.history.length > 1) {
            event.preventDefault();
            window.history.back();
          }
        } catch {
          // Use the link href when referrer cannot be parsed.
        }
      }
    });
  };

  renderPage();

  bindCopy();
  bindGalleryControls();
  bindBackLink();
  bindPreview();
})();
