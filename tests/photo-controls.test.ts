// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {mountPhotoControls} from '../src/ui/photoControls';
afterEach(()=>{document.body.replaceChildren();vi.unstubAllGlobals();});
it('offers an explicit photo download and revokes its URL when leaving photo mode',async()=>{
 const revoke=vi.fn();vi.stubGlobal('URL',{createObjectURL:vi.fn(()=> 'blob:photo'),revokeObjectURL:revoke});
 const controls=mountPhotoControls(document.body,async()=>new Blob(['photo'],{type:'image/png'}));controls.setVisible(true);
 document.querySelector('button')!.click();await Promise.resolve();await Promise.resolve();
 const link=document.querySelector('a')!;expect(link.hidden).toBe(false);expect(link.download).toMatch(/\.png$/);expect(link.href).toBe('blob:photo');controls.setVisible(false);expect(revoke).toHaveBeenCalledWith('blob:photo');controls.dispose();
});
it('does not retain a late capture after replacement or disposal',async()=>{
 const create=vi.fn();vi.stubGlobal('URL',{createObjectURL:create,revokeObjectURL:vi.fn()});let finish!:(blob:Blob)=>void;
 const controls=mountPhotoControls(document.body,()=>new Promise(resolve=>finish=resolve));controls.setVisible(true);document.querySelector('button')!.click();controls.dispose();finish(new Blob());await Promise.resolve();expect(create).not.toHaveBeenCalled();expect(document.querySelector('#photo-controls')).toBeNull();
});
