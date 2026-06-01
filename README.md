# Retro Visuals

Optional visual settings overlay for the Retro web interface.

This repository is private while it is being checked and verified.

## Requirements

- SG1 v4 installed in `/home/pi/sg1_v4`.
- Retro web interface already installed in `/home/pi/sg1_v4/web/retro`.

## Install

### Method 1 - GitHub clone

Clone the current version into `/home/pi`, remove an older downloaded copy if
one is present, grant script permissions, and run the installer:

```bash
cd /home/pi
rm -rf Retro-Visuals
git clone https://github.com/matelv-x/Retro-Visuals.git
cd Retro-Visuals
chmod +x install-retro-visuals.sh restore-retro-visuals.sh
sudo ./install-retro-visuals.sh
```

### Method 2 - ZIP download

Download and unpack the current version directly from GitHub:

```bash
cd /home/pi
rm -rf Retro-Visuals Retro-Visuals-main Retro-Visuals-main.zip
wget -O Retro-Visuals-main.zip \
  https://github.com/matelv-x/Retro-Visuals/archive/refs/heads/main.zip
unzip -o Retro-Visuals-main.zip
mv Retro-Visuals-main Retro-Visuals
cd Retro-Visuals
chmod +x install-retro-visuals.sh restore-retro-visuals.sh
sudo ./install-retro-visuals.sh
```

Open the Retro visual settings page:

```text
/retro/visual_settings.html
```

## Restore / uninstall

```bash
cd /home/pi/Retro-Visuals
chmod +x restore-retro-visuals.sh
sudo ./restore-retro-visuals.sh
```

## Features

### Custom Retro background

- Keeps the original Retro background or uploads a custom PNG, JPEG, or WebP image.
- Stores the uploaded image inside the existing Retro image folder.
- Preserves the selected background between service restarts.

### Incoming-call presentation

- Keeps the classic incoming-call presentation or enables the enhanced incoming mode.
- Supports visual incoming symbols supplied by an extended incoming-call add-on when available.
- Does not generate random incoming symbols on its own.

### Symbols in boxes

- Adds an optional `Symbols in boxes` checkbox.
- When disabled, Retro keeps its original behavior: incoming boxes are red and change to green after connection.
- When enabled, incoming boxes remain transparent so the selected symbols stay visible.
- Delays the wormhole image until the final incoming symbol reaches its box.
- Handles 7-, 8-, and 9-symbol addresses without assuming a fixed address length.

### Symbol glow

- Adds an optional animated breathing glow around symbol outlines.
- Provides a color picker and an intensity slider.
- Applies glow as an SVG outline effect instead of filling the symbol box.
- Normalizes the glow scale so all symbols behave visually like the Earth symbol.

### Surgical overlay installer

- Installs its own Retro settings page, CSS, and JavaScript files.
- Updates only the required fragments inside existing SG1 and Retro files.
- Creates timestamped backups before patching existing files.
- Preserves unrelated add-ons already installed on the gate.
- Supports reinstalling the overlay without duplicating injected fragments.

## Stored settings

The selected configuration is stored in:

```text
/home/pi/sg1_v4/config/retro-visuals.json
```

## Attribution and originality

Original Retro UI source:
https://github.com/polklabs/stargate-retro

The Retro pages being patched come from the Polklabs Retro UI project.

matelv-x/Codex modification: this repository adds an optional visual-settings
overlay for the SG1 v4 Retro web interface.

How much is copied or changed: surgical HTML, CSS, JavaScript, and Python
overlay. It does not replace the full Retro interface or the full SG1 project.

## License

Released under the MIT License. See [LICENSE](LICENSE).
