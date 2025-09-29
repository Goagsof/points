$(document).ready(function () {
  const modelingOps = {
    "Diagnosticos": 0.15,
    "Unbonded": 0.25,
    "Retainers SA": 0.25,
    "Therapeutic": 0.333,
    "CT's": 0.3,
    "CT's Suppl": 0.417,
    "CT's Diag": 0.208,
    "CT's Diag Suppl": 0.244
  };

  const ptsOps = {
    "Diagnosticos": 0.083,
    "Retainers SA": 0.12
    // Se descartan los demás según la imagen
  };

  let totalPoints = 0;

  function updateDisplay() {
    $('#total-points').text(totalPoints.toFixed(3));
  }

  function createButtons(containerId, operations) {
    for (const [name, value] of Object.entries(operations)) {
      const btn = $(`<button class="btn btn-primary m-1">${name} (${value})</button>`);
      btn.click(() => {
        totalPoints += value;
        sessionStorage.setItem('points', totalPoints);
        updateDisplay();
      });
      $(containerId).append(btn);
    }
  }

  function resetPoints() {
    totalPoints = 0;
    sessionStorage.removeItem('points');
    updateDisplay();
  }

  // Inicializar
  createButtons('#modeling-buttons', modelingOps);
  createButtons('#pts-buttons', ptsOps);

  // Restaurar si hay sesión activa
  const storedPoints = sessionStorage.getItem('points');
  if (storedPoints) {
    totalPoints = parseFloat(storedPoints);
    updateDisplay();
  }

  $('#reset-btn').click(resetPoints);
});
