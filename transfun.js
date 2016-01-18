/*global tval tpub tfun*/

// Transfunctions.
//
// Guillaume Lathoud
// glat@glat.info

function tval( /*...args...*/ )
// Convenience sugar to reverse the syntax:
// value first, then function:
//
// instead of h(g(f( value ))))
//
// one can call:
//
// tval( value )( f, g, h )
//
// or:
//
// tval( value )( [f, g, h] )
//
// Note: the `this` object is also transmitted, as in:
//
// tval.call( thisObj, value )( f, g, h )
{
    var thisObj = this
    ,   args    = arguments
    ;
    return tvalfun;

    function tvalfun( /* ...functions... | array of function*/f )
    {
        var arr = 'function' === typeof f
            ?  Array.apply( null, arguments )
            :  f.slice()
        
        ,   n   = arr.length
        ,   v   = arr[ 0 ].apply( thisObj, args )
        ;
        for (var i = 1; i < n; i++)
            v = arr[ i ].call( thisObj, v );

        return v;
    }
}

tpub._cache = { _is_transfun : true, _is_appfun : false };
function tpub( name, spec_or_str /*... more strings in the shortcut variant...*/ )
{
    (name  ||  null).substring.call.a;
    
    var cache = tpub._cache;

    if (name in cache)
        throw new Error( '"' + name + '" already published!' );

    var fun = cache[ name ] = tfun.apply( null, Array.slice.call( arguments, 1 ) );
    fun._is_transfun = name; // Only for published ones, for private ones: `true`
    
    // Also publish the function to the global namespace
    new Function( 'fun', 'name=fun' )( fun );

    return fun;
}

// --- Publish a few common transfunctions
// specifying an internally imperative implementation.

tpub( 'map', {
    arity     : 1
    , specgen : function ( /*string | externcall object*/transform ) {
        return { loopleftright : {
            morph : 'array'  // --> means, among other, reducable + depending on conserve_array_length, init & bodyend (store)
            , conserve_array_length : true
            , bodyadd : { set : [ 'v', fullexpr( transform, 'v', 'k' ) ] }
        }};
    }
});

tpub( 'mapRight', {
    arity     : 1
    , specgen : function ( /*string | externcall object*/transform ) {
        return { looprightleft : {
            morph : 'array'  // --> means, among other, reducable + depending on conserve_array_length, init & bodyend (store)
            , conserve_array_length : true
            , bodyadd : { set : [ 'v', fullexpr( transform, 'v', 'k' ) ] }
        }};
    }
});

tpub( 'mapIn', {
    arity     : 1
    , specgen : function ( /*string | externcall object*/transform ) {
        return { loopin : {
            morph     : 'object'  // --> means, among other, reducable, init & bodyend (store)
            , bodyadd : { set : [ 'v', fullexpr( transform, 'v', 'k' ) ] }
        }};
    }
});

tpub( 'filter', {
    arity     : 1
    , specgen : function ( /*string | externcall object*/test ) {
        return { loopleftright : {
            morph     : 'array'  // --> means, among other, reducable + depending on conserve_array_length (always false here), init & bodyend (store)
            , bodyadd : { restwrap : function ( rest ) { return { 'if' : fullexpr( test, 'v', 'k' ), 'then' : rest }; } }
        }};
    }
});

tpub( 'reduce', {
    arity : 1
    , specgen : function ( /*string | externcall object*/combine ) {
        return { loopleftright : {
            beforeloop  : [ { decl : [ 'out', 'null' ] }
                            , { decl : [ 'redinit', 'false' ] }
                          ]
            , bodyadd   : { 'if'     : 'redinit'
                            , then   : { set : [ 'out', fullexpr( combine, 'out', 'v' ) ] }
                            , 'else' : [ {   set : [ 'out', 'v' ] }
                                         , { set : [ 'redinit', 'true' ] }
                                       ]
                          }
            , afterloop : { set : [ 'current', 'out' ] }
        }};
    }
});

tpub( 'redinit', {
    arity : 2
    , specgen : function ( /*string | externcall object*/combine, /*string*/redinit ) {
        return { loopleftright : {
            beforeloop  : { decl : [ 'out', redinit ] }
            , bodyadd   : { set : [ 'out', fullexpr( transform, 'out', 'v' ) ] }
            , afterloop : { set : [ 'current', 'out' ] }
        }};
    }
});

