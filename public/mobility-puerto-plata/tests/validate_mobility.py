from pathlib import Path
import unittest
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "index.html"

class Inspector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags=[]
        self.ids=[]
    def handle_starttag(self,tag,attrs):
        self.tags.append(tag)
        self.ids += [value for k,value in attrs if k=="id"]

class MobilityTests(unittest.TestCase):
    def test_html_and_inputs(self):
        text=HTML.read_text(encoding="utf-8")
        doc=Inspector();doc.feed(text)
        for key in ("map","route","stops","census","field","clear","buffer","state"):
            self.assertIn(key,doc.ids)
        self.assertEqual(doc.tags.count("html"),1)
    def test_explicit_data_provenance(self):
        text=HTML.read_text(encoding="utf-8")
        for phrase in ("No se dibuja un heatmap inventado","NO geometría GIS","NO miden tiempo a pie","FeatureCollection"):
            self.assertIn(phrase,text)
        self.assertIn("poblacion",text)
    def test_safe_data_handling(self):
        text=HTML.read_text(encoding="utf-8")
        self.assertIn("file.text()",text)
        self.assertIn("20,000",text)
        self.assertIn("replace(/[<>]/g",text)

if __name__=="__main__":
    unittest.main()
