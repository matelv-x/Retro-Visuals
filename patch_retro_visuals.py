#!/usr/bin/env python3
import json
import py_compile
import re
import shutil
import sys
import time
from pathlib import Path


STAMP = time.strftime("%Y%m%d-%H%M%S")
BACKUP_SUFFIX = f".bak-retro-visuals-{STAMP}"
OWNED_FILES = (
    "web/retro/css/retro_visuals.css",
    "web/retro/css/visual_settings.css",
    "web/retro/js/retro_visuals.js",
    "web/retro/js/visual_settings.js",
    "web/retro/visual_settings.html",
)
PATCHED_FILES = (
    "classes/web_server.py",
    "web/retro/js/navigation.js",
    "web/retro/js/dial.js",
    "web/retro/dial.html",
    "web/retro/dial9.html",
)


def fail(message):
    raise SystemExit(f"ERROR: {message}")


def backup(path):
    backup_path = Path(str(path) + BACKUP_SUFFIX)
    if path.exists():
        shutil.copy2(path, backup_path)
        print(f"Backup: {backup_path}")


def write_if_changed(path, text):
    old = path.read_text(encoding="utf-8") if path.exists() else ""
    if old == text:
        return False
    backup(path)
    path.write_text(text, encoding="utf-8")
    print(f"Patched: {path}")
    return True


def copy_owned_files(app, files):
    for rel in OWNED_FILES:
        source = files / rel
        destination = app / rel
        if not source.exists():
            fail(f"Installer asset missing: {source}")
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        print(f"Installed: {destination}")


def patch_html(path):
    text = path.read_text(encoding="utf-8")
    css = '    <link rel="stylesheet" href="css/retro_visuals.css" />'
    script = '    <script src="js/retro_visuals.js"></script>'
    if "css/retro_visuals.css" not in text:
        anchors = (
            '    <link rel="stylesheet" href="css/dial.css" />',
            '    <link rel="stylesheet" href="css/dial9.css" />',
        )
        anchor = next((candidate for candidate in anchors if candidate in text), None)
        if not anchor:
            fail(f"Unable to patch stylesheet into {path}")
        text = text.replace(anchor, anchor + "\n" + css, 1)
    if "js/retro_visuals.js" not in text:
        anchor = '    <script type="module" src="js/startup.js"></script>'
        if anchor not in text:
            fail(f"Unable to patch runtime script into {path}")
        text = text.replace(anchor, script + "\n" + anchor, 1)
    write_if_changed(path, text)


def patch_navigation(path):
    text = path.read_text(encoding="utf-8")
    if "import './retro_visuals.js';" not in text:
        marker = "/* DO NOT EDIT BELOW UNLESS YOU KNOW WHAT YOU'RE DOING!!!! */"
        if marker not in text:
            fail("Unable to add Retro Visuals runtime to navigation.js")
        text = text.replace(marker, marker + "\n\nimport './retro_visuals.js';", 1)
    if "/retro/visual_settings.html" not in text:
        anchor = "            <a ${isActive('/retro/info.html')}>System</a>"
        link = "            <a ${isActive('/retro/visual_settings.html')}>Visuals</a>"
        if anchor not in text:
            fail("Unable to add Visuals link to Retro navigation")
        text = text.replace(anchor, link + "\n" + anchor, 1)
    write_if_changed(path, text)


def patch_dial(path):
    text = path.read_text(encoding="utf-8")
    helper = """function shouldDisplayIncomingGlyphs() {
  return (
    gateStatus.address_buffer_incoming.length === 0 ||
    window.retroVisuals?.shouldDisplayIncomingSymbols?.() !== false
  );
}

"""
    if "function shouldDisplayIncomingGlyphs()" not in text:
        marker = "function dial() {\n"
        if marker not in text:
            fail("Unable to add incoming glyph visibility helper to dial.js")
        text = text.replace(marker, helper + marker, 1)
    text = text.replace(
        "      buffer.length > bufferIndex\n    ) {",
        "      buffer.length > bufferIndex &&\n      shouldDisplayIncomingGlyphs()\n    ) {",
        1,
    )
    text = text.replace(
        "  if (bufferIndex < 9) {\n",
        "  if (bufferIndex < 9 && shouldDisplayIncomingGlyphs()) {\n",
        1,
    )
    old = """      setTimeout(() => newGlyph.classList.add('locked'), 1);
      setTimeout(() => newGlyph2.classList.add('locked'), 50);"""
    new = """      // RETRO_VISUALS_INCOMING_GLYPH_DELAY
      const glyphLockDelay =
        gateStatus.address_buffer_incoming.length > 0 ? 700 : 1;
      setTimeout(() => newGlyph.classList.add('locked'), glyphLockDelay);
      setTimeout(() => newGlyph2.classList.add('locked'), glyphLockDelay + 50);"""
    if "RETRO_VISUALS_INCOMING_GLYPH_DELAY" not in text:
        if old not in text:
            fail("Unable to add incoming glyph animation delay to dial.js")
        text = text.replace(old, new, 1)
    write_if_changed(path, text)


