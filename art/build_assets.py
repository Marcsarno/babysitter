"""Build original rounded, articulated characters and an open-plan family house in Blender."""
import bpy, math, os, json
from mathutils import Vector, Matrix
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'public','assets');os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for mesh_data in list(bpy.data.meshes):
    if mesh_data.users==0:bpy.data.meshes.remove(mesh_data)
for m in list(bpy.data.materials):bpy.data.materials.remove(m)
cache={}; batches={}; current='house'; obstacle=[]; roots={}
def rgb(h):
    v=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    return [a/12.92 if a<=.04045 else ((a+.055)/1.055)**2.4 for a in v]
mat=bpy.data.materials.new('Storybook vertex paint');mat.use_nodes=True
bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.72
vc=mat.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Color';mat.node_tree.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
def primitive(kind):
    if kind in cache:return cache[kind]
    if kind=='ball':bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,radius=1)
    elif kind=='cyl':bpy.ops.mesh.primitive_cylinder_add(vertices=20,radius=1,depth=1)
    elif kind=='cone':bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=1,radius2=.2,depth=1)
    else:
        bpy.ops.mesh.primitive_cube_add(size=1)
        if kind=='soft':
            mod=bpy.context.object.modifiers.new('Rounded edges','BEVEL');mod.width=.13;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name)
    o=bpy.context.object; data=([tuple(v.co) for v in o.data.vertices],[list(p.vertices) for p in o.data.polygons]);bpy.data.objects.remove(o,do_unlink=True);cache[kind]=data;return data
def shape(kind,n,x,z,y,w,d,h,c,turn=0,solid=False):
    verts,faces=primitive(kind);b=batches.setdefault(current,{'v':[],'f':[],'c':[],'smooth':[]});off=len(b['v']);co=math.cos(turn);si=math.sin(turn)
    for vx,vy,vz in verts:
        xx=vx*w;zz=-vy*d;b['v'].append((x+xx*co-zz*si,-(z+xx*si+zz*co),y+vz*h))
    col=(*rgb(c),1)
    for f in faces:b['f'].append([off+i for i in f]);b['c'].append(col);b['smooth'].append(kind=='ball')
    if solid:obstacle.append([x,z,w,d])
def box(n,x,z,y,w,d,h,c,solid=False,turn=0):shape('soft',n,x,z,y,w,d,h,c,turn,solid)
def flat(n,x,z,y,w,d,h,c):shape('box',n,x,z,y,w,d,h,c)
def ball(n,x,z,y,w,d,h,c):shape('ball',n,x,z,y,w,d,h,c)
def cyl(n,x,z,y,r,h,c):shape('cyl',n,x,z,y,r,r,h,c)
def root(n,parent=None,at=(0,0,0)):
    o=bpy.data.objects.new(n,None);bpy.context.collection.objects.link(o);o.parent=parent;o.location=(at[0],-at[1],at[2]);roots[n]=o;return o
def mesh(n,parent=None):
    b=batches.pop(n);me=bpy.data.meshes.new(n);me.from_pydata(b['v'],[],b['f']);me.materials.append(mat);a=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    for p,c,s in zip(me.polygons,b['c'],b['smooth']):
        p.use_smooth=s
        for i in p.loop_indices:a.data[i].color=c
    o=bpy.data.objects.new(n+'_mesh',me);bpy.context.collection.objects.link(o);o.parent=parent;return o
def export(n,objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
        for ch in o.children_recursive:ch.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,n+'.glb'),export_format='GLB',use_selection=True,export_yup=True)
def wall(x,z,w,d,h=1.15):
    box('wall',x,z,h/2,w,d,h,'f8e8d1',True);box('cap',x,z,h+.035,w+.035,d+.035,.07,'eed4b2')
def rug(x,z,w,d,c):
    box('rug',x,z,.075,w,d,.035,c)
    for dx in [-w/2+.13,w/2-.13]:flat('rug stitch',x+dx,z,.097,.035,d-.2,.01,'fff0d2')
