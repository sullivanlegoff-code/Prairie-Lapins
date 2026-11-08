import type Phaser from 'phaser';
import {COIN_TEXTURE, FOOD_TEXTURE, formatCoinAmount} from './currency';

/** One cached texture, matching the DOM currency, with the existing bubble hit bounds. */
/**
 * A habitat's coin bubble (owner, 7 November 2026): never the amount, only a logo (`logo`: the basket at Christmas, else the coin)
 * inside the painted cream speech bubble (`frame`, when loaded), so it reads as something to tap. The container's origin is the
 * middle of the bubble's disk; the amount shows when it is collected (MeadowScene.playIncomeCollect).
 */
export function coinBubble(scene: Phaser.Scene, x: number, y: number,
  options: {logo?: string; frame?: {texture: string; height: number; centerY: number; logo: number}} = {}): Phaser.GameObjects.Container {
  const parts: Phaser.GameObjects.GameObject[] = [];
  let size = 34, width = 34, height = 34;
  if (options.frame) {
    const f = options.frame, back = scene.add.image(0, 0, f.texture).setOrigin(.5, f.centerY); back.setScale(f.height / Math.max(back.height, 1));
    width = back.displayWidth; height = width; size = width * f.logo; parts.push(back);
  }
  const icon = scene.add.image(0, 0, options.logo ?? COIN_TEXTURE); icon.setScale(size / Math.max(icon.height, icon.width, 1)); parts.push(icon);
  return scene.add.container(x, y, parts).setSize(Math.max(width, 34), Math.max(height, 34));
}
/** The farm's harvest bubble: the amount of food ready, with the food logo. */
export function foodBubble(scene: Phaser.Scene, x: number, y: number, amount: number): Phaser.GameObjects.Container {
  const label = scene.add.text(0, 0, formatCoinAmount(amount), {fontFamily: 'Arial', fontSize: '17px', color: '#3b4d2d'}).setOrigin(0, .5);
  const width = label.width + 26 + 8 + 24, height = Math.max(label.height, 24) + 20;
  const background = scene.add.graphics(); background.fillStyle(0xfff7dc); background.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
  label.setPosition(-width / 2 + 13, 0);
  const icon = scene.add.image(width / 2 - 25, 0, FOOD_TEXTURE); icon.setScale(24 / Math.max(icon.width, icon.height));
  return scene.add.container(x, y, [background, label, icon]).setSize(width, height);
}
