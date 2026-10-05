(() => {
  const navigation = document.querySelector('[data-run-navigation]');
  if (!navigation) return;

  // Keep native link activation, history and opening in a new tab.
  const links = [...navigation.querySelectorAll('a[href]')];
  links.forEach((link, index) => {
    link.addEventListener('keydown', (event) => {
      const keyMap = {
        ArrowLeft: index - 1,
        ArrowRight: index + 1,
        Home: 0,
        End: links.length - 1,
      };
      if (!(event.key in keyMap)) return;
      event.preventDefault();
      links[(keyMap[event.key] + links.length) % links.length].focus();
    });
  });
})();