def chair(x,z,c='dcb087',turn=0):
    box('seat',x,z,.55,.7,.7,.18,c,True);box('back',x,z-.29,.94,.7,.16,.7,c)
    for dx in [-.24,.24]:
        for dz in [-.24,.24]:box('leg',x+dx,z+dz,.24,.09,.09,.5,'a57350')
def sofa(x,z,c,w=3.6):
    box('sofa',x,z,.42,w,1.25,.65,c,True);box('back',x,z-.5,.95,w,.32,1,c)
    for dx in [-w/2,w/2]:box('arm',x+dx,z,.78,.3,1.35,.7,c)
    for dx in [-1,0,1]:box('cushion',x+dx,z+.07,.78,.91,1,.2,'f0d7b8')
    for dx,col in [(-1.1,'dc9278'),(1.1,'9ab5cb')]:ball('pillow',x+dx,z-.2,1.07,.35,.16,.32,col)
def bed(x,z,c,w=1.9):
    box('frame',x,z,.3,w,2.6,.4,'bc8e65',True);box('headboard',x,z-1.25,.86,w+.1,.18,1.3,'b98965');box('mattress',x,z,.62,w-.06,2.45,.33,'fff3df');box('quilt',x,z+.4,.84,w,1.7,.12,c);box('pillow',x,z-.8,.89,w-.4,.5,.2,'fffaeb')
    for dx in [-.5,0,.5]:flat('quilt piping',x+dx,z+.4,.905,.025,1.6,.008,'fbe8d9')
def shelf(x,z,w=1.7):
    box('bookcase',x,z,.8,w,.4,1.6,'bb8c63',True)
    for y in [.25,.8,1.35]:
        box('shelf lip',x,z+.2,y,w,.1,.07,'ebc995')
        for i,c in enumerate(['d58177','91abc9','e6bb63','9db48c','c79ebe']):box('book',x-w/2+.2+i*(w-.35)/5,z+.25,y+.23,.17,.16,.39,c)
def plant(x,z,big=False):
    cyl('pot',x,z,.25,.23,.5,'d79878');ball('leaves',x,z,.75,.38,.35,.45,'7fa270')
def picture(x,z,c):
    box('frame',x,z,.89,.8,.07,.64,'ae7c59');box('paper',x,z+.05,.89,.66,.02,.5,'fff4dc');ball('sun',x+.15,z+.07,.98,.11,.015,.11,'f4c969');flat('landscape',x,z+.08,.76,.6,.01,.16,c)
rooms=[{'name':'Kitchen','x':-4.8,'z':-4,'w':8,'d':6},{'name':'Dining room','x':3,'z':-4,'w':8,'d':6},{'name':'Living room','x':-4,'z':1,'w':10,'d':6},{'name':'Play studio','x':4,'z':1,'w':6,'d':6},{'name':'Harper’s room','x':-6,'z':6,'w':6,'d':6},{'name':'Nursery','x':-.5,'z':6,'w':5,'d':6},{'name':'Bathroom','x':-11,'z':1.5,'w':4,'d':6},{'name':'Kayla’s room','x':4.5,'z':6,'w':5,'d':6},{'name':'Laundry','x':-11,'z':-4,'w':4,'d':6}]
# A wide main house with a small service wing; shared rooms connect through wide openings.
box('main foundation',-1,1,-.22,16.3,18.3,.44,'c7a47b');box('wing foundation',-11,-2,-.22,4.3,12.3,.44,'c7a47b')
for x,z,w,d,c in [(-5,-5,8,6,'d7b78e'),(3,-5,8,6,'dfbd97'),(-4,1,10,6,'d2ac85'),(4,1,6,6,'d3b695'),(-6,7,6,6,'e2bdb2'),(-.5,7,5,6,'d1c4b1'),(4.5,7,5,6,'ceb397'),(-11,1,4,6,'bcd5df'),(-11,-5,4,6,'d4d3c4')]:
    flat('floor',x,z,.015,w-.05,d-.05,.06,c)
    for i in range(int(w*2)):flat('plank',x-w/2+.25+i*.5,z,.047,.014,d-.12,.008,'b99a79')
