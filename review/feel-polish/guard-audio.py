"""Fail closed if any protected music/sting differs from the requested baseline."""
from pathlib import Path
import subprocess,hashlib,json
root=Path(__file__).resolve().parents[2]
paths=subprocess.check_output(['git','ls-tree','-r','--name-only','80359c4','assets/audio'],cwd=root,text=True).splitlines()
protected=[p for p in paths if Path(p).name.startswith(('bgm-','feixiang-sting','sting-clear'))]
rows=[]
for p in protected:
 before=subprocess.check_output(['git','show','80359c4:'+p],cwd=root)
 after=(root/p).read_bytes()
 a,b=(hashlib.sha256(x).hexdigest() for x in (before,after))
 rows.append({'path':p,'baseline':a,'current':b})
 assert a==b,p+' changed'
(root/'review/feel-polish/protected-audio.json').write_text(json.dumps(rows,indent=2)+'\n')
print('PASS',len(rows),'protected files unchanged')
