import pathlib
from PIL import Image, ImageOps, ImageDraw
root=pathlib.Path(__file__).resolve().parents[1]
paths=list((root/'public/assets').glob('*480*.webp'))+list((root/'docs/qa-results/image-typography/downloads').glob('*.webp'))
sheet=Image.new('RGB',(1000,((len(paths)+3)//4)*205),'white')
draw=ImageDraw.Draw(sheet)
for i,path in enumerate(paths):
    x=(i%4)*250; y=(i//4)*205
    im=ImageOps.contain(Image.open(path),(246,172))
    sheet.paste(im,(x,y+25)); draw.text((x+4,y+5),path.name.split('-480')[0].split('.webp')[0],fill='black')
sheet.save(root/'docs/qa-results/image-typography/contact-sheet.jpg')
