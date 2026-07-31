// ═══════════════════════════════════════════════════════════════════════
// CAMERA DIRECTOR — Director de cámara con conceptos cinematográficos
// Shots, Sequences, Transitions, Targets, Orbit, Shake, Zoom
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  const SHOTS = Object.freeze({
    WIDE:           { distance: 220, height: 40, fov: 60 },
    MEDIUM:         { distance: 120, height: 25, fov: 50 },
    CLOSE_UP:       { distance: 60,  height: 15, fov: 40 },
    EXTREME_CLOSE:  { distance: 30,  height: 10, fov: 35 },
    BIRDS_EYE:      { distance: 280, height: 200, fov: 70 },
    LOW_ANGLE:      { distance: 100, height: 5,  fov: 55 }
  });

  class CameraDirector {
    constructor(camera, eventBus) {
      this.camera = camera;
      this.eventBus = eventBus;
      this.targetPos = new THREE.Vector3(0, 5, 0);
      this._desiredTarget = this.targetPos.clone();
      this.rotAngle = 0;
      this.currentDist = 220;
      this.currentHeight = 40;
      this.targetDist = 220;
      this.targetHeight = 40;
      this.currentFov = 60;
      this.targetFov = 60;
      this.movement = 'static_breath';
      this.targetRole = 'protagonist';
      this.breath = 0.15;
      this.orbitDirection = 1;
      this._shotTime = 0;
      this.shakeIntensity = 0;

      if (this.eventBus) {
        this.eventBus.on('CameraChange', data => this.setShot(data));
        this.eventBus.on(global.SceneEventBus.Events.BEAT_DETECTED, data => this.pulse(data.intensity));
      }
    }

    setShot(config, legacyMovement) {
      const source = typeof config === 'string' ? { shot: config, movement: legacyMovement } : (config || {});
      const s = SHOTS[source.shot] || SHOTS.WIDE;
      this.targetDist = s.distance;
      this.targetHeight = s.height;
      this.targetFov = s.fov;
      if (Number.isFinite(source.distance)) this.targetDist = source.distance;
      if (Number.isFinite(source.height)) this.targetHeight = source.height;
      if (Number.isFinite(source.fov)) this.targetFov = source.fov;
      this.movement = source.movement || 'static_breath';
      this.targetRole = source.targetRole || 'protagonist';
      this.breath = Number.isFinite(source.breath) ? source.breath : 0.15;
      this.orbitDirection = source.orbitDirection || 1;
      this._shotTime = 0;

      if (this.movement === 'shake') {
        this.shakeIntensity = 0.8;
      }
    }

    setFocusTarget(target) {
      if (!target) return;
      if (target.isVector3) this._desiredTarget.copy(target);
      else if (Number.isFinite(target.x) && Number.isFinite(target.y) && Number.isFinite(target.z)) {
        this._desiredTarget.set(target.x, target.y, target.z);
      }
    }

    pulse(intensity) {
      if (this.movement === 'crane_rise' || this.movement === 'arc') {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity * 0.12);
      }
    }

    update(deltaTime) {
      if (!this.camera) return;

      this._shotTime += deltaTime;
      const ease = 1 - Math.exp(-deltaTime * 1.75);
      this.targetPos.lerp(this._desiredTarget, ease);

      let desiredDist = this.targetDist;
      let desiredHeight = this.targetHeight;
      let desiredAngle = this.rotAngle;
      const pace = Math.max(0.035, Math.min(0.18, 0.045 + this.breath * 0.11));

      switch (this.movement) {
        case 'dolly_in':
          desiredDist = this.targetDist * (0.76 + Math.exp(-this._shotTime * 0.16) * 0.24);
          break;
        case 'dolly_out':
          desiredDist = this.targetDist * (0.76 + Math.min(0.24, this._shotTime * 0.018));
          break;
        case 'lateral_track':
          desiredAngle += Math.sin(this._shotTime * pace) * 0.26 * this.orbitDirection;
          break;
        case 'arc':
          desiredAngle += deltaTime * 0.15 * this.orbitDirection;
          break;
        case 'crane_rise':
          desiredHeight += Math.min(32, this._shotTime * 3.4);
          desiredAngle += deltaTime * 0.045 * this.orbitDirection;
          break;
        case 'follow':
          desiredAngle += Math.sin(this._shotTime * pace) * 0.12 * this.orbitDirection;
          break;
        case 'static_breath':
        default:
          desiredDist += Math.sin(this._shotTime * 0.48) * this.breath * 2.2;
          desiredHeight += Math.sin(this._shotTime * 0.36) * this.breath * 0.8;
          break;
      }

      this.rotAngle += (desiredAngle - this.rotAngle) * ease;
      this.currentDist += (desiredDist - this.currentDist) * ease;
      this.currentHeight += (desiredHeight - this.currentHeight) * ease;
      this.currentFov += (this.targetFov - this.currentFov) * ease;

      let offsetX = 0, offsetY = 0;
      if (this.shakeIntensity > 0.01) {
        offsetX = Math.sin(this._shotTime * 42) * this.shakeIntensity;
        offsetY = Math.cos(this._shotTime * 37) * this.shakeIntensity;
        this.shakeIntensity *= Math.exp(-deltaTime * 6);
      }

      this.camera.position.x = this.targetPos.x + Math.sin(this.rotAngle) * this.currentDist + offsetX;
      this.camera.position.z = this.targetPos.z + Math.cos(this.rotAngle) * this.currentDist;
      this.camera.position.y = this.targetPos.y + this.currentHeight + offsetY;

      this.camera.lookAt(this.targetPos);
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }

    dispose() {}
  }

  CameraDirector.SHOTS = SHOTS;
  global.SceneCameraDirector = CameraDirector;
})(typeof window !== 'undefined' ? window : globalThis);
