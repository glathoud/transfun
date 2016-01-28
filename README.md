# transfun

`transfun` is a JavaScript library that lets you write `map/filter/reduce` code that runs much faster than the equivalent native `map/filter/reduce code`:

![speedup](img/jsperf_safari.png)

*Usage*

Instead of passing function arguments to the native array methods `map/filter/reduce` to produce a result value in 1 step: 
```javascript
var result = arr.map((x) => x.p).filter((x) => x != null).reduce((a,b) => a + b);
  ```
  
...`transfun` uses a 2-step approach: first generate very fast code, then call it:
```javascript
var appfun = map( '.p' ).filter( '!=null' ).reduce( '+' );
var result = appfun( arr ); // very fast!
```

*Usage with functions*

`transfun` also supports normal function arguments:
```javascript
var appfun = map((x) => x.p ).filter((x) => x!=null ).reduce((out,v) => out+v );
var result = appfun( arr ); // fast!
```
...but there is a performance cost. 
However, this is still much faster than the native array methods. For more about this topic, see an article about [transducers in JavaScript](https://medium.com/@roman01la/understanding-transducers-in-javascript-3500d3bd9624#.9mto6edg3)

*Merging loops for speed*

`transfun` automatically merges consecutive loops into one loop, then generates fast code for that loop (similar to stream fusion in [Haskell](http://chrisdone.com/posts/stream-composability)).

*Extensibility*

A domain-specific language is used to define `map/filter/reduce`. With this language, library users can define other transformations: `sum, and, or`...

*For the hurried ones*

...you can jump directly to the [speed results](http://glat.info/transfun/index.html#speed-result)

# More about this

http://glat.info/transfun/
