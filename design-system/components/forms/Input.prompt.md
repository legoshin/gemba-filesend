# Input

Labelled text field. 40px tall, 8px radius, white surface with a hairline ring and soft shadow; focus/validation swaps the ring colour.

```jsx
<Input label="Beneficiary name" placeholder="e.g. Tech Corp Ltd" />
<Input label="IBAN" value="GB29…" hint="Invalid checksum" state="error" />
```

`state`: `default` · `error` · `success` · `disabled`. `prefix` / `suffix` accept nodes (usually `<Icon />`). Pairs with `Checkbox`, `Radio`, `Toggle` in `forms/`.
