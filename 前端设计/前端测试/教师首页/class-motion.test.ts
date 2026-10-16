import {describe,expect,it} from 'vitest';
import {ClassShelfMotion,CLASS_MOVE_DURATION,sampleClassMove} from './src/class-motion';
import {CLASS_LANE_GAP} from './src/motion';

describe('class archive choreography',()=>{
  it('opens the front lanes before moving the requested class forward',()=>{
    const shelf=new ClassShelfMotion([0,1,2,3]);shelf.request(3);
    const move=shelf.move!;
    const opening=sampleClassMove(move,0,.28);
    expect(opening.scatter).toBeCloseTo(1);
    expect(sampleClassMove(move,3,.28).x).toBeCloseTo(CLASS_LANE_GAP*3);
    expect(sampleClassMove(move,3,.68).x).toBeLessThan(CLASS_LANE_GAP*2);
    expect(sampleClassMove(move,3,CLASS_MOVE_DURATION).x).toBe(0);
    expect(sampleClassMove(move,0,CLASS_MOVE_DURATION).scatter).toBe(0);
  });
  it('commits a unique class order without changing membership identifiers',()=>{
    const shelf=new ClassShelfMotion([0,1,2,3]);shelf.request(2);
    let commit=null;
    for(let frame=0;frame<50;frame++)commit=shelf.advance(1/30)??commit;
    expect(commit?.to).toEqual([2,0,1,3]);expect(shelf.order).toEqual([2,0,1,3]);
    expect(shelf.busy).toBe(false);expect(new Set(shelf.order).size).toBe(4);
  });
  it('coalesces rapid requests to the latest requested class',()=>{
    const shelf=new ClassShelfMotion([0,1,2,3]);
    shelf.request(3);shelf.advance(.15);shelf.request(1);shelf.request(2);
    expect(shelf.requested).toBe(2);
    for(let frame=0;frame<100;frame++)shelf.advance(1/30);
    expect(shelf.order[0]).toBe(2);expect(shelf.busy).toBe(false);
  });
  it('finishes immediately for reduced motion, including a pending request',()=>{
    const shelf=new ClassShelfMotion([0,1,2,3]);
    shelf.request(3);shelf.advance(.18);shelf.request(1);
    const commit=shelf.advance(0,true);
    expect(commit?.to[0]).toBe(1);expect(shelf.busy).toBe(false);
  });
  it('does not disturb an already-front or unknown class',()=>{
    const shelf=new ClassShelfMotion([0,1,2,3]);
    shelf.request(0);shelf.request(999);
    expect(shelf.busy).toBe(false);expect(shelf.order).toEqual([0,1,2,3]);
  });
});
