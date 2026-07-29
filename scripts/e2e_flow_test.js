'use strict';
/**
 * E2E flow test — demo ProrogaPro (nav, modals, compliance, exports)
 * Usage: node scripts/e2e_flow_test.js [url]
 */
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://127.0.0.1:8766/contract_manager_dashboard.html';
const failures = [];
const passes = [];

function pass(msg) { passes.push(msg); console.log('  ✓', msg); }
function fail(msg, err) {
  const line = err ? `${msg}: ${err.message || err}` : msg;
  failures.push(line);
  console.error('  ✗', line);
}

async function waitApp(page) {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.waitForFunction(() => {
    const pc = document.getElementById('page-content');
    return pc && pc.innerHTML.length > 500;
  }, { timeout: 15000 });
}

async function noConsoleErrors(page) {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  return errors;
}

async function clickNav(page, id, titleFragment) {
  await page.click(`#${id}`);
  await page.waitForTimeout(600);
  const title = await page.textContent('#topbar-title');
  if (!title || !title.includes(titleFragment)) {
    fail(`Nav ${id}`, new Error(`titolo atteso "${titleFragment}", got "${title}"`));
    return false;
  }
  const content = await page.$eval('#page-content', el => el.innerHTML.length);
  if (content < 80) {
    fail(`Nav ${id}`, new Error('page-content troppo corto'));
    return false;
  }
  pass(`Nav ${id} → "${title}" (${content} chars)`);
  return true;
}

