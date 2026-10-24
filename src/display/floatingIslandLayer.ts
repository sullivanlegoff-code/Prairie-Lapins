import type Phaser from 'phaser';
import type {ParcelId} from '../config/land';
import {parcelSetKey} from './islandOutline';
import {floatingIslandArt} from './floatingIslandArt';
import {islandRaster, islandCacheScale} from './islandRaster';

/** Painted caches and the vector grass lip. Replacement is atomic; no frame or camera listener. */
export class FloatingIslandLayer {
  readonly root: Phaser.GameObjects.Container;
  readonly rimRoot: Phaser.GameObjects.Container;
  private rimVisible: Phaser.GameObjects.Graphics | null = null;
  private visible: Phaser.GameObjects.Graphics | null = null;
  private images: Phaser.GameObjects.Image[] = [];
  private textureKeys: string[] = [];
  private signature: string | null = null;
  private disposed = false;
  bytes = 0;
  generations = 0;
  constructor(private readonly scene: Phaser.Scene) {
    this.root = scene.add.container(0, 0).setDepth(-.5);
    this.rimRoot = scene.add.container(0, 0).setDepth(.02);
    scene.events.once('shutdown', this.destroy, this);
    this.root.once('destroy', () => {this.rimRoot.destroy(); this.textureKeys.forEach(key=>scene.textures.remove(key));this.textureKeys=[];this.images=[]; this.disposed = true; this.bytes = 0; this.visible = null; this.rimVisible = null; scene.events.off('shutdown', this.destroy, this);});
  }
  request(ids: readonly ParcelId[]): void {
    if (this.disposed) return;
    const signature = parcelSetKey(ids);
    if (signature === this.signature) return;
    const art = floatingIslandArt(ids), next = this.scene.add.graphics().setVisible(false), rim = this.scene.add.graphics().setVisible(false);
    const images: Phaser.GameObjects.Image[]=[],keys: string[]=[];
    let rasterBytes=0;
    const scale=islandCacheScale(art.components);
    try {
      for(const [i,component] of art.components.entries()) {
        const canvas=islandRaster(component,name=>this.scene.textures.get(`island-underside:${name}`).getSourceImage() as HTMLImageElement,scale);
        const key=`island-cache:${this.generations+1}:${i}`;
        if(this.scene.textures.exists(key)) throw Error(`Island cache collision: ${key}`);
        keys.push(key);this.scene.textures.addCanvas(key,canvas);
        const image=this.scene.add.image(component.bounds.left,component.bounds.top,key).setOrigin(0).setScale(1/scale).setVisible(false);
        images.push(image);rasterBytes+=canvas.width*canvas.height*4;
      }
      for (const [graphics, commands] of [[next, art.paint], [rim, art.rim]] as const) for (const p of commands) {
        if (p.kind === 'line') {graphics.lineStyle(p.width, p.color, p.alpha); graphics.strokePoints(p.points, false);}
        else {
          graphics.fillStyle(p.color, p.alpha);
          graphics.fillEllipse(p.x, p.y, p.width, p.height, 16);
        }
      }
      this.root.add(next);this.root.add(images); this.rimRoot.add(rim); next.setVisible(true); rim.setVisible(true);images.forEach(image=>image.setVisible(true));
    } catch (error) {next.destroy(); rim.destroy();images.forEach(image=>image.destroy());keys.forEach(key=>this.scene.textures.remove(key)); throw error;}
    const oldImages=this.images,oldKeys=this.textureKeys;this.images=images;this.textureKeys=keys;
    const oldRim = this.rimVisible; this.rimVisible = rim;
    const old = this.visible; this.visible = next; this.signature = signature;
    this.bytes = art.bytes+rasterBytes; this.generations++; old?.destroy(); oldRim?.destroy();oldImages.forEach(image=>image.destroy());oldKeys.forEach(key=>this.scene.textures.remove(key));
  }
  destroy(): void {if (!this.disposed) this.root.destroy();}
}
