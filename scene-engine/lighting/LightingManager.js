// ═══════════════════════════════════════════════════════════════════════
// LIGHTING MANAGER — Gestor de iluminación 3D con presets e interpolación HSL
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  const PRESETS = {
    warm:        { ambient: 0xffaa66, ambInt: 0.6, dir: 0xffe0b2, dirInt: 0.8, fog: 0x2b150c },
    cold:        { ambient: 0x6699cc, ambInt: 0.4, dir: 0x99ccff, dirInt: 0.6, fog: 0x0a1420 },
    neon:        { ambient: 0xff00aa, ambInt: 0.7, dir: 0x00f0ff, dirInt: 1.0, fog: 0x14001a },
    dark:        { ambient: 0x222233, ambInt: 0.3, dir: 0x555577, dirInt: 0.4, fog: 0x05050a },
    moonlight:   { ambient: 0x334466, ambInt: 0.5, dir: 0x99bbee, dirInt: 0.7, fog: 0x0c101d },
    sunrise:     { ambient: 0xff7744, ambInt: 0.7, dir: 0xffcc66, dirInt: 0.9, fog: 0x260e0a },
    golden_hour: { ambient: 0xffa044, ambInt: 0.8, dir: 0xffd580, dirInt: 1.0, fog: 0x2b1b0a },
    dramatic:    { ambient: 0x111122, ambInt: 0.2, dir: 0xff2255, dirInt: 1.2, fog: 0x0a0204 }
  };

  class LightingManager {
    constructor(scene, eventBus) {
      this.scene = scene;
      this.eventBus = eventBus;

      this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      this.directionalLight.position.set(50, 100, 50);
      this.directionalLight.castShadow = true;
      this.directionalLight.shadow.mapSize.set(1024, 1024);
      this.directionalLight.shadow.camera.left = -160;
      this.directionalLight.shadow.camera.right = 160;
      this.directionalLight.shadow.camera.top = 160;
      this.directionalLight.shadow.camera.bottom = -160;
      this.fillLight = new THREE.DirectionalLight(0x7799cc, 0.18);
      this.fillLight.position.set(-70, 36, 40);
      this.rimLight = new THREE.DirectionalLight(0xb8d4ff, 0.6);
      this.rimLight.position.set(20, 70, -95);

      this.beamGroup = new THREE.Group();
      const beamMaterial = new THREE.MeshBasicMaterial({
        color: 0xffddaa, transparent: true, opacity: 0.0, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide
      });
      const beamGeometry = new THREE.ConeGeometry(28, 160, 20, 1, true);
      this.beams = [];
      for (const x of [-26, 0, 26]) {
        const beam = new THREE.Mesh(beamGeometry, beamMaterial.clone());
        beam.position.set(x, 58, -48);
        beam.rotation.x = Math.PI;
        this.beamGroup.add(beam);
        this.beams.push(beam);
      }

      this.scene.add(this.ambientLight);
      this.scene.add(this.directionalLight);
      this.scene.add(this.fillLight);
      this.scene.add(this.rimLight);
      this.scene.add(this.beamGroup);
      this._targetRig = null;
      this._pulse = 0;

      if (this.eventBus) {
        this.eventBus.on('LightingChange', data => this.setPreset(data.preset || 'moonlight', data.intensity));
        this.eventBus.on(global.SceneEventBus.Events.BEAT_DETECTED, data => this.pulse(data.intensity));
      }
    }

    setPreset(name, intensityFactor = 1.0) {
      const p = PRESETS[name] || PRESETS.moonlight;
      this.setCinematicRig({
        preset: name,
        keyColor: p.dir,
        keyIntensity: p.dirInt * intensityFactor,
        fillIntensity: p.ambInt * intensityFactor * 0.34,
        rimIntensity: p.dirInt * intensityFactor * 0.5,
        rimColor: p.dir,
        fogColor: p.fog,
        fogDensity: 0.003,
        shafts: name === 'sunrise' || name === 'golden_hour'
      }, true);
    }

    setCinematicRig(rig = {}, immediate = false) {
      const preset = PRESETS[rig.preset] || PRESETS.moonlight;
      this._targetRig = {
        ambientColor: rig.ambientColor || preset.ambient,
        ambientIntensity: Number.isFinite(rig.ambientIntensity) ? rig.ambientIntensity : preset.ambInt,
        keyColor: rig.keyColor || preset.dir,
        keyIntensity: Number.isFinite(rig.keyIntensity) ? rig.keyIntensity : preset.dirInt,
        fillColor: rig.fillColor || 0x7a93b8,
        fillIntensity: Number.isFinite(rig.fillIntensity) ? rig.fillIntensity : preset.ambInt * 0.28,
        rimColor: rig.rimColor || preset.dir,
        rimIntensity: Number.isFinite(rig.rimIntensity) ? rig.rimIntensity : preset.dirInt * 0.48,
        fogColor: rig.fogColor || preset.fog,
        fogDensity: Number.isFinite(rig.fogDensity) ? rig.fogDensity : 0.003,
        shafts: !!rig.shafts,
        silhouette: !!rig.silhouette
      };
      if (immediate) this._applyRig(1);
    }

    applyWorldState(forces, rig = {}, deltaTime = 0.016) {
      if (!this._targetRig) this.setCinematicRig(rig);
      const state = forces.globalState || {};
      const local = forces.localState || {};
      const base = this._targetRig;
      const light = Math.max(0.12, state.light || 0.5);
      base.keyIntensity = Math.max(0.12, (rig.keyIntensity || base.keyIntensity) * (0.38 + light * 0.9));
      base.ambientIntensity = Math.max(0.035, (rig.fillIntensity || base.ambientIntensity) * (0.24 + light * 0.58));
      base.fillIntensity = Math.max(0.02, (rig.fillIntensity || base.fillIntensity) * (0.3 + (state.hope || 0.4) * 0.6));
      base.rimIntensity = Math.max(0.08, (rig.rimIntensity || base.rimIntensity) * (0.45 + (forces.lightExpansion || light) * 0.72));
      base.fogDensity = Math.max(0.001, Math.min(0.018, Math.max(rig.fogDensity || 0, local.fogDensity || 0.003)));
      this._applyRig(1 - Math.exp(-deltaTime * 1.8));
    }

    _applyRig(alpha) {
      if (!this._targetRig) return;
      const target = this._targetRig;
      const blendColor = (light, color) => light.color.lerp(new THREE.Color(color), alpha);
      blendColor(this.ambientLight, target.ambientColor);
      blendColor(this.directionalLight, target.keyColor);
      blendColor(this.fillLight, target.fillColor);
      blendColor(this.rimLight, target.rimColor);
      this.ambientLight.intensity += (target.ambientIntensity - this.ambientLight.intensity) * alpha;
      this.directionalLight.intensity += (target.keyIntensity - this.directionalLight.intensity) * alpha;
      this.fillLight.intensity += (target.fillIntensity - this.fillLight.intensity) * alpha;
      this.rimLight.intensity += (target.rimIntensity - this.rimLight.intensity) * alpha;
      this.rimLight.position.set(-38, 55, -90);
      this.directionalLight.position.set(target.silhouette ? 70 : 45, target.silhouette ? 62 : 105, target.silhouette ? -70 : 45);

      if (!this.scene.fog) this.scene.fog = new THREE.FogExp2(target.fogColor, target.fogDensity);
      this.scene.fog.color.lerp(new THREE.Color(target.fogColor), alpha);
      this.scene.fog.density += (target.fogDensity - this.scene.fog.density) * alpha;

      for (let i = 0; i < this.beams.length; i++) {
        const beam = this.beams[i];
        beam.material.color.lerp(new THREE.Color(target.keyColor), alpha);
        const beamOpacity = target.shafts ? 0.035 + i * 0.012 : 0;
        beam.material.opacity += (beamOpacity - beam.material.opacity) * alpha;
        beam.visible = beam.material.opacity > 0.002;
      }
    }

    pulse(intensity) {
      this._pulse = Math.max(this._pulse, intensity * 0.14);
    }

    update(deltaTime) {
      this._pulse *= Math.exp(-deltaTime * 6);
      this.directionalLight.intensity += this._pulse;
      this._applyRig(1 - Math.exp(-deltaTime * 1.2));
    }

    dispose() {
      this.scene.remove(this.ambientLight);
      this.scene.remove(this.directionalLight);
      this.scene.remove(this.fillLight);
      this.scene.remove(this.rimLight);
      this.scene.remove(this.beamGroup);
      for (const beam of this.beams) {
        beam.geometry.dispose();
        beam.material.dispose();
      }
    }
  }

  global.SceneLightingManager = LightingManager;
})(typeof window !== 'undefined' ? window : globalThis);