# Outer envelope, cutaway front walls.
wall(-3,-8,20,.16,1.8);wall(-13,-2,.16,12,1.6);wall(7,-4,.16,8,.8);wall(7,7,.16,6,.8);wall(-1,10,16,.16,.5);wall(-11,4,4,.16,.65)
for z,d in [(-7,2),(-2.1,3.8),(3.2,1.6)]:wall(-9,z,.16,d,.95)
wall(-11,-2,4,.16,1.1)
# Very wide kitchen/living opening, open dining/play room.
wall(-7.9,-2,2.2,.15,.9);wall(-1.5,-2,1,.15,.8)
for x,w in [(-8,2),(-3.85,2.3),(1.45,2.1),(6.35,1.3)]:wall(x,4,w,.15,.95)
wall(-3,7,.15,6,1);wall(2,7,.15,6,1)
# Kitchen L and island with uncluttered circulation.
for x in [-8,-6.8,-5.6,-4.4,-3.2,-2]:
    box('blue cabinet',x,-7.35,.5,1.12,1.1,1,'83a3b5',True);box('counter',x,-7.35,1.06,1.18,1.2,.13,'f9e7c8');box('handle',x,-6.77,.76,.35,.045,.045,'c5965d')
box('backsplash',-5,-7.84,1.35,7,.04,.5,'c1d8dc')
box('fridge',-8,-5.8,1.13,1.15,1.2,2.25,'faf1df',True);box('fridge handle',-7.41,-5.8,1.1,.06,.09,.65,'baa17d')
for z,c in [(-5.5,'d79fae'),(-6,'93b1c9')]:box('child drawing',-7.4,z,1.7,.015,.3,.35,c)
box('stove',-6,-7.35,1.15,1.2,1,.07,'455d68')
for x in [-6.3,-5.8]:
    for z in [-7.6,-7.1]:cyl('burner',x,z,1.2,.19,.03,'899ea4')
cyl('pot',-6,-7.35,1.38,.3,.35,'db8464');cyl('soup',-6,-7.35,1.57,.27,.03,'f0bc58')
box('sink',-3.2,-7.35,1.14,.8,.72,.05,'93b8c5');box('tap',-3.2,-7.7,1.4,.07,.07,.55,'afbac0')
box('island',-4.5,-4.5,.5,3,1.2,1,'d7a187',True);box('island top',-4.5,-4.5,1.08,3.15,1.32,.16,'f5dab1');box('chopping board',-4.5,-4.17,1.19,.8,.5,.05,'b4865c')
for x in [-5.5,-5.15]:ball('fruit',x,-4.5,1.32,.13,.14,.14,'e6b358')
box('microwave',-8,-7.35,1.45,.8,.6,.62,'ece4d4');box('glass',-8,-7.01,1.45,.62,.025,.4,'596e7a')
box('toaster',-2,-7.35,1.35,.48,.4,.34,'cd8e76');box('toast',-2,-7.35,1.58,.12,.28,.16,'d2a16b')
# Dining room, highchair and rear French doors.
rug(3.5,-5.3,4.3,3.8,'d9b87e');box('table',3.5,-5.5,.9,2.8,1.8,.2,'b88760',True)
for dx in [-1.15,1.15]:
    for dz in [-.65,.65]:box('table leg',3.5+dx,-5.5+dz,.45,.14,.14,.85,'9f714f')
for x in [2.7,4.3]:
    for z in [-6.85,-4.15]:chair(x,z)
    cyl('plate',x,-5.45,1.03,.28,.035,'fff8e5')
