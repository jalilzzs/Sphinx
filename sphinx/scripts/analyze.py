import json,struct,numpy as np,sys,base64
from scipy import ndimage as ndi
CT={5120:np.int8,5121:np.uint8,5122:np.int16,5123:np.uint16,5125:np.uint32,5126:np.float32};NC={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}
def load(path):
    d=open(path,'rb').read();jl=struct.unpack('<I',d[12:16])[0];js=json.loads(d[20:20+jl]);p=20+jl
    bl=struct.unpack('<I',d[p:p+4])[0];bin_=d[p+8:p+8+bl]
    def acc(i):
        a=js['accessors'][i];bv=js['bufferViews'][a['bufferView']];dt=CT[a['componentType']];n=NC[a['type']];off=bv.get('byteOffset',0)+a.get('byteOffset',0)
        st=bv.get('byteStride',0);isz=np.dtype(dt).itemsize*n
        if st in(0,isz):return np.frombuffer(bin_,dt,a['count']*n,off).reshape(-1,n)
        raw=np.frombuffer(bin_,np.uint8,a['count']*st,off).reshape(a['count'],st)[:,:isz].copy();return raw.view(dt).reshape(-1,n)
    def M(n):
        if 'matrix' in n:return np.array(n['matrix'],float).reshape(4,4).T
        T=np.eye(4);t=n.get('translation',[0,0,0]);q=n.get('rotation',[0,0,0,1]);s=n.get('scale',[1,1,1])
        x,y,z,w=q;R=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
        T[:3,:3]=R*np.array(s);T[:3,3]=t;return T
    tris=[];cache={}
    def mesh(mi):
        if mi in cache:return cache[mi]
        out=[]
        for pr in js['meshes'][mi]['primitives']:
            if pr.get('mode',4)!=4 or 'POSITION' not in pr['attributes']:continue
            P=acc(pr['attributes']['POSITION']).astype(np.float64)
            I=acc(pr['indices']).reshape(-1).astype(np.int64) if 'indices' in pr else np.arange(len(P))
            out.append(P[I[:len(I)//3*3]].reshape(-1,3,3))
        cache[mi]=out;return out
    def walk(ni,pm):
        n=js['nodes'][ni];m=pm@M(n)
        if 'mesh' in n:
            for t in mesh(n['mesh']):tris.append((t.reshape(-1,3)@m[:3,:3].T+m[:3,3]).reshape(-1,3,3))
        for c in n.get('children',[]):walk(c,m)
    for r in js['scenes'][js.get('scene',0)]['nodes']:walk(r,np.eye(4))
    return np.concatenate(tris)
def analyze(path,ids,C=.25):
    T=load(path);print(' tris',len(T),'bbox',T.reshape(-1,3).min(0).round(1),T.reshape(-1,3).max(0).round(1))
    e1=T[:,1]-T[:,0];e2=T[:,2]-T[:,0];cr=np.cross(e1,e2);ar=np.linalg.norm(cr,axis=1)/2;ny=np.abs(cr[:,1])/np.maximum(np.linalg.norm(cr,axis=1),1e-12)
    ok=ar>1e-7;T,ar,ny=T[ok],ar[ok],ny[ok]
    k=np.clip(np.ceil(ar/(C*C*.15)),1,300).astype(int);tot=k.sum()
    if tot>8e6:k=np.maximum(1,(k*8e6/tot).astype(int))
    idx=np.repeat(np.arange(len(T)),k);u=np.random.rand(len(idx),2);f=u.sum(1)>1;u[f]=1-u[f]
    Pt=T[idx,0]+u[:,:1]*(T[idx,1]-T[idx,0])+u[:,1:]*(T[idx,2]-T[idx,0]);up=ny[idx]>.7
    mn=T.reshape(-1,3).min(0)-C;mx=T.reshape(-1,3).max(0)+C;dim=np.ceil((mx-mn)/C).astype(int)+1
    if dim[0]*dim[2]>1200*1200:print(' too big');return None
    g=np.floor((Pt-mn)/C).astype(int);occ=np.zeros(dim,bool);occ[g[:,0],g[:,1],g[:,2]]=True;fl=np.zeros(dim,bool);gu=g[up];fl[gu[:,0],gu[:,1],gu[:,2]]=True
    # headroom: no occupancy in y+1..y+8 ; ceiling: occupancy in y+9..y+34
    cs=np.cumsum(np.pad(occ,((0,0),(1,0),(0,0))),axis=1);Y=dim[1]
    def rng(a,b):
        lo=np.clip(np.arange(Y)+a,0,Y);hi=np.clip(np.arange(Y)+b+1,0,Y);return cs[:,hi,:]-cs[:,lo,:]
    head=rng(1,8)==0;ceil=rng(9,34)>0
    walk=fl&head&ceil
    if walk.sum()<50:walk=fl&head;print(' relaxed (no ceiling test)')
    lab,n=ndi.label(walk,structure=np.ones((3,3,3)));sizes=ndi.sum(walk,lab,range(1,n+1));best=1+int(np.argmax(sizes));comp=lab==best
    print(' walkable cells',int(walk.sum()),'main component',int(sizes.max()),'~',round(sizes.max()*C*C,1),'m2')
    col=comp.any(1);ycol=np.where(comp.any(1),np.argmax(comp,axis=1),0)         # lowest y per column
    edt=ndi.distance_transform_edt(col);xs,zs=np.nonzero(col);cx,cz=xs.mean(),zs.mean()
    w=edt[xs,zs]-.02*np.hypot(xs-cx,zs-cz);i=int(np.argmax(w));sx,sz=xs[i],zs[i]
    wp=lambda x,z:[round(float(mn[0]+(x+.5)*C),2),round(float(mn[1]+(ycol[x,z])*C+.0),2),round(float(mn[2]+(z+.5)*C),2)]
    spawn=wp(sx,sz);print(' spawn',spawn,'clear m',round(edt[sx,sz]*C,2))
    dist=np.hypot(xs-sx,zs-sz)*C;pts={};chosen=[(sx,sz)]
    def pick(cond,key):
        c=np.nonzero(cond)[0]
        if not len(c):c=np.arange(len(xs))
        best=None;bs=-1
        for j in c[np.random.permutation(len(c))[:600]]:
            m=min(np.hypot(xs[j]-a,zs[j]-b)*C for a,b in chosen);s=key(j,m)
            if s>bs:bs=s;best=j
        chosen.append((xs[best],zs[best]));return wp(xs[best],zs[best])
    for pid,kind in ids:
        if kind=='exit':
            j=int(np.argmax(np.where(edt[xs,zs]>=2.5,dist,0)));pts[pid]=wp(xs[j],zs[j]);chosen.append((xs[j],zs[j]))
        elif kind=='clue':pts[pid]=pick((dist>3)&(dist<11)&(edt[xs,zs]>=1.5)&(edt[xs,zs]<=3),lambda j,m:m)
        else:pts[pid]=pick((dist>2)&(dist<8)&(edt[xs,zs]>=2),lambda j,m:min(m,6))
    allow=ndi.binary_dilation(col,iterations=2)                                        # walkable footprint + 0.5 m tolerance
    ys,xe=np.nonzero(allow);x0,x1,z0,z1=ys.min(),ys.max()+1,xe.min(),xe.max()+1;sub=allow[x0:x1,z0:z1]
    grid={'ox':round(float(mn[0]+x0*C),2),'oz':round(float(mn[2]+z0*C),2),'c':C,'w':int(sub.shape[0]),'d':int(sub.shape[1]),'mask':base64.b64encode(np.packbits(sub.reshape(-1)).tobytes()).decode()}
    return {'spawn':spawn,'pts':pts,'grid':grid}
PUZ={'bathroom_interior':[('b_ink','item'),('b_pend','item'),('b_mirror','clue'),('b_door','exit')],
 'abandoned_warehouse_-_interior_scene':[('w_bat','item'),('w_cas','item'),('w_crate','clue'),('w_gate','exit')],
 'southwark_borough_control_bunker':[('k_key','item'),('k_term','clue'),('k_door','exit')],
 'st_pancras_new_church_crypt':[('c_ins','clue'),('c_tomb','exit')],
 'the_hallwyl_museum_1st_floor_combined':[('m_plaque','clue'),('m_hall','exit')]}
SID={'bathroom_interior':'bathroom_interior','abandoned_warehouse_-_interior_scene':'abandoned_warehouse','southwark_borough_control_bunker':'southwark_borough_bunker','st_pancras_new_church_crypt':'st_pancras_new_church_crypt','the_hallwyl_museum_1st_floor_combined':'the_hallwyl_museum'}
np.random.seed(7);L={}
for f,ids in PUZ.items():
    print(f);r=analyze('/mnt/user-data/uploads/'+f+'.glb',ids)
    if r:L[SID[f]]=r
import os;os.makedirs('/home/claude/sphinx/lib',exist_ok=True)
open('/home/claude/sphinx/lib/layout.ts','w').write('// Auto-generated from the original GLBs (scripts/analyze.py). spawn/pts are world coords at floor level.\nexport type Layout={spawn:[number,number,number];pts:Record<string,[number,number,number]>;grid:{ox:number;oz:number;c:number;w:number;d:number;mask:string}};\nexport const LAYOUT:Record<string,Layout>='+json.dumps(L,separators=(",",":"))+';\n')
print('written',list(L))
