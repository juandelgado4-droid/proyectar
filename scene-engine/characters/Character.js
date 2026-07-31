// ═══════════════════════════════════════════════════════════════════════
// CHARACTER — Clase base abstracta para personajes 3D procedurales
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class Character {
    /**
     * @param {THREE.Scene} threeScene
     * @param {SceneAssetLibrary} assetLibrary
     */
    constructor(threeScene, assetLibrary) {
      this.scene = threeScene;
      this.assets = assetLibrary;
      this.group = new THREE.Group();
      this.currentAnimation = 'idle';
      this.animTime = 0;
      this.anchorPosition = new THREE.Vector3();
      this.targetPosition = new THREE.Vector3();
      this.gazeTarget = null;
      this.expression = 'neutral';
      this.expressionIntensity = 0.4;
      this.bodyParts = {};
      this.scene.add(this.group);
    }

    build() {
      throw new Error('Character.build() must be implemented');
    }

    setAnimation(name) {
      const next = name || 'idle';
      if (next !== this.currentAnimation) {
        this.currentAnimation = next;
        this.animTime = 0;
      }
    }

    setPosition(x, y, z) {
      this.anchorPosition.set(x, y, z);
      this.targetPosition.set(x, y, z);
      this.group.position.set(x, y, z);
    }

    setTargetPosition(x, y, z) {
      this.targetPosition.set(x, y, z);
    }

    setGazeAt(target) {
      this.gazeTarget = target && target.clone ? target.clone() : target;
    }

    setExpression(name, intensity = 0.4) {
      this.expression = name || 'neutral';
      this.expressionIntensity = Math.max(0, Math.min(1, intensity));
    }

    setBodyParts(parts) {
      this.bodyParts = parts || {};
    }

    getFocusPoint() {
      return new THREE.Vector3(this.group.position.x, this.group.position.y + 10, this.group.position.z);
    }

    setRotation(x, y, z) {
      this.group.rotation.set(x, y, z);
    }

    update(deltaTime) {
      this.animTime += deltaTime;
      const movementEase = 1 - Math.exp(-deltaTime * 1.8);
      this.anchorPosition.lerp(this.targetPosition, movementEase);
      this.group.position.copy(this.anchorPosition);
      if (this.gazeTarget) {
        const targetAngle = Math.atan2(this.gazeTarget.x - this.group.position.x, this.gazeTarget.z - this.group.position.z);
        let delta = targetAngle - this.group.rotation.y;
        delta = Math.atan2(Math.sin(delta), Math.cos(delta));
        this.group.rotation.y += delta * (1 - Math.exp(-deltaTime * 2.6));
      }
      this._applyAnimation(this.currentAnimation, this.animTime);
    }

    _applyAnimation(name, time) {
      const breath = Math.sin(time * 1.45) * (0.045 + this.expressionIntensity * 0.035);
      const torso = this.bodyParts.torso;
      const head = this.bodyParts.head;
      const leftArm = this.bodyParts.leftArm;
      const rightArm = this.bodyParts.rightArm;
      if (torso) torso.scale.y = 1 + breath;
      if (head) {
        head.position.y = (head.userData.baseY || head.position.y) + breath * 1.8;
        head.rotation.y = this.expression === 'withdraw' ? 0.28 : 0;
      }
      const armSwing = Math.sin(time * 2.2) * 0.28;

      switch (name) {
        case 'dance':
          this.group.rotation.z = Math.sin(time * 4) * 0.15;
          if (leftArm) leftArm.rotation.x = armSwing * 1.8;
          if (rightArm) rightArm.rotation.x = -armSwing * 1.8;
          break;
        case 'walk':
          if (leftArm) leftArm.rotation.x = armSwing;
          if (rightArm) rightArm.rotation.x = -armSwing;
          break;
        case 'hug':
        case 'reach':
          if (leftArm) leftArm.rotation.x = -0.9 + Math.sin(time * 1.6) * 0.08;
          if (rightArm) rightArm.rotation.x = -0.9 + Math.sin(time * 1.6 + 0.4) * 0.08;
          break;
        case 'turn_away':
          this.group.rotation.y += Math.sin(time * 0.6) * 0.01;
          break;
        case 'idle':
        default:
          if (leftArm) leftArm.rotation.z = Math.sin(time * 0.9) * 0.035;
          if (rightArm) rightArm.rotation.z = -Math.sin(time * 0.9) * 0.035;
          break;
      }
    }

    dispose() {
      if (this.group) {
        this.scene.remove(this.group);
        this.group.clear();
      }
    }
  }

  global.SceneCharacter = Character;
})(typeof window !== 'undefined' ? window : globalThis);