def patch_web_server(path):
    text = path.read_text(encoding="utf-8")
    if '"incoming_symbols_in_boxes"' not in text:
        text = text.replace(
            '            "incoming_style": "classic",\n'
            '            "glow_enabled": False,',
            '            "incoming_style": "classic",\n'
            '            "incoming_symbols_in_boxes": False,\n'
            '            "glow_enabled": False,',
        )
        text = text.replace(
            '        glow_color = updates.get("glow_color", config["glow_color"])\n',
            '        incoming_symbols_in_boxes = updates.get(\n'
            '            "incoming_symbols_in_boxes", config["incoming_symbols_in_boxes"]\n'
            '        )\n'
            '        glow_color = updates.get("glow_color", config["glow_color"])\n',
        )
        text = text.replace(
            '        if not isinstance(glow_color, str) or not re.fullmatch',
            '        if not isinstance(incoming_symbols_in_boxes, bool):\n'
            '            raise ValueError("Incoming symbols in boxes must be true or false.")\n'
            '        if not isinstance(glow_color, str) or not re.fullmatch',
        )
        text = text.replace(
            '            "incoming_style": incoming_style,\n'
            '            "glow_enabled": glow_enabled,',
            '            "incoming_style": incoming_style,\n'
            '            "incoming_symbols_in_boxes": incoming_symbols_in_boxes,\n'
            '            "glow_enabled": glow_enabled,',
        )
    text = text.replace(
        "glow_intensity = max(0, min(40, int(glow_intensity)))",
        "glow_intensity = max(0, min(80, int(glow_intensity)))",
    )
    text = text.replace(
        "Glow intensity must be a number from 0 to 40.",
        "Glow intensity must be a number from 0 to 80.",
    )
    if "import base64" not in text:
        text = text.replace("import os\n", "import os\nimport base64\nimport binascii\n", 1)
    if "import hashlib" not in text:
        text = text.replace("import os\n", "import os\nimport hashlib\n", 1)
    if "import re" not in text:
        text = text.replace("import os\n", "import os\nimport re\n", 1)
    if "from pathlib import Path" not in text:
        text = text.replace(
            "from http.server import SimpleHTTPRequestHandler\n",
            "from http.server import SimpleHTTPRequestHandler\nfrom pathlib import Path\n",
            1,
        )

    if 'request_path == "/get/retro_visuals"' not in text:
        anchor = '            elif request_path == "/get/config":\n'
        block = (
            '            elif request_path == "/get/retro_visuals":\n'
            "                data = self.get_retro_visuals_config()\n\n"
        )
        if anchor not in text:
            fail("Unable to add Retro Visuals GET endpoint")
        text = text.replace(anchor, block + anchor, 1)

    if "self.path == '/update/retro_visuals'" not in text:
        anchor = "            elif self.path == '/update/config':\n"
        block = (
            "            elif self.path == '/update/retro_visuals':\n"
            "                try:\n"
            "                    data = self.update_retro_visuals_config(data)\n"
            "                except (TypeError, ValueError, OSError) as ex:\n"
            '                    data = {"success": False, "message": str(ex)}\n\n'
        )
        if anchor not in text:
            fail("Unable to add Retro Visuals POST endpoint")
        text = text.replace(anchor, block + anchor, 1)

    helper = r'''

    # RETRO_VISUALS_HELPERS_START
    def get_retro_visuals_config(self):
        defaults = {
            "background_mode": "default",
            "background_image": "",
            "incoming_style": "classic",
            "incoming_symbols_in_boxes": False,
            "glow_enabled": False,
            "glow_color": "#fffea5",
            "glow_intensity": 12
        }
        config_path = Path(__file__).resolve().parent.parent / "config" / "retro-visuals.json"
        try:
            stored = json.loads(config_path.read_text(encoding="utf-8"))
            if isinstance(stored, dict):
                defaults.update(stored)
        except (FileNotFoundError, ValueError, OSError):
            pass
        return defaults

    def update_retro_visuals_config(self, updates):
        if not isinstance(updates, dict):
            raise ValueError("Invalid Retro Visuals settings.")

        config = self.get_retro_visuals_config()
        background_mode = updates.get("background_mode", config["background_mode"])
        incoming_style = updates.get("incoming_style", config["incoming_style"])
        incoming_symbols_in_boxes = updates.get(
            "incoming_symbols_in_boxes", config["incoming_symbols_in_boxes"]
        )
        glow_color = updates.get("glow_color", config["glow_color"])
        glow_enabled = updates.get("glow_enabled", config["glow_enabled"])
        glow_intensity = updates.get("glow_intensity", config["glow_intensity"])

        if background_mode not in ("default", "custom"):
            raise ValueError("Invalid background mode.")
        if incoming_style not in ("classic", "enhanced"):
            raise ValueError("Invalid incoming-call style.")
        if not isinstance(incoming_symbols_in_boxes, bool):
            raise ValueError("Incoming symbols in boxes must be true or false.")
        if not isinstance(glow_color, str) or not re.fullmatch(r"#[0-9a-fA-F]{6}", glow_color):
            raise ValueError("Glow color must use #RRGGBB format.")
        if not isinstance(glow_enabled, bool):
            raise ValueError("Glow enabled must be true or false.")
        try:
            glow_intensity = max(0, min(80, int(glow_intensity)))
        except (TypeError, ValueError):
            raise ValueError("Glow intensity must be a number from 0 to 80.")

        app_dir = Path(__file__).resolve().parent.parent
        image_dir = app_dir / "web" / "retro" / "images"
        image_dir.mkdir(parents=True, exist_ok=True)
        background_dir = image_dir / "backgrounds"

        def original_hash(path):
            if not path.exists():
                return ""
            return hashlib.sha256(path.read_bytes()).hexdigest()

        def active_originals():
            return sorted(image_dir.glob("retro-custom-background.*"))

        def active_variants():
            if not background_dir.exists():
                return []
            return sorted(
                path for path in background_dir.glob("background-*.*")
                if path.is_file()
            )

        def next_archive_dir():
            background_dir.mkdir(parents=True, exist_ok=True)
            index = 1
            while (background_dir / str(index)).exists():
                index += 1
            destination = background_dir / str(index)
            destination.mkdir()
            return destination

        def write_manifest(folder, source_file):
            manifest = {
                "source_file": source_file.name if source_file else "",
                "source_sha256": original_hash(source_file) if source_file else "",
            }
            (folder / "manifest.json").write_text(
                json.dumps(manifest, indent=2) + "\n",
                encoding="utf-8",
            )

        def archive_active_set():
            originals = active_originals()
            variants = active_variants()
            if not originals and not variants:
                return None
            destination = next_archive_dir()
            source_file = originals[0] if originals else None
            for path in originals + variants:
                path.rename(destination / path.name)
            write_manifest(destination, destination / source_file.name if source_file else None)
            return destination

        def find_archived_set(source_sha256):
            if not background_dir.exists():
                return None
            for folder in sorted(
                (path for path in background_dir.iterdir() if path.is_dir() and path.name.isdigit()),
                key=lambda path: int(path.name),
            ):
                manifest_path = folder / "manifest.json"
                try:
                    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                except (FileNotFoundError, ValueError, OSError):
                    manifest = {}
                if manifest.get("source_sha256") == source_sha256:
                    return folder
                for original in folder.glob("retro-custom-background.*"):
                    if original_hash(original) == source_sha256:
                        return folder
            return None

        def restore_archived_set(folder):
            restored_original = None
            for path in sorted(folder.iterdir()):
                if path.name == "manifest.json":
                    continue
                if path.name.startswith("retro-custom-background."):
                    target = image_dir / path.name
                    path.rename(target)
                    restored_original = target
                elif path.name.startswith("background-"):
                    path.rename(background_dir / path.name)
            try:
                folder.rmdir()
            except OSError:
                pass
            return restored_original

        image_data = updates.get("background_data")
        if image_data:
            match = re.fullmatch(r"data:image/(png|jpeg|webp);base64,(.+)", image_data, re.DOTALL)
            if not match:
                raise ValueError("Background must be a PNG, JPEG or WEBP image.")
            extension = "jpg" if match.group(1) == "jpeg" else match.group(1)
            try:
                decoded = base64.b64decode(match.group(2), validate=True)
            except (binascii.Error, ValueError):
                raise ValueError("Unable to decode the uploaded background.")
            if not decoded or len(decoded) > 8 * 1024 * 1024:
                raise ValueError("Background image must be smaller than 8 MB.")
            uploaded_sha256 = hashlib.sha256(decoded).hexdigest()
            current_originals = active_originals()
            current_sha256 = original_hash(current_originals[0]) if current_originals else ""
            archived = find_archived_set(uploaded_sha256)
            image_name = f"retro-custom-background.{extension}"
            if current_sha256 == uploaded_sha256:
                config["background_image"] = current_originals[0].name if current_originals else image_name
                config["background_variants_reused"] = True
            elif archived:
                archive_active_set()
                restored_original = restore_archived_set(archived)
                config["background_image"] = restored_original.name if restored_original else image_name
                config["background_variants_reused"] = True
                config["background_variants_restored_from"] = archived.name
            else:
                archive_active_set()
                source_path = image_dir / image_name
                source_path.write_bytes(decoded)
                config["background_image"] = image_name
                try:
                    from PIL import Image, ImageOps

                    background_dir.mkdir(parents=True, exist_ok=True)
                    for old_variant in active_variants():
                        old_variant.unlink()

                    sizes = (
                        (5120, 1440),
                        (3840, 2160),
                        (3440, 1440),
                        (2560, 1600),
                        (2560, 1440),
                        (1920, 1200),
                        (1920, 1080),
                        (1600, 1200),
                        (1440, 2560),
                        (1280, 1024),
                        (1080, 1920),
                    )
                    with Image.open(source_path) as uploaded:
                        image = ImageOps.exif_transpose(uploaded).convert("RGB")
                        for width, height in sizes:
                            variant = ImageOps.fit(
                                image,
                                (width, height),
                                method=Image.Resampling.LANCZOS,
                                centering=(0.5, 0.5),
                            )
                            variant.save(
                                background_dir / f"background-{width}x{height}.jpg",
                                "JPEG",
                                quality=92,
                                optimize=True,
                                progressive=True,
                            )
                    config["background_variants_generated"] = True
                    config["background_variants_reused"] = False
                except Exception as ex:
                    config["background_variants_generated"] = False
                    config["background_variant_error"] = str(ex)

        config.update({
            "background_mode": background_mode,
            "incoming_style": incoming_style,
            "incoming_symbols_in_boxes": incoming_symbols_in_boxes,
            "glow_enabled": glow_enabled,
            "glow_color": glow_color.lower(),
            "glow_intensity": glow_intensity
        })
        config_path = app_dir / "config" / "retro-visuals.json"
        config_path.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
        config["success"] = True
        return config
    # RETRO_VISUALS_HELPERS_END
'''
    if "# RETRO_VISUALS_HELPERS_START" in text and "# RETRO_VISUALS_HELPERS_END" in text:
        text = re.sub(
            r"\n\n    # RETRO_VISUALS_HELPERS_START.*?    # RETRO_VISUALS_HELPERS_END\n?",
            helper + "\n",
            text,
            count=1,
            flags=re.DOTALL,
        )
    elif "def get_retro_visuals_config(self):" not in text:
        text = text.rstrip() + helper + "\n"

    write_if_changed(path, text)


