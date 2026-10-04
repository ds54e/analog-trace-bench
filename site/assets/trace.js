(() => {
  const tablist = document.querySelector('[data-run-tabs]');
  if (!tablist) return;

  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const panels = tabs
    .map((tab) => document.getElementById(tab.getAttribute('aria-controls')))
    .filter(Boolean);

  const activate = (nextTab, moveFocus = false) => {
    tabs.forEach((tab) => {
      const selected = tab === nextTab;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });

    panels.forEach((panel) => {
      panel.hidden = panel.id !== nextTab.getAttribute('aria-controls');
    });

    if (moveFocus) nextTab.focus();
  };

  activate(tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0]);

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', (event) => {
      const keyMap = {
        ArrowLeft: index - 1,
        ArrowRight: index + 1,
        Home: 0,
        End: tabs.length - 1,
      };

      if (!(event.key in keyMap)) return;
      event.preventDefault();
      const nextIndex = (keyMap[event.key] + tabs.length) % tabs.length;
      activate(tabs[nextIndex], true);
    });
  });
})();
