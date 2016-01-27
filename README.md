# transfun

`transfun` is a JavaScript library that lets you write `map/filter/reduce` code that runs much faster than the equivalent native `map/filter/reduce code`.

![speedup](img/jsperf_safari.png)

*Usage*

Instead of passing function arguments to the native array methods `map/filter/reduce` to produce a result value in 1 step: 
```
var result = arr.map((x) => x.p)
  .filter((x) => x != null)
  .reduce((a,b) => a + b);
  ```
  
...`transfun` uses a 2-step approach: first generate very fast code, then call it:
```
var appfun = map( '.p' ).filter( '!=null' ).reduce( '+' );
var result = appfun( arr ); // very fast!
```

*Merging loops for speed*

transfun automatically merges consecutive loops into one loop, then generates fast code for that loop (similar to stream fusion in [Haskell](http://chrisdone.com/posts/stream-composability)).

*Extensibility*

A domain-specific language is used to define map/filter/reduce. With this language, library users can define other transformations: sum, and, or...

*For the hurried ones*

...you can jump directly to the [speed results](http://glat.info/transfun/index.html#speed-result)

# More about this

http://glat.info/transfun/