chair(1.25,-5.5,'cf9b91');box('highchair tray',1.25,-5.14,1.03,.85,.42,.12,'f4d9b7');box('booster',1.25,-5.5,.83,.58,.6,.3,'d9b7a2')
for x in [1.2,2.8,4.4]:
    box('window casing',x,-7.87,1.25,1.4,.06,1.2,'fff2da');box('sky glass',x,-7.82,1.25,1.23,.02,1.02,'a4d4de');box('mullion',x,-7.79,1.25,.06,.015,1.02,'fff2da')
# Living room: generous central play space and comfortable seating.
rug(-4.5,1,6.5,4.5,'e6c695');sofa(-5.2,-.75,'d18f74',4)
box('coffee table',-5,1.3,.45,1.8,1,.22,'ba8d64',True);box('magazine',-5.3,1.3,.59,.5,.35,.05,'93adc4')
box('TV stand',-8.3,1.5,.48,.8,2,.8,'b48d68',True);box('TV',-8.3,1.5,1.37,.13,1.8,1.05,'465b6c');box('TV screen',-8.21,1.5,1.37,.025,1.63,.85,'95becb')
shelf(-8,-1.65);plant(-7.9,3.2);picture(-5.3,-1.91,'acb99b')
cyl('lamp',-2,-.75,1,.04,1.9,'b29772');shape('cone','lampshade',-2,-.75,1.97,.43,.43,.5,'f5d7a1')
# Creative studio: a train rug, art table, dress-up and a reading corner.
rug(4,1,4.9,4.5,'9db8c5');sofa(4.5,-1,'8599bd',3.2);shelf(6.45,2.8,1)
box('art table',2.2,2.8,.48,1.5,1,.16,'d8b68a',True);box('paper',2.2,2.8,.58,1.25,.8,.02,'fff5e0')
for x,c in [(1.8,'d78786'),(2.1,'a08cbe'),(2.4,'e1b759')]:box('crayon',x,2.75,.62,.06,.35,.065,c)
box('toy box',5.6,3.15,.4,1,1,.75,'d7a95e',True)
for i,c in enumerate(['d98b76','8eaed0','e9c467']):
    box('train',3.5+i*.45,1.2,.21,.34,.25,.28,c)
    for dz in [-.15,.15]:ball('wheel',3.5+i*.45,1.2+dz,.1,.09,.035,.09,'4b5c68')
for x,z,c in [(4.8,2.7,'d998b1'),(5.4,2.4,'e5bf72'),(5.1,3.2,'94b99a')]:box('block',x,z,.19,.4,.4,.38,c)
# Bedrooms, storage and the short bedroom connection through shared rooms.
bed(-7.4,7.7,'d999b2');rug(-5,6.7,2.8,3.5,'e7cfa9');shelf(-4,9.35,1.6)
ball('teddy',-7.3,7.1,1.13,.26,.2,.3,'b8855e');ball('teddy head',-7.3,7.1,1.48,.24,.2,.23,'b8855e')
for dx in [-.2,.2]:ball('teddy ear',-7.3+dx,7.1,1.66,.09,.08,.1,'b8855e')
bed(.7,8.25,'95b2cd');rug(-.75,6.3,3.6,2.6,'e5c477')
for dx in [-.95,.95]:
    box('crib rail',.7+dx,8.25,1.25,.08,2.55,.09,'f0dcc0')
    for z in [7.15,7.55,7.95,8.35,8.75,9.2]:box('spindle',.7+dx,z,.97,.045,.045,.54,'f0dcc0')