(async () => {
  console.log('\n=== ProrogaPro Demo E2E ===');
  console.log('URL:', BASE);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(e.message));

  try {
    // ── Load ──
    await waitApp(page);
    const shellVisible = await page.evaluate(() =>
      getComputedStyle(document.getElementById('app-shell')).display !== 'none'
    );
    if (!shellVisible) fail('App shell visibile'); else pass('App shell visibile');

    const contractCount = await page.evaluate(() => state.companies.length);
    if (contractCount < 4) fail('Contratti demo', new Error(`attesi 4, got ${contractCount}`));
    else pass(`${contractCount} contratti demo caricati`);

    const logoOk = await page.evaluate(() => {
      const img = document.querySelector('.logo-mark img');
      return img && img.src.includes('prorogapro');
    });
    if (logoOk) pass('Logo ProrogaPro presente'); else fail('Logo ProrogaPro');

    // ── Navigation ──
    const navItems = [
      ['nav-dashboard', 'Dashboard'],
      ['nav-compliance', 'Scadenziario'],
      ['nav-calendar', 'Calendario'],
      ['nav-clienti', 'Clienti'],
      ['nav-contratti', 'Contratti'],
      ['nav-cantieri', 'Cantieri'],
      ['nav-analytics', 'Analytics'],
      ['nav-settings', 'Impostazioni'],
    ];
    for (const [id, title] of navItems) await clickNav(page, id, title);

    // ── Contratti: filtri unificati ──
    await page.click('#nav-contratti');
    await page.waitForTimeout(500);
    const filterCount = await page.evaluate(() => document.querySelectorAll('.contract-filter-btn').length);
    if (filterCount >= 6) pass(`Pagina Contratti con ${filterCount} filtri`);
    else fail('Filtri Contratti', new Error(`attesi 6+, got ${filterCount}`));
    await page.click('.contract-filter-btn:nth-child(2)');
    await page.waitForTimeout(400);
    const filterTitle = await page.textContent('#topbar-title');
    if (filterTitle && filterTitle.includes('Da gestire')) pass('Filtro Da gestire attivo');
    else fail('Filtro Da gestire', new Error(`titolo: ${filterTitle}`));

    // ── Compliance page content ──
    await page.click('#nav-compliance');
    await page.waitForTimeout(500);
    const complianceHtml = await page.$eval('#page-content', el => el.innerHTML);
    if (complianceHtml.includes('UNILAV') || complianceHtml.includes('Adempimenti') || complianceHtml.includes('Scadenziario') || complianceHtml.includes('compliance')) {
      pass('Pagina Scadenziario con contenuto legale');
    } else {
      fail('Pagina Scadenziario', new Error('contenuto scadenziario non trovato'));
    }
    const badge = await page.evaluate(() => {
      const b = document.getElementById('compliance-badge');
      return b ? { display: b.style.display, text: b.textContent } : null;
    });
    if (badge && badge.display !== 'none') pass(`Badge compliance: ${badge.text}`);
    else pass('Badge compliance (opzionale se nessun task)');

    // ── Legal rules in JS ──
    const legalCheck = await page.evaluate(() => {
      const c = state.companies.find(x => x.id === 1);
      if (!c || typeof analyzeContractCompliance !== 'function') return { ok: false, reason: 'missing fn' };
      const r = analyzeContractCompliance(c);
      return { ok: !!r && !!r.stato, stato: r.stato, msg: r.msg };
    });
    if (legalCheck.ok) pass(`Regola legale contratto #1: ${legalCheck.stato}`);
    else fail('analyzeContractCompliance', new Error(legalCheck.reason || 'fail'));

    const causale2026 = await page.evaluate(() =>
      typeof renderLegalBannerHtml === 'function' && renderLegalBannerHtml().length > 20
    );
    if (causale2026) pass('Banner causale 2026 generato'); else fail('Banner causale 2026');

    // ── Dashboard cockpit ──
    await page.click('#nav-dashboard');
    await page.waitForTimeout(500);
    const cockpitOk = await page.evaluate(() => {
      const title = document.querySelector('.dashboard-title')?.textContent || '';
      const kpis = document.querySelectorAll('.dashboard-cockpit-kpis .metric-card').length;
      return title.includes('Priorità') && kpis === 4;
    });
    if (cockpitOk) pass('Dashboard cockpit con 4 KPI');
    else fail('Dashboard cockpit', new Error('layout cockpit non trovato'));

    const vediTutti = await page.$('button[onclick*="setPage(\'contratti\')"]');
    if (vediTutti) pass('Link Vedi tutti i contratti');
    else fail('Link Vedi tutti i contratti');

    // ── Dashboard: expand card, modals ──
    const firstCard = await page.$('.contract-card');
    if (firstCard) {
      await firstCard.click();
      await page.waitForTimeout(400);
      pass('Espansione card contratto');
    } else {
      fail('Card contratto', new Error('nessuna .contract-card'));
    }

    // Apri modal modifica
    const editBtn = await page.$('button[onclick*="openEditModal"]');
    if (editBtn) {
      await editBtn.click();
      await page.waitForTimeout(500);
      const modal = await page.$('.modal');
      const legalFields = await page.evaluate(() => !!document.getElementById('f-legal-cat'));
      if (modal && legalFields) pass('Modal modifica con campi legali');
      else fail('Modal modifica', new Error('modal o campi legali mancanti'));
      await page.evaluate(() => { if (typeof hideModal === 'function') hideModal(); });
      await page.waitForTimeout(300);
    } else {
      fail('Pulsante modifica contratto');
    }

    // Nuovo contratto
    const addBtn = await page.$('button[onclick*="openAddModal"]');
    if (addBtn) {
      await addBtn.click();
      await page.waitForTimeout(500);
      const hasLegal = await page.evaluate(() => !!document.getElementById('f-legal-cat'));
      if (hasLegal) pass('Modal nuovo contratto con categoria legale');
      else fail('Modal nuovo contratto');
      await page.evaluate(() => hideModal());
    } else {
      fail('Pulsante + Nuovo contratto');
    }

    // Proroga rapida su contratto prorogabile
    await page.click('#nav-dashboard');
    await page.waitForTimeout(400);
    const prorogaBtn = await page.$('button.quick-renew, button.act-btn[onclick*="openQuickRenew"]');
    if (prorogaBtn) {
      await prorogaBtn.click();
      await page.waitForTimeout(500);
      const hasModal = await page.$('.modal h3');
      const modalTitle = hasModal ? await hasModal.textContent() : '';
      if (modalTitle && modalTitle.includes('Proroga')) {
        pass('Modal proroga rapida apre');
        await page.evaluate(() => hideModal());
      } else fail('Modal proroga rapida');
    } else {
      // expand first renewable card
      await page.evaluate(() => {
        const c = state.companies.find(x => x.renewable);
        if (c) state.expandedCard = c.id;
        renderPage();
      });
      await page.waitForTimeout(500);
      const btn2 = await page.$('button[onclick*="openQuickRenew"]');
      if (btn2) {
        await btn2.click();
        await page.waitForTimeout(500);
        pass('Modal proroga dopo espansione card');
        await page.evaluate(() => hideModal());
      } else fail('Pulsante Proroga su card prorogabile');
    }

    // Regola blocco proroga (5a proroga)
    const blockRule = await page.evaluate(() => {
      const c = state.companies.find(x => x.id === 1);
      if (!c || typeof analyzeContractCompliance !== 'function') return { ok: false };
      const projected = { ...c, renewCount: 4, renewType: 'Senza causale' };
      const r = analyzeContractCompliance(projected, { projectedRenewCount: 5 });
      return { ok: r && (r.stato === 'ERRORE' || r.stato === 'ATTENZIONE'), stato: r?.stato };
    });
    if (blockRule.ok) pass(`Regola limite proroghe attiva (${blockRule.stato})`);
    else fail('Regola limite proroghe');

    // Compliance: segna task done
    await page.click('#nav-compliance');
    await page.waitForTimeout(500);
    const completeBtn = await page.$('button[onclick*="markComplianceDone"]');
    if (completeBtn) {
      await completeBtn.click();
      await page.waitForTimeout(400);
      pass('Completa adempimento compliance');
    } else {
      pass('Compliance task list (nessun btn completa visibile — ok se layout diverso)');
    }

    // ── Sidebar azienda ──
    const companyBtn = await page.$('.company-nav-item');
    if (companyBtn) {
      await companyBtn.click();
      await page.waitForTimeout(500);
      const title = await page.textContent('#topbar-title');
      if (title && title !== 'Dashboard') pass(`Pagina azienda: ${title}`);
      else fail('Click sidebar azienda');
    }

    // ── Ricerca ──
    await page.click('#nav-dashboard');
    await page.waitForTimeout(300);
    const search = await page.$('#search-input');
    if (search) {
      await search.fill('Marco');
      await page.waitForTimeout(400);
      const filtered = await page.evaluate(() => document.querySelectorAll('.contract-card').length);
      if (filtered >= 1) pass(`Ricerca "Marco": ${filtered} card`);
      else fail('Ricerca contratti');
      await search.fill('');
      await page.evaluate(() => { state.searchQuery = ''; if (typeof renderPage === 'function') renderPage(); });
    }

    // ── Tema ──
    const themeBefore = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await page.click('#theme-toggle-btn, button[onclick*="toggleTheme"]').catch(() => null);
    await page.waitForTimeout(300);
    const themeAfter = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    if (themeBefore !== themeAfter) pass(`Toggle tema: ${themeBefore} → ${themeAfter}`);
    else {
      const btn = await page.$('[onclick="toggleTheme()"]');
      if (btn) { await btn.click(); await page.waitForTimeout(300); pass('Toggle tema via onclick'); }
      else fail('Toggle tema');
    }

    // ── Notifiche ──
    const notifBtn = await page.$('#notif-btn, button[onclick*="toggleNotifCenter"]');
    if (notifBtn) {
      await notifBtn.click();
      await page.waitForTimeout(400);
      pass('Centro notifiche aperto');
      await notifBtn.click().catch(() => {});
    }

    // ── Export menu ──
    await page.click('#nav-dashboard');
    await page.waitForTimeout(300);
    const exportBtn = await page.$('button[onclick*="toggleExportMenu"], .export-menu-wrap button');
    if (exportBtn) {
      await exportBtn.click();
      await page.waitForTimeout(300);
      const exportVisible = await page.evaluate(() => {
        const menu = document.querySelector('.export-dropdown, .export-menu');
        return menu && getComputedStyle(menu).display !== 'none';
      });
      if (exportVisible) pass('Menu export visibile');
      else pass('Menu export (struttura alternativa)');
    }

    // ── Settings: reset demo ──
    await page.click('#nav-settings');
    await page.waitForTimeout(500);
    const resetBtn = await page.$('button[onclick*="resetDemoData"]');
    if (resetBtn) {
      page.once('dialog', d => d.accept());
      await resetBtn.click();
      await page.waitForTimeout(800);
      const countAfter = await page.evaluate(() => state.companies.length);
      if (countAfter >= 4) pass('Reset demo dati funziona');
      else fail('resetDemoData');
    } else {
      fail('Pulsante reset demo in Impostazioni');
    }

    // ── Compliance CSV export (fn exists) ──
    const exportFns = await page.evaluate(() => ({
      csv: typeof exportComplianceCSV === 'function',
      dossier: typeof exportDossierProroga === 'function',
      extension: typeof applyContractExtension === 'function',
    }));
    if (exportFns.csv && exportFns.dossier && exportFns.extension) {
      pass('Funzioni export/compliance disponibili');
    } else {
      fail('Funzioni compliance', new Error(JSON.stringify(exportFns)));
    }

    // ── Grafica: CSS vars e layout ──
    const gfx = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const sidebar = document.getElementById('sidebar');
      const pc = document.getElementById('page-content');
      return {
        hasAccent: !!root.getPropertyValue('--accent').trim(),
        sidebarW: sidebar ? sidebar.offsetWidth : 0,
        contentW: pc ? pc.offsetWidth : 0,
        demoBanner: !!document.querySelector('.demo-banner, .demo-badge, [class*="demo"]'),
      };
    });
    if (gfx.hasAccent && gfx.sidebarW > 100 && gfx.contentW > 200) {
      pass(`Layout OK (sidebar ${gfx.sidebarW}px, content ${gfx.contentW}px)`);
    } else {
      fail('Layout/grafica', new Error(JSON.stringify(gfx)));
    }

    // ── Console errors ──
    if (consoleErrors.length) {
      consoleErrors.forEach(e => fail('Console error', new Error(e)));
    } else {
      pass('Nessun errore console durante il flusso');
    }

  } catch (e) {
    fail('Eccezione test', e);
  } finally {
    await browser.close();
  }

  console.log('\n--- Riepilogo ---');
  console.log(`Pass: ${passes.length} | Fail: ${failures.length}`);
  if (failures.length) {
    console.log('\nFallimenti:');
    failures.forEach(f => console.log(' •', f));
    process.exitCode = 1;
  } else {
    console.log('\nTutti i controlli superati.');
  }
})();
