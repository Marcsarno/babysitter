"""Original low-poly assets, executed in Blender's UI Python Console.
Coordinates use game X/Z for layout; convert to Blender Z-up here.
Regenerates public/assets/*.glb and the editable .blend source.
"""
import bpy, math, os, json
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'public','assets'); os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
M={}; groups={}; current='house'; obstacles=[]
def mat(hex):
    if hex not in M:
        m=bpy.data.materials.new(hex); h=hex.lstrip('#'); rgb=[int(h[i:i+2],16)/255 for i in (0,2,4)]
        rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
        m.diffuse_color=(*rgb,1); m.use_nodes=True
        bs=m.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value=(*rgb,1); bs.inputs['Roughness'].default_value=.85
        M[hex]=m
    return M[hex]
def finish(o,n,c):
    o.name=n; o.data.materials.append(mat(c)); groups.setdefault(current,[]).append(o); return o
def box(n,x,z,y,w,d,h,c,bevel=.06,solid=False):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=bpy.context.object;o.scale=(w,d,h)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Soft toy edges','BEVEL');mod.width=bevel;mod.segments=2
        bpy.ops.object.modifier_apply(modifier=mod.name)
        mod=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
    if solid: obstacles.append([x,z,w,d])
    return finish(o,n,c)
def ball(n,x,z,y,sx,sz,sy,c):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=1,location=(x,-z,y));o=bpy.context.object;o.scale=(sx,sz,sy)
    for p in o.data.polygons:p.use_smooth=True
    return finish(o,n,c)
def cyl(n,x,z,y,r,h,c):
    bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r,depth=h,location=(x,-z,y)); return finish(bpy.context.object,n,c)
def plant(x,z):
    cyl('Terracotta pot',x,z,.27,.25,.48,'d88e66')
    for dx,dz,dy in [(0,0,.9),(.22,0,.73),(-.19,.08,.7),(0,.22,.76)]:ball('Plump leaf',x+dx,z+dz,dy,.25,.23,.33,'7d9e61')
def rug(x,z,w,d,c):box('Woven rug',x,z,.035,w,d,.05,c,.2)
def chair(x,z,c='e8bf72'):
    box('Chair seat',x,z,.52,.65,.65,.18,c);box('Chair back',x,z-.28,.93,.66,.15,.75,c)
    for dx in [-.22,.22]:
        for dz in [-.22,.22]:box('Chair foot',x+dx,z+dz,.23,.1,.1,.45,'b9875b',.02)
def sofa(x,z,c):
    box('Sofa base',x,z,.4,2.9,1.05,.65,c,solid=True);box('Sofa back',x,z-.45,.86,3,.3,.9,c)
    for dx in [-1.4,1.4]:box('Rounded arm',x+dx,z,.72,.3,1.15,.65,c,.12)
    for dx in [-.8,0,.8]:box('Soft seat cushion',x+dx,z+.05,.76,.74,.8,.2,'f7ddb0',.09)
    for dx in [-.85,.85]:ball('Throw pillow',x+dx,z-.19,1,.32,.14,.3,'df9478')
def bed(x,z,c):
    box('Bed frame',x,z,.28,1.75,2.4,.45,'c39870',solid=True);box('Mattress',x,z,.58,1.65,2.3,.3,'fff4dd',.1)
    box('Quilt',x,z+.4,.77,1.68,1.45,.14,c,.08);box('Pillow',x,z-.76,.8,1.16,.47,.24,'fff9ec',.1)
    box('Headboard',x,z-1.15,.8,1.85,.15,1.15,'d4ac7a')
    for dx in [-.55,0,.55]:box('Quilt stripe',x+dx,z+.4,.847,.06,1.39,.015,'ffffff',.005)
def shelf(x,z):
    box('Bookcase',x,z,.8,1.35,.45,1.6,'c09767',solid=True)
    for y in [.4,.95,1.48]:
        box('Shelf',x,z+.2,y,1.28,.12,.08,'f6d69d')
        for i,c in enumerate(['89b4ad','edb969','c397b6','da8773']):box('Story book',x-.45+i*.28,z+.23,y+.2,.17,.18,.35,c,.01)
