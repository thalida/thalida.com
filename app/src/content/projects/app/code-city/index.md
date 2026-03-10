---
title: Code City
description: Visualize a Github Repo as a 3D City
publishedOn: 2021-11-06
updatedOn: 2024-02-03
tags:
  - github
  - python
  - threejs
  - vue
coverImage: code-city/sketch-isometric-city-island.png
coverImageAlt: Hand-drawn sketch of an isometric city on an island with
  buildings, trees, streets, and a "thalida.com" sign, with handwritten notes
  about street placement rules.
---

![Hand-drawn sketch of an isometric city on an island with buildings, trees, streets, and a "thalida.com" sign, with handwritten notes about street placement rules](code-city/sketch-isometric-city-island.png)

| Links                                           |     |
| ----------------------------------------------- | --- |
| [Github →](https://github.com/thalida/codecity) |     |


## ✅ Todos

- [ ] Buy / Create 3D buildings
- [ ] Update site performance
- [ ] Take screenshots to update notion build log


## 🧠🌩 Brainstorm


### City Generation


#### **BUILDINGS**

- Buildings age based on the age of the file
  - eg. A modern building for a new file
  - eg. A victorian building for a an old file
- Grime / damage on a building based on last modified date
  - the cleaner the building the most recently the file was updated
- The style / type of building is based on the type of file
  - eg. a readme could be a library?


#### **STREETS**

- Each street is the name of a folder
- The width of the street is based on the number of files / directories nested in it


## 🎨 Design


### Inspiration

[Code City by Thalida Noel](https://dribbble.com/thalida/collections/2030629-Code-City)


### Paper Sketches

|                                                           |                                                           |
| --------------------------------------------------------- | --------------------------------------------------------- |
| ![Sketch of an isometric city on an island with buildings, trees, and handwritten notes about street edge gaps, alternating sides, and fit-to-grid rules](code-city/sketch-isometric-city-with-notes.png) | ![Sketch exploring building types and people figures for the city, with notes about 3D buildings representing file types and people representing viewers](code-city/sketch-building-types-and-people.png) |
| ![Sketch of a directory-as-grid layout with nested rectangles representing folders, blue squares as files, and notes about directory thickness mapping to road width](code-city/sketch-directory-grid-layout.png) |                                                           |
