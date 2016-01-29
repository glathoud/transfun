/*
  examples.js
  
  Copyright Guillaume Lathoud 2016
  Boost License: see the file ./LICENSE

  Contact: glat@glat.info
*/

/*
  This file is merely a notebook:
  
  These are a bunch of production examples accumulated over the years,
  intertwined with tentative design of the `transfun` API.
*/

var sum   = reduce( 'out+v' )
,   sum2d = map( sum ).next( sum )
;

var sum = reduce( 'out+v' );
var sum = reduce( '+' );
transfun.publish( 'sum', sum );  // name necessary because of IE. publish fails if name already known
var sum2d = map( sum ).sum;
var sum2d = map( sum ).sum();  // same because sum does not need any code argument (special case)

map( '.prop' ).sum().next( '/n' );  // mean

map( 'v.prop' ).filter( 'v!=null' ).sum()
map( '.prop' ).filter( '!=null' ).sum()

map( 'v.prop' ).and()
map( '.prop' ).and()

redinit( 'out+v.prop' ).next( ... )  // fail! redinit needs 2 arguments
redinit( 'out+v.prop', 0 ).next( '/n' )   // mean
redinit( '+v.prop', 0 ).next( '/n' )   // mean

// 2d
map( filter( 'v!=null' ) ).map( sum )
map( filter( 'v!=null' ).sum() )
map( filter( 'v!=null' ).reduce( 'out+v' ) )
map( filter( '!=null' ).reduce( '+' ) )

// Usage on an actual array:

sum( arr );
reduce( 'out+v', arr );
reduce( 'out+v' )( arr );
reduce( '+' )( arr );
sum2d( [ [ 1,2,3], [4,5,6,7 ] ] );

// pushing it

// NO mapThis -> needs TWO applicative arguments (arr, this)
    -> just.call( this, ... )   and make sure to transmit this

// looping on objects:

mapIn
reducein
reducein0

// example: original code

  var url_cfg = {
            proj      : requestObj.proj  ||  null.proj_required
            , request : requestObj.frontendtype  ||  'tours'
        }
        ,   rest = alp.filterIn( requestObj, '!(w in this)', url_cfg )
        ,   rstr = alp.o2arr( rest, 'k=o[k]' ).join( '&' )

        ,   ret = alp.dfrd( 'ADAPI:filter', { then : 1 } )
        ;
        url_cfg.rest = rstr  ?  '&' + rstr  :  '';

// trying to write new code:

transfun.publish( 'join', '#c', '.join(#c)' );  // maybe something more complex needed...
transfun.publish( 'join', 'c', function (c) { return next( '.join(' + c + ')' ); } )  // ...but then a bit ugly xxx

rstr = filterIn( '!(b in this)' ).map( 'b+"="+a' ).o2arr().join( '&' )
    .call( url_cfg, requestObj )
;


// other example: original code

var arr = arr_storage
    .concat(
        alp.filter( arr_backend
                    , '!(v in this)'
                    , alp.arr2oSimple( arr_storage )
                  )
    );

// trying to write new code:

var arr = arr_storage
    .concat(
        filter( '!(a in this)' )
            .call( arr2o( arr_storage ) /* -> will be `this` */ , arr_backend )
    );

// other example: original code

var exit_arr = alp.gEBCN( _CTRL_BTN, box )
,   save_arr =  alp.filter( exit_arr, 'alp.hasClass(v,"' + _CTRL_BTN_SAVE + '")' )
, cancel_arr = alp.filter( exit_arr, '!alp.hasClass(v,"' + _CTRL_BTN_SAVE + '")' )
;
//     ... leave as is in this case:
filter( 'alp.hasClass(a,"' + ... + '")' )( exit_arr )
filter( 'alp.hasClass(a,"' + ... + '")',  exit_arr )    // direct call with all code args and application arg
filter( '!alp.hasClass(a,"' + ... + '")', exit_arr )    // direct call with all code args and application arg

