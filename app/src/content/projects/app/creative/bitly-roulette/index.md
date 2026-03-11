---
title: bit.ly roulette
description: Generate a random http://bit.ly/ url, let the internet surprise you!
publishedOn: 2017-12-23
coverImage: /content/projects/app/creative/bitly-roulette/random-bitly-url-interface.png
coverImageAlt: The bit.ly roulette app displaying a randomly generated URL
  "bit.ly/SQJG" centered on a purple-to-pink gradient background, with "a random
  bit.ly" header text.
tags:
  - fun
  - hack
  - random
---

![The bit.ly roulette app displaying a randomly generated URL "bit.ly/SQJG" centered on a purple-to-pink gradient background, with "a random bit.ly" header text](/content/projects/app/creative/bitly-roulette/random-bitly-url-interface.png)

| Links                                                 |                                                        |
| ----------------------------------------------------- | ------------------------------------------------------ |
| [Github →](https://github.com/thalida/bitly-roulette) | [Website →](https://thalida.github.io/bitly-roulette/) |


## How it Works

Hackity hack hacks. Get four random characters, add it to the [bit.ly](http://bit.ly) domain, and hope that it’s a real site.

```jsx
getBitly() {
  const numChars = 4;
  let bitlyUrl = 'bit.ly/';
  for (let i = 0; i < numChars; i += 1) {
    bitlyUrl += this.getRandomChar();
  }
  return bitlyUrl;
},
```
