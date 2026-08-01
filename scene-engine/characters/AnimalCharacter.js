(function (global) {
  'use strict';

  class AnimalCharacter {
    constructor(scene, assets) {
      this.scene = scene;
      this.assets = assets;
      this.group = new THREE.Group();
      this.scene.add(this.group);
      this.position = new THREE.Vector3();
    }

    build() {
      const fur = new THREE.MeshStandardMaterial({ color: 0x6b3f27, roughness: 0.95 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x17120f });
      const body = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 8), fur);
      body.scale.set(1.5, 0.8, 0.8);
      body.position.y = 4;
      this.group.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 8), fur);
      head.position.set(-3, 7, 0);
      this.group.add(head);

      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(1, 3, 5), dark);
        ear.position.set(-4, 9, side * 1.6);
        this.group.add(ear);
      }
      this.group.userData.focus = new THREE.Vector3(-3, 7, 0);
    }

    setPosition(x, y, z) { this.group.position.set(x, y, z); this.position.set(x, y, z); }
    setAnimation() {}
    setExpression() {}
    setTargetPosition(x, y, z) { this.group.position.lerp(new THREE.Vector3(x, y, z), 0.08); }
    setGazeAt() {}
    getFocusPoint() { return this.group.localToWorld(this.group.userData.focus.clone()); }
    update() {}
    dispose() { this.scene.remove(this.group); this.group.clear(); }
  }

  global.AnimalCharacter = AnimalCharacter;
})(typeof window !== 'undefined' ? window : globalThis);