def window(x,z):
    box('Window frame',x,z,1.25,1.65,.15,1.1,'fff3d4');box('Blue window glass',x,z+.09,1.25,1.42,.04,.86,'a6d9df',.01)
    box('Window cross',x,z+.12,1.25,.06,.035,.95,'fff7db',.01);box('Window sill',x,z+.14,.7,1.86,.4,.12,'fff0ce')
    for dx in [-.88,.88]:box('Curtain',x+dx,z+.16,1.27,.25,.13,1.15,'f0bf8f')
rooms=[('Kitchen',-3.5,-7.5,'e8e1ab'),('Dining room',3.5,-7.5,'eac7a1'),('Living room',-3.5,-2.5,'d8ddb4'),('Family room',3.5,-2.5,'c2d7c8'),('Harper’s room',-3.5,2.5,'e6c7d0'),('Nursery',3.5,2.5,'c5d8de'),('Bathroom',-3.5,7.5,'b3d7d8'),('Kayla’s room',3.5,7.5,'dfd6b5')]
box('Dollhouse foundation',0,0,-.25,12.6,20.5,.5,'c7a67b',.15)
box('Hall runner',0,0,.015,1.6,19.5,.045,'cfbb9c')
for name,x,z,c in rooms:
    box(name+' floor',x,z,0,4.9,4.9,.08,c,.03)
    # Plank seams, decorative and flush with floor.
    for i in range(1,9):box('Floor seam',x-2.5+i*.55,z,.045,.015,4.8,.008,'bb9f7c',0)
    box('Back wall',x,z-2.5,.5,5,.15,1,'fff0cf',.03,True)
    box('Wall top trim',x,z-2.5,1.02,5.05,.19,.08,'ead6b8',.02)
    box('Outer wall',(-6 if x<0 else 6),z,.5,.15,5,1,'f4e4c8',.03,True)
    # Room doors opening into the central hallway.
    for dz in [-1.7,1.7]:box('Doorway wall',(-1 if x<0 else 1),z+dz,.33,.15,1.6,.66,'fff1d5',.03,True)
    if z==-7.5:window(x,z-2.4)
    plant(x+(-1.95 if x<0 else 1.95),z+1.8)
# Kitchen.
for x in [-5.25,-4.05,-2.85]:
    box('Mint kitchen cabinet',x,-9.22,.48,1.1,1.15,.95,'87b7a1',solid=True);box('Butcher-block counter',x,-9.22,1.01,1.16,1.2,.12,'fff3d9')
    box('Brass drawer handle',x,-8.63,.75,.36,.07,.06,'c5a063')
box('Stove top',-4.05,-9.22,1.09,1.01,1,.07,'475d59')
for x in [-4.3,-3.82]:
    for z in [-9.45,-8.97]:cyl('Stove ring',x,z,1.145,.17,.035,'94a89c')
cyl('Soup pot',-4.27,-9.15,1.31,.23,.3,'d68f62');cyl('Soup',-4.27,-9.15,1.47,.2,.02,'f0c45c')
box('Sink',-2.85,-9.2,1.085,.7,.65,.05,'b4d5d2',.12)
box('Faucet',-2.85,-9.65,1.3,.1,.1,.46,'a0b7ad')
box('Fridge',-5.24,-7.25,1.03,1.15,1.15,2.05,'f4ecd8',.1,True)
box('Fridge handle',-4.65,-7.45,1.05,.08,.1,.6,'a3b2a1')
for z,c in [(-7.1,'db947d'),(-7.6,'a3b5d7')]:box('Fridge drawing',-4.65,z,1.65,.02,.28,.3,c,.01)
box('Kitchen island',-3.4,-6.2,.45,1.9,.8,.9,'a3bd93',solid=True);box('Island top',-3.4,-6.2,.94,2.05,.95,.12,'f4d9a5')
for x in [-3.8,-3.4,-3]:ball('Fruit',x,-6.2,1.14,.13,.13,.14,'e6a64e')
# Dining room.
rug(3.7,-7.2,3.8,3.6,'ecd598');box('Dining table',3.8,-7.4,.86,2.3,1.6,.17,'b98960',solid=True)
for dx in [-.9,.9]:
    for dz in [-.55,.55]:box('Table leg',3.8+dx,-7.4+dz,.43,.13,.13,.8,'b98960')
