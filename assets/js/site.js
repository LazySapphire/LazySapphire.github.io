(function () {
  const root = document.documentElement;
  const themeQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const translations = {
    en: {
      "skip.main": "Skip to main content",
      "nav.primary": "Primary navigation",
      "nav.menu": "Menu",
      "nav.home": "Home",
      "nav.reading_notes": "Paper Reading",
      "nav.reading_notes_submenu": "Paper reading submenu",
      "nav.paper_briefs": "Paper Briefs",
      "nav.collections": "Collections",
      "nav.collections_submenu": "Collections submenu",
      "nav.resources": "Resources",
      "nav.surveys": "Surveys",
      "nav.notes": "Notes",
      "nav.projects": "Projects",
      "nav.projects_submenu": "Projects submenu",
      "nav.offline_rl": "Offline RL",
      "nav.robotics": "Robotics",
      "nav.tools": "Tools",
      "nav.tools_submenu": "Tools submenu",
      "nav.dev_tools": "Dev Tools",
      "nav.utils": "Utils",
      "nav.dexterous_hands": "Dexterous Hands",
      "nav.dexterous_hands_submenu": "Dexterous Hands submenu",
      "nav.genesis_piano": "Dexterous Hand Piano - Genesis AI",
      "nav.resume": "Resume",
      "nav.github": "GitHub",
      "theme.toggle": "Toggle color theme",
      "language.toggle": "Switch language",
      "home.eyebrow": "Personal Workspace",
      "home.headline": "Personal site and research workspace.",
      "home.sections": "Site sections",
      "section.papers.title": "Paper Reading",
      "section.papers.description": "Unified paper library for full notes, briefs, and research leads.",
      "section.paper-briefs.title": "Paper Briefs",
      "section.paper-briefs.description": "Quick paper cards before full reading notes.",
      "section.resources.title": "Resources",
      "section.resources.description": "Saved links, product news, open-source projects, and online tools.",
      "section.surveys.title": "Surveys",
      "section.surveys.description": "Lightweight overviews of topics, tools, and research directions.",
      "section.collections.title": "Collections",
      "section.collections.description": "Saved resources, papers, surveys, tools, and external links.",
      "section.notes.title": "Notes",
      "section.notes.description": "Short essays, loose ideas, and non-project notes.",
      "section.projects.title": "Projects",
      "section.projects.description": "Projects, technical reports, and research work.",
      "section.tools.title": "Tools",
      "section.tools.description": "Tools and utilities.",
      "footer.built": "Built with Hugo"
    },
    zh: {
      "skip.main": "跳到正文",
      "nav.primary": "主导航",
      "nav.menu": "菜单",
      "nav.home": "主页",
      "nav.reading_notes": "论文阅读",
      "nav.reading_notes_submenu": "论文阅读子菜单",
      "nav.paper_briefs": "论文速读",
      "nav.collections": "收藏",
      "nav.collections_submenu": "收藏子菜单",
      "nav.resources": "资料速记",
      "nav.surveys": "主题综述",
      "nav.notes": "随笔",
      "nav.projects": "项目",
      "nav.projects_submenu": "项目子菜单",
      "nav.offline_rl": "离线强化学习",
      "nav.robotics": "机器人",
      "nav.tools": "工具",
      "nav.tools_submenu": "工具子菜单",
      "nav.dev_tools": "开发工具",
      "nav.utils": "实用工具",
      "nav.dexterous_hands": "灵巧手",
      "nav.dexterous_hands_submenu": "灵巧手子菜单",
      "nav.genesis_piano": "灵巧手弹钢琴 - Genesis AI",
      "nav.resume": "简历",
      "nav.github": "GitHub",
      "theme.toggle": "切换明暗主题",
      "language.toggle": "切换中英文",
      "home.eyebrow": "个人工作台",
      "home.headline": "个人主页与研究笔记工作区。",
      "home.sections": "站点栏目",
      "section.papers.title": "论文阅读",
      "section.papers.description": "统一管理论文精读、论文速读和后续可继续整理的论文线索。",
      "section.paper-briefs.title": "论文速读",
      "section.paper-briefs.description": "进入精读前的论文快速卡片。",
      "section.resources.title": "资料速记",
      "section.resources.description": "保存链接、产品资讯、开源项目和在线工具。",
      "section.surveys.title": "主题综述",
      "section.surveys.description": "围绕主题、工具和研究方向整理的轻量概览。",
      "section.collections.title": "收藏",
      "section.collections.description": "收藏资料、论文阅读、主题综述、工具和外部链接。",
      "section.notes.title": "随笔",
      "section.notes.description": "短随笔、松散想法和非项目化记录。",
      "section.projects.title": "项目",
      "section.projects.description": "项目、技术报告与研究工作。",
      "section.tools.title": "工具",
      "section.tools.description": "工具与实用程序。",
      "footer.built": "由 Hugo 构建"
    }
  };

  function readStoredValue(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function storeValue(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // Ignore storage failures; controls still work for the current page.
    }
  }

  function preferredTheme() {
    const storedTheme = readStoredValue("theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      return storedTheme;
    }
    return themeQuery.matches ? "dark" : "light";
  }

  function updateThemeImages(theme) {
    document.querySelectorAll("[data-light-src][data-dark-src]").forEach((image) => {
      const nextSource = theme === "dark" ? image.dataset.darkSrc : image.dataset.lightSrc;
      if (nextSource && image.getAttribute("src") !== nextSource) {
        image.setAttribute("src", nextSource);
      }
    });
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    updateThemeImages(theme);
  }

  function preferredLanguage() {
    const storedLanguage = readStoredValue("uiLanguage");
    if (storedLanguage === "en" || storedLanguage === "zh") {
      return storedLanguage;
    }
    return navigator.language && navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
  }

  function applyLanguage(language) {
    const nextLanguage = translations[language] ? language : "en";
    const dictionary = translations[nextLanguage];

    root.lang = nextLanguage === "zh" ? "zh-CN" : "en";
    root.dataset.language = nextLanguage;

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.dataset.i18n;
      if (dictionary[key]) {
        element.textContent = dictionary[key];
      }
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      const key = element.dataset.i18nAriaLabel;
      if (dictionary[key]) {
        element.setAttribute("aria-label", dictionary[key]);
      }
    });

    document.querySelectorAll("[data-i18n-title]").forEach((element) => {
      const key = element.dataset.i18nTitle;
      if (dictionary[key]) {
        element.setAttribute("title", dictionary[key]);
      }
    });
  }

  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");

  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  const themeToggle = document.querySelector(".theme-toggle");

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(next);
      storeValue("theme", next);
    });
  }

  const languageToggle = document.querySelector(".language-toggle");

  if (languageToggle) {
    languageToggle.addEventListener("click", () => {
      const next = root.dataset.language === "zh" ? "en" : "zh";
      applyLanguage(next);
      storeValue("uiLanguage", next);
    });
  }

  applyTheme(preferredTheme());
  applyLanguage(preferredLanguage());

  if (themeQuery.addEventListener) {
    themeQuery.addEventListener("change", () => {
      if (!readStoredValue("theme")) {
        applyTheme(preferredTheme());
      }
    });
  }

  function initPaperLibrary() {
    const library = document.querySelector("[data-paper-library]");
    if (!library) {
      return;
    }

    const rows = Array.from(library.querySelectorAll("[data-paper-item]"));
    const filterButtons = Array.from(library.querySelectorAll("[data-paper-filter]"));
    const tagButtons = Array.from(library.querySelectorAll("[data-paper-tag]"));
    const searchInput = library.querySelector("[data-paper-search]");
    const emptyState = library.querySelector("[data-paper-empty]");
    const detailBody = library.querySelector("[data-paper-detail-body]");

    let activeFilter = "all";
    let activeTag = "all";

    function parseDetail(row) {
      try {
        return JSON.parse(row.dataset.paperDetail || "{}");
      } catch (error) {
        return {};
      }
    }

    function setOptionalLink(selector, url) {
      const link = detailBody && detailBody.querySelector(selector);
      if (!link) {
        return;
      }
      if (url) {
        link.href = url;
        link.hidden = false;
      } else {
        link.hidden = true;
      }
    }

    function setText(selector, value, fallback = "未记录") {
      const node = detailBody && detailBody.querySelector(selector);
      if (node) {
        node.textContent = value || fallback;
      }
    }

    function clearDetail() {
      if (!detailBody) {
        return;
      }

      rows.forEach((candidate) => candidate.classList.remove("is-selected"));
      const cover = detailBody.querySelector("[data-detail-cover]");
      if (cover) {
        cover.hidden = true;
        cover.removeAttribute("src");
      }

      setText("[data-detail-kind]", "", "");
      setText("[data-detail-title]", "没有匹配条目", "");
      setText("[data-detail-paper-title]", "调整目录、标签或搜索", "");
      setText("[data-detail-authors]", "", "");
      setText("[data-detail-year]", "", "");
      setText("[data-detail-venue]", "", "");
      setText("[data-detail-status]", "", "");
      setText("[data-detail-arxiv]", "", "");
      setText("[data-detail-doi]", "", "");
      setText("[data-detail-description]", "", "");

      const tagBox = detailBody.querySelector("[data-detail-tags]");
      if (tagBox) {
        tagBox.innerHTML = "";
      }

      const openLink = detailBody.querySelector("[data-detail-open]");
      if (openLink) {
        openLink.removeAttribute("href");
      }
      setOptionalLink("[data-detail-paper]", "");
      setOptionalLink("[data-detail-project]", "");
      setOptionalLink("[data-detail-code]", "");
    }

    function selectRow(row) {
      if (!row || row.hidden) {
        row = rows.find((candidate) => !candidate.hidden);
      }
      if (!row || !detailBody) {
        clearDetail();
        return;
      }

      rows.forEach((candidate) => candidate.classList.toggle("is-selected", candidate === row));
      const detail = parseDetail(row);
      const cover = detailBody.querySelector("[data-detail-cover]");

      if (cover) {
        if (detail.cover) {
          cover.src = detail.cover;
          cover.alt = detail.title || "";
          cover.hidden = false;
        } else {
          cover.hidden = true;
          cover.removeAttribute("src");
        }
      }

      setText("[data-detail-kind]", detail.kind);
      setText("[data-detail-title]", detail.title);
      setText("[data-detail-paper-title]", detail.paperTitle);
      setText("[data-detail-authors]", detail.authors);
      setText("[data-detail-year]", detail.year);
      setText("[data-detail-venue]", detail.venue);
      setText("[data-detail-status]", detail.status);
      setText("[data-detail-arxiv]", detail.arxiv);
      setText("[data-detail-doi]", detail.doi);
      setText("[data-detail-description]", detail.description);

      const tagBox = detailBody.querySelector("[data-detail-tags]");
      if (tagBox) {
        tagBox.innerHTML = "";
        [...(detail.tags || []), ...(detail.topics || [])].forEach((tag) => {
          const chip = document.createElement("span");
          chip.textContent = tag;
          tagBox.appendChild(chip);
        });
      }

      const openLink = detailBody.querySelector("[data-detail-open]");
      if (openLink) {
        if (detail.url) {
          openLink.href = detail.url;
        } else {
          openLink.removeAttribute("href");
        }
      }
      setOptionalLink("[data-detail-paper]", detail.paperUrl);
      setOptionalLink("[data-detail-project]", detail.projectUrl);
      setOptionalLink("[data-detail-code]", detail.codeUrl);
    }

    function matchesFilter(row) {
      if (activeFilter === "all") {
        return true;
      }
      if (activeFilter === "current" || activeFilter === "triaged") {
        return row.dataset.paperStatus === activeFilter;
      }
      return row.dataset.paperGroup === activeFilter;
    }

    function matchesTag(row) {
      if (activeTag === "all") {
        return true;
      }
      return (row.dataset.paperTags || "").split("|").includes(activeTag);
    }

    function matchesSearch(row) {
      const query = (searchInput && searchInput.value ? searchInput.value : "").trim().toLowerCase();
      if (!query) {
        return true;
      }
      return (row.dataset.paperSearchText || "").toLowerCase().includes(query);
    }

    function applyFilters() {
      let visibleCount = 0;

      rows.forEach((row) => {
        const visible = matchesFilter(row) && matchesTag(row) && matchesSearch(row);
        row.hidden = !visible;
        if (visible) {
          visibleCount += 1;
        }
      });

      if (emptyState) {
        emptyState.hidden = visibleCount > 0;
      }

      const selected = rows.find((row) => row.classList.contains("is-selected") && !row.hidden);
      selectRow(selected);
    }

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        activeFilter = button.dataset.paperFilter || "all";
        filterButtons.forEach((candidate) => candidate.classList.toggle("is-active", candidate === button));
        applyFilters();
      });
    });

    tagButtons.forEach((button) => {
      button.addEventListener("click", () => {
        activeTag = button.dataset.paperTag || "all";
        tagButtons.forEach((candidate) => candidate.classList.toggle("is-active", candidate === button));
        applyFilters();
      });
    });

    rows.forEach((row) => {
      row.addEventListener("click", () => selectRow(row));
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectRow(row);
        }
      });
    });

    if (searchInput) {
      searchInput.addEventListener("input", applyFilters);
    }

    selectRow(rows[0]);
  }

  initPaperLibrary();
})();
