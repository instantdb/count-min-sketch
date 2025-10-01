# count-min-sketches

Welcome to the accompanying repo for the [Count-Min Sketches](https://www.instantdb.com/essays/count_min_sketch) essay.

This contains the full tutorial in one go, so if you get stuck anywhere, feel free to persue [index.ts](./index.ts) for pointers.

You can run it in one go too:

```bash
bun install
bun run index.ts
```

You should see a bunch of console.logs, and a nice new `compressedSketch.png`.

### FAQ

**How did you get the full Wodehouse text in one file?**

I had Claude fetch it using gutendex. Here's the [script](https://gist.github.com/stopachka/5448f9afda77abb87a7059ec2d828029).