for x in [3.1,4.5]:
    for z in [-8.65,-6.15]:chair(x,z)
    cyl('Plate',x,-7.35,.97,.28,.03,'fff6df');ball('Sandwich',x,-7.35,1.03,.18,.15,.08,'e7b871')
cyl('Flower vase',3.8,-7.6,1.17,.13,.4,'85b1ad');ball('Flowers',3.8,-7.6,1.47,.27,.22,.23,'e6acb2')
shelf(5,-9.1)
# Living room.
rug(-3.5,-2.2,3.8,3.2,'efc281');sofa(-3.5,-4.05,'cc9473')
box('Coffee table',-3.5,-2.2,.44,1.5,.8,.22,'cda573',.16,True)
box('Picture book',-3.7,-2.15,.58,.5,.36,.08,'7daca7')
box('TV console',-5.38,-1.15,.45,.7,1.3,.8,'c0986d',solid=True)
box('Television',-5.38,-1.15,1.17,.14,1.2,.8,'566568');box('Screen',-5.29,-1.15,1.17,.02,1.03,.65,'a0c8c5',.01)
shelf(-5.12,-4.1)
# Family room.
rug(3.5,-2,3.5,3.1,'91b5a5');sofa(3.7,-4.1,'8caeaa')
box('Toy chest',5.25,-1.4,.4,1,.8,.7,'dfa95f',solid=True);box('Toy chest lid',5.25,-1.4,.81,1.08,.88,.13,'f1c879')
for i,(x,z,c) in enumerate([(2.9,-2,'e69f7e'),(3.45,-1.7,'edd179'),(4,-2.4,'8fb1bf')]):box('Toy block',x,z,.21,.35,.35,.4,c)
shelf(1.9,-4.1)
# Bedrooms.
bed(-4.55,1.6,'dd9fae');rug(-2.9,3.3,2.6,1.6,'f1dcaf');shelf(-2,1)
ball('Teddy body',-4.45,1.4,1.01,.26,.2,.32,'bf9167');ball('Teddy head',-4.45,1.4,1.4,.27,.23,.26,'bf9167')
for dx in [-.22,.22]:ball('Teddy ears',-4.45+dx,1.4,1.6,.12,.1,.12,'bf9167')
bed(4.5,1.65,'9eb9cb');rug(2.8,3.35,2.8,1.8,'edcd86')
box('Changing dresser',2.05,.9,.57,1.45,.8,1.1,'eed9b4',solid=True);box('Changing pad',2.05,.9,1.17,1.3,.67,.16,'a8c6b4')
for x,c in [(2.1,'d7a0b5'),(2.5,'9bbb93')]:ball('Soft ball',x,3.4,.25,.22,.22,.22,c)
# Bathroom/laundry.
for x in [-5.5,-4.5,-3.5,-2.5,-1.5]:
    for z in [5.5,6.5,7.5,8.5,9.5]:box('Bathroom tile',x,z,.053,.91,.91,.018,'d1e8df',.01)
box('Tub base',-4.7,6.05,.4,2.1,1.3,.75,'fff5db',.24,True);box('Bathwater',-4.7,6.05,.8,1.7,.95,.04,'92cdd6',.2)
for dx in [-1,1]:box('Tub rim',-4.7+dx,6.05,.86,.17,1.25,.16,'fff8e9')
for dz in [-.58,.58]:box('Tub rim',-4.7,6.05+dz,.86,2,.15,.16,'fff8e9')
ball('Rubber duck body',-4.7,6.05,.93,.17,.2,.12,'f0c452');ball('Rubber duck head',-4.7,6.18,1.07,.11,.1,.11,'f0c452')
box('Washing machine',-5.22,8.52,.62,1.18,1.15,1.2,'f7f1de',.1,True)
o=cyl('Washer door',-5.22,9.11,.65,.39,.05,'a1bfc0');o.rotation_euler[0]=math.pi/2
box('Folded towel',-5.22,8.52,1.3,1,.65,.12,'eda59a');box('Folded towel',-5.22,8.52,1.43,.8,.6,.12,'f4cf83')
box('Bathroom sink cabinet',-2,5.75,.53,1.2,.9,1,'a0bca9',solid=True);ball('Wash basin',-2,5.75,1.08,.55,.38,.1,'fff4dd')
box('Bath mat',-3.9,7.5,.07,1.8,.8,.07,'f0d88d',.12)
bed(4.5,6.7,'9dac7a');rug(3.2,8.6,3.2,1.3,'eacaa0');shelf(2,5.85)
box('Bedside table',5.5,8.75,.4,.65,.65,.75,'c19b6f',solid=True);cyl('Lamp stand',5.5,8.75,.99,.08,.45,'d4ac6c')
cyl('Lamp shade',5.5,8.75,1.26,.29,.37,'f9dfa0')
# Hallway welcome rug and scattered decorative stars.
rug(0,9,1.4,1.3,'bdc79a')
for z in [-7.5,-2.5,2.5,7.5]:
    box('Door threshold',0,z,.04,1.9,.12,.025,'e8d4b1',.01)
