// SCENE RENDERER - Three.js renderer with lightweight bloom, vignette and focus-aware DOF.
(function (global) {
  'use strict';

  class SceneRenderer {
    constructor(canvas, eventBus, assetLibrary) {
      this.canvas = canvas;
      this.eventBus = eventBus;
      this.assets = assetLibrary;
      this.renderer = null;
      this.scene = null;
      this.camera = null;
      this.scenes = new Map();
      this.activeScene = null;
      this._postTarget = null;
      this._postScene = null;
      this._postCamera = null;
      this._postMaterial = null;
      this._focusTarget = new THREE.Vector3(0, 5, 0);
      this._audioBands = { bass: 0, mid: 0, high: 0 };
      if (this.eventBus) this.eventBus.on(global.SceneEventBus.Events.SCENE_CHANGED, data => {
        if (data && typeof data.scene === 'string') this.switchScene(data.scene);
      });
    }

    init() {
      if (this.renderer) { try { this.renderer.dispose(); } catch (_) {} }
      this._disposePostProcessing();
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
      this.camera.position.set(0, 40, 220);
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.shadowMap.enabled = true;
      if (THREE.PCFSoftShadowMap) this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if ('toneMapping' in this.renderer && THREE.ACESFilmicToneMapping) this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      if ('toneMappingExposure' in this.renderer) this.renderer.toneMappingExposure = 1.08;
      if ('outputColorSpace' in this.renderer && THREE.SRGBColorSpace) this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this._initPostProcessing();
      const sceneEntries = [...this.scenes.entries()];
      this.scenes.clear();
      for (const [name, factory] of sceneEntries) this.scenes.set(name, { factory, instance: factory(this.scene, this.assets) });
    }

    _initPostProcessing() {
      if (!THREE.WebGLRenderTarget || !THREE.DepthTexture) return;
      try {
        const size = new THREE.Vector2();
        this.renderer.getDrawingBufferSize(size);
        this._postTarget = new THREE.WebGLRenderTarget(size.x, size.y, { depthBuffer: true, stencilBuffer: false });
        this._postTarget.depthTexture = new THREE.DepthTexture(size.x, size.y);
        this._postTarget.depthTexture.type = THREE.UnsignedShortType;
        this._postMaterial = new THREE.ShaderMaterial({
          depthWrite: false,
          uniforms: {
            tScene: { value: this._postTarget.texture }, tDepth: { value: this._postTarget.depthTexture },
            resolution: { value: size.clone() }, focusDepth: { value: 0.985 }, audioEnergy: { value: 0 }
          },
          vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
          fragmentShader: `
            varying vec2 vUv;
            uniform sampler2D tScene;
            uniform sampler2D tDepth;
            uniform vec2 resolution;
            uniform float focusDepth;
            uniform float audioEnergy;
            vec3 sampleScene(vec2 uv) { return texture2D(tScene, clamp(uv, 0.001, 0.999)).rgb; }
            void main() {
              vec2 texel = 1.0 / resolution;
              float depth = texture2D(tDepth, vUv).x;
              float blur = clamp(abs(depth - focusDepth) * 38.0, 0.0, 0.62);
              vec3 sharp = sampleScene(vUv);
              vec3 soft = sharp * 0.26;
              soft += sampleScene(vUv + vec2(texel.x * 3.0, 0.0)) * 0.12;
              soft += sampleScene(vUv - vec2(texel.x * 3.0, 0.0)) * 0.12;
              soft += sampleScene(vUv + vec2(0.0, texel.y * 3.0)) * 0.12;
              soft += sampleScene(vUv - vec2(0.0, texel.y * 3.0)) * 0.12;
              soft += sampleScene(vUv + texel * 2.0) * 0.065;
              soft += sampleScene(vUv - texel * 2.0) * 0.065;
              soft += sampleScene(vUv + vec2(texel.x * 2.0, -texel.y * 2.0)) * 0.065;
              soft += sampleScene(vUv + vec2(-texel.x * 2.0, texel.y * 2.0)) * 0.065;
              vec3 color = mix(sharp, soft, blur);
              vec3 bloom = max(sharp - vec3(0.58), vec3(0.0));
              bloom += max(sampleScene(vUv + texel * 4.0) - vec3(0.66), vec3(0.0)) * 0.32;
              bloom += max(sampleScene(vUv - texel * 4.0) - vec3(0.66), vec3(0.0)) * 0.32;
              bloom += max(sampleScene(vUv + vec2(texel.x * 4.0, -texel.y * 4.0)) - vec3(0.66), vec3(0.0)) * 0.22;
              bloom += max(sampleScene(vUv + vec2(-texel.x * 4.0, texel.y * 4.0)) - vec3(0.66), vec3(0.0)) * 0.22;
              color += bloom * (0.32 + audioEnergy * 0.38);
              vec2 centered = vUv - 0.5;
              float vignette = smoothstep(0.78, 0.18, dot(centered, centered) * 2.05);
              color *= 0.72 + vignette * 0.28;
              gl_FragColor = vec4(color, 1.0);
            }
          `
        });
        this._postScene = new THREE.Scene();
        this._postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this._postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this._postMaterial));
      } catch (error) {
        console.warn('[SceneRenderer] Post-processing disabled:', error);
        this._disposePostProcessing();
      }
    }

    registerSceneFactory(name, factory) { this.scenes.set(name, { factory, instance: null }); }

    switchScene(name) {
      if (!this.scene) return;
      if (this.activeScene && this.activeScene.getName() === name) return;
      if (this.activeScene) this.activeScene.dispose();
      const entry = this.scenes.get(name) || this.scenes.get('forest');
      if (!entry) return;
      if (!entry.instance || !entry.instance.scene) entry.instance = entry.factory(this.scene, this.assets);
      this.activeScene = entry.instance;
      this.activeScene.build();
    }

    setFocusTarget(target) {
      if (target && target.isVector3) this._focusTarget.copy(target);
      else if (target && Number.isFinite(target.x) && Number.isFinite(target.y) && Number.isFinite(target.z)) this._focusTarget.set(target.x, target.y, target.z);
    }

    setAudioBands(bands = {}) { this._audioBands = { bass: bands.bass || 0, mid: bands.mid || 0, high: bands.high || 0 }; }

    render(deltaTime = 0.016, beatIntensity = 0) {
      if (!this.renderer || !this.scene || !this.camera) return;
      if (this.activeScene) this.activeScene.update(deltaTime, beatIntensity);
      if (!this._postTarget || !this._postMaterial) { this.renderer.render(this.scene, this.camera); return; }
      const focus = this._focusTarget.clone().project(this.camera);
      this._postMaterial.uniforms.focusDepth.value = Math.max(0.001, Math.min(0.999, focus.z * 0.5 + 0.5));
      this._postMaterial.uniforms.audioEnergy.value = Math.max(0, Math.min(1, this._audioBands.bass * 0.6 + this._audioBands.high * 0.4));
      this.renderer.setRenderTarget(this._postTarget);
      this.renderer.clear();
      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(null);
      this.renderer.render(this._postScene, this._postCamera);
    }

    resize(width, height) {
      if (!this.renderer || !this.camera) return;
      this.renderer.setSize(width, height);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      if (this._postTarget && this._postMaterial) {
        const size = new THREE.Vector2(); this.renderer.getDrawingBufferSize(size);
        this._postTarget.setSize(size.x, size.y);
        this._postMaterial.uniforms.resolution.value.copy(size);
      }
    }

    _disposePostProcessing() {
      if (this._postScene) this._postScene.traverse(object => { if (object.geometry) object.geometry.dispose(); });
      if (this._postMaterial) this._postMaterial.dispose();
      if (this._postTarget) this._postTarget.dispose();
      this._postTarget = null; this._postScene = null; this._postCamera = null; this._postMaterial = null;
    }

    dispose() {
      if (this.activeScene) { this.activeScene.dispose(); this.activeScene = null; }
      this._disposePostProcessing();
      if (this.renderer) { try { this.renderer.dispose(); } catch (_) {} this.renderer = null; }
      this.scene = null; this.camera = null;
    }
  }

  global.SceneRenderer = SceneRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
