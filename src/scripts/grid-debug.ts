const params = new URLSearchParams(window.location.search);
if (params.has('debug') || localStorage.getItem('debugGrid') === '1') {
  document.documentElement.dataset.debugGrid = 'true';
}
