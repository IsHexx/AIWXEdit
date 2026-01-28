# Code highlight fixture

Use this fixture to manually verify that code blocks have rich token coloring (keywords/strings/numbers/comments/types, etc.).

1. Open this file in Obsidian.
2. Use AIWXEdit to preview.
3. Switch “代码高亮” between themes (GitHub / Atom One Dark / Dracula).
4. Confirm that background + more token types change (not only a few colors).

```ts
// comment + keyword + type + string + number + regexp
export class Greeter {
  constructor(private readonly name: string) {}

  greet(times = 2): string {
    const msg = `Hello, ${this.name}!`
    const re = /hello/gi
    return Array.from({ length: times }, () => msg).join("\n")
  }
}
```