tpub( 'breakWhen', {
    arity     : 1
    , specgen : function ( /*string | externcall object*/test ) {
        return { loopleftright : { bodyadd : { 'if' : fullexpr( test, 'v', 'k' ), 'then' : 'break' } }};
    }
});

tpub( 'and', {
    arity : 0
    , spec : { loopleftright : {
        beforeloop : { decl : [ 'out', 'true' ] }
        , bodyadd  : { 'if' : { not : 'v' }
                       , 'then' : [ { set : [ 'out', 'v' ] }
                                    , 'break'
                                  ]
                     }
        , afterloop : { set, [ 'current', 'out' ] }
    }}
});

tpub( 'or', {
    arity : 0
    , spec : { loopleftright : {
        beforeloop : { decl : [ 'out', 'true' ] }
        , bodyadd  : { 'if' : 'v'
                       , 'then' : [ { set : [ 'out', 'v' ] }
                                    , 'break'
                                  ]
                     }
        , afterloop : { set, [ 'current', 'out' ] }
    }}
});

tpub( 'o2values', {
    arity : 0
    , spec : { append : { set : [ 'current', { 'Object.values' : 'current' } ] } }
});

tpub( 'arr2o', {
    arity  : 0
    , spec : { loopleftright : {
        beforeloop  : { decl, [ 'out', '{}' ] }
        , bodyadd   : { set_at : [ 'out', 'k', 'true' ] }
        , afterloop : { set, [ 'current', 'out' ] }
    }}
});

tpub( 'next', {
    arity : 1
    , specgen : function ( /*string | externcall object*/transform ) {
        return { append : { set : [ 'current', fullexpr( transform, 'current' ) ] } };
    }
});

// examples

tpub( 'sum',  reduce( '+' ) );
tpub( 'mean', sum().next( '/n' ) );   // after an array loop, the value of `n` should still be the length of the array (unless someone meddled with `n`).

// A thought about dealing with non-string parameters (e.g. functions)
// e.g.
//     .mapIn( function (v) { return AGD_attr_copy_and_fix( v, nodeCount, /*singleKey:*/true ); } )
//
// contrived example of a function parameter:
//
// next( function ( current ) { return 2 * current; } );
//
// approach:
// * will need new variables in the generated code, e.g. `__extern$0__`, `__extern$1__` etc.
// * will need to bind somehow those variables to their (external) values through closure or bind.
//
// implementation:
// * while computing (and optimizing) the specification, for transform and similar, instead of passing a string, pass an object { externcall : '__extern$0__' }
// * `fullexpr` recognizes this and outputs forexample '__extern$0__(v,k)'
// * do not forget to store the mapping outside of the code, e.g. '__extern$0__' -> <function> (or whatever non-string thing)
// * so while creating/optimizing the spec, store the mapping of externs + the array of [ <arguments so far (string or {externcall:string} object)>, <definition object> ]
//    * this way the possible definition.specgen() can be called right away using the arguments ( as soon as arguments.length === definition.arity )
//    * the latter array can then be optimized, at least the first elements that have as many arguments as definition.arity
//
// Maybe the simplest is an array of <{ spec : ... } | {spec_unresolved : { args_so_far : [ ... ], def : { arity : x, specgen: function (...){ ... }}}}>
//
// when outputting a transfun (complete or not):
// * check whether arity "full" -> yes, "direct", function (also has the published methods) ; no, wrapper function (has no method)
//
// when applying a full transfun on data ("direct" function):
// * at the first call, generate the code
//   * extra extern arguments in the presence of externals
//   * from the generated code, generate an function
// * then call the generated function (do not forget the extra "extern" arguments if necessary -> should be in an array in a closure, concatenate with data arguments)

// --- Implementation

