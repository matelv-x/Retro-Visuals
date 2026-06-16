const form = document.querySelector('#retro-visuals-form');
const backgroundMode = document.querySelector('#background-mode');
const backgroundFile = document.querySelector('#background-file');
const backgroundFileName = document.querySelector('#background-file-name');
const savedBackground = document.querySelector('#saved-background');
const savedBackgroundPreview = document.querySelector('#saved-background-preview');
const incomingStyle = document.querySelector('#incoming-style');
const incomingSymbolsInBoxes = document.querySelector('#incoming-symbols-in-boxes');
const glowEnabled = document.querySelector('#glow-enabled');
const glowColor = document.querySelector('#glow-color');
const glowIntensity = document.querySelector('#glow-intensity');
const glowIntensityValue = document.querySelector('#glow-intensity-value');
const customColorsEnabled = document.querySelector('#custom-colors-enabled');
const dialedSymbolColor = document.querySelector('#dialed-symbol-color');
const ringSymbolColor = document.querySelector('#ring-symbol-color');
const keyboardSymbolColor = document.querySelector('#keyboard-symbol-color');
const gateNameColor = document.querySelector('#gate-name-color');
const uiLineColor = document.querySelector('#ui-line-color');
const uiSecondaryColor = document.querySelector('#ui-secondary-color');
const changeAllUiColors = document.querySelector('#change-all-ui-colors');
const restoreOriginalColors = document.querySelector('#restore-original-colors');
const preview = document.querySelector('.visual-preview');
const previewFrame = document.querySelector('#visual-preview-frame');
const message = document.querySelector('.visual-message');
let uploadedBackground = '';
let storedSettings = {};

const originalColors = {
  custom_colors_enabled: false,
  dialed_symbol_color: '#fffea5',
  ring_symbol_color: '#fffea5',
  keyboard_symbol_color: '#fffea5',
  gate_name_color: '#78dcff',
  ui_line_color: '#37bfde',
  ui_secondary_color: '#4a7297',
  change_all_ui_colors: false,
};

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
      backgroundFileName.textContent = 'No file selected';
      backgroundMode.value = 'custom';
      savedBackground.value = archive.id;
      renderSavedBackgroundSelection();
      renderPreview();
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

function selectedArchivePreview() {
  if (!savedBackground.value) return '';
  const archive = (storedSettings.background_archives || [])
    .find(item => item.id === savedBackground.value);
  return archive?.preview || '';
}

function draftSettings() {
  return {
    ...storedSettings,
    background_mode: backgroundMode.value,
    incoming_style: incomingStyle.value,
    incoming_symbols_in_boxes: incomingSymbolsInBoxes.checked,
    glow_enabled: glowEnabled.checked,
    glow_color: glowColor.value,
    glow_intensity: Number(glowIntensity.value),
    custom_colors_enabled: customColorsEnabled.checked,
    dialed_symbol_color: dialedSymbolColor.value,
    ring_symbol_color: ringSymbolColor.value,
    keyboard_symbol_color: keyboardSymbolColor.value,
    gate_name_color: gateNameColor.value,
    ui_line_color: uiLineColor.value,
    ui_secondary_color: uiSecondaryColor.value,
    change_all_ui_colors: changeAllUiColors.checked,
  };
}

function applyPreviewBackground(frameDocument, draft) {
  const customBackground = draft.background_mode === 'custom';
  const body = frameDocument.body;
  const root = frameDocument.documentElement;
  let previewUrl = '';

  if (customBackground && uploadedBackground) {
    previewUrl = uploadedBackground;
  } else if (customBackground && selectedArchivePreview()) {
    previewUrl = selectedArchivePreview();
  } else if (customBackground && draft.background_image) {
    const version = Number(draft.background_version) || 0;
    previewUrl = `/retro/images/${encodeURIComponent(draft.background_image)}`;
    if (version) previewUrl += `?v=${version}`;
  }

  if (previewUrl) {
    root.style.setProperty('--retro-custom-background', `url("${previewUrl}")`);
    body.classList.add('retro-background-custom');
  } else if (!customBackground) {
    root.style.setProperty('--retro-custom-background', 'none');
    body.classList.remove('retro-background-custom');
  }
}

