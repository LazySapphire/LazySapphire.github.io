(function () {
  const root = document.documentElement;
  const themeQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const translations = {
    en: {
      "skip.main": "Skip to main content",
      "nav.primary": "Primary navigation",
      "nav.menu": "Menu",
      "nav.home": "Home",
      "nav.reading_notes": "Reading Notes",
      "nav.notes": "Notes",
      "nav.projects": "Projects",
      "nav.projects_submenu": "Projects submenu",
      "nav.offline_rl": "Offline RL",
      "nav.robotics": "Robotics",
      "nav.tools": "Tools",
      "nav.tools_submenu": "Tools submenu",
      "nav.dev_tools": "Dev Tools",
      "nav.utils": "Utils",
      "nav.resume": "Resume",
      "nav.github": "GitHub",
      "theme.toggle": "Toggle color theme",
      "language.toggle": "Switch language",
      "home.eyebrow": "Personal Workspace",
      "home.headline": "Personal site and research workspace.",
      "home.sections": "Site sections",
      "section.papers.title": "Reading Notes",
      "section.papers.description": "Reading notes for papers, reports, and technical references.",
      "section.notes.title": "Notes",
      "section.notes.description": "Miscellaneous notes, technical memos, and short essays.",
      "section.projects.title": "Projects",
      "section.projects.description": "Projects and research work.",
      "section.tools.title": "Tools",
      "section.tools.description": "Tools and utilities.",
      "footer.built": "Built with Hugo"
    },
    zh: {
      "skip.main": "跳到正文",
      "nav.primary": "主导航",
      "nav.menu": "菜单",
      "nav.home": "主页",
      "nav.reading_notes": "阅读笔记",
      "nav.notes": "随笔",
      "nav.projects": "项目",
      "nav.projects_submenu": "项目子菜单",
      "nav.offline_rl": "离线强化学习",
      "nav.robotics": "机器人",
      "nav.tools": "工具",
      "nav.tools_submenu": "工具子菜单",
      "nav.dev_tools": "开发工具",
      "nav.utils": "实用工具",
      "nav.resume": "简历",
      "nav.github": "GitHub",
      "theme.toggle": "切换明暗主题",
      "language.toggle": "切换中英文",
      "home.eyebrow": "个人工作台",
      "home.headline": "个人主页与研究笔记工作区。",
      "home.sections": "站点栏目",
      "section.papers.title": "阅读笔记",
      "section.papers.description": "论文、报告与技术资料的阅读笔记。",
      "section.notes.title": "随笔",
      "section.notes.description": "零散笔记、技术备忘和短随笔。",
      "section.projects.title": "项目",
      "section.projects.description": "项目与研究工作。",
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
})();