box('changing dresser',-1.7,4.65,.55,1.4,.9,1.05,'d5b69a',True);box('pad',-1.7,4.65,1.15,1.3,.8,.16,'caa2b9')
bed(-1.85,8.1,'c8a2bf',1.25)
bed(4.7,8.1,'aaa6c3',2.8);rug(4.5,5.8,3.8,2.2,'dabb9c')
box('wardrobe',6.3,5.6,1.1,1,.8,2.15,'c79b79',True)
for dx in [-.23,.23]:box('wardrobe door',6.3+dx,6.02,1.1,.43,.05,1.9,'e5c9a6')
# Bathroom and utility wing.
for x in [-12.5,-11.5,-10.5,-9.5]:
    for z in [-1.5,-.5,.5,1.5,2.5,3.5]:flat('tile',x,z,.055,.95,.95,.025,'e2edf0')
box('tub',-11.1,-.65,.48,2.4,1.5,.85,'fff3df',True);box('water',-11.1,-.65,.92,2.02,1.16,.035,'8cd2e0')
for dx in [-1.1,1.1]:box('tub rim',-11.1+dx,-.65,.99,.17,1.5,.15,'fff9ec')
box('sink stand',-12.4,1.7,.55,.85,1.05,1,'90b0c3',True);ball('basin',-12.4,1.7,1.12,.44,.49,.12,'fff5df')
box('mirror',-12.78,1.7,1.6,.07,.85,.88,'b7d9df')
box('toilet tank',-10,3.4,.75,.67,.35,.75,'faf5e9',True);ball('bowl',-10,2.9,.48,.36,.45,.2,'fff7ea');ball('seat',-10,2.9,.64,.24,.3,.025,'b4c5d1')
rug(-11.1,1.4,1.9,1.2,'e7bd9b')
for z in [-6.9,-5.4]:
    box('washer',-12.25,z,.65,1.2,1.2,1.25,'eee7dc',True);ball('washer window',-11.61,z,.68,.045,.4,.4,'8baab6')
box('folding counter',-10.4,-7,.6,1.8,1,1.15,'b49b88',True)
for y,c in [(1.25,'d49caf'),(1.38,'a0bad0')]:box('towels',-10.4,-7,y,1.2,.8,.14,c)
cyl('hamper',-10.3,-3,.36,.4,.7,'c19b76');plant(-12.4,-2.6)
# Green garden, trees, driveway and a fenced backyard pool.
flat('lawn',-1,1,-.51,65,65,.18,'82aa65')
flat('driveway',-11,13.5,-.39,5.5,18,.12,'c6c2b6')
for z in [6,9,12,15,18,21]:flat('driveway seam',-11,z,-.318,5.4,.025,.01,'aaa89d')
flat('rear patio',-1,-10,-.37,17,4,.16,'e0c6a3');flat('entry walk',3,12,-.37,2,4,.14,'e0c6a3')
box('pool coping',1,-16,-.25,8.8,5.7,.28,'e9deca');box('pool water',1,-16,-.075,8.2,5.1,.07,'56c3db')
for i in range(8):flat('pool shimmer',-2+i*.83,-16+math.sin(i)*1.5,-.032,.6,.06,.005,'b5e7e5')
for x,z,w,d in [(-4,-16,.1,7),(6,-16,.1,7),(1,-19.5,10,.1),(1,-12.5,10,.1)]:
    box('pool fence rail',x,z,.65,w,d,.08,'efe5cc');box('pool fence lower',x,z,.15,w,d,.08,'efe5cc')
    count=int(max(w,d)*1.5)
    for i in range(count+1):box('fence picket',x+((i/count-.5)*w if w>d else 0),z+((i/count-.5)*d if d>w else 0),.36,.06,.06,.8,'eee2c9')
for x,z in [(-16,-10),(-16,5),(10,-10),(11,4),(11,12),(-7,-20),(8,-21)]:
    cyl('tree trunk',x,z,1.05,.28,2.6,'a17750')
    for dx,dz,y,r in [(0,0,3.3,1.55),(-.8,.3,2.9,1.1),(.7,-.3,3.65,1.2)]:ball('tree canopy',x+dx,z+dz,y,r,r*.9,r,'6c9e59')
    for dx,dz in [(-.5,.8),(.7,.2)]:ball('apple',x+dx,z+dz,3.3,.15,.15,.16,'db9070')
