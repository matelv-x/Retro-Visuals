(function () {
  if (window.retroVisuals) return;

  const defaults = {
    background_mode: 'default',
    background_image: '',
    incoming_style: 'classic',
    incoming_symbols_in_boxes: false,
    glow_enabled: false,
    glow_color: '#fffea5',
    glow_intensity: 12,
  };
  let settings = {...defaults};
  let incomingSignature = '';
  let incomingSymbolCount = 0;
  let incomingGlyphsReadyAt = 0;
  let backgroundRequestId = 0;
  const originalFetch = window.fetch.bind(window);
  const backgroundSizes = [
    [5120, 1440],
    [3840, 2160],
    [3440, 1440],
    [2560, 1600],
    [2560, 1440],
    [1920, 1200],
    [1920, 1080],
    [1600, 1200],
    [1440, 2560],
    [1280, 1024],
    [1080, 1920],
  ];
  const backgroundExtensions = ['jpg', 'jpeg', 'png', 'webp'];

  function imageExists(url) {
    return new Promise(resolve => {
      const image = new Image();
      let finished = false;
      const done = result => {
        if (finished) return;
        finished = true;
        image.onload = null;
        image.onerror = null;
        resolve(result);
      };
      image.onload = () => done(true);
      image.onerror = () => done(false);
      window.setTimeout(() => done(false), 900);
      image.src = url;
    });
  }

  function rankedBackgroundCandidates() {
    const width = Math.max(window.innerWidth || 0, window.screen?.width || 0, 1);
    const height = Math.max(window.innerHeight || 0, window.screen?.height || 0, 1);
    const targetAspect = width / height;
    const targetPixels = width * height;

    return backgroundSizes
      .map(([candidateWidth, candidateHeight]) => ({
        width: candidateWidth,
        height: candidateHeight,
        aspectDelta: Math.abs(candidateWidth / candidateHeight - targetAspect),
        pixelDelta: Math.abs(candidateWidth * candidateHeight - targetPixels),
      }))
      .sort((a, b) => a.aspectDelta - b.aspectDelta || a.pixelDelta - b.pixelDelta)
      .flatMap(candidate =>
        backgroundExtensions.map(extension =>
          `../images/backgrounds/background-${candidate.width}x${candidate.height}.${extension}`,
        ),
      );
  }

  function applyBackgroundUrl(url) {
    document.documentElement.style.setProperty(
      '--retro-custom-background',
      url ? `url("${url}")` : 'none',
    );
  }

  async function applyBestCustomBackground(fallbackUrl) {
    const requestId = ++backgroundRequestId;
    applyBackgroundUrl(fallbackUrl);

    for (const candidate of rankedBackgroundCandidates()) {
      if (await imageExists(candidate)) {
        if (requestId === backgroundRequestId) applyBackgroundUrl(candidate);
        return;
      }
    }

    if (requestId === backgroundRequestId) applyBackgroundUrl(fallbackUrl);
  }

  function updateSvgGlowFilter(nextSettings) {
    let host = document.querySelector('#retro-symbol-glow-host');
    if (!host) {
      host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      host.id = 'retro-symbol-glow-host';
      host.setAttribute('width', '0');
      host.setAttribute('height', '0');
      host.setAttribute('aria-hidden', 'true');
      host.style.position = 'absolute';
      host.style.pointerEvents = 'none';
      host.style.overflow = 'visible';
      host.innerHTML = `
        <defs>
          <filter id="retro-symbol-glow" x="-150%" y="-150%" width="400%" height="400%"
            color-interpolation-filters="sRGB">
            <feGaussianBlur class="retro-glow-blur-small retro-glow-blur-earth-small" in="SourceGraphic" result="blurSmall" />
            <feFlood class="retro-glow-color-small" result="colorSmall" />
            <feComposite in="colorSmall" in2="blurSmall" operator="in" result="glowSmall" />
            <feGaussianBlur class="retro-glow-blur-large retro-glow-blur-earth-large" in="SourceGraphic" result="blurLarge" />
            <feFlood class="retro-glow-color-large" result="colorLarge" />
            <feComposite in="colorLarge" in2="blurLarge" operator="in" result="glowLarge" />
            <feMerge>
              <feMergeNode in="glowLarge" />
              <feMergeNode in="glowSmall" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="retro-symbol-glow-large-viewbox" x="-150%" y="-150%" width="400%" height="400%"
            color-interpolation-filters="sRGB">
            <feGaussianBlur class="retro-glow-blur-small retro-glow-blur-large-viewbox-small" in="SourceGraphic" result="blurSmall" />
            <feFlood class="retro-glow-color-small" result="colorSmall" />
            <feComposite in="colorSmall" in2="blurSmall" operator="in" result="glowSmall" />
            <feGaussianBlur class="retro-glow-blur-large retro-glow-blur-large-viewbox-large" in="SourceGraphic" result="blurLarge" />
            <feFlood class="retro-glow-color-large" result="colorLarge" />
            <feComposite in="colorLarge" in2="blurLarge" operator="in" result="glowLarge" />
            <feMerge>
              <feMergeNode in="glowLarge" />
              <feMergeNode in="glowSmall" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>`;
      document.body.append(host);
    }

    const intensity = Math.max(0, Number(nextSettings.glow_intensity) || 0);
    const small = Math.max(0.4, intensity * 0.055);
    const large = Math.max(0.8, intensity * 0.13);
    const viewBoxScale = 241 / 63.509;
    const setAnimatedBlur = (selector, base) => {
      host.querySelector(selector).innerHTML =
        `<animate attributeName="stdDeviation" values="${base};${base * 1.9};${base}" dur="2.4s" repeatCount="indefinite" />`;
    };
    setAnimatedBlur('.retro-glow-blur-earth-small', small);
    setAnimatedBlur('.retro-glow-blur-earth-large', large);
    setAnimatedBlur('.retro-glow-blur-large-viewbox-small', small * viewBoxScale);
    setAnimatedBlur('.retro-glow-blur-large-viewbox-large', large * viewBoxScale);
    host.querySelectorAll('.retro-glow-color-small, .retro-glow-color-large').forEach(node => {
      node.setAttribute('flood-color', nextSettings.glow_color);
    });
  }

  function enhanceDialingStatus(data) {
    if (!data) return data;

    const backendVisual = Array.isArray(data.incoming_visual_symbols)
      ? data.incoming_visual_symbols
      : [];

    if (settings.incoming_style === 'enhanced' && backendVisual.length > 0) {
      data.address_buffer_incoming = backendVisual.slice();
      data.locked_chevrons_incoming = Number(
        data.incoming_visual_locked_chevrons ?? data.locked_chevrons_incoming,
      );
    }

    const incoming = Array.isArray(data.address_buffer_incoming)
      ? data.address_buffer_incoming
      : [];
    const signature = incoming.join('-');

    if (signature !== incomingSignature) {
      const newlyReceived = Math.max(1, incoming.length - incomingSymbolCount);
      incomingSignature = signature;
      incomingSymbolCount = incoming.length;
      incomingGlyphsReadyAt = signature
        ? Date.now() + 1600 + (newlyReceived - 1) * 1300
        : 0;
    }

    if (
      settings.incoming_symbols_in_boxes &&
      incoming.length > 0 &&
      data.wormhole_active &&
      Date.now() < incomingGlyphsReadyAt
    ) {
      data.wormhole_active = false;
    }

    return data;
  }

  window.fetch = async function retroVisualsFetch(resource, options) {
    const response = await originalFetch(resource, options);
    const url = typeof resource === 'string' ? resource : resource.url;
    if (!url || !url.includes('/get/dialing_status') || !response.ok) return response;

    try {
      const data = enhanceDialingStatus(await response.clone().json());
      return new Response(JSON.stringify(data), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error) {
      console.warn('[retro_visuals] Unable to enhance dialing status:', error);
      return response;
    }
  };

  function apply(nextSettings) {
    settings = {...defaults, ...nextSettings};
    const root = document.documentElement;
    const body = document.body;
    root.style.setProperty('--retro-glow-color', settings.glow_color);
    root.style.setProperty('--retro-glow-strength', `${settings.glow_intensity}px`);
    updateSvgGlowFilter(settings);
    body.classList.toggle('retro-glow-enabled', Boolean(settings.glow_enabled));
    body.classList.toggle('retro-incoming-enhanced', settings.incoming_style === 'enhanced');
    body.classList.toggle('retro-incoming-symbols', Boolean(settings.incoming_symbols_in_boxes));

    const customBackground = settings.background_mode === 'custom' && settings.background_image;
    body.classList.toggle('retro-background-custom', Boolean(customBackground));
    if (customBackground) {
      applyBestCustomBackground(`../images/${encodeURIComponent(settings.background_image)}`);
    } else {
      backgroundRequestId += 1;
      applyBackgroundUrl('');
    }
    return settings;
  }

  async function load() {
    try {
      const response = await originalFetch('/stargate/get/retro_visuals');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      apply(await response.json());
    } catch (error) {
      console.warn('[retro_visuals] Using default settings:', error);
      apply(defaults);
    }
    return settings;
  }

  window.retroVisuals = {
    apply,
    getSettings: () => ({...settings}),
    shouldDisplayIncomingSymbols: () => Boolean(settings.incoming_symbols_in_boxes),
    load,
    originalFetch,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load, {once: true});
  } else {
    load();
  }

  window.addEventListener('resize', () => {
    if (settings.background_mode === 'custom' && settings.background_image) {
      applyBestCustomBackground(`../images/${encodeURIComponent(settings.background_image)}`);
    }
  });
})();
