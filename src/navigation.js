export function createNavigation(obstacles,step=.25,layout={}){
  const [minX,maxX,minZ,maxZ]=layout.bounds??[-5.7,5.7,-9.7,9.7];
  const cols=Math.round((maxX-minX)/step)+1,rows=Math.round((maxZ-minZ)/step)+1;
  const blocked=(x,z)=>x<minX||x>maxX||z<minZ||z>maxZ||(layout.regions&&!layout.regions.some(([a,b,w,d])=>Math.abs(x-a)<=w/2&&Math.abs(z-b)<=d/2))||obstacles.some(([a,b,w,d])=>Math.abs(x-a)<w/2+.19&&Math.abs(z-b)<d/2+.19);
  const pos=i=>({x:minX+(i%cols)*step,z:minZ+Math.floor(i/cols)*step});
  const grid=Array.from({length:cols*rows},(_,i)=>{const p=pos(i);return blocked(p.x,p.z)});
  function nearest(p){let best=-1,dist=Infinity;for(let i=0;i<grid.length;i++){if(grid[i])continue;const v=pos(i),d=(v.x-p.x)**2+(v.z-p.z)**2;if(d<dist){dist=d;best=i}}return best}
  function path(from,to){const start=nearest(from),end=nearest(to);if(start<0||end<0)return[];const open=new Set([start]),came=new Map(),g=new Map([[start,0]]),f=new Map([[start,0]]);
    while(open.size){let at=-1,best=Infinity;for(const i of open){if(f.get(i)<best){best=f.get(i);at=i}}if(at===end){let route=[pos(at)];while(came.has(at)){at=came.get(at);route.push(pos(at))}return route.reverse()}
      open.delete(at);const x=at%cols,z=Math.floor(at/cols);
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz;if(nx<0||nx>=cols||nz<0||nz>=rows)continue;const next=nz*cols+nx;if(grid[next])continue;const cost=g.get(at)+1;if(cost<(g.get(next)??Infinity)){came.set(next,at);g.set(next,cost);f.set(next,cost+Math.abs(nx-end%cols)+Math.abs(nz-Math.floor(end/cols)));open.add(next)}}
    }return[];
  }
  return {blocked,path,nearest:p=>pos(nearest(p))};
}
