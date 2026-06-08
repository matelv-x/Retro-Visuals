const form = document.querySelector('#retro-visuals-form');
const backgroundMode = document.querySelector('#background-mode');
const backgroundFile = document.querySelector('#background-file');
const savedBackground = document.querySelector('#saved-background');
const savedBackgroundPreview = document.querySelector('#saved-background-preview');
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

function refreshRetroAfterSave() {
  const token = Date.now().toString();
  const fallback = `dial.html?_refresh=${token}`;
  const referrer = document.referrer;

  if (!referrer) {
    window.location.href = fallback;
    return;
  }

  try {
    const url = new URL(referrer, window.location.href);
    if (url.origin !== window.location.origin || !url.pathname.includes('/retro/')) {
      window.location.href = fallback;
      return;
    }
    url.searchParams.set('_refresh', token);
    window.location.href = url.toString();
  } catch (error) {
    window.location.href = fallback;
  }
}

function renderSavedBackgrounds(settings) {
  const archives = Array.isArray(settings.background_archives) ? settings.background_archives : [];
  savedBackground.replaceChildren(new Option('Upload or current', ''));
  savedBackgroundPreview.replaceChildren();

  archives.forEach(archive => {
    savedBackground.add(new Option(archive.label, archive.id));
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'visual-background-choice';
    button.dataset.backgroundId = archive.id;
    button.style.backgroundImage = `url("${archive.preview}")`;
    button.setAttribute('aria-label', archive.label);
    button.title = archive.label;
    button.addEventListener('click', () => {
      uploadedBackground = '';
      backgroundFile.value = '';
      backgroundMode.value = 'custom';
      savedBackground.value = archive.id;
      preview.style.backgroundImage = `url("${archive.preview}")`;
      renderSavedBackgroundSelection();
    });
    savedBackgroundPreview.append(button);
  });

  renderSavedBackgroundSelection();
}

function renderSavedBackgroundSelection() {
  savedBackgroundPreview.querySelectorAll('.visual-background-choice').forEach(button => {
    button.classList.toggle('selected', button.dataset.backgroundId === savedBackground.value);
  });
}

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
  renderSavedBackgrounds(settings);
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
    savedBackground.value = '';
    renderSavedBackgroundSelection();
  });
  reader.readAsDataURL(file);
});

[savedBackground].forEach(control => {
  control.addEventListener('input', () => {
    uploadedBackground = '';
    backgroundFile.value = '';
    const archive = (storedSettings.background_archives || [])
      .find(item => item.id === savedBackground.value);
    if (archive) {
      backgroundMode.value = 'custom';
      preview.style.backgroundImage = `url("${archive.preview}")`;
    }
    renderSavedBackgroundSelection();
  });
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
  if (!uploadedBackground && savedBackground.value) {
    payload.background_archive = savedBackground.value;
  }

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
  setTimeout(refreshRetroAfterSave, 250);
});

loadSettings().catch(error => {
  message.textContent = `Unable to load settings: ${error.message}`;
});