box('garden sandpit',9,-3,-.27,2.6,2.5,.2,'c79e6c');flat('sand',9,-3,-.15,2.3,2.2,.04,'efce8e')
for x in [-5.8,-4.8,-3.8]:flat('stepping stone',x,-10.5,-.23,.7,.8,.13,'eddbc1')
# A side entrance connects the driveway to the family room.
flat('front path',-1,12,-.32,21,1.4,.14,'e1c9a4');flat('side path',8.8,6,-.32,1.6,13,.14,'e1c9a4')
box('porch',8,1.6,-.12,2,3.5,.32,'c5a481');rug(7.9,1.5,1.4,1.8,'c49b6a')
for z in [.2,3.2]:box('door jamb',7,z,1,.15,.12,2,'e7ccab')
box('entry lintel',7,1.7,2,.15,3.1,.16,'e7ccab');box('open front door',7.8,.2,.9,1.5,.1,1.8,'b77963');ball('door knob',8.3,.27,.85,.07,.04,.07,'d8b771')
box('shoe bench',6.3,.5,.4,.6,1.3,.16,'c69b71',True)
for z in [.15,.5,.85]:ball('little shoe',6.25,z,.14,.17,.1,.08,'c994aa')
# Family car, pool loungers, a striped umbrella, flowers and garden toys.
box('family car',-11,16,.4,2.5,4.3,.9,'97b7cc');box('car cabin',-11,16,1.15,2.15,2.35,.75,'a1bfd0');box('windshield',-11,14.85,1.2,1.9,.06,.6,'587d95')
for x in [-12.23,-9.77]:
    for z in [14.6,17.3]:ball('car tire',x,z,.1,.15,.45,.45,'4e5961');ball('wheel hub',x+(-.12 if x<-11 else .12),z,.1,.035,.22,.22,'e0dacd')
for x in [-11.8,-10.2]:box('headlight',x,13.82,.45,.48,.06,.22,'f7e3a6')
for x in [-6.5,-8.1]:
    box('lounger',x,-15,.05,1.15,2.8,.25,'d9b88d');box('lounger cushion',x,-15,.23,1.05,2.7,.13,'e9c5b1');box('folded pool towel',x,-14.2,.34,.95,.6,.1,'8bb5c8')
cyl('umbrella pole',-7.3,-17.2,1.1,.055,3,'a48560');shape('cone','umbrella',-7.3,-17.2,2.8,1.8,1.8,.6,'df9e85')
for x,z in [(8.5,3.8),(8.5,-.7),(-8,11),(-3,11)]:
    box('flower planter',x,z,-.1,1.2,.6,.35,'c59876')
    for i,c in enumerate(['dba1b6','e5c366','b29bc9']):
        cyl('flower stem',x-.35+i*.35,z,.2,.025,.55,'77966b');ball('flower',x-.35+i*.35,z,.52,.16,.16,.12,c)
