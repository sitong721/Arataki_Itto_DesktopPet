const sizeButtons = [...document.querySelectorAll("[data-size]")];
const actionButtons = [...document.querySelectorAll("[data-action]")];
const closeSettings = document.getElementById("closeSettings");

function markSize(key) {
  sizeButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.size === key);
  });
}

sizeButtons.forEach(button => {
  button.addEventListener("click", () => {
    const key = button.dataset.size;
    markSize(key);
    window.petWindow.setSize(key);
  });
});

actionButtons.forEach(button => {
  button.addEventListener("click", () => {
    window.petWindow.playAction(button.dataset.action);
  });
});

closeSettings.addEventListener("click", () => {
  window.petWindow.closeSettings();
});

window.addEventListener("contextmenu", event => event.preventDefault());
window.petWindow.onSettingsSize(markSize);
markSize("normal");