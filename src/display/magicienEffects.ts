import Phaser from 'phaser';
import {MAGICIEN_ART as ART} from '../config/magicienArt';
import type {RabbitArt} from '../config/rabbitArt';
import type {MagicienAct} from './magicienTimeline';
import {MagicienClock, magicienLevitation, magicienSparks} from './magicienTimeline';
export interface MagicienHost {object: Phaser.GameObjects.Container; body: Phaser.GameObjects.Container; sprite: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Ellipse; art: RabbitArt}
export class MagicienView {
  lift = 0;
  private playing: MagicienAct | null = null;
  private floor: Phaser.GameObjects.Container;
  private circle?: Phaser.GameObjects.Image;
  private stars: Phaser.GameObjects.Image[] = [];
  private tip = {x: 0, y: 0};
  private readonly shadow: {x:number;y:number;scaleX:number;scaleY:number;alpha:number};
  constructor(private scene: Phaser.Scene, readonly id: string, private host: MagicienHost, readonly clock: MagicienClock) {
    this.floor = scene.add.container(0,0); host.object.addAt(this.floor,0);
    this.shadow={x:host.shadow.x,y:host.shadow.y,scaleX:host.shadow.scaleX,scaleY:host.shadow.scaleY,alpha:host.shadow.alpha};
  }
  play(act: MagicienAct): void { this.clock.play(act); }
  update(dt:number, active:boolean, reduced:boolean): void {
    this.clock.step(dt,active && this.host.art.evolved===true,reduced); const act=this.clock.act;
    if (act?.act !== this.playing) { this.clear(); this.playing=act?.act??null; if(act) this.build(act.act); }
    this.lift=act?.act==='levitation' ? 12*magicienLevitation(act.elapsed) : 0;
    const lev=act?.act==='levitation' ? magicienLevitation(act.elapsed) : 0;
    this.host.shadow.setPosition(this.shadow.x,this.shadow.y).setScale(this.shadow.scaleX*(1-.28*lev),this.shadow.scaleY*(1-.2*lev)).setAlpha(this.shadow.alpha);
    if(act?.act==='circle'&&this.circle){const u=act.elapsed/act.duration;this.circle.setRotation(u*Math.PI*2*.65).setAlpha(Math.min(1,u*5,(1-u)*5));}
    if(act?.act==='sparks') this.stars.forEach((star,i)=>{const p=magicienSparks(act.elapsed,i,this.stars.length);star.setPosition(this.tip.x+p.x,this.tip.y+p.y).setAlpha(p.alpha);});
  }
  private build(act:MagicienAct):void {
    if(act==='circle'){this.circle=this.scene.add.image(0,0,ART.circle.texture).setOrigin(.5,.5).setScale(this.host.art.worldWidth*1.35/ART.circle.width, this.host.art.worldWidth*.45/ART.circle.height).setAlpha(0);this.floor.add(this.circle);}
    if(act==='sparks'){
      const scale=this.host.art.worldWidth/this.host.art.width, p={x:(ART.wandTip.x-this.host.art.width/2)*scale,y:this.host.art.groundY-(this.host.art.height-ART.wandTip.y)*scale};
      this.tip=p; const count=5+(this.id.length%4);
      for(let i=0;i<count;i++){const star=this.scene.add.image(p.x,p.y,ART.star.texture).setScale(this.host.art.worldWidth*.16/ART.star.width).setRotation(i*.81);this.host.body.add(star);this.stars.push(star);}
    }
  }
  private clear():void {this.circle?.destroy();this.circle=undefined;for(const star of this.stars)star.destroy();this.stars=[];this.lift=0;}
  destroy():void{this.clear();this.floor.destroy();this.host.shadow.setPosition(this.shadow.x,this.shadow.y).setScale(this.shadow.scaleX,this.shadow.scaleY).setAlpha(this.shadow.alpha);}
}
