"""Generate credited WebP variants. Requires Pillow and outbound image access.

Never edits database rows or substitutes photographs. The manifest is published
only after every download succeeds; failed downloads leave the old manifest valid.
Run before npm.cmd run build, then commit generated assets and manifest together.
"""
import hashlib
from io import BytesIO
import json
from pathlib import Path
import urllib.request

from PIL import Image, ImageOps

root = Path(__file__).resolve().parent.parent
photos = json.loads((root / 'shared/travel-photos.json').read_text(encoding='utf-8'))
output = root / 'public/assets'
output.mkdir(parents=True, exist_ok=True)
manifest = {}
inventory = []
for photo in photos:
    request = urllib.request.Request(photo['original'], headers={'User-Agent': 'TravelEyePhotoVariants/1.0'})
    data = urllib.request.urlopen(request, timeout=25).read()
    image = ImageOps.exif_transpose(Image.open(BytesIO(data))).convert('RGB')
    candidates = []
    widths = sorted(set(min(width, image.width) for width in [480, 768, 1280, 1920]))
    for width in widths:
        variant = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
        buffer = BytesIO()
        variant.save(buffer, format='WEBP', quality=85, method=6)
        encoded = buffer.getvalue()
        digest = hashlib.sha256(encoded).hexdigest()[:16]
        name = f'{photo["key"]}-{width}-{digest}.webp'
        (output / name).write_bytes(encoded)
        candidates.append(f'/assets/{name} {width}w')
        inventory.append({'photo': photo['key'], 'width': width, 'bytes': len(encoded), 'file': name})
    for source in [photo['image'], photo['original']]:
        manifest[source] = ', '.join(candidates)
    print(photo['key'], 'generated', len(candidates), 'WebP variants')
(root / 'shared/optimized-photos.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
(root / 'docs/qa-results/performance/image-variants.json').write_text(json.dumps(inventory, indent=2) + '\n', encoding='utf-8')
