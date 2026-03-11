---
title: Ciphers & Codes
description: A tool to learn about various ciphers, and encode and decode text.
publishedOn: 2022-02-19
tags:
  - vue
coverImage: ./homepage-decode-mode.png
coverImageAlt: The cipher.codes homepage in decode mode showing sample decoded
  text in a card with an encode/decode toggle switch.
---

![The cipher.codes homepage in decode mode showing sample decoded text in a card with an encode/decode toggle switch](./homepage-decode-mode.png)

| Links                                                |                                     |
| ---------------------------------------------------- | ----------------------------------- |
| [Github →](https://github.com/thalida/ciphers.codes) | [Website →](https://ciphers.codes/) |


## Supported Ciphers


### Affine

![Affine cipher output card showing encrypted text with co-prime set to 3 and shift set to 6, with copy and swap buttons](./cipher-affine.png)

A monoalphabetic substitution cipher. Each letter in the alphabet is mapped to a number, then encrypted/decrypted
using a math formula, and finally converted back to a letter.
[Learn more](https://ciphers.codes/about/affine)


### Atbash

![Atbash cipher output card showing text encrypted by reversing the alphabet, with copy and swap buttons](./cipher-atbash.png)

A simple substitution cipher originally created for the Hebrew alphabet. When used with the English alphabet,
this cipher reverses the alphabet.
[Learn more](https://ciphers.codes/about/atbash)


### Caesar

![Caesar cipher output card showing text encrypted with a shift of 5, with copy and swap buttons](./cipher-caesar.png)

A popular substitution cipher, where the alphabet is shifted up or down a specified number of positions.
[Learn more](https://ciphers.codes/about/caesar)


### Keyed Substitution

![Keyed Substitution cipher output card showing text encrypted with the key "lorem," with copy and swap buttons](./cipher-keyed-substitution.png)

A monoalphabetic substitution cipher, where a keyword placed into beginning of the alphabet,
and any duplicated letters are removed.
[Learn more](https://ciphers.codes/about/keyed-substitution)


### Masonic

![Masonic cipher output card showing text encrypted into geometric grid-fragment symbols, with copy and swap buttons](./cipher-masonic.png)

A geometric simple substitution cipher which exchanges letters for symbols which are fragments of a grid.
[Learn more](https://ciphers.codes/about/masonic)


### Playfair

![Playfair cipher output card showing text encrypted with the key "private," with copy and swap buttons](./cipher-playfair.png)

Encrypts pairs of letters, using a 5x5 grid. [Learn more](https://ciphers.codes/about/playfair)


### Polybius Square

![Polybius Square cipher output card showing text converted to pairs of grid coordinate numbers, with copy and swap buttons](./cipher-polybius-square.png)

A cipher where each alphanumeric (a-z, 0-9) character is represented by it’s coordinates in a grid.
[Learn more](https://ciphers.codes/about/polybius-square)


### Vigenère

![Vigenere cipher output card showing text encrypted with the key "hide," with copy and swap buttons](./cipher-vigenere.png)

A simple polyalphabetic substitution cipher which uses a tableau composed of each of the 26 options
of the [Caesar Cipher](https://ciphers.codes/about/caesar).
[Learn more](https://ciphers.codes/about/vigenere)


## 🎨 Design

Catalog of various redesigns over time as I got the itch to work on this again.

| | |
| --- | --- |
| ![cipher.codes v4 mobile: encode/decode toggle with cipher output cards](./redesign-v4-mobile-overview.png) | ![cipher.codes v4 About panel for Affine cipher with formula and features](./redesign-v4-about-affine.png) |
| ![cipher.codes v3 desktop: blue split-screen Caesar cipher encode/decode](./redesign-v3-desktop-caesar.png) | ![cipher.codes v2 desktop: white layout with Caesar cipher form](./redesign-v2-desktop-caesar.png) |
| ![cipher.codes v1: dark purple-gray background with side-by-side panels](./redesign-v1-encodedecode.png) | ![Toggle logo animation: pill-shaped toggles transitioning gray to green](./toggle-logo-animation.png) |
