Title: Unpack
Summary: Web crawler intended to work well with Twitter.
Date_Updated: 11-05-2020 19:52

# Story

I spend a lot of time on Twitter, and I find myself often seeing a retweet, of a
retweet, from a thread, that links to another thread, that leads to a WaPo article,
that links me back to Twitter.

It's an endless cycle that I wanted to unpack, to understand and be able to easily
see how "deep" any conversation goes.

## What it does

Unpack, when given any url will follow all of the links from that content. In the
case of twitter replies and any embedded tweets will be traced back. From there I
continue to pull links from any following pages that are linked, so every link
from that WaPo page for example.

There are hundreds of links on a standard news article, so I needed to create a
system that was scalable.

For this to work, I needed a way to tell the server go fetch this url, get all
of it's contents, find anything that's a link, and then go fetch their contents. Rinse and Repeat.

But, I also knew this would take a very long time, I wanted to make sure anyone using
the site could get constant signal it's working, but also navigate away if they wanted.

Which all meant I needed to figure out how to use jobs, workers, and queues.

### Jobs, Workers, Queues

For unpack,