ball('garden ball',9,-4,-.02,.27,.27,.27,'d88b78');box('sand bucket',9.6,-3,.05,.35,.35,.4,'91b5cc')
house=mesh('house');export('house',[house])
layout={'obstacles':obstacle,'rooms':rooms,'bounds':[-12.7,6.7,-7.7,9.7],'regions':[[-1,1,16,18],[-11,-2,4,12]]}
with open(os.path.join(OUT,'navigation.json'),'w',encoding='utf8') as f:json.dump(layout,f)
# Detailed, articulated original characters. Every joint keeps a separate mesh.
for name,shirt,hair,height,style in [('kayla','d5876b','dec078',1.95,'bun'),('harper','d394b1','e5c779',1.35,'pigtails'),('jax','87acd0','ebd493',1.05,'tuft'),('arianna','e4b85e','654337',1.58,'ponytail'),('lilah','a594ca','dfbd71',1.14,'pigtails')]:
    rig=root(name);rig.scale=(height/2.2,)*3
    current=name+'_torso';torso=root('torso_'+name,rig,at=(0,0,.87))
    ball('shirt',0,0,.18,.31,.23,.41,shirt);ball('hips',0,0,-.16,.29,.22,.2,shirt)
    if name in ['jax','arianna']:
        box('overalls bib',0,.218,.15,.39,.04,.4,'738fac')
        for x in [-.17,.17]:ball('button',x,.256,.29,.035,.02,.035,'f5d480')
    else:
        shape('cone','skirt',0,0,-.12,.38,.28,.36,shirt)
    if name=='kayla':box('apron',0,.254,-.01,.45,.035,.47,'f3dec2');box('apron pocket',0,.279,-.08,.22,.02,.17,'dcbea0')
    mesh(current,torso)
    current=name+'_head';head=root('head_'+name,torso,at=(0,0,.73))
    ball('face',0,.015,0,.4,.33,.44,'e9b48f');ball('hair back',0,-.115,.2,.41,.3,.34,hair)
    for x in [-.37,.37]:ball('ear',x,0,-.035,.085,.1,.14,'e4aa85')
    for x in [-.155,.155]:
        ball('eye white',x,.303,.035,.115,.058,.15,'fffaf0');ball('iris',x,.357,.028,.06,.025,.083,'58899c');ball('pupil',x,.38,.026,.032,.017,.054,'303942');ball('glint',x-.017,.394,.066,.02,.008,.024,'ffffff')
        ball('eyebrow',x,.318,.235,.117,.035,.032,hair);ball('cheek',x*1.5,.282,-.145,.085,.025,.044,'de9185')
    ball('nose',0,.35,-.092,.085,.1,.095,'e1a57e');ball('smile',0,.309,-.24,.105,.025,.051,'995d55');ball('lower lip',0,.313,-.266,.079,.022,.021,'e8a292')
    for i in range(5):ball('swept fringe',-.3+i*.14,.18,.29+math.sin(i)*.025,.135,.14,.13,hair)
    if style=='bun':
        ball('bun',0,-.15,.59,.23,.21,.22,hair);ball('hair tie',0,-.15,.44,.19,.18,.045,'c68077')
    if style=='ponytail':ball('pony',.22,-.34,.05,.2,.18,.38,hair)
    if style=='tuft':ball('curl',.02,.02,.54,.11,.12,.18,hair)
    if style=='pigtails':
        for x in [-.43,.43]:ball('pigtail',x,-.04,.03,.18,.17,.26,hair);ball('bow',x,.05,.28,.14,.06,.09,'f4cc72')
    mesh(current,head)
    for side,sign in [('L',-1),('R',1)]:
        current=name+'_arm'+side;arm=root('arm'+side+'_'+name,torso,at=(sign*.33,0,.39));ball('sleeve',0,0,-.09,.13,.14,.2,shirt);ball('upper arm',0,0,-.25,.1,.105,.18,'e3ac88');mesh(current,arm)
        current=name+'_fore'+side;fore=root('fore'+side+'_'+name,arm,at=(0,0,-.36));ball('forearm',0,0,-.1,.095,.1,.17,'e3ac88');ball('palm',0,.01,-.27,.11,.095,.13,'e8b590')
        for dx in [-.065,-.02,.025,.07]:ball('finger',dx,.025,-.365,.027,.046,.063,'e8b590')
        ball('thumb',sign*.1,.03,-.27,.05,.06,.075,'e8b590');mesh(current,fore)
        current=name+'_leg'+side;leg=root('leg'+side+'_'+name,rig,at=(sign*.16,0,.75));ball('shorts',0,0,-.12,.15,.17,.2,'798ca1' if name in ['jax','arianna'] else shirt);ball('thigh',0,0,-.28,.115,.12,.2,'e3ab86');mesh(current,leg)
        current=name+'_shin'+side;shin=root('shin'+side+'_'+name,leg,at=(0,0,-.38));ball('calf',0,0,-.12,.09,.1,.17,'e3ab86');ball('sock',0,0,-.25,.096,.108,.1,'faf1df');ball('shoe',0,.09,-.3,.14,.24,.12,'bd7e66' if name=='kayla' else 'eee1c8');box('shoe sole',0,.09,-.39,.29,.45,.055,'fff4df');mesh(current,shin)
    export(name,[rig]);rig.location=(list(['kayla','harper','jax','arianna','lilah']).index(name)*2-4,-13,0)