// other example: original code

   var raw = alp.or( alp.map(
                        [ 'highlights', 'travelAdvisoryComment', 'wxSynopsisComment', 'snowpackStructureComment' ]
                        , 'this[v]'
                        , shortDatv.details
                    ))  ||  ''
                

// trying to rewrite this

var raw =
    map( 'this[a]' ).or()
    .call( shortDate.details // will be `this`
           , [ 'highlights', 'travelAdvisoryComment', 'wxSynopsisComment', 'snowpackStructureComment' ]
         )
;

// ...getting readable :)

// other example

    // reduce array of objects to unique components based on id property
    AG3_cfg_copyright_wrapper.arr_def = alp.filter(     // for alp.maps.leaflet_gshim  #11615
                arr_def
                , '(v=v.copy_id),(!v || (v in this ? false : (this[v] = true) ))'
                , {}
            );


// trying to rewrite this

var arr_def2 =
    .filter( next( '.copy_id' )
             .next( '!a || (a in this ? false : (this[a] = true) )' )
           )
    .call( {}, arr_def )
;

// other example: (probably rare use case)

filter( arr, '.selected' ).slice( 20 )

// ---> now: filter all, *then* pick the first 20.
// 
// --> efficiently: stop at the 20th, do not filter all.
//
// inspired from Haskell

filter( '.selected' ).takeWhile( 'b<20' )  // clear
// or
filter( '.selected' ).breakWhen( 'b>=20' ) // less clear for the last one: take it or not?

// other example

alp.mapIn(

            // Filter the cats
            alp.filterIn( catid2info, '!(w in this)', all_to_remove )

            // And also filter the list of children of each cat
            , 'alp.oCreateMix( v, { children : v.children  &&  alp.filter( v.children, "!(v in this)", this ) })'
            , all_to_remove
)

// trying to rewrite

// Filter the cats
filterIn( '!(b in this)' )
    // And also filter the list of children of each cat
    .mapIn( 'oCreateMix( a, { children : v.children  &&  filter( v.children, "!(a in this)", this ) } )' )
    .call( all_to_remove, catid2info )
;

// a bit clearer

// other example

            var separateKeys = alp.reduce(
                attr_json
                , '((v[ w.key ]  ||  (v[ w.key ] = [])).push( w )),v'
                , {}
            )
            , separateFixed  = alp.mapIn( separateKeys, function (v) { return AGD_attr_copy_and_fix( v, nodeCount, /*singleKey:*/true ); } )
            , separateMerged = alp.arrChain( alp.oValues( separateFixed ) )
            ;
            separateMerged.sort( compareFrom );
            return separateMerged;

// trying to rewrite

transfun.publish( 'arrChain', reduce( 'out.concat(v)' ) );

transfun.publish( 'sort'
                  , {
                      arity : 1
                      , specgen : function ( compareFun ) {
                          return { stepadd : { set : { 'current', { dotcall : [ 'current', 'sort', fullexpr( compareFun, 'a', 'b' ) ] } }} }; 
                      }
                  }
                );

var separateMerged =
    // separate
    redinit( '((out[ v.key ]  ||  (out[ v.key ] = [])).push( v )),out' )
    // merge consecutive segments for each
    .mapIn( function (v) { return AGD_attr_copy_and_fix( v, nodeCount, /*singleKey:*/true ); } )
    // merge them again
    .o2values()
    .arrChain()
    .sort( compareFrom )
    ( {}, attr_json )  // application call: may not be clear to everyone
;

// or with extra paren

var separateMerged =
    (
        // separate
        redinit( '((out[ v.key ]  ||  (out[ v.key ] = [])).push( v )),out' )
        // merge consecutive segments for each
            .mapIn( function (v) { return AGD_attr_copy_and_fix( v, nodeCount, /*singleKey:*/true ); } )
        // merge them again
            .o2values()
            .arrChain()
            .sort( compareFrom )
    )(
        {}, attr_json  // application call: a bit clearer because of extra parens
    )
