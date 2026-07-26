// ═══════════════════════════════════════
// LOGOUT / RESET DEMO
// ═══════════════════════════════════════
function doLogout() {
  if (typeof isDemoMode === 'function' && isDemoMode()) {
    if (typeof resetDemoData === 'function') resetDemoData();
    return;
  }
  authUser = null;
  var appShell = document.getElementById('app-shell');
  if (appShell) appShell.style.display = 'none';
  var loginScreen = document.getElementById('login-screen');
  if (loginScreen) {
    loginScreen.innerHTML = '<div class="login-card"><h3>Sei stato disconnesso</h3><button class="tb-btn primary" onclick="location.reload()">Accedi di nuovo</button></div>';
    loginScreen.style.display = 'flex';
  }
}
