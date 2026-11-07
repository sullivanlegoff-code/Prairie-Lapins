import type Phaser from 'phaser';
import {COIN_TEXTURE, FOOD_TEXTURE, formatCoinAmount} from './currency';

/** One cached texture, matching the DOM currency, with the existing bubble hit bounds. */
/**
 * A habitat's coin bubble (owner, 7 November 2026): only a logo, never the amount: the painted basket at Christmas (`texture`,
 * `size` high), else the coin. A soft shadow under it; the amount shows when it is collected (MeadowScene.playIncomeCollect).
 */
export function coinBubble(scene: Phaser.Scene, x: number, y: number, texture = COIN_TEXTURE, size = 34): Phaser.GameObjects.Container {
  const icon = scene.add.image(0, 0, texture); icon.setScale(size / Math.max(icon.height, 1));
  const width = icon.displayWidth, shadow = scene.add.ellipse(0, size * .46, width * .7, size * .16, 0x2c3a1e, .22);
  return scene.add.container(x, y, [shadow, icon]).setSize(Math.max(width, 34), Math.max(size, 34));
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
