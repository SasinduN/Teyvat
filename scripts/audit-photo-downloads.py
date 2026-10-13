import json, pathlib, urllib.request, hashlib, io
from PIL import Image, ImageOps
root = pathlib.Path(__file__).resolve().parents[1]
photos = json.loads((root/'shared/travel-photos.json').read_text())
optimized = json.loads((root/'shared/optimized-photos.json').read_text())
out = root/'docs/qa-results/image-typography/downloads'
out.mkdir(parents=True, exist_ok=True)
results = json.loads((out.parent/'downloads.json').read_text()) if (out.parent/'downloads.json').exists() else []
for photo in photos:
    if photo['image'] in optimized or (out/(photo['key']+'.webp')).exists():
        continue
    url = photo['image'].replace('https://upload.wikimedia.org/wikipedia/commons/thumb/', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/')
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'TravelEyeImageAudit/1.0 (Sri Lanka travel photograph attribution audit)'})
        with urllib.request.urlopen(req, timeout=30) as response:
            data = response.read(10*1024*1024+1)
        if len(data)>10*1024*1024: raise ValueError('Image exceeds 10 MB')
        image = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert('RGB')
        image.thumbnail((1280,1280))
        path = out/(photo['key']+'.webp')
        image.save(path, 'WEBP', quality=84, method=6)
        results.append({'key':photo['key'],'url':url,'status':'downloaded','width':image.width,'height':image.height,'bytes':path.stat().st_size})
        print(photo['key'], 'downloaded', image.size, flush=True)
    except Exception as error:
        results.append({'key':photo['key'],'url':url,'status':'blocked','error':str(error)})
        print(photo['key'], 'BLOCKED', str(error), flush=True)
(out.parent/'downloads.json').write_text(json.dumps(results,indent=2))
