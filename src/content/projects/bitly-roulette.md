---
title: bit.ly roulette
description: Generate a random http://bit.ly/ url, let the internet surprise you!
publishedOn: 2017-12-23
coverImage: bitly-roulette/Screen_Shot_2022-02-19_at_18.53.19.png
coverImageAlt: A screenshot of the bit.ly roulette interface, showing a random URL.
tags: [fun, hack, random]
---


![Screen Shot 2022-02-19 at 18.53.19.png](bitly-roulette/Screen_Shot_2022-02-19_at_18.53.19.png)

| Links | |
| ------ | ------- |
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
