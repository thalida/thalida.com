Title:          Latest
Summary:        Window: The site you're interacting with at this very moment.
Subtext:        Present
Date_Updated:   30-08-2018 10:08

<img alt="Mac Desktop Screenshot" src="/static/images/posts/meta-history/latest/screenshot.png" class="img--block">

---

## Built With
  - Python 3:
    * [Pipenv](https://pipenv.readthedocs.io/en/latest/)
    * [Flask](http://flask.pocoo.org/docs/1.0/quickstart/)
    * [Python Markdown](https://python-markdown.github.io/)
  - [DarkSky](https://darksky.net/poweredby/)
  - [Docker](https://www.docker.com/)

---

## Goals
I wanted to create a super minimal site, using no frontend frameworks, in order to force myself to improve my backend skills with Python and the Flask Framework.

Also, I thought it'd  be interesting to see what it'd be like to create a site now without the benefits of scss and other compilers.

## Inspriation & Sketching

### Sites I was inspired by (and what I liked about them)

- http://nicksigler.com/
  Bold Typeography, Serifs, Columns
- http://www.turnislefthome.com/
  Long List of Projects, Casestudies
- http://www.zachroszczewski.com/
  Casestudies
- http://www.brucira.com/
  Plants, Illustrations
- http://thingstoread.online/
  Grid
- https://manuelmoreale.com/
  Minimal, Serifs, Long List of Posts

### Concept Sketches
<img alt="Concept sketch 1 in my notebook of thalida.com: window version" src="/static/images/posts/meta-history/latest/sketch.1.jpg" class="img--block">
<img alt="Concept sketch 2 in my notebook of thalida.com: window version" src="/static/images/posts/meta-history/latest/sketch.2.jpg" class="img--block">
<img alt="Concept sketch 3 in my notebook of thalida.com: window version" src="/static/images/posts/meta-history/latest/sketch.3.jpg" class="img--block">

## Design
<img alt="Version 1 mockup of thalida.com: winodw version" src="/static/images/posts/meta-history/latest/mock.1.png" class="img--inline img--50percent"><img alt="Version 2 mockup of thalida.com: winodw version" src="/static/images/posts/meta-history/latest/mock.2.png" class="img--inline img--50percent">
Version 1 of my initial design alinged the most with my favorite concept sketches. After creating this version I realised more space was needed for my about text, and version 2 split the about section into two columns.

<img alt="Version 4 mockup of thalida.com: winodw version" src="/static/images/posts/meta-history/latest/mock.3.png" class="img--inline img--50percent"><img alt="Version 5 mockup of thalida.com: winodw version" src="/static/images/posts/meta-history/latest/mock.4.png" class="img--inline img--50percent">

Version 4 changed my list of posts into a grid, once again to provide more space for a growing list of posts, and I also added link and post hover styles. (The missing version 3 was very similar to version 4 without link styles.) Version 5 introduced the concept of collections of posts, each with their own title and summary.

_Note: As always the transition from static mockup to live site, resulted in changes to the design as I was able to interact and see it with real content._

## Development
### Server Side
The most challening aspect of this site was creating the system to house my posts, the logic for the window is actually repurposed from other versions of my site.

The posts collection system is built upon [Python Markdown](https://python-markdown.github.io/), there's an extension to add meta data, and this extension is a critical piece of how this version of thalida.com functions.

Each collection folder namespaced, for example the collection folder for this post is named: `collection.meta-history`. Inside the collection folder is a `_collection-meta.md` file with contents similar to this:
```md
Title: Meta Timeline
Summary: Explore the future, present, and past of thalida.com
Visual_Index: 1
Sort_Posts_By: -path
```
[View on github](https://github.com/thalida/thalida.com/tree/master/posts/collection/collection.meta-history)

There's _a lot_ more supported meta keys available, in this case I wanted the Meta Timeline content to be the second collection shown `0-indexed`, and I wanted the posts in this collection to be sorted by path in reverse order.

There's a lot more magic✨ happening, and I'm hoping to split PostsCollection out into a seperate library with it's own writeup.

### Frontend
The frontend for this version is a beautiful mess, I haven't worked without scss on a complex project in a long time, and I can 100% say I don't think I _ever_ want to do that again.

Adding vendor prefixes manually, working without variables (css variables are coming though!), and not being able to use the scsss `&` all resulted in some very tedious styling.

In spite of all of that, I was able to create a site using modern css: flexbox, grid, and em/rems everywhere, all without using any of the trimings of modern-day frontend web development.

Snippet of the css used for styling the lines under the window label:
```css
.window__label__colors .google-home__color {
  display: block;
  position: absolute;
  top: 0rem;
  left: calc(50% - 0.3rem);
  margin: 0;
  opacity: 0;
  -webkit-animation-delay: 500ms;
          animation-delay: 500ms;
  -webkit-animation-duration: 600ms;
          animation-duration: 600ms;
  -webkit-animation-fill-mode: forwards;
          animation-fill-mode: forwards;
  -webkit-animation-iteration-count: 1;
          animation-iteration-count: 1;
  -webkit-animation-timing-function: linear;
          animation-timing-function: linear;
}
  .window__label__colors .google-home__color.google-home__color--blue {
      -webkit-animation-name: animation-label-color--blue;
              animation-name: animation-label-color--blue;
  }
  .window__label__colors .google-home__color.google-home__color--purple {
      -webkit-animation-name: animation-label-color--purple;
              animation-name: animation-label-color--purple;
  }
  .window__label__colors .google-home__color.google-home__color--green {
      -webkit-animation-name: animation-label-color--green;
              animation-name: animation-label-color--green;
  }
  .window__label__colors .google-home__color.google-home__color--pink {
      -webkit-animation-name: animation-label-color--pink;
              animation-name: animation-label-color--pink;
  }
```
