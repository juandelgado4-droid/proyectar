// ═══════════════════════════════════════════════════════════════════════
// CHARACTER COMPOSER — Ensamblador de Actores 3D y Lenguaje Corporal
// ═══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  class CharacterComposer {
    constructor(scene, assetLibrary, eventBus = null) {
      this.scene = scene;
      this.assets = assetLibrary;
      this.eventBus = eventBus;
      this.activeCharacters = [];
      this.byRole = new Map();
      this._direction = {};

      if (this.eventBus) {
        this.eventBus.on(global.SceneEventBus.Events.ANIMATION_STARTED, data => {
          this._direction = { ...this._direction, ...(data || {}) };
        });
      }
    }

    compose(characterSpec = {}, seed = 1) {
      this.dispose();
      const cast = characterSpec.cast && characterSpec.cast.length ? characterSpec.cast : [
        { id: 'actor_1', role: 'protagonist', species: 'human', style: 'reflective' }
      ];
      const classes = { human: global.HumanCharacter, skeleton: global.SkeletonCharacter, robot: global.RobotCharacter };

      cast.forEach((actor, index) => {
        const CharacterType = classes[actor.species] || global.HumanCharacter;
        const character = new CharacterType(this.scene, this.assets);
        character.build();
        const x = cast.length === 1 ? 0 : (index === 0 ? -10 : 10);
        character.setPosition(x, 0, index === 0 ? 0 : -3);
        character.setAnimation('idle');
        character.setExpression(actor.style || 'reflective', 0.35);
        character.role = actor.role || `actor_${index + 1}`;
        this.activeCharacters.push(character);
        this.byRole.set(character.role, character);
      });
      this._direction = { ...characterSpec };
    }

    applyDirection(direction = {}, forces = {}, deltaTime = 0.016, progress = 0) {
      this._direction = { ...this._direction, ...direction };
      const protagonist = this.byRole.get('protagonist') || this.activeCharacters[0];
      const companion = this.byRole.get('companion') || this.activeCharacters[1];
      if (!protagonist) return;
      const behavior = this._direction.behavior || 'observe';
      const intensity = this._direction.intensity || 0.4;
      protagonist.setExpression(this._direction.emotion || 'neutral', intensity);

      if (!companion) {
        protagonist.setTargetPosition(0, 0, behavior === 'withdraw' ? -8 : 0);
        protagonist.setAnimation(behavior === 'confront' ? 'reach' : 'idle');
        return;
      }

      companion.setExpression(this._direction.emotion || 'neutral', intensity * 0.75);
      const targetDistances = { approach: 4.8, withdraw: 28, confront: 6.5, release: 22, observe: 15 };
      const distance = targetDistances[behavior] || 15;
      const centered = behavior === 'approach' || behavior === 'confront';
      protagonist.setTargetPosition(centered ? -distance * 0.5 : -distance * 0.55, 0, 0);
      companion.setTargetPosition(centered ? distance * 0.5 : distance * 0.55, 0, behavior === 'withdraw' ? -8 : -3);
      protagonist.setGazeAt(companion.getFocusPoint());
      companion.setGazeAt(protagonist.getFocusPoint());
      protagonist.setAnimation(behavior === 'approach' ? 'walk' : behavior === 'confront' ? 'reach' : 'idle');
      companion.setAnimation(behavior === 'release' ? 'turn_away' : behavior === 'approach' ? 'walk' : 'idle');
    }

    getFocusAnchor(role = 'protagonist') {
      const character = this.byRole.get(role) || this.byRole.get('protagonist') || this.activeCharacters[0];
      return character ? character.getFocusPoint() : null;
    }

    update(deltaTime) {
      for (const char of this.activeCharacters) {
        char.update(deltaTime);
      }
    }

    dispose() {
      for (const char of this.activeCharacters) {
        char.dispose();
      }
      this.activeCharacters.length = 0;
      this.byRole.clear();
    }
  }

  global.SceneCharacterComposer = CharacterComposer;
})(typeof window !== 'undefined' ? window : globalThis);
