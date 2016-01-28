function test()
{
    console.time( 'transfun:test' );
    
    var sum_local = reduce( '+' )
    ,  mean = sum_local.next( '/n' ) // after an array loop that conserves the length (e.g. no filtering), the value of `n` is available
    ,  prod = reduce( '*' )
    , geommean = map( 'Math.log(v)' ).next( sum_local ).next( 'Math.exp(current/n)' )  // Only for positive numbers
    ;

    10 === sum_local( [ 1, 2, 3, 4 ] )  ||  null.bug;
    3*5*7 === prod( [ 1, 3, 5, 7 ] )  ||  null.bug;
    
    (1+3+10+20)/4 === mean( [ 1, 3, 10, 20 ] )  ||  null.bug;
    1e-10 > Math.abs( Math.pow(1*3*5*11*17,1/5) - geommean( [ 1, 3, 5, 11, 17 ] ))  ||  null.bug;


    // Using the publicly declared `sum`. Note the *transfun* `sum`
    // has arity 0, so in the *appfun* is in global namespace.
    
    10 === sum( [ 1, 2, 3, 4 ] )  ||  null.bug;
    
    var geommean2 = map( 'Math.log(v)' ).sum().next( 'Math.exp(current/n)' )  // Only for positive numbers

    1e-10 > Math.abs( Math.pow(1*3*5*11*17,1/5) - geommean( [ 1, 3, 5, 11, 17 ] ))  ||  null.bug;



    [ 1, 3, 4, 7 ].map( function (x) { return x*2; } ).join( '#' )
        === map( '*2' ).join( '"#"' )( [ 1, 3, 4, 7 ] )  ||  null.bug
    ;
    
    [ 1, 3, 4, 7 ].map( function (x) { return x*2; } ).join( '#' )
        === tval( [ 1, 3, 4, 7 ] )( map( '*2' ).join( '"#"' ) )  ||  null.bug
    ;
    
    

    var corrupt_arr = [ { age : 12 }, { age: 91 }, null, { age : 43 }, undefined, { age : 23 }, { age : 32 }, undefined ]

    ,   age_clean = corrupt_arr
        .filter( function ( o ) { return o != null; } )
        .map( function ( o ) { return o.age; } )

    ,   age_sum   = age_clean.reduce( function ( a, b ) { return a+b; } )

    ,   age_mean  = age_sum / age_clean.length
    ;
    (age_mean  ||  null).toPrecision.call.a;

    age_clean.join( '#' ) === filter( '!=null' ).map( '.age' )( corrupt_arr ).join( '#' )  ||  null.bug;

    age_mean === tval(
        corrupt_arr
    )(
        // filter( '!=null' ) may change the length of the array so we need to count.
        decl( 'count', '0' ).filter( '!=null' ).map( '.age' ).redinit( '0', 'count++, out+v' ).next( '/count' )
    )  ||  null.bug;


    var mapsafe = filter( '!=null' ).map();  // Partial transformation: needs one more argument to be complete

    age_clean.join( '#' ) === tval( corrupt_arr )( mapsafe( '.age' ) ).join( '#' )  ||  null.bug;

    var age_mean_appfun = decl( 'count', '0' )
        .next( mapsafe( '.age' ) )  // needs .next call because `mapsafe` has not been published
        .redinit( '0', 'count++, out+v' )
        .next( '/count' )
    ;
    
    age_mean === tval( corrupt_arr )( age_mean_appfun )  ||  null.bug;

    0 === age_mean_appfun._tf_chainspec.extern_arr.length  ||  null.bug;


    console.log( age_mean_appfun._tf_dbg.code_body );
    

    var mapsafe_not_called = filter( '!=null' ).map;  // Partial transformation: needs one more argument to be complete

    age_clean.join( '#' ) === tval( corrupt_arr )( mapsafe_not_called( '.age' ) ).join( '#' )  ||  null.bug;

    var age_mean_appfun_2 = decl( 'count', '0' )
        .next( mapsafe_not_called( '.age' ) )  // needs .next call because `mapsafe_not_called` has not been published
        .redinit( '0', 'count++, out+v' )
        .next( '/count' )
    ;
    
    age_mean === tval( corrupt_arr )( age_mean_appfun_2 )  ||  null.bug;
    age_mean === age_mean_appfun_2( corrupt_arr )  ||  null.bug;

    0 === age_mean_appfun_2._tf_chainspec.extern_arr.length  ||  null.bug;

    

    // shortcut variant

    var join = tfun( '#c', '.join(#c)' );
    age_clean.join( '$a$' ) === tval( age_clean )( join( '"$a$"' ) )
        ||  null.bug
    ;

    // object equivalent to the shortcut variant

    var join2 = tfun( {
        arity : 1
        , specgen : function ( c ) {
            return { stepadd : { set : [ 'current', 'current.join(' + c + ')' ] } };
        }
    });

    age_clean.join( '$a$' ) === tval( age_clean )( join2( '"$a$"' ) )
        ||  null.bug
    ;

    // without tval

    age_clean.join( '$a$' ) === join( '"$a$"' )( age_clean )
        ||  null.bug
    ;

    age_clean.join( '$a$' ) === join2( '"$a$"' )( age_clean )
        ||  null.bug
    ;

    // externs
    
    age_clean.join( '#' ) === filter( function ( v ) { return v!=null; } ).map( '.age' )( corrupt_arr ).join( '#' )  ||  null.bug;
    age_clean.join( '#' ) === filter( '!=null' ).map( function ( v ) { return v.age; } )( corrupt_arr ).join( '#' )  ||  null.bug;
    age_clean.join( '#' ) === tval(
        corrupt_arr
    )(
        filter( function ( v ) { return v!=null; } )
            .map( function ( v ) { return v.age; } )
    )
        .join( '#' )  ||  null.bug
    ;

    console.log( geommean._tf_dbg.code_body );

    var tmp = filter( '!=null' ).map( function ( v ) { return v.age; } );
    tmp( corrupt_arr );
    console.log( tmp._tf_dbg.code_body );        
    
    // other

    var    arr = [ 1, 4, 7, 10, 13, 16, 18 ]
    , obtained = filterRight( '%2' )( arr )
    , expected = [ 13, 7, 1 ]
    ;
    expected.join( '#' ) === obtained.join( '#' )  ||  null.bug;

    //
    
    var    obj = { a: 1, b : 4, c : 7, d : 10, e : 13, f : 16, g : 18 }
    , obtained = filterIn( '%2' )( obj )
    , expected = { a : 1, c : 7, e : 13 }
    ;
    JSON.stringify( expected ) === JSON.stringify( obtained )  ||  null.bug;

    //

    var    arr = [ 1, 4, 7, 10, 13, 16, 18 ]
    , obtained = reduceRight( '/' )( arr )
    , expected = 18 / 16 / 13 / 10 / 7 / 4 / 1
    ;
    1e-10 > Math.abs( expected - obtained )  ||  null.bug;

    //
    
    var    obj = { a: 1, b : 4, c : 7, d : 10, e : 13, f : 16, g : 18 }
    , obtained = reduceIn( '+' )( obj )
    , expected = 1+4+7+10+13+16+18
    ;
    1e-10 > Math.abs( expected - obtained )  ||  null.bug;

    //

    var    arr = [ 1, 4, 7, 10, 13, 16, 18 ]
    , obtained = redinitRight( '1', '/' )( arr )
    , expected = 1 / 18 / 16 / 13 / 10 / 7 / 4 / 1
    ;
    1e-10 > Math.abs( expected - obtained )  ||  null.bug;

    //
    
    var    obj = { a: 1, b : 4, c : 7, d : 10, e : 13, f : 16, g : 18 }
    , obtained = redinitIn( '-100', '+' )( obj )
    , expected = -100+1+4+7+10+13+16+18
    ;
    1e-10 > Math.abs( expected - obtained )  ||  null.bug;

    //

    true  === and( [] )  ||  null.bug;
    false === or( [] )   ||  null.bug;

    //

    'great' === and( [ 1, true, 2, 'great' ] )  ||  null.bug;
    1 === andRight( [ 1, true, 2, 'great' ] )  ||  null.bug;
    true  === !!andIn( { a: 1, b : 'great', c : true })  ||  null.bug;
    null  === andIn( { a: 1, b : 'great', d : null, c : true })  ||  null.bug;
    
    null === and( [ 1, true, 2, null, 'great' ] )  ||  null.bug;
    null === and( [ 1, true, 2, null, 'great', 0, 3, 'bcd' ] )  ||  null.bug;
    0 === andRight( [ 1, true, 2, null, 'great', 0, 3, 'bcd' ] )  ||  null.bug;
   
    true  === tval( [ 1, 4, 7, 10, 13, 16, 18 ] )( map( '>0' ).and() )  ||  null.bug;
    false === tval( [ 1, 4, -7, 10, 13, -16, 18 ] )( map( '>0' ).and() )  ||  null.bug;

    true  === tval( [ 1, 4, 7, 10, 13, 16, 18 ] )( map( '>0' ).andRight() )  ||  null.bug;
    false === tval( [ 1, 4, -7, 10, 13, -16, 18 ] )( map( '>0' ).andRight() )  ||  null.bug;

    true  === tval( { a: 1, b : 4, c : 7, d : 10, e : 13, f : 16, g : 18 } )( mapIn( '>0' ).andIn() )  ||  null.bug;
    false === tval( { a: 1, b : 4, c : -7, d : 10, e : -13, f : 16, g : 18 })( mapIn( '>0' ).andIn() )  ||  null.bug;
    
    //

    'great' === or( [ 0, false, 'great', true, 2, null, 0 ] )  ||  null.bug;
    2 === orRight( [ 0, false, 'great', true, 2, null, 0 ] )  ||  null.bug;
    111   === orIn( { a: null, b : false, c : 111 })  ||  null.bug;
    false === !!orIn( { a: null, b : false, c : 0 })  ||  null.bug;
    null  === orIn( { a: null, b : null, d : null, c : null })  ||  null.bug;
    

    // Conversions

    oEquals( [ 1, 'xyz', null ], o2values({ a:1, b:'xyz', c:null }) )  ||  null.bug;
    
    oEquals( [ 'a', 'b', 'c'  ],         o2keys({ a:1, b:'xyz', c:null }) )  ||  null.bug;
    oEquals( { a:true, b:true, c:true }, keys2o([ 'a', 'b', 'c' ]) )  ||  null.bug;

    oEquals( [ ['c', null], ['a', 1], ['b', 'xyz'] ].sort(), o2kv({ a:1, b:'xyz', c:null }).sort() )  ||  null.bug
    oEquals( { a:1, b:'xyz', c:null }, kv2o([ ['b', 'xyz'], ['a', 1], ['c', null] ]) )   ||  null.bug;

    // 
    
    console.timeEnd( 'transfun:test' );
    console.log( 'transfun:test: all tests passed.' );
}
