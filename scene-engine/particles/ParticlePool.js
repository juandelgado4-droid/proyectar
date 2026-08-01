// ═══════════════════════════════════════════════════════════════════════
// PARTICLE POOL — Pool manager central de partículas 3D
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class ParticlePool {
    constructor(scene, eventBus, maxParticles = 400) {
      this.scene = scene;
      this.eventBus = eventBus;
      this.maxParticles = maxParticles;
      this.activeTypes = new Map();
      this.registeredTypes = new Map();

      // Points mesh
      const geo = new THREE.BufferGeometry();
      this.positions = new Float32Array(maxParticles * 3);
      this.colors = new Float32Array(maxParticles * 3);
      this.sizes = new Float32Array(maxParticles);

      geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

      const mat = new THREE.PointsMaterial({
        size: 3,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false
      });

      this.pointsMesh = new THREE.Points(geo, mat);
      this.scene.add(this.pointsMesh);

      // Particle instances tracking
      this.particles = [];
      for (let i = 0; i < maxParticles; i++) {
        this.particles.push({
          id: i,
          active: false,
          type: null,
          x: 0, y: 0, z: 0,
          vx: 0, vy: 0, vz: 0,
          life: 0, maxLife: 1,
          r: 1, g: 1, b: 1, size: 2
        });
      }

      if (this.eventBus) {
        this.eventBus.on(global.SceneEventBus.Events.PARTICLE_STARTED, data => this._handleParticleEvent(data));
        this.eventBus.on(global.SceneEventBus.Events.BEAT_DETECTED, data => this.pulse(data.intensity));
      }
    }

    registerType(name, instance) {
      this.registeredTypes.set(name, instance);
    }

    activate(typeName, config = {}) {
      this.activeTypes.set(typeName, config);
    }

    deactivate(typeName) {
      this.activeTypes.delete(typeName);
    }

    deactivateAll() {
      this.activeTypes.clear();
      for (const p of this.particles) {
        p.active = false;
      }
    }

    _handleParticleEvent(data) {
      if (!data || !data.configs) return;
      this.activeTypes.clear();
      for (const cfg of data.configs) {
        this.activate(cfg.type, cfg);
      }
    }

    pulse(intensity) {
      // Spawn extra particles on beat
      for (const [typeName, config] of this.activeTypes) {
        const typeImpl = this.registeredTypes.get(typeName);
        if (typeImpl) {
          for (let i = 0; i < 5; i++) {
            const p = this._getInactiveParticle();
            if (p) typeImpl.spawn(p, config);
          }
        }
      }
    }

    _getInactiveParticle() {
      return this.particles.find(p => !p.active) || null;
    }

    update(deltaTime) {
      // Spawn new active particles per frame
      for (const [typeName, config] of this.activeTypes) {
        const typeImpl = this.registeredTypes.get(typeName);
        const spawnChance = 0.18 + Math.min(0.72, (config.intensity || 0.5) * 0.62);
        if (typeImpl && Math.random() < spawnChance) {
          const p = this._getInactiveParticle();
          if (p) typeImpl.spawn(p, config);
        }
      }

      // Update existing particles
      const posAttr = this.pointsMesh.geometry.attributes.position;
      const colAttr = this.pointsMesh.geometry.attributes.color;

      for (let i = 0; i < this.maxParticles; i++) {
        const p = this.particles[i];
        if (p.active) {
          const typeImpl = this.registeredTypes.get(p.type);
          if (typeImpl) {
            typeImpl.update(p, deltaTime);
          } else {
            p.life -= deltaTime;
            p.y += p.vy * deltaTime;
          }

          if (p.life <= 0) {
            p.active = false;
          }

          posAttr.setXYZ(i, p.x, p.y, p.z);
          colAttr.setXYZ(i, p.r, p.g, p.b);
        } else {
          posAttr.setXYZ(i, 0, -9999, 0); // Hide inactive
        }
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    }

    dispose() {
      this.scene.remove(this.pointsMesh);
      this.pointsMesh.geometry.dispose();
      this.pointsMesh.material.dispose();
    }
  }

  global.SceneParticlePool = ParticlePool;
})(typeof window !== 'undefined' ? window : globalThis);