;


// or clearer:

var f =
    // separate
    redinit( '((out[ v.key ]  ||  (out[ v.key ] = [])).push( v )),out' )
// merge consecutive segments for each
    .mapIn( function (v) { return AGD_attr_copy_and_fix( v, nodeCount, /*singleKey:*/true ); } )
// merge them again
    .o2values()
    .arrChain()
    .sort( compareFrom )

, separateMerged = f( {}, attr_json );
;

// or for convenience (maybe?) use transform:

var separateMerged = tval( {}, attr_json )
(
    // separate
    redinit( '((out[ v.key ]  ||  (out[ v.key ] = [])).push( v )),out' )
    // merge consecutive segments for each
        .mapIn( function (v) { return AGD_attr_copy_and_fix( v, nodeCount, /*singleKey:*/true ); } )
    // merge them again
        .o2values()
        .arrChain()
        .sort( compareFrom )
);

// or if we need to debug a bit

var separateKeys = redinit( '((a[ b.key ]  ||  (a[ b.key ] = [])).push( b )),a'
                          )( {}, attr_json )

, separateFixed = mapIn( function (v) { return AGD_attr_copy_and_fix( v, nodeCount, /*singleKey:*/true ); }
                       )( separateKeys )
, separateMerged = o2values().arrChain().sort( compareFrom )( separateFixed )  // somewhat clear
, separateMerged = (o2values().arrChain().sort( compareFrom ))( separateFixed )  // somewhat clear
, separateMerged = o2values().arrChain().sort( compareFrom ).call( null, separateFixed )  // somewhat clearer, even if verbose
;
// or:
, separateMerged = o2values().arrChain().sort( compareFrom, separateFixed );  // not so clear here... up to the writer xxx


// another example

     attr_json = [].concat(attr_json); // copy
        attr_json.sort(function (x,y) { return x.from - y.from; });

        //     (1)    attr_json[a - 1].to <= attr_json[a].from

attr_json = slice( 0 ).sort( 'v.from-b.from' )( attr_json );  // nicer
attr_json = slice( 0 ).sort( 'v.from-b.from' ).call( null, attr_json );  // a bit verbose but maybe clearer
// same as:
var f = slice( 0 ).sort( 'v.from-b.from' );
attr_json = f( attr_json );

attr_json = transform( attr_json , slice( 0 ).sort( 'v.from-b.from' ) )  // for convenience

// or with extra paren
attr_json = (
    slice( 0 ).sort( 'v.from-b.from' )
)(
    attr_json
);

// other example

     var nextleg_change = !prev_one.nextleg  ?  one.nextleg  :  alp.filterIn(

                        one.nextleg

                        , '!(k in this  &&  v === this[k])'

                        , prev_one.nextleg

                    );

                    for (var k in nextleg_change) { if (!(k in _emptyObj)) {  // More flexible than hasOwnProperty  #7394

                        needed = true;

                        one_out.nextleg = nextleg_change;

                        // xxx break ?
                        
                    }}


// try to rewrite

var nextleg_change = !prev_one.nextleg
    ?  one.nextleg
    :  filterIn( '!(k in this  &&  v === this[ k ])' )
    .call( prev_one.nextleg, one.nextleg )
;

var needed = orIn( next( 'this.nextleg = obj' ).next( 'true' ) )
    .call( one_out, nextleg_change )
;


// other example

that[ _ONE_FROMTO_LABEL ] = alp.filterIn(
    alp.mapIn(
        { today : 1, tomorrow : 1, weekend : 1, next14days : 1 }
        , _oam_fs_try_to_extract_one_label
    )
    , ''
);

// try to rewrite

that[ _ONE_FROMTO_LABEL ] = (
    mapIn( _oam_fs_try_to_extract_one_label ).filterIn( '' )
)(
    { today : 1, tomorrow : 1, weekend : 1, next14days : 1 }    
);
