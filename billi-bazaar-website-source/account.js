(() => {
  const MEMBERS_KEY = 'billi-bazaar-members-v1';
  const CURRENT_KEY = 'billi-bazaar-current-member';
  let resumeCheckout = false;
  const readMembers = () => { try { return JSON.parse(localStorage.getItem(MEMBERS_KEY) || '{}'); } catch { return {}; } };
  const writeMembers = members => localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
  const current = () => { const phone = localStorage.getItem(CURRENT_KEY); return phone ? readMembers()[phone] || null : null; };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const openModal = () => { document.querySelector('#modal-wrap').classList.add('open'); document.body.style.overflow = 'hidden'; };
  const closeModal = () => { document.querySelector('#modal-wrap').classList.remove('open'); document.body.style.overflow = ''; };
  function open(options = {}) {
    resumeCheckout = resumeCheckout || Boolean(options.resumeCheckout);
    const member = current();
    member ? renderDashboard(member) : renderSignIn();
    openModal();
  }
  function renderSignIn(error = '') {
    document.querySelector('#modal-content').innerHTML = `<section class="account-panel"><p class="eyebrow">BILLI BAZAAR REWARDS</p><h2>Account and rewards</h2><p class="account-intro">Sign in or join with your mobile number to save your customer ID and keep your Thread points together.</p><form id="member-form" class="account-form"><label>Your name <span>(new members)</span><input name="name" autocomplete="name" placeholder="Name on your Billi profile"></label><label>Mobile number<input name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" pattern="[0-9]{10}" maxlength="10" minlength="10" placeholder="10-digit Indian mobile number" required></label><p class="account-error" role="alert">${esc(error)}</p><button class="button button-dark" type="submit">Continue to my account ↗</button></form></section>`;
    const form = document.querySelector('#member-form');
    form.onsubmit = event => {
      event.preventDefault();
      const phone = form.elements.phone.value.replace(/\D/g, '').slice(-10);
      const name = form.elements.name.value.trim();
      if (!/^\d{10}$/.test(phone)) return renderSignIn('Enter a valid 10-digit mobile number.');
      const members = readMembers();
      let member = members[phone];
      if (!member && name.length < 2) return renderSignIn('Add your name to create your Billi Bazaar account.');
      if (!member) {
        const id = `BB-${phone.slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;
        member = { id, name, phone, points: 0, ledger: [], freebieReserved: false, orders: [], joinedAt: new Date().toISOString() };
      } else if (name.length >= 2) member.name = name;
      members[phone] = member;
      writeMembers(members);
      localStorage.setItem(CURRENT_KEY, phone);
      window.dispatchEvent(new CustomEvent('billi:accountchange', { detail: member }));
      const next = resumeCheckout;
      resumeCheckout = false;
      if (next) {
        closeModal();
        if (location.hash === '#checkout') window.mountBilliCheckout();
        else location.hash = 'checkout';
      } else renderDashboard(member);
    };
  }
  function renderDashboard(member) {
    const points = Number(member.points) || 0;
    const remaining = Math.max(0, 500 - points);
    const tier = points >= 1500 ? 'Gold member' : points >= 500 ? 'Silver member' : 'Member';
    const ledger = (member.ledger || []).slice(0, 4);
    const freebie = member.freebieReserved ? '<div class="account-freebie">Your free item is reserved for your next order.</div>' : '';
    document.querySelector('#modal-content').innerHTML = `<section class="account-panel account-dashboard"><p class="eyebrow">${tier.toUpperCase()} · MEMBER ACCOUNT</p><h2>Welcome, ${esc(member.name.split(/\s+/)[0])}.</h2><div class="member-id">CUSTOMER ID <strong>${esc(member.id)}</strong><button type="button" id="copy-member-id" aria-label="Copy customer ID">Copy</button></div><div class="account-points"><span>THREAD POINTS</span><strong>${points.toLocaleString('en-IN')}</strong><small>${remaining ? `${remaining} points until you can redeem a free item` : 'You can redeem a free item.'}</small><div class="account-progress"><i style="width:${Math.min(100, points / 5)}%"></i></div></div>${freebie}${points >= 500 && !member.freebieReserved ? '<button class="button button-dark" type="button" id="redeem-freebie">Redeem 500 points for a free item ↗</button>' : ''}<div class="account-history"><h3>Recent activity</h3>${ledger.length ? ledger.map(row => `<p><span>${esc(row.label)}</span><b>${row.delta > 0 ? '+' : ''}${Number(row.delta).toLocaleString('en-IN')} pts</b></p>`).join('') : '<p class="account-empty">Earn 100 points for each item in your first order.</p>'}</div><div class="account-actions"><button class="button button-dark" type="button" id="account-shop">Continue shopping</button><button class="account-signout" type="button" id="account-signout">Sign out</button></div></section>`;
    document.querySelector('#copy-member-id').onclick = async () => { try { await navigator.clipboard.writeText(member.id); } catch { const area = document.createElement('textarea'); area.value = member.id; document.body.append(area); area.select(); document.execCommand('copy'); area.remove(); } document.querySelector('#copy-member-id').textContent = 'Copied'; };
    document.querySelector('#account-shop').onclick = () => { closeModal(); document.querySelector('#shop').scrollIntoView({ behavior: 'smooth' }); };
    document.querySelector('#account-signout').onclick = () => { localStorage.removeItem(CURRENT_KEY); resumeCheckout = false; window.dispatchEvent(new CustomEvent('billi:accountchange', { detail: null })); renderSignIn(); };
    document.querySelector('#redeem-freebie')?.addEventListener('click', () => {
      const members = readMembers();
      const latest = members[member.phone];
      if (!latest || latest.points < 500 || latest.freebieReserved) return;
      latest.points -= 500;
      latest.freebieReserved = true;
      latest.ledger = [{ label: 'Freebie redeemed', delta: -500, at: new Date().toISOString() }, ...(latest.ledger || [])].slice(0, 20);
      members[member.phone] = latest;
      writeMembers(members);
      window.dispatchEvent(new CustomEvent('billi:accountchange', { detail: latest }));
      renderDashboard(latest);
    });
  }
  function completeOrder(earned, reference) {
    const member = current();
    if (!member) return null;
    const members = readMembers();
    const latest = members[member.phone] || member;
    const amount = Math.max(0, Number(earned) || 0);
    latest.points = (Number(latest.points) || 0) + amount;
    latest.ledger = [{ label: `Order ${reference} · points earned`, delta: amount, at: new Date().toISOString() }, ...(latest.ledger || [])].slice(0, 20);
    latest.orders = [{ reference, points: amount, at: new Date().toISOString() }, ...(latest.orders || [])].slice(0, 20);
    latest.freebieReserved = false;
    members[member.phone] = latest;
    writeMembers(members);
    window.dispatchEvent(new CustomEvent('billi:accountchange', { detail: latest }));
    return latest;
  }
  window.BilliAccount = { current, open, completeOrder };
})();
