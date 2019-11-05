/**
 * The Dungeons & Dragons 5th Edition game system for Foundry Virtual Tabletop
 * Author: Atropos
 * Software License: GNU GPLv3
 * Content License: https://media.wizards.com/2016/downloads/DND/SRD-OGL_V5.1.pdf
 * Repository: https://gitlab.com/foundrynet/dnd5e
 * Issue Tracker: https://gitlab.com/foundrynet/dnd5e/issues
 */

// Import Modules
import { DND5E } from "./module/config.js";
import { registerSystemSettings } from "./module/settings.js";
import { preloadHandlebarsTemplates } from "./module/templates.js";
import { _getInitiativeFormula, addChatMessageContextOptions } from "./module/combat.js";
import { measureDistance, getBarAttribute } from "./module/canvas.js";
import { highlightCriticalSuccessFailure } from "./module/dice.js";
import { Actor5e } from "./module/actor/entity.js";
import { ActorSheet5eCharacter } from "./module/actor/sheets/character.js";
import { Item5e } from "./module/item/entity.js";
import { ItemSheet5e } from "./module/item/sheets/base.js";
import { ActorSheet5eNPC } from "./module/actor/sheets/npc.js";
import { migrateSystem } from "./module/migration.js";


/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", async function() {
  console.log(`D&D5e | Initializing Dungeons & Dragons 5th Edition System\n${DND5E.ASCII}`);

  // Record Configuration Values
  CONFIG.DND5E = DND5E;
  CONFIG.Actor.entityClass = Actor5e;
  CONFIG.Item.entityClass = Item5e;

  // Register System Settings
  registerSystemSettings();

  // Preload Handlebars Templates
  await preloadHandlebarsTemplates();

  // Patch Core Functions
  Combat.prototype._getInitiativeFormula = _getInitiativeFormula;

  // TODO - suppress the "backpack" type item. Remove this later
  let backpackIndex = game.system.entityTypes.Item.findIndex(t => t === "backpack");
  if ( backpackIndex !== -1 ) game.system.entityTypes.Item.splice(backpackIndex, 1);

  // Maybe apply a system migration
  const NEEDS_MIGRATION_VERSION = 0.7;
  let needMigration = game.settings.get("dnd5e", "systemMigrationVersion") < NEEDS_MIGRATION_VERSION;
  needMigration = true;
  if ( needMigration && game.user.isGM ) await migrateSystem();
});


/* -------------------------------------------- */
/*  Foundry VTT Setup                           */
/* -------------------------------------------- */

Hooks.once("setup", function() {

  // Localize CONFIG objects once up-front
  const toLocalize = ["abilities", "distanceUnits", "skills", "targetTypes", "timePeriods"];
  for ( let o of toLocalize ) {
    CONFIG.DND5E[o] = Object.fromEntries(Object.entries(CONFIG.DND5E[o]).map(e => {
      e[1] = game.i18n.localize(e[1]);
      return e;
    }));
  }
});


/* -------------------------------------------- */

Hooks.once("ready", function() {
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("dnd5e", ActorSheet5eCharacter, { types: ["character"], makeDefault: true });
  Actors.registerSheet("dnd5e", ActorSheet5eNPC, { types: ["npc"], makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("dnd5e", ItemSheet5e, {makeDefault: true});
});


/* -------------------------------------------- */
/*  Canvas Initialization                       */
/* -------------------------------------------- */

Hooks.on("canvasInit", function() {

  // Extend Diagonal Measurement
  canvas.grid.diagonalRule = game.settings.get("dnd5e", "diagonalMovement");
  SquareGrid.prototype.measureDistance = measureDistance;

  // Extend Token Resource Bars
  Token.prototype.getBarAttribute = getBarAttribute;
});


/* -------------------------------------------- */
/*  Other Hooks                                 */
/* -------------------------------------------- */

Hooks.on("renderChatMessage", highlightCriticalSuccessFailure);
Hooks.on("getChatLogEntryContext", addChatMessageContextOptions);
Hooks.on("renderChatLog", (app, html, data) => Item5e.chatListeners(html));
