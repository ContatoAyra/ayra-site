/* Ayra — interações do site (leve, sem dependências)
   - Acessibilidade: tamanho de texto (A-/A+) e alto contraste, com preferência salva
   - Carrinho e favoritos em painéis laterais
   - Envio da seleção por WhatsApp (pagamento online chega na fase 2)
*/
(function () {
  'use strict';

  var WHATS = '5521999230233';

  // Armazenamento seguro (não quebra se o navegador bloquear)
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- Acessibilidade: tamanho do texto ---------- */
  var scale = parseFloat(store.get('ayra-scale')) || 1;
  var MIN = 1, MAX = 1.4, STEP = 0.1;
  function applyScale() {
    document.documentElement.style.setProperty('--font-scale', scale.toFixed(2));
    store.set('ayra-scale', scale);
  }
  function inc() { scale = Math.min(MAX, +(scale + STEP).toFixed(2)); applyScale(); }
  function dec() { scale = Math.max(MIN, +(scale - STEP).toFixed(2)); applyScale(); }
  applyScale();

  /* ---------- Acessibilidade: alto contraste ---------- */
  if (store.get('ayra-hc') === '1') document.body.classList.add('hc');
  function toggleContrast() {
    document.body.classList.toggle('hc');
    store.set('ayra-hc', document.body.classList.contains('hc') ? '1' : '0');
  }

  function on(id, ev, fn) { var el = document.getElementById(id); if (el) el.addEventListener(ev, fn); }
  on('fontPlus', 'click', inc); on('fontMinus', 'click', dec); on('contrast', 'click', toggleContrast);
  on('fontPlusM', 'click', inc); on('fontMinusM', 'click', dec); on('contrastM', 'click', toggleContrast);

  /* ---------- Painéis (drawers) ---------- */
  var overlay = document.getElementById('overlay');
  function openDrawer(id) {
    var d = document.getElementById(id); if (!d) return;
    d.classList.add('open'); overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawers() {
    document.querySelectorAll('.drawer.open').forEach(function (d) { d.classList.remove('open'); });
    overlay.classList.remove('open'); document.body.style.overflow = '';
  }
  on('openCart', 'click', function () { renderCart(); openDrawer('cartDrawer'); });
  on('openFav', 'click', function () { openDrawer('favDrawer'); });
  overlay.addEventListener('click', closeDrawers);
  document.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', closeDrawers); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeDrawers(); closeMenu(); } });

  /* ---------- Carrinho ---------- */
  var cart = [];
  try { cart = JSON.parse(store.get('ayra-cart') || '[]') || []; } catch (e) { cart = []; }
  function saveCart() { store.set('ayra-cart', JSON.stringify(cart)); }
  var cartBadge = document.getElementById('cartBadge');
  var cartBody = document.getElementById('cartBody');
  var cartTotal = document.getElementById('cartTotal');
  var cartWa = document.getElementById('cartWa');

  function money(n) { return 'R$ ' + n.toLocaleString('pt-BR'); }

  function addToCart(name, price) {
    var found = cart.find(function (i) { return i.name === name; });
    if (found) found.qty++; else cart.push({ name: name, price: price, qty: 1 });
    saveCart(); updateBadge(); pulse(cartBadge);
  }
  function removeFromCart(idx) { cart.splice(idx, 1); saveCart(); renderCart(); updateBadge(); }

  function updateBadge() {
    var count = cart.reduce(function (s, i) { return s + i.qty; }, 0);
    if (count > 0) { cartBadge.hidden = false; cartBadge.textContent = count; }
    else cartBadge.hidden = true;
  }
  function renderCart() {
    if (!cart.length) { cartBody.innerHTML = '<p class="empty">Seu carrinho está vazio.</p>'; cartTotal.textContent = 'R$ 0'; buildWa(); return; }
    var html = '', total = 0;
    cart.forEach(function (i, idx) {
      total += i.price * i.qty;
      html += '<div class="cart-item"><div><strong>' + i.name + '</strong>' +
              '<span>' + i.qty + ' × ' + (i.price ? money(i.price) : 'sob consulta') + '</span></div>' +
              '<button class="rm" data-idx="' + idx + '" aria-label="Remover">&times;</button></div>';
    });
    cartBody.innerHTML = html;
    cartTotal.textContent = money(total);
    cartBody.querySelectorAll('.rm').forEach(function (b) {
      b.addEventListener('click', function () { removeFromCart(+b.getAttribute('data-idx')); });
    });
    buildWa();
  }
  function buildWa() {
    var lines = cart.map(function (i) { return '• ' + i.qty + 'x ' + i.name; });
    var msg = 'Olá Ayra! Gostaria de concluir minha seleção:%0A' + encodeURIComponent(lines.join('\n'));
    cartWa.href = 'https://wa.me/' + WHATS + '?text=' + msg;
  }
  function pulse(el) { if (!el) return; el.style.transform = 'scale(1.3)'; setTimeout(function () { el.style.transform = ''; }, 180); }

  document.querySelectorAll('.add').forEach(function (btn) {
    btn.addEventListener('click', function () {
      addToCart(btn.getAttribute('data-name'), parseFloat(btn.getAttribute('data-price')) || 0);
      var original = btn.textContent; btn.textContent = 'Adicionado ✓';
      setTimeout(function () { btn.textContent = original; }, 1200);
    });
  });
  updateBadge(); // reflete o carrinho salvo ao abrir qualquer página

  /* ---------- Leitor de artigos (abre na própria página) ---------- */
  (function articleReader() {
    var ov = document.getElementById('articleOverlay');
    if (!ov) return;
    var body = document.getElementById('articleBody');
    var cat = document.getElementById('artCat');

    function open(id) {
      var src = document.getElementById('article-' + id);
      if (!src) return;
      body.innerHTML = src.innerHTML;
      cat.innerHTML = src.getAttribute('data-cat') || 'Artigo';
      ov.classList.add('open');
      document.body.style.overflow = 'hidden';
      ov.scrollTop = 0;
    }
    function close() { ov.classList.remove('open'); document.body.style.overflow = ''; }

    document.querySelectorAll('.article-open').forEach(function (b) {
      b.addEventListener('click', function () { open(b.getAttribute('data-article')); });
    });
    on('articleClose', 'click', close);
    on('articleBack', 'click', close);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  })();

  /* ---------- Hero: carrossel das seções ---------- */
  (function heroCarousel() {
    var track = document.getElementById('heroTrack');
    if (!track) return;
    var slides = track.children;
    var count = slides.length;
    var dotsWrap = document.getElementById('heroDots');
    var index = 0, timer = null;
    var DELAY = 6000;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Cria os "dots"
    for (var i = 0; i < count; i++) {
      var d = document.createElement('button');
      d.setAttribute('role', 'tab');
      d.setAttribute('aria-label', 'Ir para o slide ' + (i + 1));
      d.addEventListener('click', (function (n) { return function () { go(n, true); }; })(i));
      dotsWrap.appendChild(d);
    }
    var dots = dotsWrap.children;

    function render() {
      track.style.transform = 'translateX(' + (-index * 100) + '%)';
      for (var j = 0; j < dots.length; j++) dots[j].classList.toggle('active', j === index);
    }
    function go(n, user) {
      index = (n + count) % count;
      render();
      if (user) restart();
    }
    function next() { go(index + 1); }
    function prev() { go(index - 1); }

    function start() { if (!reduce) timer = setInterval(next, DELAY); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function restart() { stop(); start(); }

    on('heroNext', 'click', function () { go(index + 1, true); });
    on('heroPrev', 'click', function () { go(index - 1, true); });

    var hero = document.getElementById('topo');
    hero.addEventListener('mouseenter', stop);
    hero.addEventListener('mouseleave', start);
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });

    // Swipe no celular
    var x0 = null;
    hero.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; stop(); }, { passive: true });
    hero.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 45) (dx < 0 ? next : prev)();
      x0 = null; start();
    }, { passive: true });

    render();
    start();
  })();

  /* ---------- Menu mobile ---------- */
  var menu = document.getElementById('mobileMenu');
  function closeMenu() { if (menu) menu.classList.remove('open'); document.body.style.overflow = ''; }
  on('openMenu', 'click', function () { menu.classList.add('open'); document.body.style.overflow = 'hidden'; });
  on('closeMenu', 'click', closeMenu);
  if (menu) menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeMenu); });
})();
