# Icon

Renders any of the 1,167 Gemba line icons (Untitled UI set) from the bundled data map. Single-colour — paints with `currentColor`, so set `color` on the element or a parent.

```jsx
<Icon name="BankNote01" size={20} />
<span style={{ color: 'var(--gemba-success)' }}><Icon name="CheckCircle" size={24} /></span>
```

`name` must be a PascalCase icon name (see `Icon.d.ts` for the full index). `size` defaults to 24. Common banking glyphs: `BankNote01`, `CreditCard01`, `Coins01`, `Wallet01`, `SwitchHorizontal01`, `CurrencyPound`, `Receipt`, `Safe`, `Shield01`.
