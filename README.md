# PF1e Armor Soak Pool

Version 1.0.1 for Foundry VTT v12 build 331 and Pathfinder 1e system v11.11.

PF1e Armor Soak Pool adds a manual armor-based **Soak** pool to PF1e actors. It is designed for tables using Wounds and Vigor where Soak acts like a temporary shield layer that can absorb damage before Vigor or Wounds when the GM or player chooses to use it.

## What the Module Automates

- Calculates maximum Soak from worn armor and natural armor.
- Stores current and maximum Soak on actor flags.
- Displays a shield-style Soak panel on actor sheets.
- Refills Soak at the start of an actor's combat turn by default.
- Provides a manual damage dialog from the actor sheet and public API.
- Posts optional chat cards for damage, refills, adjustments, and recalculations.
- Provides GM tools to recalculate, refill, clear, export, import, and reset Soak data.

## What the Module Does Not Automate

This module does not automate attack resolution. It does not determine whether an attack hit Touch AC, full AC, or missed. It does not automatically confirm critical hits. It does not duplicate DR, resistance, vulnerability, immunity, or hardness handling.

The optional experimental damage intercept setting attempts to patch `Actor.applyDamage` when that method exists, but it is disabled by default so it does not interfere with Wounds/Vigor or other damage automation modules.

## Soak Formula

Maximum Soak is calculated as:

```text
Maximum Soak = Armor Item Soak + Natural Armor Soak
```

### Armor Item Soak

Armor Item Soak uses worn armor items only. It excludes shields and non-armor bonuses.

```text
Light Armor:  armor AC bonus × 1
Medium Armor: armor AC bonus × 2
Heavy Armor:  armor AC bonus × 3
```

The armor item's enhancement bonus is included when it is stored on a recognized PF1e armor data path.

### Natural Armor Soak

Natural armor is calculated separately and then added to worn armor soak.

```text
Natural Armor Soak = max(floor(Natural Armor / 2), 1) × Hit Dice
```

The natural armor portion only applies when the actor has a natural armor bonus greater than 0.

## Armor Focus Feats

When the Armor Focus setting is enabled, the module detects exact feat names:

- Armor Focus
- Improved Armor Focus
- Advanced Armor Focus

The feats replace each other rather than stacking.

```text
Armor Focus:          +1 armor multiplier step
Improved Armor Focus: +2 armor multiplier steps
Advanced Armor Focus: +3 armor multiplier steps
```

By default, these feats only modify worn armor soak. There is an optional setting to let the bonus affect natural armor soak as a house rule.

## Campaign Touch AC Rules Text

The module includes this rules reference for your campaign, but does not automate it:

- Weapon and natural attacks generally need only hit Touch AC.
- If the attack roll hits Touch AC but does not beat full AC, the defender may apply the damage to Soak.
- If the attack roll beats full AC, damage is applied normally and does not go to Soak.
- Touch abilities only interact with Soak if the attack roll is above 10 but at or below the defender's Touch AC.
- Creatures with Touch AC lower than 10 do not benefit from Soak against touch abilities.
- Critical hits only confirm if the confirmation roll beats full normal AC.

## Damage Workflow

Use the **Damage** button on the actor sheet's Armor Soak panel, or call the API macro shown below.

The dialog offers:

- Apply to Soak
- Apply to Vigor/Wounds Normally
- Split Damage
- Cancel

The module assumes DR, resistance, vulnerability, and similar mitigation have already been resolved before the dialog is opened.

## Combat Refill

By default, Soak refills to maximum at the start of the actor's combat turn.

Settings allow:

- Start of turn
- End of turn
- Manual only

The refill hook is GM-only and records a combat-specific refill key to avoid double-triggering on combat tracker updates.

## Token Bars

Soak is stored in actor flags. Foundry token resource bars work best with real actor system paths. Because this module avoids overwriting PF1e system data, token bar integration is documented as a safe fallback rather than forced. The actor sheet panel and chat cards remain the primary display.

## Installation

1. Extract the `armor-soak-pool` folder into your Foundry user data `Data/modules/` directory.
2. Restart Foundry.
3. Open your PF1e world.
4. Enable **PF1e Armor Soak Pool** in Manage Modules.
5. Open Configure Settings and review the Armor Soak Pool settings.

## GitHub Release Setup

For remote installation, create a GitHub release tagged `1.0.1` and upload these exact assets:

```text
module.json
PF1e-Armor-Soak-Pool-v1.0.1.zip
```

Use this manifest URL in Foundry:

```text
https://github.com/Antpoizen/armor-soak-pool/releases/latest/download/module.json
```

## Example Macros

Open the damage dialog for the selected token:

```javascript
const token = canvas.tokens.controlled[0];
if (!token) return ui.notifications.warn("Select a token first.");
game.modules.get("armor-soak-pool").api.openDamageDialog(token.actor, 25);
```

Refill Soak for the selected token:

```javascript
const token = canvas.tokens.controlled[0];
if (!token) return ui.notifications.warn("Select a token first.");
await game.modules.get("armor-soak-pool").api.refillSoak(token.actor, { chat: true });
```

Recalculate all selected tokens:

```javascript
const api = game.modules.get("armor-soak-pool").api;
for (const token of canvas.tokens.controlled) {
  await api.recalculateSoak(token.actor, { preserveRatio: true, chat: false });
}
```

## Public API

The module exposes:

```javascript
game.modules.get("armor-soak-pool").api
```

Available methods:

```javascript
getSoak(actor)
getMaxSoak(actor)
getSoakBreakdown(actor)
calculateMaxSoak(actor)
recalculateSoak(actor, options)
setSoak(actor, value, options)
adjustSoak(actor, delta, options)
refillSoak(actor, options)
applyDamageToSoak(actor, amount, options)
openDamageDialog(actor, amount, options)
isSoakEnabled(actor)
setSoakEnabled(actor, enabled)
```

Hooks fired:

```javascript
armorSoakPool.calculated
armorSoakPool.refilled
armorSoakPool.damageApplied
armorSoakPool.adjusted
armorSoakPool.enabledChanged
```

## Known Limitations

- Actual PF1e data paths for armor values can vary by item type, migration history, or third-party modules. The module checks several common PF1e-style paths and ignores invalid armor items safely.
- The module is manual-first. Automatic attack resolution is intentionally not included.
- Experimental damage interception is disabled by default and should only be enabled after testing with your Wounds/Vigor and mitigation modules.
- Token bar support is not forced because the module stores data in flags rather than PF1e system resource paths.
- This package was statically checked and built for Foundry VTT v12 build 331 and PF1e v11.11, but it still needs in-world testing in your Foundry installation.

## Testing Checklist

- Open a PC sheet and confirm the Armor Soak panel appears.
- Open an NPC/monster sheet and confirm the panel appears.
- Equip light, medium, and heavy armor and recalculate.
- Add armor enhancement values and confirm the soak total updates where PF1e exposes them.
- Add natural armor and confirm natural soak calculates separately.
- Add Armor Focus feats and confirm multipliers replace rather than stack.
- Start combat and confirm Soak refills once at the configured timing.
- Use the Damage button and confirm Apply to Soak, Split, Normal, and Cancel behave correctly.
- Test linked and unlinked token actors.
- Test with the Wounds/Vigor and mitigation modules enabled.
- Enable experimental damage intercept only in a backup world and verify there are no conflicts.