# Reusable action props exported from Blender and animated by the game.
pr=root('props')
for n in ['plate','phone','brush','spoon','book','sock','bubble','star','heart','puddle','crayon','pillow','teddy','scribble','eyelids']:
    current=n;o=root(n,pr)
    if n=='plate':
        cyl(n,0,0,0,.25,.04,'fff3dd');ball('banana',0,0,.07,.16,.08,.05,'edc257')
    elif n=='phone':
        box(n,0,0,0,.17,.045,.31,'b77991');box('screen',0,.028,0,.135,.015,.245,'8bc3d7');ball('camera',0,.03,.12,.016,.009,.016,'334955')
    elif n=='brush':
        box('handle',0,0,.32,.04,.04,.68,'c89769');box('head',0,0,0,.36,.18,.12,'9fadc6')
    elif n=='spoon':box('stem',0,0,.17,.035,.035,.45,'af8057');ball('bowl',0,0,-.08,.09,.065,.04,'af8057')
    elif n=='book':box('cover',0,0,0,.35,.06,.28,'aa98bf');box('pages',0,.038,0,.3,.035,.23,'f7e9cc')
    elif n=='sock':box('sock',0,0,0,.12,.04,.24,'d899b3');box('foot',.04,0,-.09,.2,.07,.08,'d899b3')
    elif n=='bubble':ball(n,0,0,0,.16,.16,.16,'b6e6ee');ball('shine',-.045,.13,.06,.045,.012,.045,'f9ffff')
    elif n in ['star','heart']:
        if n=='heart':
            for x in [-.07,.07]:ball('lobe',x,0,.05,.11,.05,.11,'ed9cac')
            shape('cone','point',0,0,-.055,.12,.06,.2,'ed9cac',math.pi)
        else:
            for i in range(5):ball('ray',math.sin(i*math.tau/5)*.1,0,math.cos(i*math.tau/5)*.1,.075,.035,.075,'f4cb64')
    elif n=='puddle':ball(n,0,0,0,.55,.43,.018,'d9966e')
    elif n=='eyelids':
        for x in [-.155,.155]:
            ball('closed lid',x,.345,.035,.118,.075,.155,'e9b48f')
            ball('closed lash',x,.415,.015,.092,.01,.015,'8d6452')
    elif n=='scribble':
        for band,c in enumerate(['dc938a','b8a0cc','e2bc65','92b7ce']):
            for i in range(14):
                x=-.65+i*.1;ball('crayon mark',x,math.sin(i*.6)*.16+band*.13,0,.075,.035,.008,c)
    elif n=='crayon':box(n,0,0,0,.075,.38,.075,'ad8ebe')
    elif n=='pillow':box(n,0,0,0,.68,.3,.45,'eac9a3')
    elif n=='teddy':
        ball('body',0,0,0,.17,.12,.21,'bd9168');ball('head',0,0,.27,.17,.14,.17,'bd9168')
        for x in [-.14,.14]:ball('ear',x,0,.41,.07,.05,.07,'bd9168')
    mesh(n,o)
export('props',[pr]);pr.location=(12,0,0)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art','little-chaos.blend'))
print('V3 COMPLETE: connected family house, garden, articulated cast and action props.')
