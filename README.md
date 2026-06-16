# Retro Visuals

Optional visual settings overlay for the Retro web interface.

## Requirements

- SG1 v4 installed in `/home/pi/sg1_v4`.
- Retro web interface already installed in `/home/pi/sg1_v4/web/retro`.

## Install

### ZIP download
Change only the `RELEASE` value when installing a different version. The command converts
GitHub's extracted folder name back to `/home/pi/Retro-Visuals`, so the restore
command below always works from the same folder.

```bash
cd /home/pi
RELEASE="retro-visual"
PACKAGE="Retro-Visuals-${RELEASE#v}"
ZIP="${RELEASE}.zip"

rm -rf Retro-Visuals "$PACKAGE" "$ZIP"

wget -O "$ZIP" \
  "https://github.com/matelv-x/Retro-Visuals/archive/refs/tags/${RELEASE}.zip"

unzip -o "$ZIP"
mv "$PACKAGE" Retro-Visuals

cd Retro-Visuals
chmod +x install-retro-visuals.sh restore-retro-visuals.sh
sudo ./install-retro-visuals.sh
```

## Restore / uninstall

```bash
cd /home/pi/Retro-Visuals
chmod +x restore-retro-visuals.sh
sudo ./restore-retro-visuals.sh
```

Restore removes the Retro Visuals menu link, injected JavaScript/CSS hooks,
backend endpoints, and Retro Visuals overlay files. It preserves user data:

```text
/home/pi/sg1_v4/config/retro-visuals.json
/home/pi/sg1_v4/web/retro/images/retro-custom-background.*
/home/pi/sg1_v4/web/retro/images/backgrounds/
```

This lets a later reinstall reuse saved background settings and archives.

## Features

### Preview

<p>
  <img src="docs/images/retro-visuals-custom-colors.jpg" alt="Retro Visuals custom colors on Retro dial screen" width="49%">
  <img src="docs/images/retro-visuals-settings-preview.jpg" alt="Retro Visuals settings page with static preview" width="49%">
</p>

### Custom Retro background

- Keeps the original Retro background or uploads a custom PNG, JPEG, or WebP image.
- Stores the uploaded image inside the existing Retro image folder.
- Preserves the selected background between service restarts.
- Displays the custom Retro background as one scalable image fitted to the
  full Retro screen/TV area, without repeated tiles or colored side fill.
- Can automatically choose the closest matching resolution file for the
  detected screen size.
- When a custom background is uploaded from the Visuals page, the backend tries
  to generate the resolution files automatically from that one original image.
- Automatic generation uses Pillow. The installer installs Pillow into the SG1
  Python environment when it is missing.
- When a new custom background is uploaded, the current generated background
  set is archived instead of being deleted.
- Archived background sets are stored in numbered folders:

```text
/home/pi/sg1_v4/web/retro/images/backgrounds/1/
/home/pi/sg1_v4/web/retro/images/backgrounds/2/
/home/pi/sg1_v4/web/retro/images/backgrounds/3/
```

- If the uploaded image matches an archived original image, Retro Visuals swaps
  the active set with that archived set instead of regenerating it.
- The Visuals page shows saved background previews, so a user can choose an
  already generated background set without uploading the image again.
- The Visuals page uses a static preview window that is not connected to the
  live Stargate status refresh loop. New uploaded backgrounds appear in the
  preview before saving and are not overwritten by the currently active gate
  background.
- After saving Visuals settings, the page returns to Retro with a cache-busting
  refresh token so the selected background appears immediately.
- Resolution-based background selection works only when matching files are
  present in:

```text
/home/pi/sg1_v4/web/retro/images/backgrounds/
```

Use this naming format:

```text
background-WIDTHxHEIGHT.jpg
background-WIDTHxHEIGHT.jpeg
background-WIDTHxHEIGHT.png
background-WIDTHxHEIGHT.webp
```

Example:

```text
background-1920x1080.jpg
background-1920x1080.png
background-2560x1440.png
background-3840x2160.png
```

If no matching resolution file is found, Retro Visuals falls back to the
uploaded custom image.

The generated files use centered cover/crop scaling, so each target resolution
is filled without repeated tiles or colored side fill.

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
- The Visuals preview includes symbols in boxes so glow color and intensity can
  be checked before saving.

### Custom colors

- Adds optional color controls for:
  - dialed symbols in destination boxes
  - ring symbols
  - selection symbols in the left symbol picker
  - gate name
  - main UI lines
  - secondary UI lines
- Includes a `Restore original colors` button that returns the custom color
  section to the original Retro-style defaults before saving.
- By default, main and secondary UI line colors affect only the main Retro
  window, leaving the top navigation menu untouched.
- Includes an `Include top menu` checkbox for users who want the UI line colors
  applied to the full Retro page including the top menu.
- Uses a static full-window preview so color changes can be inspected before
  saving without the live gate refresh loop changing the preview.

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

## Versions

Older releases remain available from the GitHub Releases or Tags page. Use an
older tag if you want the previous Custom Retro background behavior.

### Current version

- Adds scalable Custom Retro backgrounds for TV/web screens.
- Adds optional automatic resolution matching from
  `/home/pi/sg1_v4/web/retro/images/backgrounds/`.
- Adds test support for generating those resolution files automatically when
  the user uploads one custom background from the Visuals page.
- Adds numbered background-set archiving and restores an archived set when the
  same original image is uploaded again.
- Adds saved background previews and selection in the Visuals page.
- Replaces the live Visuals preview with a static preview that shows uploaded
  backgrounds, box symbols, glow, ring symbol colors, selection symbol colors,
  gate name color, and UI line colors before saving.
- Adds optional custom color controls for dialed symbols, ring symbols,
  selection symbols, gate name, main UI lines, and secondary UI lines.
- Keeps top navigation menu colors unchanged unless `Include top menu` is
  enabled.
- Adds automatic cache-busting refresh after saving a background.
- Keeps fallback behavior for gates that only have one uploaded custom
  background image.

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