def install(app, files):
    for rel in PATCHED_FILES:
        if not (app / rel).exists():
            fail(f"Required SG1/Retro file missing: {app / rel}")
    copy_owned_files(app, files)
    patch_navigation(app / "web/retro/js/navigation.js")
    patch_dial(app / "web/retro/js/dial.js")
    patch_html(app / "web/retro/dial.html")
    patch_html(app / "web/retro/dial9.html")
    patch_web_server(app / "classes/web_server.py")
    py_compile.compile(
        str(app / "classes/web_server.py"),
        cfile="/tmp/stargate_web_server_retro_visuals_check.pyc",
        doraise=True,
    )
    Path("/tmp/stargate_web_server_retro_visuals_check.pyc").unlink(missing_ok=True)


def restore(app):
    navigation = app / "web/retro/js/navigation.js"
    if navigation.exists():
        text = navigation.read_text(encoding="utf-8")
        text = text.replace("\nimport './retro_visuals.js';", "")
        text = re.sub(
            r"\n\s*<a \$\{isActive\('/retro/visual_settings\.html'\)\}>Visuals</a>",
            "",
            text,
            count=1,
        )
        navigation.write_text(text, encoding="utf-8")
        print(f"Cleaned: {navigation}")

    dial = app / "web/retro/js/dial.js"
    if dial.exists():
        text = dial.read_text(encoding="utf-8")
        text = text.replace(
            """function shouldDisplayIncomingGlyphs() {
  return (
    gateStatus.address_buffer_incoming.length === 0 ||
    window.retroVisuals?.shouldDisplayIncomingSymbols?.() !== false
  );
}

""",
            "",
        )
        text = text.replace(
            "      buffer.length > bufferIndex &&\n"
            "      shouldDisplayIncomingGlyphs()\n"
            "    ) {",
            "      buffer.length > bufferIndex\n"
            "    ) {",
            1,
        )
        text = text.replace(
            "  if (bufferIndex < 9 && shouldDisplayIncomingGlyphs()) {\n",
            "  if (bufferIndex < 9) {\n",
            1,
        )
        text = text.replace(
            """      // RETRO_VISUALS_INCOMING_GLYPH_DELAY
      const glyphLockDelay =
        gateStatus.address_buffer_incoming.length > 0 ? 700 : 1;
      setTimeout(() => newGlyph.classList.add('locked'), glyphLockDelay);
      setTimeout(() => newGlyph2.classList.add('locked'), glyphLockDelay + 50);""",
            """      setTimeout(() => newGlyph.classList.add('locked'), 1);
      setTimeout(() => newGlyph2.classList.add('locked'), 50);""",
        )
        dial.write_text(text, encoding="utf-8")
        print(f"Cleaned: {dial}")

    for rel in ("web/retro/dial.html", "web/retro/dial9.html"):
        path = app / rel
        if path.exists():
            text = path.read_text(encoding="utf-8")
            text = re.sub(r'\n\s*<link rel="stylesheet" href="css/retro_visuals\.css" />', "", text, count=1)
            text = re.sub(r'\n\s*<script src="js/retro_visuals\.js(?:\?v=[^"]*)?"></script>', "", text, count=1)
            path.write_text(text, encoding="utf-8")
            print(f"Cleaned: {path}")

    web_server = app / "classes/web_server.py"
    if web_server.exists():
        text = web_server.read_text(encoding="utf-8")
        text = re.sub(
            r'\n\s*elif request_path == "/get/retro_visuals":\n'
            r"\s*data = self\.get_retro_visuals_config\(\)\n",
            "\n",
            text,
            count=1,
        )
        text = re.sub(
            r"\n\s*elif self\.path == '/update/retro_visuals':\n"
            r"\s*try:\n"
            r"\s*data = self\.update_retro_visuals_config\(data\)\n"
            r"\s*except \(TypeError, ValueError, OSError\) as ex:\n"
            r'\s*data = \{"success": False, "message": str\(ex\)\}\n',
            "\n",
            text,
            count=1,
        )
        text = re.sub(
            r"\n    # RETRO_VISUALS_HELPERS_START\n.*?"
            r"    # RETRO_VISUALS_HELPERS_END\n?",
            "\n",
            text,
            count=1,
            flags=re.DOTALL,
        )
        web_server.write_text(text, encoding="utf-8")
        py_compile.compile(
            str(web_server),
            cfile="/tmp/stargate_web_server_retro_visuals_restore_check.pyc",
            doraise=True,
        )
        Path("/tmp/stargate_web_server_retro_visuals_restore_check.pyc").unlink(missing_ok=True)
        print(f"Cleaned: {web_server}")

    for rel in OWNED_FILES:
        path = app / rel
        if path.exists():
            path.unlink()
            print(f"Removed: {path}")
    config = app / "config/retro-visuals.json"
    if config.exists():
        config.unlink()
        print(f"Removed: {config}")
    for image in (app / "web/retro/images").glob("retro-custom-background.*"):
        image.unlink()
        print(f"Removed: {image}")


def main():
    if len(sys.argv) != 4 or sys.argv[1] not in ("install", "restore"):
        fail("Usage: patch_retro_visuals.py install|restore APP_DIR FILES_DIR")
    action = sys.argv[1]
    app = Path(sys.argv[2]).resolve()
    files = Path(sys.argv[3]).resolve()
    if not app.exists():
        fail(f"SG1 app folder not found: {app}")
    if action == "install":
        install(app, files)
    else:
        restore(app)


if __name__ == "__main__":
    main()