function fullexpr( /*string | externcall object*/code, /*string*/leftvar, /*?string?*/rightvar )
// string->string: Complete a code expression of one or two variables.
//
// Examples:
// {{{
// 'v!=null' === fullexpr( '!=null', 'v' )
// 'v+k'     === fullexpr( '+', 'v', 'k' )
// }}}
{
    if ('object' === typeof code)
    {
        var externcall = code.externcall;
        (externcall  ||  null).substring.call.a;
        code = externcall + '(' + leftvar + (rightvar  ?  ',' + rightvar  :  '') + ')';
    }
    
    (code      ||  null).substring.call.a;
    (leftvar   ||  null).substring.call.a;
    rightvar  &&  rightvar.substring.call.a;
    
    var is_left_implicit  = /^\s*(?:[+*\/%&|\^\.=<>\?]|!=|$)/.test( code )
    ,   is_right_implicit = /[+\-*\/%&|\^\.=<>!]\s*$/        .test( code )  &&  !/(\+\+|\-\-)$/.test( code )
    ;
    if (is_left_implicit)
        code = leftvar + code;

    if (is_right_implicit)
        code = code + (is_left_implicit  ?  (rightvar  ||  '')  :  leftvar);

    return code;
}


function tfun( spec_or_str /*... more strings in the shortcut variant...*/ )
{
    if ('string' === spec_or_str)
    {
        // Shortcut "string" variant
        // 
        // Call syntax similar to that of `new Function`,
        // except that the parameter names start with '#'
        var arr = Array.apply( null, arguments );
        for (var i = arr.length - 1; i--;)
        {
            var x = arr[ i ].split( ',' );
            if (x.length > 1)
                arr.splice.apply( arr, [ i, 1 ].concat( x ) );
        }
        
        var shortcut_par_rx   = arr.slice( 0, -1 ).map( function ( hash_string ) {
            var hashname = hash_string.match( /^#[a-zA-Z_][a-zA-Z_0-9]*$/ )[ 0 ]
            return new RegExp( hashname, 'g' );
        })
        , shortcut_arity = shortcut_par_rx.length
        , shortcut_body  = arr.slice( -1 )[ 0 ]
        ;
        return tfun( { arity     : shortcut_arity
                       , codegen : shortcut_codegen
                     }
                   );
        
    }

    // General variant
    if (1 !== arguments.length)
        throw new Error( 'General variant requires a single specification (object or function).' );
    
    var spec = spec_or_str
    ,   fun  = 'object' === typeof spec  ?  tfun_from_object( spec )  :  spec
    ;
    if (!('function' === typeof fun  &&  fun._is_transfun))
        throw new Error( 'Invalid specification! Must be an object or a transfunction.' );
    
    return fun;
    
    // --- Details for the shortcut variant

    function shortcut_codegen( /*...arguments...*/ )
    {
        shortcut_arity === arguments.length  ||  null.bug;

        var ret = shortcut_body;
        for (var i = shortcut_par_rx.length; i--;)
            ret = ret.replace( shortcut_par_rx[ i ], arguments[ i ] );

        return 'current = ' + fullexpr( ret, 'current' ) + ';';
    }

    // --- Details for the object definition variant

    function tfun_from_object( definition )
    {
        var arity = definition.arity;

        return transfun;
        
        function transfun( /*...`arity` arguments...*/ )
        {
            if (arity !== arguments.length)
                return missing_args_transfun.call( { transfunThisObj : this, arg : [] }, arguments );
            
            var spec     = arity === 0  ?  definition.spec  :  definition.apply( null, arguments )
            ,   spec_arr = (
                this._is_appfun  ?  this._spec_arr  :  []
            ).concat( [ spec ] )
            ;

            xxxxx concat( [ { externals : ..., spec : ... } ] )
            
            for (var name in tpub._cache) { if (tpub._cache.hasOwnProperty( name )) {
                appfun[ name ] = tpub._cache[ name ]; // `transfunThisObj` permits partial call of these transfun methods
            }}

            appfun._is_appfun = true;
            appfun._spec_arr  = spec_arr;

            return appfun;
            
            var spec_arr_opt
            ,   impl
            ;
            function appfun( /*an actual value, e.g. an array of numbers*/current )
            {
                if (!impl)
                {
                    spec_arr_opt  ||  (spec_arr_opt = optimize_spec_arr( spec_arr ));
                    xxx
                }
                return impl.call( this, current );
            }
        }

        function missing_args_transfun( /*... more arguments ... */)
        {
            var new_arg = Array.prototype.concat.call( this.arg, arguments )
            , n_missing = arity - new_arg.length
            ;
            if (n_missing < 0)
                throw new Error( 'Too many arguments.' );

            if (n_missing > 0)
                return missing_args_transfun.bind( new_arg );
            
            return transfun.apply( transfunThisObj, new_arg );
        }

        function optimize_spec_arr( spec_arr )
        {
            
        }
        
        
    }
}
