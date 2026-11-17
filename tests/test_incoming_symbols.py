import importlib.util
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "retro_visuals_patch", ROOT / "patch_retro_visuals.py"
)
PATCH = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PATCH)


COMMON = """function dial() {
  if (bufferIndex >= locked_chevrons) {
    PENDING
      displayGlyph();
    }
    encoding = false;
    return;
  }

  if (bufferIndex < 9) {
    const [newGlyph, newGlyph2] = displayGlyph();
      setTimeout(() => lockGlyphInBox(newGlyph), 1);
      setTimeout(() => lockGlyphInBox(newGlyph2), 50);
  }
}
"""


class IncomingSymbolsPatchTests(unittest.TestCase):
    def patch(self, pending):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            path = root / "web/retro/js/dial.js"
            path.parent.mkdir(parents=True)
            original = COMMON.replace("    PENDING\n", pending)
            path.write_text(original, encoding="utf-8")
            PATCH.patch_dial(path)
            first = path.read_text(encoding="utf-8")
            PATCH.patch_dial(path)
            second = path.read_text(encoding="utf-8")
            PATCH.restore(root)
            restored = path.read_text(encoding="utf-8")
        self.assertEqual(first, second)
        self.assertEqual(restored, original)
        self.assertIn("function shouldDisplayIncomingGlyphs()", first)
        self.assertIn("bufferIndex < 9 && shouldDisplayIncomingGlyphs()", first)
        return first

    def test_single_line_pending_glyph_is_guarded(self):
        result = self.patch("    if (buffer.length > bufferIndex) {\n")
        self.assertIn(
            "if (buffer.length > bufferIndex && shouldDisplayIncomingGlyphs())",
            result,
        )

    def test_multiline_pending_glyph_is_guarded(self):
        result = self.patch(
            "    if (\n"
            "      buffer.length > bufferIndex\n"
            "    ) {\n"
        )
        self.assertIn(
            "buffer.length > bufferIndex &&\n"
            "      shouldDisplayIncomingGlyphs()",
            result,
        )

    def test_new_install_defaults_to_symbols_in_boxes(self):
        runtime = (ROOT / "files/web/retro/js/retro_visuals.js").read_text(
            encoding="utf-8"
        )
        installer = (ROOT / "patch_retro_visuals.py").read_text(encoding="utf-8")
        self.assertIn("incoming_symbols_in_boxes: true", runtime)
        self.assertIn('"incoming_symbols_in_boxes": True', installer)


if __name__ == "__main__":
    unittest.main()
