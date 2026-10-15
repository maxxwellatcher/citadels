from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parents[1]
with ZipFile(root / 'citadels-offline.zip', 'w', ZIP_DEFLATED) as archive:
    for file in (root / 'dist').rglob('*'):
        if file.is_file():
            archive.write(file, file.relative_to(root / 'dist'))
    archive.write(root / 'OFFLINE.md', 'OFFLINE.md')
print('Created citadels-offline.zip')
