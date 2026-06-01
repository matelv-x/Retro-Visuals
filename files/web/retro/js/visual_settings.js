const form = document.querySelector('#retro-visuals-form');
const backgroundMode = document.querySelector('#background-mode');
const backgroundFile = document.querySelector('#background-file');
const incomingStyle = document.querySelector('#incoming-style');
const incomingSymbolsInBoxes = document.querySelector('#incoming-symbols-in-boxes');
const glowEnabled = document.querySelector('#glow-enabled');
const glowColor = document.querySelector('#glow-color');
const glowIntensity = document.querySelector('#glow-intensity');
const glowIntensityValue = document.querySelector('#glow-intensity-value');
const preview = document.querySelector('.visual-preview');
const message = document.querySelector('.visual-message');
let uploadedBackground = '';
let storedSettings = {};

function renderPreview() {
  glowIntensityValue.value = glowIntensity.value;
  document.documentElement.style.setProperty('--retro-glow-color', glowColor.value);
  document.documentElement.style.setProperty('--retro-glow-strength', `${glowIntensity.value}px`);
  preview.querySelector('.visual-preview-symbol').style.textShadow = glowEnabled.checked
    ? `0 0 ${Math.max(2, Number(glowIntensity.value) * 0.4)}px ${glowColor.value}, 0 0 ${glowIntensity.value}px ${glowColor.value}`
    : 'none';
}

function setForm(settings) {
  storedSettings = settings;
  backgroundMode.value = settings.background_mode || 'default';
  incomingStyle.value = settings.incoming_style || 'classic';
  incomingSymbolsInBoxes.checked = Boolean(settings.incoming_symbols_in_boxes);
  glowEnabled.checked = Boolean(settings.glow_enabled);
  glowColor.value = settings.glow_color || '#fffea5';
  glowIntensity.value = settings.glow_intensity ?? 12;
  renderPreview();
}

async function loadSettings() {
  const response = await fetch('/stargate/get/retro_visuals');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  setForm(await response.json());
}

backgroundFile.addEventListener('change', () => {
  const [file] = backgroundFile.files;
  if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    message.textContent = 'Select a PNG, JPEG or WEBP image.';
    backgroundFile.value = '';
    return;
  }
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    uploadedBackground = reader.result;
    preview.style.backgroundImage = `url("${reader.result}")`;
    backgroundMode.value = 'custom';
  });
  reader.readAsDataURL(file);
});

[glowEnabled, glowColor, glowIntensity].forEach(control => {
  control.addEventListener('input', renderPreview);
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  message.textContent = 'Saving...';
  const payload = {
    background_mode: backgroundMode.value,
    incoming_style: incomingStyle.value,
    incoming_symbols_in_boxes: incomingSymbolsInBoxes.checked,
    glow_enabled: glowEnabled.checked,
    glow_color: glowColor.value,
    glow_intensity: Number(glowIntensity.value),
  };
  if (uploadedBackground) payload.background_data = uploadedBackground;

  const response = await fetch('/stargate/update/retro_visuals', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || `HTTP ${response.status}`);
  }
  uploadedBackground = '';
  setForm(result);
  window.retroVisuals.apply(result);
  message.textContent = 'Settings saved.';
  setTimeout(() => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = 'dial.html';
    }
  }, 250);
});

loadSettings().catch(error => {
  message.textContent = `Unable to load settings: ${error.message}`;
});