# Merge by material for a small draw-call count; keep separate character limbs for animation.
def merge_group(name):
    objs=groups[name];bpy.ops.object.select_all(action='DESELECT')
    for o in objs:o.select_set(True)
    bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();o=bpy.context.object;o.name=name
    bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');groups[name]=[o]
def export_group(name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in groups[name]:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,name+'.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True)
merge_group('house');export_group('house')
for name,shirt,hair,height,style in [('kayla','e39770','6b4838',1.6,'bun'),('harper','d48eae','92583b',1.05,'pigtails'),('jax','90b5a4','b18b58',.8,'tuft'),('arianna','e3bf65','654337',1.25,'ponytail'),('lilah','aa9bc6','785039',.88,'pigtails')]:
    current=name;s=height/1.6
    def B(n,x,z,y,a,b,c,col):return ball(n,x*s,z*s,y*s,a*s,b*s,c*s,col)
    B('Body',0,0,.64,.28,.19,.36,shirt)
    if name!='jax':B('Skirt',0,0,.49,.32,.22,.2,shirt)
    for dx in [-.13,.13]:
        B('Leg',dx,0,.22,.085,.09,.2,'b98568');B('Shoe',dx,.07,.08,.11,.16,.08,'fff0d7')
    for dx in [-.33,.33]:B('Arm',dx,0,.69,.09,.1,.25,'d7a27e')
    B('Head',0,0,1.18,.34,.28,.34,'e6b08b');B('Hair cap',0,-.03,1.36,.35,.29,.22,hair)
    for dx in [-.14,.14]:
        B('Eye',dx,.263,1.19,.04,.029,.055,'3b3938');B('Eye sparkle',dx-.008,.286,1.209,.012,.009,.015,'fff9ec')
        B('Rosy cheek',dx*1.4,.244,1.075,.062,.02,.032,'d88e78')
    B('Nose',0,.292,1.12,.042,.046,.043,'d79d78');B('Smile',0,.27,1.035,.061,.016,.022,'9e6753')
    if style=='bun':B('Hair bun',0,-.16,1.63,.2,.18,.18,hair)
    if style=='ponytail':B('Ponytail',.19,-.28,1.23,.18,.17,.32,hair)
    if style=='tuft':B('Hair tuft',0,.04,1.57,.09,.09,.15,hair)
    if style=='pigtails':
        for dx in [-.34,.34]:
            B('Pigtail',dx,-.05,1.26,.15,.14,.21,hair);B('Hair bow',dx,.03,1.46,.13,.06,.08,'f1ca6d')
    if name=='kayla':box('Apron',0,.192*s,.62*s,.38*s,.035*s,.4*s,'f9e8bf',.03)
    merge_group(name);export_group(name)
    groups[name][0].location=(['kayla','harper','jax','arianna','lilah'].index(name)*1.5-3,-11,0)
with open(os.path.join(OUT,'navigation.json'),'w') as f:json.dump({'obstacles':obstacles,'rooms':[{'name':n,'x':x,'z':z} for n,x,z,c in rooms]},f)
bpy.ops.object.select_all(action='DESELECT');groups['house'][0].select_set(True);bpy.context.view_layer.objects.active=groups['house'][0]
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':area.spaces.active.shading.type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art','little-chaos.blend'))
print('LITTLE CHAOS: all six GLBs and editable Blender scene exported.')
