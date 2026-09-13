import {describe,expect,it} from 'vitest';
import {publicAsset} from '../src/public-asset';
describe('public asset deployment paths',()=>{
  it('supports origin, repository and relative static hosting',()=>{
    expect(publicAsset('/assets/archive/charcoal-paper.png','/')).toBe('/assets/archive/charcoal-paper.png');
    expect(publicAsset('/assets/archive/charcoal-paper.png','/ganglian-zhixun/')).toBe('/ganglian-zhixun/assets/archive/charcoal-paper.png');
    expect(publicAsset('/assets/archive/charcoal-paper.png','./')).toBe('./assets/archive/charcoal-paper.png');
    expect(publicAsset('https://example.com/file.png','./')).toBe('https://example.com/file.png');
    expect(publicAsset('/api/files/123','./')).toBe('/api/files/123');
  });
});
