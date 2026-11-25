const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());

document.querySelectorAll('[data-language]').forEach(link => {
  link.addEventListener('click', () => {
    const destination = new URL(link.href);
    destination.hash = window.location.hash;
    link.href = destination.href;
  });
});
