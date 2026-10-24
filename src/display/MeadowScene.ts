import {islandOutline, organicLoop, parcelSetKey} from './islandOutline';
import {nestForParent} from '../simulation/breeding';
import {RABBIT_ART, rabbitArt, type RabbitArt} from '../config/rabbitArt';
import Phaser from 'phaser';
import {VISUAL} from '../config/visual';
import type {GameController} from '../application/GameController';
import {drawBuildingArt} from './buildingArt';
import {drawHabitat} from './habitatArt';
import {HABITAT_SIZE_PROPOSAL, habitatSlots} from '../config/habitatSizes';
import {habitatArtLayout, HABITAT_ART_LIST, habitatArtFor, type HabitatArt} from '../config/habitatArt';
import {KITCHEN_ART} from '../config/kitchenArt';
import {FARM_ART} from '../config/farmArt';
import {NEST_ART} from '../config/nestArt';
import {NURSERY_ART} from '../config/nurseryArt';
import {NurseryOverlays} from './nurseryOverlays';
import {buildingAt, buildingPlacementReason, buildingFootprint, type Footprint} from '../simulation/placement';
import {placementGrid, PLACEMENT_GRID} from './placementGrid';
import {readyNurseryBabies} from '../simulation/nursery';
import {FloatingIslandLayer} from './floatingIslandLayer';
import {ISLAND_ART} from '../config/islandArt';
import {GRASS_TILE, islandStage, stageArt} from '../config/islandStages';
import {IslandStageLayer, queueStage} from './islandStageLayer';
import {SkyLayer, SKY_COLOR} from './skyLayer';
import {PARCELS, PARCEL_IDS, expansionTarget, purchasableParcels, type ParcelId} from '../config/land';
import {ISLAND} from '../config/islandGeometry';
import {rabbitOffset, rabbitPosition, rabbitHit, rabbitFedLift} from './rabbitLayout';
import {createRabbitMotion, retargetRabbitMotion, stepRabbitMotion, triggerFedReaction, rabbitPose, type RabbitMotion} from './rabbitMotion';
import {habitatStats, habitatName, habitatEntryReason, visibleColumns} from '../simulation/habitats';
import {HOUR, type SpeciesId} from '../config/balance';
import type {Building, DecorationLocation, GameState} from '../state/types';
import {DECORATION_IDS, FINE_GRID, type DecorationId} from '../config/decorations';
import {catalogDecorationPlacementReason, footprint} from '../simulation/decorations';
import {decorationTexture, decorationScale, decorationOrigin, decorationUrl, decorationLayerDepth} from './decorationArt';
import {MeadowCamera, cellsBounds, gridCell, fineCell, finePoint, buildingCenter, gridPoint, type Point} from '../ui/gestures';
import {groundTransform, screenBounds, toGround, toScreen} from '../ui/projection';
import {BUILDING_NAMES, type Placement} from '../ui/models';
import {SPECIES, proceduralCoat} from '../config/species';
import {bindMeadowInput} from './meadowInput';
import {ownedRegions, recenterCamera, type ScreenChrome} from './recenter';
import {COIN_TEXTURE, COIN_URL} from './currency';
import {coinBubble} from './currencyPhaser';

export type MeadowSelection = {kind: 'building' | 'rabbit' | 'income' | 'grass' | 'decoration' | 'birth'; id: string} | {kind: 'cell' | 'fineCell'; x: number; y: number} | {kind: 'extension'; parcelId?: ParcelId} | {kind: 'empty'};
export interface DecorationGhost {id: string; catalogId?: DecorationId; location: DecorationLocation | null}
/** `object` is the ground point (position, depth, scale); `body` carries the hop height, squash and mirror, apart from the shadow. */
interface VisualRabbit {id: string; object: Phaser.GameObjects.Container; body: Phaser.GameObjects.Container; ears: Phaser.GameObjects.Ellipse[]; sprite?: Phaser.GameObjects.Image; art?: RabbitArt; base: Point; phase: number; fedUntil: number;
  center: Point; group: string; motion?: RabbitMotion; lift: number;
  /** Centre of the visible body in body space: the somersault turns about it, not about the feet or the picture centre. */
  pivot: Point; /** Mirror sign of the picture's native direction: -1 for art that looks left. */ native: 1 | -1}
