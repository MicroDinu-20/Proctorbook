window.showLoader = function() {
  const loaderOverlay = document.getElementById('loader-overlay');
  if (loaderOverlay) loaderOverlay.style.display = 'flex';
};

window.hideLoader = function() {
  const loaderOverlay = document.getElementById('loader-overlay');
  if (loaderOverlay) loaderOverlay.style.display = 'none';
};
