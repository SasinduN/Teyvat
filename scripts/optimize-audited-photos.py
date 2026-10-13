import json,pathlib,hashlib
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[1]
photos=json.loads((root/'shared/travel-photos.json').read_text())
registry=json.loads((root/'shared/optimized-photos.json').read_text())
credits=(root/'public/assets/PHOTO_CREDITS.md').read_text()
for photo in photos:
    if photo['image'] in registry: continue
    existing=sorted((root/'public/assets').glob(photo['key']+'-*.webp'))
    if existing:
        variants=', '.join('/assets/'+p.name+' '+p.name.split('-')[1]+'w' for p in sorted(existing,key=lambda p:int(p.name.split('-')[1])))
    else:
        source=root/'docs/qa-results/image-typography/downloads'/(photo['key']+'.webp')
        if not source.exists():continue
        im=Image.open(source).convert('RGB'); candidates=[]; names=[]
        for width in [480,768,1280]:
            if width>im.width:continue
            resized=im.resize((width,round(im.height*width/im.width)),Image.Resampling.LANCZOS)
            import io
            buffer=io.BytesIO();resized.save(buffer,'WEBP',quality=84,method=6);data=buffer.getvalue()
            name=photo['key']+'-'+str(width)+'-'+hashlib.sha256(data).hexdigest()[:16]+'.webp'
            (root/'public/assets'/name).write_bytes(data)
            candidates.append('/assets/'+name+' '+str(width)+'w');names.append(name)
        variants=', '.join(candidates)
        credits+='\n## '+photo['key']+'\n\nAuthor: '+photo['author']+'. Original: ['+photo['file']+']('+photo['source']+'). License: ['+photo['license']+']('+photo['licenseUrl']+'). Adaptations: resized and re-encoded to WebP; display may crop.\n\n'+''.join('- '+name+'\n' for name in names)
    registry[photo['image']]=variants;registry[photo['original']]=variants
(root/'shared/optimized-photos.json').write_text(json.dumps(registry,indent=2)+'\n')
(root/'public/assets/PHOTO_CREDITS.md').write_text(credits)
print('Registered',len(registry)//2,'same-origin photographs')
