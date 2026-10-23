import Phaser from 'phaser';
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create(): void {
    this.add.rectangle(195, 422, 390, 844, 0x83ae63);
    this.add.rectangle(195, 460, 340, 520, 0x9dc778).setStrokeStyle(3, 0x628a49);
    this.add.text(195, 90, 'Prairie de lapins', {fontFamily: 'Arial', fontSize: '28px', color: '#203b20'}).setOrigin(0.5);
    this.add.text(195, 370, 'Socle prêt\nSimulation indépendante\nInterface jouable à venir', {
      fontFamily: 'Arial', fontSize: '19px', color: '#203b20', align: 'center', lineSpacing: 10,
    }).setOrigin(0.5);
  }
}
