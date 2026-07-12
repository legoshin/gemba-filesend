# PrimaryButton / SecondaryButton / TertiaryButton / GhostButton

The four Gemba button ranks. Primary = solid ink (`#283349`) with white label; Secondary = subdued grey fill; Tertiary = lighter fill; Ghost = transparent. Use Primary for the single main action per view ("Send money"), the others for supporting actions.

```jsx
<PrimaryButton buttonLabel="Send money" showPrefix={false} showSuffix={false} />
<SecondaryButton buttonLabel="Add account" showPrefix={false} showSuffix={false} />
<GhostButton buttonLabel="Cancel" showPrefix={false} showSuffix={false} />
```

Variants via `style2`: `"default"` (24px pill), `"square"` (8px radius), `"small"` (32px tall pill), `"small square"`. Toggle icons with `showPrefix` / `showSuffix`; pass your own with `prefixIcon` / `suffixIcon` (defaults to an arrow-circle glyph).
