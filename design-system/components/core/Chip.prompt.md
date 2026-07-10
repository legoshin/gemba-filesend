# Chip

Small status pill used across transaction tables, card lists and account rows. 20px tall, pill radius, 10px bold label on an 8%-tint fill.

```jsx
<Chip style2="success" text1="RECEIVED" prefixIcon={false} />
<Chip style2="critical" text1="REJECTED" prefixIcon={false} />
```

`style2`: `neutral` · `accent` · `success` · `warning` · `critical`. Set `prefixIcon={false}` for label-only (the common table style); pass `icon` for a custom leading glyph.