function renderPreview() {
  glowIntensityValue.value = glowIntensity.value;
  const draft = draftSettings();
  const glow = Math.max(0, Math.min(80, Number(draft.glow_intensity) || 0));
  const glowSoft = glow <= 0 ? 0 : 1.5 + glow * 0.06;
  const glowMid = glow <= 0 ? 0 : 3 + glow * 0.18;
  const glowWide = glow <= 0 ? 0 : 6 + glow * 0.38;
  document.documentElement.style.setProperty('--retro-glow-color', draft.glow_color);
  document.documentElement.style.setProperty('--retro-glow-strength', `${draft.glow_intensity}px`);
  document.documentElement.style.setProperty('--retro-dialed-symbol-color', draft.dialed_symbol_color);
  document.documentElement.style.setProperty('--retro-ring-symbol-color', draft.ring_symbol_color);
  document.documentElement.style.setProperty('--retro-keyboard-symbol-color', draft.keyboard_symbol_color);
  document.documentElement.style.setProperty('--retro-gate-name-color', draft.gate_name_color);
  document.documentElement.style.setProperty('--retro-ui-line-color', draft.ui_line_color);
  document.documentElement.style.setProperty('--retro-ui-secondary-color', draft.ui_secondary_color);
  preview.style.borderColor = draft.custom_colors_enabled ? draft.ui_line_color : '';

  const frameDocument = previewFrame.contentDocument;
  if (!frameDocument?.body) return;

  const frameRoot = frameDocument.documentElement;
  const frameBody = frameDocument.body;
  frameRoot.style.setProperty('--retro-glow-color', draft.glow_color);
  frameRoot.style.setProperty('--retro-glow-strength', `${draft.glow_intensity}px`);
  frameRoot.style.setProperty('--retro-preview-glow-soft', `${glowSoft.toFixed(1)}px`);
  frameRoot.style.setProperty('--retro-preview-glow-mid', `${glowMid.toFixed(1)}px`);
  frameRoot.style.setProperty('--retro-preview-glow-wide', `${glowWide.toFixed(1)}px`);
  frameRoot.style.setProperty('--retro-dialed-symbol-color', draft.dialed_symbol_color);
  frameRoot.style.setProperty('--retro-ring-symbol-color', draft.ring_symbol_color);
  frameRoot.style.setProperty('--retro-keyboard-symbol-color', draft.keyboard_symbol_color);
  frameRoot.style.setProperty('--retro-gate-name-color', draft.gate_name_color);
  frameRoot.style.setProperty('--retro-ui-line-color', draft.ui_line_color);
  frameRoot.style.setProperty('--retro-ui-secondary-color', draft.ui_secondary_color);
  frameBody.classList.toggle('retro-glow-enabled', Boolean(draft.glow_enabled));
  frameBody.classList.toggle('retro-custom-colors', Boolean(draft.custom_colors_enabled));
  frameBody.classList.toggle('retro-custom-colors-all', Boolean(draft.change_all_ui_colors));
  frameBody.style.setProperty('--color', draft.custom_colors_enabled ? draft.ui_line_color : '');
  frameBody.style.setProperty('--color-dark', draft.custom_colors_enabled ? draft.ui_secondary_color : '');
  applyPreviewBackground(frameDocument, draft);
}

function setForm(settings) {
  storedSettings = settings;
  backgroundMode.value = settings.background_mode || 'default';
  incomingStyle.value = settings.incoming_style || 'classic';
  incomingSymbolsInBoxes.checked = Boolean(settings.incoming_symbols_in_boxes);
  glowEnabled.checked = Boolean(settings.glow_enabled);
  glowColor.value = settings.glow_color || '#fffea5';
  glowIntensity.value = settings.glow_intensity ?? 12;
  customColorsEnabled.checked = Boolean(settings.custom_colors_enabled);
  dialedSymbolColor.value = settings.dialed_symbol_color || '#fffea5';
  ringSymbolColor.value = settings.ring_symbol_color || '#fffea5';
  keyboardSymbolColor.value = settings.keyboard_symbol_color || '#fffea5';
  gateNameColor.value = settings.gate_name_color || '#78dcff';
  uiLineColor.value = settings.ui_line_color || '#37bfde';
  uiSecondaryColor.value = settings.ui_secondary_color || '#4a7297';
  changeAllUiColors.checked = Boolean(settings.change_all_ui_colors);
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
  if (!file.type.startsWith('image/')) {
    message.textContent = 'Select a PNG, JPEG or WEBP image.';
    backgroundFile.value = '';
    backgroundFileName.textContent = 'No file selected';
    return;
  }
  backgroundFileName.textContent = file.name || 'Selected image';
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    uploadedBackground = reader.result;
    backgroundMode.value = 'custom';
    savedBackground.value = '';
    renderSavedBackgroundSelection();
    renderPreview();
  });
  reader.readAsDataURL(file);
});

[savedBackground].forEach(control => {
  control.addEventListener('input', () => {
    uploadedBackground = '';
    backgroundFile.value = '';
    backgroundFileName.textContent = 'No file selected';
    const archive = (storedSettings.background_archives || [])
      .find(item => item.id === savedBackground.value);
    if (archive) {
      backgroundMode.value = 'custom';
    }
    renderSavedBackgroundSelection();
    renderPreview();
  });
});

[backgroundMode, incomingStyle, incomingSymbolsInBoxes, glowEnabled, glowColor, glowIntensity, customColorsEnabled, dialedSymbolColor, ringSymbolColor, keyboardSymbolColor, gateNameColor, uiLineColor, uiSecondaryColor, changeAllUiColors].forEach(control => {
  control.addEventListener('input', renderPreview);
});

previewFrame.addEventListener('load', renderPreview);

restoreOriginalColors.addEventListener('click', () => {
  customColorsEnabled.checked = originalColors.custom_colors_enabled;
  dialedSymbolColor.value = originalColors.dialed_symbol_color;
  ringSymbolColor.value = originalColors.ring_symbol_color;
  keyboardSymbolColor.value = originalColors.keyboard_symbol_color;
  gateNameColor.value = originalColors.gate_name_color;
  uiLineColor.value = originalColors.ui_line_color;
  uiSecondaryColor.value = originalColors.ui_secondary_color;
  changeAllUiColors.checked = originalColors.change_all_ui_colors;
  renderPreview();
  message.textContent = 'Original colors restored. Press Save to apply.';
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
    custom_colors_enabled: customColorsEnabled.checked,
    dialed_symbol_color: dialedSymbolColor.value,
    ring_symbol_color: ringSymbolColor.value,
    keyboard_symbol_color: keyboardSymbolColor.value,
    gate_name_color: gateNameColor.value,
    ui_line_color: uiLineColor.value,
    ui_secondary_color: uiSecondaryColor.value,
    change_all_ui_colors: changeAllUiColors.checked,
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
