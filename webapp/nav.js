const body = document.body;
const page = body?.dataset.page;
const nav = document.querySelector('.bottom-nav');
if (nav && !nav.querySelector('[data-target="favorites"]')) {
  const favoritesLink = document.createElement('a');
  favoritesLink.className = 'nav-item';
  favoritesLink.dataset.target = 'favorites';
  favoritesLink.href = '/stub.html?view=favorites';
  favoritesLink.innerHTML = `
    <span class="nav-icon">❤️</span>
    <span class="nav-label">Избранное</span>
    <small>🚧 в разработке</small>
  `;
  const searchItem = nav.querySelector('.nav-item.nav-search');
  if (searchItem) {
    nav.insertBefore(favoritesLink, searchItem);
  } else {
    nav.appendChild(favoritesLink);
  }
}

const items = nav?.querySelectorAll('.nav-item') || [];
items.forEach((item) => {
  if (item.dataset.target === page) {
    item.classList.add('active');
  }
});