/** Local y of the ground contact the body is compressed against, so its feet stay put. */
const BODY_PIVOT = 10;
export class MeadowScene extends Phaser.Scene {
  private current: GameState | null = null;
  private placement: Placement | null = null;
  private ground!: Phaser.GameObjects.Container;
  private animals!: Phaser.GameObjects.Container;
  private bubbles!: Phaser.GameObjects.Container;
  private labels!: Phaser.GameObjects.Container;
  private buildingNames: Phaser.GameObjects.Container | null = null;
  /** Flat overlays on the ground (cell highlights, grids, footprints, parcel outlines), in the ground layer. */
  private grid!: Phaser.GameObjects.Graphics;
  /** Ground layer above the sprites: holds `grid`, so it shares the ground transform yet keeps its draw order. */
  private groundOverlay!: Phaser.GameObjects.Container;
  /** Upright readable icons drawn over the overlay: expansion "+" badges, decoration ✓/✗ marks. */
  private markers!: Phaser.GameObjects.Graphics;
  private rabbitViews: VisualRabbit[] = [];
  /** Visual-only walking state per resident, reused while the individual stays present. */
  private motions = new Map<string, {group: string; tier: number; center: Point; motion: RabbitMotion}>();
  private motionClock: number | null = null;
  private pivots = new Map<string, Point>();
  private bubbleHits: {point: Point; width: number; height: number; selection: MeadowSelection}[] = [];
  private layoutKey = '';
  private buildingsLayer!: Phaser.GameObjects.Container;
  private buildingViews = new Map<string, Phaser.GameObjects.Image>();
  private nurseryOverlays: NurseryOverlays | null = null;
  private focusTween: Phaser.Tweens.Tween | null = null;
  private buildingTextures = new Set<string>();
  private buildingGhost: Phaser.GameObjects.Image | null = null;
  private purchase: {species: SpeciesId; selected: string | null} | null = null;
  private purchaseLabels: Phaser.GameObjects.Text[] = [];
  private arrangement = false;
  private ghost: DecorationGhost | null = null;
  private photo = false;
  private expanding = false;
  private expansionParcelId: ParcelId | undefined;
  private islandMaskGraphics: Phaser.GameObjects.Graphics | null = null;
  private islandMask: Phaser.Display.Masks.GeometryMask | null = null;
  private islandMaskKey = '';
  private floatingIslandLayer: FloatingIslandLayer | null = null;
  private islandStageLayer: IslandStageLayer | null = null;
  private decorationViews = new Map<string, Phaser.GameObjects.Image>();
  private ghostView: Phaser.GameObjects.Image | null = null;
  private floorDecorationsLayer!: Phaser.GameObjects.Container;
  private decorationsLayer!: Phaser.GameObjects.Container;
  private selectedDecorationId: string | null = null;
  private decorationSelection!: Phaser.GameObjects.Graphics;
  private decorationPixels = new Map<string, Uint8ClampedArray>();
  private unsubscribe: (() => void) | null = null;
  readonly view = new MeadowCamera();
  /** Optional start-up reporting for the loading screen (texture loader progress, errors, scene ready). */
  constructor(private controller: GameController, private select: (selection: MeadowSelection) => void, private blocked: () => boolean,
    private loading?: {progress(fraction: number): void; error(file: string): void; ready(): void}) { super('Meadow'); }
  preload(): void {
    if (this.loading) { const l = this.loading; this.load.on('progress', (v: number) => l.progress(v)); this.load.on('loaderror', (file: {key: string}) => l.error(file.key)); }
    this.load.image(COIN_TEXTURE, COIN_URL);
    for (const art of ISLAND_ART) if (!this.textures.exists(art.texture)) this.load.image(art.texture, art.url);
    if (!this.textures.exists(GRASS_TILE.texture)) this.load.image(GRASS_TILE.texture, GRASS_TILE.url);
    // Only the painting of the current stage is loaded at start; a later stage loads when it is bought.
    const stage = islandStage(this.controller.getSnapshot().state?.acquiredParcels ?? []);
    if (stage) queueStage(this, stageArt(stage));
    if (!this.textures.exists(FARM_ART.texture)) this.load.image(FARM_ART.texture, FARM_ART.url);
    if (!this.textures.exists(NEST_ART.texture)) this.load.image(NEST_ART.texture, NEST_ART.url);
    if (!this.textures.exists(NURSERY_ART.texture)) this.load.image(NURSERY_ART.texture, NURSERY_ART.url);
    NurseryOverlays.preload(this);
    if (!this.textures.exists(KITCHEN_ART.texture)) this.load.image(KITCHEN_ART.texture, KITCHEN_ART.url);
    for (const art of HABITAT_ART_LIST) if (!this.textures.exists(art.texture)) this.load.image(art.texture, art.url);
    for (const art of RABBIT_ART) if (!this.textures.exists(art.texture)) this.load.image(art.texture, art.url);
    for (const id of DECORATION_IDS) {
      const key = decorationTexture(id);
      if (!this.textures.exists(key)) this.load.image(key, decorationUrl(id));
    }
  }
  create(): void {
    this.cameras.main.setBackgroundColor(SKY_COLOR);
    // Owns its shutdown cleanup; independent of parcel ownership and ground projection.
    new SkyLayer(this, toScreen(gridPoint(ISLAND.focus, ISLAND.focus)));
    // Ground layer (flat on the island, drawn in ground coordinates, one shared projection transform):
    // terrain at depth 0 and the flat overlays at depth 1. Upright layer (untransformed, anchors through
    // toScreen): buildings .1, decorations .5, decoration selection .9, markers 1, ghosts 1.5, rabbits 2,
    // labels 2.5, bubbles and availability texts 3. Depths are those of the former single-plane scene.
    this.ground = this.add.container(0, 0); this.buildingsLayer = this.add.container(0, 0).setDepth(.1); this.animals = this.add.container(0, 0).setDepth(2);
    this.nurseryOverlays = new NurseryOverlays(this, this.buildingsLayer);
    // Flat path paintings follow the ground compression, above terrain but below every upright object.
    this.floorDecorationsLayer = this.add.container(0, 0).setDepth(decorationLayerDepth('dirt-path'));
    this.decorationsLayer = this.add.container(0, 0).setDepth(.5);
    this.decorationSelection = this.add.graphics().setDepth(.9);
    this.labels = this.add.container(0, 0).setDepth(2.5);
    this.grid = this.add.graphics(); this.groundOverlay = this.add.container(0, 0, [this.grid]).setDepth(1);
    this.markers = this.add.graphics().setDepth(1); this.bubbles = this.add.container(0, 0).setDepth(3);
    for (const layer of [this.ground, this.groundOverlay]) layer.setPosition(groundTransform.x, groundTransform.y).setRotation(groundTransform.rotation).setScale(groundTransform.scaleX, groundTransform.scaleY);
    this.resize();
    this.unsubscribe = this.controller.subscribe(snapshot => { this.current = snapshot.state; this.renderState(); });
    this.recenter();
    this.scale.on('resize', this.resize, this);
    const disposeInput = bindMeadowInput(this.game.canvas, this.view, point => this.tap(point), this.blocked, () => this.applyCamera());
    this.events.once('shutdown', () => { this.unsubscribe?.(); disposeInput(); this.scale.off('resize', this.resize, this); this.buildingTextures.forEach(key=>this.textures.remove(key)); this.ground.clearMask(); this.islandMask?.destroy(); this.islandMaskGraphics?.destroy(); this.islandMask = null; this.islandMaskGraphics = null; this.floatingIslandLayer?.destroy(); this.floatingIslandLayer = null; this.islandStageLayer?.destroy(); this.islandStageLayer = null; this.nurseryOverlays?.destroy(); this.nurseryOverlays = null; this.motions.clear(); this.pivots.clear(); });
    this.loading?.ready();
  }
  recenter(): void { if (!this.cameras?.main) return; recenterCamera(this.view, this.current, this.screenChrome()); this.applyCamera(); }
  /** CSS-pixel chrome measured from the DOM; the same reading is reproduced by the browser checks. */
  private screenChrome(): ScreenChrome {
    const visible = (id: string) => {const e = document.getElementById(id); return e && !e.hidden && getComputedStyle(e).display !== 'none' ? e.getBoundingClientRect() : null;};
    const columns = ['open-missions', 'meadow-actions'].map(visible).filter((r): r is DOMRect => !!r && r.width > 0);
    const footer = visible('dev-badge');
    return {width: this.scale.width, height: this.scale.height, hudBottom: document.getElementById('hud')?.getBoundingClientRect().bottom ?? 0,
      column: columns.length ? {right: Math.max(...columns.map(r => r.right)), bottom: Math.max(...columns.map(r => r.bottom))} : null, footerTop: footer ? footer.top : null};
  }
  private framingInsets() {
    const pad=VISUAL.camera.overviewPadding, panel=document.getElementById('game-panel'), hud=document.getElementById('hud');
    const rect=panel && !panel.hidden ? panel.getBoundingClientRect() : null;
    const footer=document.getElementById('dev-badge');
    const bottom=footer && getComputedStyle(footer).display!=='none' ? this.scale.height-footer.getBoundingClientRect().top+pad : pad;
    return {left:pad,right:rect ? this.scale.width-rect.left+pad : pad,top:(hud?.getBoundingClientRect().bottom ?? 0)+pad,bottom};
  }
  overview(): void {
    if (!this.current || !this.cameras?.main) return;
    const ids=this.expanding ? PARCEL_IDS : this.current.acquiredParcels;
    const parcels=ids.map(id=>PARCELS[id]);
    this.view.setInsets(this.framingInsets());
    const rects=parcels.map(p=>screenBounds(cellsBounds(p.x,p.y,p.x+ISLAND.parcelCells,p.y+ISLAND.parcelCells)));
    // Extend downward AFTER projection: the rock hangs vertically in screen space.
    const owned = ownedRegions(this.current.acquiredParcels);
    rects.push(...owned);
    this.view.overview({left:Math.min(...rects.map(r=>r.left)),right:Math.max(...rects.map(r=>r.right)),top:Math.min(...rects.map(r=>r.top)),bottom:Math.max(...rects.map(r=>r.bottom))});
    this.applyCamera();
  }
  private updateDetails(): void {
    const fade=(low:number,high:number)=>Phaser.Math.Clamp((this.view.zoom-low)/(high-low),0,1);
    // Names fully shown from the fresh-island framing (readableZoom .6) upward; gone in a large-island overview.
    this.buildingNames?.setAlpha(fade(.4,.6));
    this.bubbles?.setAlpha(fade(.45,.7)).setVisible(!this.photo && this.view.zoom>.45);
  }
  private resize(): void { this.view.setInsets(this.framingInsets()); this.view.resize(this.scale.width, this.scale.height); this.applyCamera(); }
  private applyCamera(): void { this.cameras.main.setZoom(this.view.zoom).centerOn(this.view.x, this.view.y); this.drawDecorationSelection(); this.updateDetails(); }
  setExpansion(active:boolean, parcelId?:ParcelId):void {
    const was=this.expanding;this.expanding=active;this.expansionParcelId=active?parcelId:undefined;
    this.updateVisibleRegions();
    if(active&&!was)this.overview();
    else if(parcelId){const p=PARCELS[parcelId],point=toScreen(gridPoint(p.x+ISLAND.parcelCells/2,p.y+ISLAND.parcelCells/2));this.view.x=point.x;this.view.y=point.y;this.view.clamp();this.applyCamera();}
    else if(was&&!active)this.recenter();
    if(this.grid)this.drawGrid();
  }
  setRabbitPurchase(species: SpeciesId | null, selected: string | null = null): void {
    this.purchase = species ? {species, selected} : null;
    if (this.grid) this.drawGrid();
  }
  private tutorialCell: {x:number;y:number}|null = null;
  private tutorialTarget: 'birth'|null = null;
  focusTutorialCell(cell: {x:number;y:number}): void {
    if(!this.cameras?.main)return;
    const point=toScreen(buildingCenter(cell));
    const portrait=this.view.width<600;
    this.view.x=point.x+(portrait?0:this.view.width*.18)/this.view.zoom;
    this.view.y=point.y+(portrait?this.view.height*.2:0)/this.view.zoom;
    this.view.clamp();this.applyCamera();
  }
  setTutorialCell(cell: {x:number;y:number}|null): void { this.tutorialCell = cell; if(this.grid)this.drawGrid(); }
  setTutorialTarget(target: 'birth'|null): void { if(this.tutorialTarget === target)return; this.tutorialTarget = target; if(this.bubbles)this.drawBubbles(); }
  setPlacement(placement: Placement | null): void { this.placement = placement; if (this.grid) this.drawGrid(); }
  setArrangement(active: boolean, ghost: DecorationGhost | null = null): void {
    this.arrangement = active; this.ghost = ghost;
    if (this.grid) { this.drawDecorations(); this.drawGrid(); this.drawGhost(); }
  }
  focusDecoration(id: string): void {
    const d=this.current?.decorations.find(d=>d.id===id);if(!d)return;
    const p=this.decorationPoint(d.location,d.catalogId);if(!p)return;
    this.view.x=p.x+this.view.width*.15/this.view.zoom;this.view.y=p.y;this.view.clamp();this.applyCamera();
  }
  setDecorationSelection(id: string | null): void {
    this.selectedDecorationId = id; this.drawDecorationSelection();
  }
  private drawDecorationSelection(): void {
    if (!this.decorationSelection) return;
    this.decorationSelection.clear();
    const image = this.selectedDecorationId ? this.decorationViews.get(this.selectedDecorationId) : null;
    this.decorationSelection.setVisible(!!image && !this.photo);
    if (!image) return;
    const r = image.getBounds(), pad = 5 / this.view.zoom;
    this.decorationSelection.lineStyle(3 / this.view.zoom, 0xd19b39, 1);
    this.decorationSelection.strokeRoundedRect(r.x - pad, r.y - pad, r.width + 2 * pad, r.height + 2 * pad, 8);
  }
  /** Hit the drawn silhouette, including tall portions above the logical footprint.
   * Raster masks are cached per texture; only a tap samples pixels, never each frame. */
  private decorationAt(screen: Point): string | null {
    const world = this.view.world(screen), pad = Math.min(4 / this.view.zoom, 5);
    const images = [...this.decorationViews.entries()].reverse().sort((a, b) => (b[1].parentContainer.depth - a[1].parentContainer.depth) || b[1].depth - a[1].depth);
    for (const [id, image] of images) {
      const bounds = image.getBounds();
      if (world.x < bounds.left - pad || world.x > bounds.right + pad || world.y < bounds.top - pad || world.y > bounds.bottom + pad) continue;
      let pixels = this.decorationPixels.get(image.texture.key);
      const width = image.frame.realWidth, height = image.frame.realHeight;
      if (!pixels) {
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const context = canvas.getContext('2d', {willReadFrequently: true});
        if (!context) continue;
        context.drawImage(image.texture.getSourceImage() as CanvasImageSource, 0, 0, width, height);
        pixels = context.getImageData(0, 0, width, height).data;
        this.decorationPixels.set(image.texture.key, pixels);
      }
      const matrix = image.getWorldTransformMatrix();
      for (const [dx, dy] of [[0, 0], [-pad, 0], [pad, 0], [0, -pad], [0, pad], [-pad, -pad], [-pad, pad], [pad, -pad], [pad, pad]]) {
        const local = matrix.applyInverse(world.x + dx, world.y + dy);
        const x = Math.floor(local.x + image.displayOriginX), y = Math.floor(local.y + image.displayOriginY);
        // Transparent margins and faint ground shadows do not capture empty-space taps.
        if (x >= 0 && y >= 0 && x < width && y < height && pixels[(y * width + x) * 4 + 3] > 48) return id;
      }
    }
    return null;
  }
  setPhoto(active: boolean): void {
    this.photo = active;
    this.drawDecorationSelection();
    this.bubbles?.setVisible(!active); this.grid?.setVisible(!active); this.markers?.setVisible(!active); this.ghostView?.setVisible(!active); this.buildingGhost?.setVisible(!active && !!this.placement?.cell); this.nurseryOverlays?.setGhostVisible(!active && this.placement?.kind==='nursery' && !!this.placement.cell); this.updateDetails();
  }
  reactToFeed(id: string): void {
    const rabbit = this.rabbitViews.find(r => r.id === id); if (!rabbit) return;
    rabbit.fedUntil = this.time.now + 900; if (rabbit.motion) triggerFedReaction(rabbit.motion);
    const heart = this.add.text(rabbit.object.x, rabbit.object.y - 40, '♥', {fontSize: '28px', color: '#d9788d'}).setDepth(5).setOrigin(.5);
    this.tweens.add({targets: heart, y: heart.y - 45, alpha: 0, duration: 1000, onComplete: () => heart.destroy()});
  }
  private updateVisibleRegions(): void {
    // Owned plateaux and their hanging rock; clouds and extension sketches do not own pan regions.
    this.view.setVisibleRegions(this.expanding || !this.current ? null : ownedRegions(this.current.acquiredParcels));
  }
  private renderState(): void {
    const s = this.current;
    if (s) { this.view.setColumns(visibleColumns(s)); this.updateVisibleRegions(); this.applyCamera(); }
    const key = JSON.stringify([s?.acquiredParcels, s?.buildings.map(b => [b.id, b.kind, b.x, b.y, b.habitat, b.breeding?.parents]), s?.rabbits.map(r => [r.id, r.species, r.enclosureId])]);
    if (key !== this.layoutKey) { this.layoutKey = key; this.drawGround(); this.drawBuildings(); this.drawAnimals(); }
    // The cushion overlays follow the canonical state and simulation time on every refresh (a no-op when nothing changed).
    this.nurseryOverlays?.sync(s);
    this.drawDecorations(); this.drawBubbles(); this.drawGrid(); this.drawGhost(); this.updateDetails();
  }
  private decorationPoint(location: DecorationLocation, catalogId: typeof DECORATION_IDS[number]): Point | null {
    if (location.kind === 'inventory') return null;
    if (location.kind === 'outside') {
      const size = footprint(catalogId, location.rotation);
      return toScreen(gridPoint((location.x + size.width / 2) / FINE_GRID, (location.y + size.height / 2) / FINE_GRID));
    }
    return null;
  }
  private drawDecorations(): void {
    const visible = new Set<string>();
    for (const d of this.current?.decorations ?? []) {
      const point = this.decorationPoint(d.location, d.catalogId); if (!point) continue;
      visible.add(d.id);
      let image = this.decorationViews.get(d.id);
      if (!image) { image = this.add.image(0, 0, decorationTexture(d.catalogId)); (d.catalogId === 'dirt-path' ? this.floorDecorationsLayer : this.decorationsLayer).add(image); this.decorationViews.set(d.id, image); }
      image.setTexture(decorationTexture(d.catalogId, d.location.kind === 'outside' ? d.location.rotation : 0));
      const scale = decorationScale(d.catalogId, image.frame.realWidth), anchor = decorationOrigin(d.catalogId);
      image.setPosition(point.x, point.y).setOrigin(anchor.x, anchor.y).setScale(scale, scale * (d.catalogId === 'dirt-path' ? VISUAL.projection.q : 1)).setDepth(point.y)
        .setAlpha(this.ghost?.id === d.id ? .35 : 1);
    }
    for (const [id, image] of this.decorationViews) if (!visible.has(id)) { image.destroy(); this.decorationViews.delete(id); }
    this.floorDecorationsLayer.sort('depth'); this.decorationsLayer.sort('depth'); this.drawDecorationSelection();
  }
  private drawGhost(): void {
    const d = this.current?.decorations.find(d => d.id === this.ghost?.id) ?? (this.ghost?.catalogId ? {id: this.ghost.id, catalogId: this.ghost.catalogId} : null);
    const point = d && this.ghost?.location ? this.decorationPoint(this.ghost.location, d.catalogId) : null;
    if (!d || !point || !this.ghost?.location) { this.ghostView?.setVisible(false); return; }
    if (!this.ghostView) this.ghostView = this.add.image(0, 0, decorationTexture(d.catalogId)).setDepth(1.5).setAlpha(.65).setOrigin(.5, .87);
    const rotation = this.ghost.location.kind === 'outside' ? this.ghost.location.rotation : 0;
    this.ghostView.setTexture(decorationTexture(d.catalogId, rotation)).setPosition(point.x, point.y)
      .setOrigin(decorationOrigin(d.catalogId).x, decorationOrigin(d.catalogId).y)
      .setScale(decorationScale(d.catalogId, this.ghostView.frame.realWidth), decorationScale(d.catalogId, this.ghostView.frame.realWidth) * (d.catalogId === 'dirt-path' ? VISUAL.projection.q : 1)).setDepth(d.catalogId === 'dirt-path' ? .06 : 1.5)
      .setTint(catalogDecorationPlacementReason(this.current!, d.catalogId, this.ghost.location, d.id) ? 0xf3a6a1 : 0xe4ffb5).setVisible(!this.photo);
  }
  private drawGround(): void {
    // The painted stage (or, for an island grown outside the fixed order, the generated relief) changes only with
    // ownership and keeps the previous picture until the new one is ready. The grass tiles follow the parcels at once.
    this.ground.removeAll(true);
    if (!this.current) { this.floatingIslandLayer?.destroy(); this.floatingIslandLayer = null; this.islandStageLayer?.destroy(); this.islandStageLayer = null; return; }
    const ids = this.current.acquiredParcels, stage = islandStage(ids);
    if (stage) {
      if (!this.islandStageLayer) this.islandStageLayer = new IslandStageLayer(this);
      this.islandStageLayer.request(stage, () => { this.floatingIslandLayer?.destroy(); this.floatingIslandLayer = null; });
      // The painted rim covers the plateau edges itself.
      this.ground.clearMask(); this.islandMask?.destroy(); this.islandMaskGraphics?.destroy();
      this.islandMask = null; this.islandMaskGraphics = null; this.islandMaskKey = '';
    } else {
      this.islandStageLayer?.clear();
      if (!this.floatingIslandLayer) this.floatingIslandLayer = new FloatingIslandLayer(this);
      this.floatingIslandLayer.request(ids);
      this.maskIsland(ids);
    }
    const scale = GRASS_TILE.worldUnits / GRASS_TILE.size;
    for (const id of ids) {
      const parcel = PARCELS[id], x = VISUAL.grid.originX + parcel.x * VISUAL.grid.width, y = VISUAL.grid.originY + parcel.y * VISUAL.grid.depth;
      // Anchored on the world origin: neighbouring parcels continue the same pattern without a seam.
      this.ground.add(this.add.tileSprite(x, y, ISLAND.parcelWidth / scale, ISLAND.parcelDepth / scale, GRASS_TILE.texture)
        .setOrigin(0).setScale(scale).setTilePosition(x / scale, y / scale));
    }
  }
  /** Rounded plateau outline for the generated relief only. */
  private maskIsland(ids: readonly ParcelId[]): void {
    const maskKey = parcelSetKey(ids);
    if (maskKey !== this.islandMaskKey) {
      const graphics = this.make.graphics({x:0,y:0});
      graphics.fillStyle(0xffffff); graphics.beginPath();
      for (const component of islandOutline(ids)) {
        const loops = [...component.loops].sort((a,b)=>Number(a.hole)-Number(b.hole));
        const vertices: number[] = [], holes: number[] = [];
        for (const loop of loops) {
          if(loop.hole) holes.push(vertices.length/2);
          for(const p of organicLoop(loop).map(toScreen)) vertices.push(p.x,p.y);
        }
        const triangles = Phaser.Geom.Polygon.Earcut(vertices,holes,2);
        for(let i=0;i<triangles.length;i+=3) {
          const a=triangles[i]*2,b=triangles[i+1]*2,c=triangles[i+2]*2;
          graphics.moveTo(vertices[a],vertices[a+1]); graphics.lineTo(vertices[b],vertices[b+1]); graphics.lineTo(vertices[c],vertices[c+1]); graphics.closePath();
        }
      }
      graphics.fillPath();
      const mask=graphics.createGeometryMask();
      // Only the flat plateau is clipped. Upright art and interaction layers are independent.
      this.ground.setMask(mask); this.islandMask?.destroy(); this.islandMaskGraphics?.destroy();
      this.islandMask=mask; this.islandMaskGraphics=graphics; this.islandMaskKey=maskKey;
    }
    this.ground.setMask(this.islandMask!);
  }
  private buildingTexture(b: Pick<Building, 'kind' | 'habitat' | 'footprintTier'>): string {
    if (b.kind === 'farm') return FARM_ART.texture;
    if (b.kind === 'nest') return NEST_ART.texture;
    if (b.kind === 'nursery') return NURSERY_ART.texture;
    if (b.kind === 'kitchen') return KITCHEN_ART.texture;
    if (b.kind === 'enclosure') { const illustrated = habitatArtFor(b.habitat ?? undefined, b.footprintTier); if (illustrated) return illustrated.texture; }
    // The drawing follows the footprint actually acquired (tier), not the capacity level: a legacy enclosure keeps its compact look.
    const sized = b.habitat && b.footprintTier && b.footprintTier > 1 ? HABITAT_SIZE_PROPOSAL[b.footprintTier] : null;
    const key = `meadow-building-${b.kind}-${b.habitat?.type ?? 'none'}-${b.habitat?.level ?? 0}${sized ? `-t${b.footprintTier}` : ''}`;
    if (sized && b.habitat && !this.textures.exists(key)) {
      const g = this.add.graphics();g.scaleCanvas(2,2);drawHabitat(g,sized.texture.width/2,sized.texture.height/2,b.habitat.type,b.habitat.level,sized.growth);
      g.generateTexture(key,sized.texture.width*2,sized.texture.height*2);g.destroy();this.buildingTextures.add(key);
    }
    if (!this.textures.exists(key)) {
      const g = this.add.graphics();g.scaleCanvas(2,2);drawBuildingArt(g,128,128,b);
      g.generateTexture(key,512,512);g.destroy();this.buildingTextures.add(key);
    }
    return key;
  }
  /** The same registration is used for placed buildings and the placement/move ghost. */
  private positionBuildingArt(image: Phaser.GameObjects.Image, x: number, y: number, kind: Building['kind'], illustrated: HabitatArt | null = null): void {
    if (illustrated) { image.setPosition(x, y).setOrigin(illustrated.anchor.x / illustrated.width, illustrated.anchor.y / illustrated.height).setScale(illustrated.worldWidth / illustrated.width); return; }
    const art = kind === 'farm' ? FARM_ART : kind === 'nest' ? NEST_ART : kind === 'nursery' ? NURSERY_ART : kind === 'kitchen' ? KITCHEN_ART : null;
    image.setPosition(x, y).setOrigin(.5, art ? art.originY : .5)
      .setScale(art ? art.worldWidth / art.width : .5);
  }
  private drawBuildings(): void {
    this.labels.removeAll(true);
    this.buildingNames=this.add.container(0,0);this.labels.add(this.buildingNames);
    const present = new Set<string>();
    for (const b of this.current?.buildings ?? []) {
      present.add(b.id);const p=toScreen(buildingCenter(b)),x=p.x,y=p.y;
      let image=this.buildingViews.get(b.id);
      if(!image){image=this.add.image(x,y,this.buildingTexture(b));this.buildingsLayer.add(image);this.buildingViews.set(b.id,image);}
      image.setTexture(this.buildingTexture(b)).setDepth(y);
      this.positionBuildingArt(image, x, y, b.kind, b.kind === 'enclosure' ? habitatArtFor(b.habitat ?? undefined, b.footprintTier) : null);
      const labelY=y+(b.kind==='nest'?NEST_ART.labelY:b.kind==='nursery'?NURSERY_ART.labelY:b.kind==='kitchen'?KITCHEN_ART.labelY:b.footprintTier&&b.footprintTier>1?HABITAT_SIZE_PROPOSAL[b.footprintTier].labelOffset:70);
      const label=this.add.text(x,labelY,b.kind==='enclosure'?habitatName(b):BUILDING_NAMES[b.kind],{fontFamily:'Arial',fontSize:'13px',color:'#435b38',padding:{x:7,y:3}}).setOrigin(.5);
      const background=this.add.graphics();background.fillStyle(0xf8f4de,.96);background.fillRoundedRect(x-label.width/2,labelY-label.height/2,label.width,label.height,7);
      this.buildingNames.add([background,label]);
    }
    for(const [id,image] of this.buildingViews)if(!present.has(id)){image.destroy();this.buildingViews.delete(id);}
    this.buildingsLayer.sort('depth');
  }
  private drawAnimals(): void {
    this.animals.removeAll(true); this.rabbitViews = [];
    const walkers = new Set<string>();
    for (const enclosure of this.current?.buildings.filter(b => b.kind === 'enclosure' || b.kind==='nest' && b.breeding) ?? []) {
      const residents = enclosure.kind==='nest' ? enclosure.breeding!.parents.flatMap(id=>this.current!.rabbits.filter(r=>r.id===id)) : this.current!.rabbits.filter(r => r.enclosureId === enclosure.id);
      const center = toScreen(buildingCenter(enclosure));
      residents.forEach((rabbit, index) => {
        if(enclosure.kind==='enclosure' && nestForParent(this.current!,rabbit.id)) return;
        // Nest parents keep their original independent illustrations in front of the doorway.
        const tier = enclosure.footprintTier ?? 1, proposed = enclosure.kind==='enclosure' && tier > 1 ? HABITAT_SIZE_PROPOSAL[tier] : null;
        const illustrated = enclosure.kind==='enclosure' ? habitatArtFor(enclosure.habitat ?? undefined, enclosure.footprintTier) : null;
        const illustratedLayout = illustrated ? habitatArtLayout(illustrated) : null;
        const offset = enclosure.kind==='nest' ? NEST_ART.parentOffsets[index] : illustratedLayout ? illustratedLayout.slots[Math.min(index, illustratedLayout.slots.length - 1)] : proposed ? habitatSlots(tier as 2 | 3, residents.length)[Math.min(index, residents.length - 1)] : rabbitOffset(index, residents.length);
        const layout = illustratedLayout ? {zone: illustratedLayout.zone, roamScale: illustratedLayout.roamScale} : proposed ? {zone: proposed.zone, roamScale: proposed.roamScale} : undefined;
        const base = {x: center.x + offset.x, y: center.y + offset.y};
        // Enclosure residents wander around their slot (local to the centre); nest parents keep their spot.
        let motion: RabbitMotion | undefined;
        if (enclosure.kind === 'enclosure') {
          // Same enclosure: keep the individual's place (a resident added or removed only walks it back); another enclosure: start afresh at its slot.
          const known = this.motions.get(rabbit.id);
          if (known && known.group === enclosure.id) {
            motion = known.motion;
            // An upgrade moves the footprint's centre but not the ground: keep the rabbit where it stands, then it walks to its new place.
            if (known.tier !== tier) motion.local = {x: motion.local.x + known.center.x - center.x, y: motion.local.y + known.center.y - center.y};
            retargetRabbitMotion(motion, offset, residents.length, layout); known.tier = tier; known.center = center;
          } else { motion = createRabbitMotion(rabbit.id, offset, residents.length, layout); this.motions.set(rabbit.id, {group: enclosure.id, tier, center, motion}); }
          walkers.add(rabbit.id);
        }
        const start = motion ? {x: center.x + motion.local.x, y: center.y + motion.local.y} : base;
        const object = this.add.container(start.x, start.y).setScale(VISUAL.rabbit.scale).setDepth(start.y);
        const body = this.add.container(0, 0), shadow = this.add.ellipse(0, 10, 35, 12, 0x6b7755, .16);
        object.add([shadow, body]);
        const art = rabbitArt(rabbit.species);
        const view = {object, body, center, group: enclosure.id, motion, lift: 0, pivot: art ? this.spritePivot(art) : {x: 0, y: -3}, native: art ? art.facing : 1 as const, base, phase: index * 2 + Number(rabbit.id.split('-')[1]), fedUntil: 0};
        if (art) {
          const sprite = this.add.image(0, art.groundY, art.texture).setOrigin(.5, 1);
          sprite.setScale(art.worldWidth / art.width); // Uniform scale preserves the original proportions.
          body.add(sprite);
          this.animals.add(object);
          this.rabbitViews.push({id: rabbit.id, ears: [], sprite, art, ...view});
          return;
        }
        const coat = proceduralCoat(SPECIES[rabbit.species].art), color = Phaser.Display.Color.HexStringToColor(coat.body).color, patch = Phaser.Display.Color.HexStringToColor(coat.patch).color;
        const ears = coat.lop ? [this.add.ellipse(-19, -6, 10, 29, color), this.add.ellipse(19, -6, 10, 29, color)] :
          [this.add.ellipse(-7, -24, 8, 26, color), this.add.ellipse(7, -25, 8, 26, coat.frost ? patch : color)];
        if (coat.wings) {
          const wings = this.add.graphics(); wings.fillStyle(coat.plumage ? 0x86b9d0 : 0xfff9ee); wings.lineStyle(1.4, 0x8b9cb4);
          for (const side of [-1, 1]) {
            const points = [{x: 12, y: 0}, {x: 26, y: -17}, {x: 32, y: -11}, {x: 27, y: 6}, {x: 17, y: 9}].map(p => ({x: p.x * side, y: p.y}));
            wings.fillPoints(points, true); wings.strokePoints(points, true);
          }
          body.add(wings);
        }
        body.add([...ears,
          this.add.ellipse(0, 0, 33, 27, color), this.add.ellipse(8, 2, 13, 18, patch),
          this.add.circle(-6, -7, 2, 0x3e332b), this.add.circle(6, -7, 2, 0x3e332b), this.add.circle(0, 0, 2, 0xbc8990), this.add.circle(17, 5, 6, color)]);
        const details = this.add.graphics(); body.add(details);
        if (coat.flame) {
          details.fillStyle(0xda8469); details.fillPoints([{x: -6, y: -14}, {x: -7, y: -23}, {x: 0, y: -31}, {x: 1, y: -22}, {x: 6, y: -26}, {x: 7, y: -16}], true);
          details.fillStyle(0xffe1a3); details.fillTriangle(-3, -15, 0, -24, 4, -15);
        }
        if (coat.glasses) { details.lineStyle(2, 0x555b70); details.strokeCircle(-6, -7, 5); details.strokeCircle(6, -7, 5); details.lineBetween(-1, -7, 1, -7); details.lineBetween(-11, -8, -15, -10); details.lineBetween(11, -8, 15, -10); }
        if (coat.metal) { details.fillStyle(0xeef3f8); details.fillPoints([{x: 8, y: 7}, {x: 12, y: 3}, {x: 16, y: 7}, {x: 12, y: 11}], true); details.lineStyle(1, 0x6e7a91); details.lineBetween(8, 7, 12, 11); }
        if (coat.plumage) { details.fillStyle(0xedc87d); details.fillEllipse(-3, -17, 5, 14); details.fillStyle(0xd98e81); details.fillEllipse(3, -15, 5, 12); }
        if (coat.frost) { details.lineStyle(1.5, 0xeafdff); details.lineBetween(10, -19, 18, -19); details.lineBetween(14, -23, 14, -15); }
        this.animals.add(object); this.rabbitViews.push({id: rabbit.id, ears, ...view});
      });
    }
    for (const id of [...this.motions.keys()]) if (!walkers.has(id)) this.motions.delete(id);
    // A rebuilt body starts in the pose of its state, never flat in the middle of a hop or somersault.
    for (const rabbit of this.rabbitViews) {
      const pose = rabbit.motion ? rabbitPose(rabbit.motion) : {lift: 0, squashX: 1, squashY: 1, facing: 1 as const, rotation: 0};
      rabbit.lift = pose.lift; this.poseBody(rabbit, pose);
    }
  }
  /** A point of the body (body space) in the scene, following hop, squash, mirror and rotation. */
  private bodyPoint(rabbit: VisualRabbit, x: number, y: number): Point {
    const world = rabbit.body.getWorldTransformMatrix().transformPoint(x, y); return {x: world.x, y: world.y};
  }
  /** Mean of the opaque pixels' bounding box, from a small copy of the picture (cheap, once per texture). */
  private spritePivot(art: RabbitArt): Point {
    const known = this.pivots.get(art.texture); if (known) return known;
    const scale = art.worldWidth / art.width; let pivot = {x: 0, y: art.groundY - art.height * scale / 2};
    try {
      const size = 64, canvas = document.createElement('canvas'); canvas.width = size; canvas.height = Math.max(1, Math.round(size * art.height / art.width));
      const context = canvas.getContext('2d', {willReadFrequently: true});
      if (context) {
        context.drawImage(this.textures.get(art.texture).getSourceImage() as CanvasImageSource, 0, 0, canvas.width, canvas.height);
        const data = context.getImageData(0, 0, canvas.width, canvas.height).data; let minX = Infinity, maxX = -1, minY = Infinity, maxY = -1;
        for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) if (data[(y * canvas.width + x) * 4 + 3] >= 32) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
        if (maxX >= 0) {
          const k = art.width / canvas.width, cx = (minX + maxX + 1) / 2 * k, cy = (minY + maxY + 1) / 2 * (art.height / canvas.height);
          pivot = {x: (cx - art.width / 2) * scale, y: art.groundY + (cy - art.height) * scale};
        }
      }
    } catch { /* the picture centre is an acceptable pivot */ }
    this.pivots.set(art.texture, pivot); return pivot;
  }
  /** Body pose: mirror, compression against the ground contact, height, and a rotation about the body centre that keeps that centre in place. */
  private poseBody(rabbit: VisualRabbit, pose: {lift: number; squashX: number; squashY: number; facing: 1 | -1; rotation: number}): void {
    const scaleX = pose.facing * rabbit.native * pose.squashX, p = rabbit.pivot, c = Math.cos(pose.rotation), s = Math.sin(pose.rotation);
    const px = scaleX * p.x, py = pose.squashY * p.y;
    // The visible centre stays where the picture's own orientation puts it: turning mirrors the body about that centre
    // (asymmetric transparent margins cause no sideways jump), and the rotation of a somersault keeps it in place too.
    rabbit.body.setRotation(pose.rotation).setScale(scaleX, pose.squashY)
      .setPosition(pose.squashX * p.x - (c * px - s * py), BODY_PIVOT * (1 - pose.squashY) - pose.lift + py - (s * px + c * py));
  }
  /** A finished birth: a heart in a cream bubble; touching it sends the baby to the nursery. */
  private heartBubble(x: number, y: number): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    g.fillStyle(0x6e4a3a, .25); g.fillRoundedRect(-25, -21, 50, 46, 16);
    g.fillStyle(0xfff7dc); g.lineStyle(2, 0xe7c9a4); g.fillRoundedRect(-25, -24, 50, 46, 16); g.strokeRoundedRect(-25, -24, 50, 46, 16);
    g.fillStyle(0xd2577a); g.fillCircle(-7, -7, 8); g.fillCircle(7, -7, 8); g.fillTriangle(-14.5, -4, 14.5, -4, 0, 12);
    g.fillStyle(0xffe3ea); g.fillCircle(-9, -10, 2.5);
    return this.add.container(x, y, [g]).setSize(50, 46);
  }
  /** Glides the camera to a building, zoom unchanged; instant when reduced motion is requested. */
  focusBuilding(id: string): void {
    const b = this.current?.buildings.find(b => b.id === id); if (!b || !this.cameras?.main) return;
    const from = {x: this.view.x, y: this.view.y}, to = this.view.centered(toScreen(buildingCenter(b)));
    const go = (t: number) => { this.view.x = from.x + (to.x - from.x) * t; this.view.y = from.y + (to.y - from.y) * t; this.view.clamp(); this.applyCamera(); };
    this.focusTween?.stop(); this.focusTween = null;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { go(1); return; }
    this.focusTween = this.tweens.addCounter({from: 0, to: 1, duration: 650, ease: 'Sine.easeInOut',
      // A pan or pinch by the player takes over at once.
      onUpdate: tween => { if (this.view.busy) { tween.stop(); this.focusTween = null; return; } go(tween.getValue() ?? 1); },
      onComplete: () => { this.focusTween = null; }});
  }
  private drawBubbles(): void {
    this.bubbles.removeAll(true); this.bubbleHits = [];
    for (const b of this.current?.buildings ?? []) {
      const now = this.current!.lastSimulatedAt;
      const amount = Math.floor(b.incomeUnits / HOUR);
      let text = '', kind: 'income' | 'grass' | 'building' = 'building';
      if (b.kind === 'enclosure' && amount >= 1) { text = 'income'; kind = 'income'; }
      if (b.kind === 'farm' && b.order && b.order.endsAt <= now) { text = 'Herbe ✓'; kind = 'grass'; }
      if (b.kind==='nest' && b.breeding && b.breeding.endsAt<=now) text='birth';
      if (b.kind === 'nursery' && readyNurseryBabies(b, now).length) text = 'Prêt !'; // One bubble for any ready baby.
      if (!text) continue;
      const p = toScreen(buildingCenter(b)); p.y += b.kind === 'farm' ? FARM_ART.harvestY : b.kind==='nest' ? NEST_ART.actionY : b.kind==='nursery' ? NURSERY_ART.actionY : -72;
      const bubble = kind === 'income' ? coinBubble(this, p.x, p.y, amount, amount >= habitatStats(b).cap) : text === 'birth' ? this.heartBubble(p.x, p.y) : this.add.text(p.x, p.y, text, {fontFamily: 'Arial', fontSize: '17px', color: '#3b4d2d', backgroundColor: '#fff7dc', padding: {x: 13, y: 10}}).setOrigin(.5);
      if (text === 'birth' && this.tutorialTarget === 'birth') {
        const halo=this.add.graphics().lineStyle(4,0xffcf55).strokeEllipse(p.x,p.y,bubble.width+12,bubble.height+12);this.bubbles.add(halo);
        const hand = this.add.text(p.x + 34,p.y - 28,'👇',{fontSize:'28px'}).setOrigin(.5); this.bubbles.add(hand);
        if(!matchMedia('(prefers-reduced-motion: reduce)').matches) {
          const tween=this.tweens.add({targets:hand,y:p.y-35,duration:500,yoyo:true,repeat:-1});hand.once('destroy',()=>tween.remove());
        }
      }
      this.bubbles.add(bubble); this.bubbleHits.push({point: p, width:bubble.width, height:bubble.height, selection: {kind: text === 'birth' ? 'birth' : kind, id: b.id}});
    }
  }
  private gridZoom = 0;
  /** Re-records the placement overlay from geometry computed by drawGrid; only its zoom-relative widths change. */
  private gridStroke: (() => void) | null = null;
  private placementLines(active: Footprint | null): [Point, Point][] {
    return this.current ? placementGrid(this.current, active).map(line => [finePoint(line.from.x, line.from.y), finePoint(line.to.x, line.to.y)]) : [];
  }
  private strokePlacementContext(lines: [Point, Point][]): void {
    this.grid.lineStyle(1 / this.view.zoom, 0x396447, PLACEMENT_GRID.opacity);
    for (const [a, b] of lines) this.grid.lineBetween(a.x, a.y, b.x, b.y);
  }
  /** Placement geometry depends on the state and the candidate, never on the camera: a zoom only re-strokes it. */
  private setGridStroke(stroke: () => void): void {
    this.gridStroke = () => { this.grid.clear(); this.gridZoom = this.view.zoom; stroke(); };
    this.gridStroke();
  }
  private drawGrid(): void {
    this.grid.clear(); this.markers.clear(); this.buildingGhost?.setVisible(false); this.nurseryOverlays?.hideGhost(); this.gridZoom = this.view.zoom; this.gridStroke = null;
    this.purchaseLabels.splice(0).forEach(label => label.destroy());
    if (this.purchase && this.current) {
      for (const b of this.current.buildings.filter(b => !habitatEntryReason(this.current!, b, this.purchase!.species))) {
        const p = finePoint(b.x, b.y), selected = b.id === this.purchase.selected;
        this.grid.lineStyle(selected ? 4 : 2, selected ? 0xd99b32 : 0x396447);
        this.grid.fillStyle(selected ? 0xf4d58b : 0xe5ffd2, .25);
        this.grid.fillRect(p.x,p.y,VISUAL.grid.width,VISUAL.grid.depth);
        this.grid.strokeRect(p.x,p.y,VISUAL.grid.width,VISUAL.grid.depth);
        const free = habitatStats(b).capacity - this.current.rabbits.filter(r => r.enclosureId === b.id).length;
        const at = toScreen({x: p.x + VISUAL.grid.width / 2, y: p.y + VISUAL.grid.depth});
        this.purchaseLabels.push(this.add.text(at.x, at.y, `${free} place${free>1?'s':''} libre${free>1?'s':''}`, {fontSize:'14px', color:'#24462d',backgroundColor:'#fff9e9',padding:{x:4,y:3}}).setOrigin(.5,0).setDepth(3));
      }
      return;
    }
    if (this.expanding && this.current) {
      const available = purchasableParcels(this.current);
      for (const id of purchasableParcels(this.current)) {
        const parcel = PARCELS[id], point = gridPoint(parcel.x, parcel.y);
        const width = ISLAND.parcelWidth, height = ISLAND.parcelDepth;
        const selected = this.expansionParcelId === id;
        const sketch = selected || (!this.expansionParcelId && id === available[0]);
        if (sketch) {this.grid.fillStyle(0xeee9d5, .28); this.grid.fillRoundedRect(point.x + 3, point.y + 3, width - 6, height - 6, 10);}
        this.grid.lineStyle(selected ? 4 : 2, selected ? 0xf4d58b : 0xe5f3df, .8);
        this.grid.strokeRoundedRect(point.x + 3, point.y + 3, width - 6, height - 6, 10);
        const {x, y} = toScreen({x: point.x + width / 2, y: point.y + height / 2});
        this.markers.fillStyle(0xeef5d3, .85); this.markers.fillCircle(x, y, 17);
        this.markers.lineStyle(2, 0x577951); this.markers.lineBetween(x - 7, y, x + 7, y); this.markers.lineBetween(x, y - 7, x, y + 7);
        if (sketch) this.purchaseLabels.push(this.add.text(x, y + 32, 'Terrain réservé', {fontFamily:'Arial',fontSize:'20px',color:'#57735b',backgroundColor:'#f7f4e4',padding:{x:10,y:5}}).setOrigin(.5).setDepth(3));
      }
      return;
    }
    if(this.placement){this.drawBuildingGrid();return;}
    if(this.arrangement)this.drawDecorationGrid();
  }
  private drawBuildingGrid(): void {
    if(!this.current || !this.placement)return;
    const p=this.placement;
    const moving=this.current.buildings.find(b=>b.id===p.movingId), active=p.cell?{...p.cell,footprintTier:moving?.footprintTier}:moving;
    const lines=this.placementLines(active?buildingFootprint(active):null);
    if(!p.cell){this.setGridStroke(()=>{
      this.strokePlacementContext(lines);
      if(this.tutorialCell) { const c=finePoint(this.tutorialCell.x,this.tutorialCell.y); this.grid.fillStyle(0xffd966,.5);this.grid.fillRect(c.x,c.y,VISUAL.grid.width,VISUAL.grid.depth);this.grid.lineStyle(3/this.view.zoom,0xffd966);this.grid.strokeRect(c.x,c.y,VISUAL.grid.width,VISUAL.grid.depth); }
    });return;}
    const valid=!buildingPlacementReason(this.current,p.cell.x,p.cell.y,p.movingId),corner=finePoint(p.cell.x,p.cell.y),center=toScreen(buildingCenter(active!)),size=buildingFootprint(active!),cellsWide=VISUAL.grid.width*size.width/FINE_GRID,cellsDeep=VISUAL.grid.depth*size.height/FINE_GRID;
    this.setGridStroke(()=>{
      this.strokePlacementContext(lines);
      this.grid.fillStyle(valid?0xe5ffd2:0xf5b7b1,.3);this.grid.fillRect(corner.x,corner.y,cellsWide,cellsDeep);
      this.grid.lineStyle(2.5/this.view.zoom,valid?0x396447:0xa54242);this.grid.strokeRect(corner.x,corner.y,cellsWide,cellsDeep);
    });
    const habitat=p.kind==='enclosure'?(moving?.habitat??{type:p.habitatType??'universal',level:1 as const}):null;
    if(!this.buildingGhost)this.buildingGhost=this.add.image(0,0,this.buildingTexture({kind:p.kind,habitat,footprintTier:moving?.footprintTier})).setDepth(1.5).setAlpha(.55).setScale(.5);
    const tint=valid?0xe4ffb5:0xf3a6a1;
    this.buildingGhost.setTexture(this.buildingTexture({kind:p.kind,habitat,footprintTier:moving?.footprintTier})).setTint(tint).setVisible(!this.photo);
    this.positionBuildingArt(this.buildingGhost, center.x, center.y, p.kind, habitatArtFor(habitat ?? undefined, moving?.footprintTier));
    // The nursery's preview carries its four cushion states, with the ghost base's own opacity and valid/invalid tint.
    if(p.kind==='nursery')this.nurseryOverlays?.showGhost(this.current,moving??null,center,{alpha:this.buildingGhost.alpha,tint},!this.photo);
  }
  private drawDecorationGrid(): void {
    if (!this.current) return;
    const owned = this.current.decorations.find(d => d.id === this.ghost?.id) ?? (this.ghost?.catalogId ? {id: this.ghost.id, catalogId: this.ghost.catalogId} : null);
    if (!this.ghost?.location || !owned || this.ghost.location.kind === 'inventory') return;
    const valid = !catalogDecorationPlacementReason(this.current, owned.catalogId, this.ghost.location, owned.id);
    const p = this.decorationPoint(this.ghost.location, owned.catalogId)!;
    if (this.ghost.location.kind === 'outside') {
      const loc = this.ghost.location, size = footprint(owned.catalogId, loc.rotation), corner = gridPoint(loc.x / 4, loc.y / 4);
      const lines = this.placementLines({...loc, ...size});
      this.setGridStroke(() => {
        this.strokePlacementContext(lines);
        this.grid.fillStyle(valid ? 0xe5ffd2 : 0xf5b7b1, .6); this.grid.fillRect(corner.x, corner.y, size.width * VISUAL.grid.width / 4, size.height * VISUAL.grid.depth / 4);
        this.grid.lineStyle(2.5 / this.view.zoom, valid ? 0x396447 : 0xa54242);
        this.grid.strokeRect(corner.x, corner.y, size.width * VISUAL.grid.width / 4, size.height * VISUAL.grid.depth / 4);
      });
    }
    this.markers.lineStyle(3, valid ? 0x396447 : 0xa54242);
    if (valid) { this.markers.lineBetween(p.x - 8, p.y + 5, p.x - 2, p.y + 11); this.markers.lineBetween(p.x - 2, p.y + 11, p.x + 10, p.y - 3); }
    else { this.markers.lineBetween(p.x - 8, p.y - 8, p.x + 8, p.y + 8); this.markers.lineBetween(p.x - 8, p.y + 8, p.x + 8, p.y - 8); }
  }
  private tap(screen: Point): void {
    // Cells are read on the ground plane; rabbits, bubbles and decorations are hit where they are drawn.
    const world = this.view.world(screen), ground = toGround(world), cell = gridCell(ground);
    if (this.photo) return;
    if (this.purchase) {
      const b = this.current ? buildingAt(this.current, fineCell(ground)) : null;
      if (b && !habitatEntryReason(this.current!, b, this.purchase.species)) this.select({kind:'building',id:b.id});
      return;
    }
    if (this.placement || (this.arrangement && this.ghost)) { this.select({kind:'fineCell',...fineCell(ground)}); return; }
    for (const bubble of this.bubbles.visible && this.bubbles.alpha>=.65 ? this.bubbleHits : []) { const p = this.view.screen(bubble.point); if (Math.abs(p.x - screen.x) < Math.min(39,bubble.width*this.view.zoom/2+3) && Math.abs(p.y - screen.y) < Math.min(25,bubble.height*this.view.zoom/2+3)) { this.select(bubble.selection); return; } }
    if (this.expanding) {const id=this.current ? expansionTarget(this.current,cell.x,cell.y) : null;if(id)this.select({kind:'extension',parcelId:id});return;}
    if (this.placement) {this.select({kind:'fineCell',...fineCell(ground)});return;}
    if (this.arrangement) {
      const chosen = this.current?.decorations.find(d => d.id === this.ghost?.id);
      if (!chosen) {
        const decorationId = this.decorationAt(screen);
        if (decorationId) { this.select({kind: 'decoration', id: decorationId}); return; }
      }
      if (chosen) {
        this.select({kind: 'fineCell', ...fineCell(ground)}); return;
      }
      const decorationId = this.decorationAt(screen);
      if (decorationId) { this.select({kind: 'decoration', id: decorationId}); return; }
      const home=this.current?buildingAt(this.current,fineCell(ground)):null;
      this.select(home ? {kind: 'building', id: home.id} : {kind: 'empty'}); return;
    }
    const closest = rabbitHit(screen, this.rabbitViews.flatMap(r => {
      if (r.sprite && r.art) {
        // Reference images use their own alpha silhouette, avoiding rectangular hits on adjacent residents.
        const world = this.view.world(screen);
        const local = r.sprite.getWorldTransformMatrix().applyInverse(world.x, world.y);
        const x = Math.floor(local.x + r.art.width / 2), y = Math.floor(local.y + r.art.height);
        if (x < 0 || y < 0 || x >= r.art.width || y >= r.art.height ||
            this.textures.getPixelAlpha(x, y, r.art.texture) < 32) return [];
      }
      return [{id: r.id, point: this.view.screen(this.bodyPoint(r, 0, -7)), depth: r.object.y,
        radius: r.sprite ? Infinity : VISUAL.rabbit.hitRadius * Math.min(1,this.view.zoom/.8)}];
    }));
    if (closest) { this.select({kind: 'rabbit', id: closest.id}); return; }
    const decorationId = this.decorationAt(screen);
    if (decorationId) { this.select({kind: 'decoration', id: decorationId}); return; }

    const building=this.current?buildingAt(this.current,fineCell(ground)):null;
    this.select(building ? {kind: 'building', id: building.id} : {kind: 'empty'});
  }
  update(time: number): void {
    // A pinch changes the zoom on every pointer event: re-stroke the cached overlay at most once per frame.
    if (this.gridStroke && this.gridZoom !== this.view.zoom) this.gridStroke();
    // Scene time since the last frame; a long gap (inactive tab) is cut short inside the motion step: no jump.
    const dt = this.motionClock === null ? 0 : time - this.motionClock; this.motionClock = time;
    for (const rabbit of this.rabbitViews) {
      const t = time / 1000 + rabbit.phase;
      let lift = 0, squashX = 1, squashY = 1, facing: 1 | -1 = 1, rotation = 0;
      if (rabbit.motion) {
        const motion = rabbit.motion;
        const others = this.rabbitViews.flatMap(other => other === rabbit || other.group !== rabbit.group || !other.motion ? [] :
          other.motion.mode === 'walk' ? [other.motion.local, other.motion.to] : [other.motion.local]);
        stepRabbitMotion(motion, dt, others);
        const pose = rabbitPose(motion);
        ({lift, squashX, squashY, facing, rotation} = pose);
        // The ground point drives position and depth; the hop only lifts the body.
        rabbit.object.setPosition(rabbit.center.x + motion.local.x, rabbit.center.y + motion.local.y).setDepth(rabbit.center.y + motion.local.y);
      } else {
        const position = rabbitPosition(rabbit.base, time, rabbit.phase, 0);
        lift = rabbitFedLift(time, rabbit.phase, rabbit.fedUntil);
        rabbit.object.setPosition(position.x, position.y).setDepth(position.y);
      }
      rabbit.lift = lift;
      this.poseBody(rabbit, {lift, squashX, squashY, facing, rotation});
      rabbit.ears.forEach((ear, index) => { ear.rotation = Math.sin(t * 1.4 + index) * .13; });
    }
    this.animals?.sort('depth');
  }
}
