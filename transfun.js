/*global tval tpub tfun fullexpr
  map filter reduce sum prod decl
*/

// Transfunctions.
//
// Guillaume Lathoud
// glat@glat.info

var fullexpr, tval, tpub, tfun;
(function () {

    var L_LEFT  = 'loopleftright'
    ,   L_RIGHT = 'looprightleft'
    ,   L_IN    = 'loopin'
    ;
    
    // ---------- Public API

    fullexpr = fullexpr_;
    tval     = tval_;
    tpub     = tpub_;
    tfun     = tfun_;

    // --- Publish a few common transfunctions, specifying an
    // internally imperative implementation for a functional.

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

    // xxx filterRight, filterIn
    
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

    // xxx reduceRight, reduceIn
    
    tpub( 'redinit', {
        arity : 2
        , specgen : function ( /*string | externcall object*/combine, /*string*/redinit ) {
            return { loopleftright : {
                beforeloop  : { decl : [ 'out', fullexpr( redinit, 'current' ) ] }
                , bodyadd   : { set : [ 'out', fullexpr( combine, 'out', 'v' ) ] }
                , afterloop : { set : [ 'current', 'out' ] }
            }};
        }
    });

    // xxx redinitRight, redinitIn

    tpub( 'breakWhen', {
        arity     : 1
        , specgen : function ( /*string | externcall object*/test ) {
            return { loopleftright : { bodyadd : { 'if' : fullexpr( test, 'v', 'k' ), 'then' : 'break' } }};
        }
    });

    tpub( 'takeWhile', {
        arity : 1
        , specgen : function ( /* string | externcall object*/test ) {
            return { loopleftright : {
                morph     : 'array'
                , bodyadd : { restwrap : function ( rest ) { return { 'if' : fullexpr( test, 'v', 'k' ), then : rest, 'else' : 'break' }; } }
            }};
        }
    });

    tpub( 'takeWhileIn', {
        arity : 1
        , specgen : function ( /* string | externcall object*/test ) {
            return { loopin : {
                morph     : 'object'
                , bodyadd : { restwrap : function ( rest ) { return { 'if' : fullexpr( test, 'v', 'k' ), then : rest, 'else' : 'break' }; } }
            }};
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
            , afterloop : { set : [ 'current', 'out' ] }
        }}
    });

    // xxx andRight andIn
    
    tpub( 'or', {
        arity : 0
        , spec : { loopleftright : {
            beforeloop : { decl : [ 'out', 'true' ] }
            , bodyadd  : { 'if' : 'v'
                           , 'then' : [ { set : [ 'out', 'v' ] }
                                        , 'break'
                                      ]
                         }
            , afterloop : { set : [ 'current', 'out' ] }
        }}
    });

    // xxx orRight orIn
    
    tpub( 'o2values', {
        arity : 0
        , spec : { stepadd : { set : [ 'current', { 'Object.values' : 'current' } ] } }
    });

    tpub( 'arr2o', {
        arity  : 0
        , spec : { loopleftright : {
            beforeloop  : { decl : [ 'out', '{}' ] }
            , bodyadd   : { set_at : [ 'out', 'k', 'true' ] }
            , afterloop : { set : [ 'current', 'out' ] }
        }}
    });

    tpub( 'next', {
        arity : 1
        , specgen : function ( /*string | externcall object*/transform ) {
            return { stepadd : { set : [ 'current', fullexpr( transform, 'current' ) ] } };
        }
    });

    tpub( 'decl', {
        arity : 2
        , specgen : function ( /*string*/name, /*string | externcall object*/expr ) {
            return {
                stepadd : { decl : [ name, fullexpr( expr, 'current' ) ] }
            };
        }
    });
    
    tpub( 'sum',  reduce( '+' ) );
    tpub( 'mean', sum().next( '/n' ) ); // after an array loop that conserves the length (e.g. no filtering), the value of `n` is available

    tpub( 'prod', reduce( '*' ) );
    tpub( 'geommean', map( 'Math.log(v)' ).sum().next( 'Math.exp(current/n)' ) );  // Only for positive numbers

    test();

    function test()
    {
        10 === sum( [ 1, 2, 3, 4 ] )  ||  null.bug;
        3*5*7 === prod( [ 1, 3, 5, 7 ] )  ||  null.bug;

        var corrupt_arr = [ { age : 12 }, { age: 91 }, null, { age : 43 }, undefined, { age : 23 }, { age : 32 }, undefined ]
        ,   age_clean = corrupt_arr.filter( function ( o ) { return o != null; } ).map( function ( o ) { return o.age; } )
        ,   age_sum   = age_clean.reduce( function ( a, b ) { return a+b; } )
        ,   age_mean  = age_sum / age_clean.length
        ;
        (age_mean  ||  null).toPrecision.call.a;

        age_clean.join( '#' ) === filter( '!=null' ).map( '.age' )( corrupt_arr ).join( '#' )  ||  null.bug;

        age_mean === tval(
            corrupt_arr
        )(
            decl( 'count', '0' ).filter( '!null' ).map( '.age' ).reduce( 'count++, out+v' ).next( '/count' )
        )  ||  null.bug;

        var mapsafe = filter( '!null' ).map();  // Partial transformation: needs one more argument to be complete

        age_clean.join( '#' ) === tval( corrupt_arr )( mapsafe( '.age' ) ).join( '#' )  ||  null.bug;
        
        age_mean === tval(
            corrupt_arr
        )(
            decl( 'count', '0' )
                .next( mapsafe( '.age' ) )  // needs .next call because `mapsafe` has not been published
                .reduce( 'count++, out+v' )
                .next( '/count' )
        )  ||  null.bug;
    }
    
    // ---------- Public API implementation

    function tval_( /*...args...*/ )
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


    var _tpub_cache = {};
    function tpub_( name, spec_or_str /*... more strings in the shortcut variant...*/ )
    {
        (name  ||  null).substring.call.a;
        
        if (name in _tpub_cache)
            throw new Error( '"' + name + '" already published!' );

        var tf = _tpub_cache[ name ] = tfun.apply( null, Array.slice.call( arguments, 1 ) );
        
        // Also publish the function to the global namespace
        new Function( 'tf', name + '=tf' )( tf );

        return tf;
    }

    function fullexpr_( /*string | externcall object*/code, /*string*/leftvar, /*?string?*/rightvar )
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

    function tfun_( def_or_str /*... more strings in the shortcut variant...*/ )
    {
        if ('string' === def_or_str)
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
        
        var def  = def_or_str
        ,   fun  = 'object' === typeof def  ?  tfun_from_objectdef( def )  :  def
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

        function tfun_from_objectdef( definition )
        {
            var arity = definition.arity
            ,   spec  = arity === 0  &&  definition.spec
            ,   specgen = arity > 0  &&  definition.specgen
            ;
            transfun._is_transfun = true;
            
            return transfun;
            
            function transfun( /*...`arity` arguments: array of (code string | non-string extern) ... */ )
            {
                if (arity !== arguments.length)
                    return missing_args_transfun.call( { transfunThisObj : this, arg : [] }, arguments );
                
                var chainspec = (
                    this instanceof _ChainSpec  ?  this  :  new _ChainSpec
                )
                    .add_step( arity, spec  ||  specgen, arguments )
                ;
                
                for (var name in _tpub_cache) { if (_tpub_cache.hasOwnProperty( name )) {
                    appfun[ name ] = get_wrapped_chain_method_tf( name, _tpub_cache[ name ] ); 
                }}

                return appfun;

                // --- Details
                
                function get_wrapped_chain_method_tf( name, tf )
                {
                    return wrapped_chain_method;
                    function wrapped_chain_method( /*... arguments for `tf`...*/ )
                    {
                        return tf.apply( chainspec, arguments );
                    }
                }
                
                // steps for code & function generation
                var extern_arr   // array of non-string values (if any, given by _ChainSpec)
                ,   has_extern
                
                ,   spec_arr_optim      // after merging compatible `morph` loops + one extra loop
                ,   spec_arr_optim_solved   // after expliciting the last `store` step of `morph` loops (+ small optimization if simple `store v` preceded by `set v <expr>` --> single step `store expr`, as e.g. in map)

                
                ,   code_par_arr   // actual implementation (array of string: parameter names, `n_extern` extern names, if any, + `current`)
                ,   code_body      // actual implementation (string)
                
                ,   impl           // actual implementation (function)
                ;
                function appfun( /*an actual value, e.g. an array of numbers*/current )
                {
                    if (!impl)  // Generated only on-demand, i.e. when calling the application function
                    {
                        extern_arr    = chainspec.extern_arr;
                        has_extern    = extern_arr.length > 0;
                        
                        code_par_arr    = chainspec.externname_arr.concat( [ 'current' ] );
                        
                        spec_arr_optim        = optimize_spec_arr_merging_morphs( chainspec.spec_arr );
                        spec_arr_optim_solved = explicit_and_optimize_morph_store( spec_arr_optim );

                        code_body       = generate_code_body( spec_arr_optim_solved );

                        impl            = new Function( code_par_arr, code_body );
                    }
                    return has_extern
                        ?  impl.call( this, extern_arr.concat( current ) )
                        :  impl.call( this, current )
                    ;
                }
                
            } // function transfun

            function missing_args_transfun( /*... more arguments ... */)
            {
                var new_arg = Array.prototype.concat.call( this.arg, arguments )
                , n_missing = arity - new_arg.length
                ;
                if (n_missing < 0)
                    throw new Error( 'Too many arguments.' );
                
                if (n_missing > 0)
                    return missing_args_transfun.bind( new_arg );
                
                return transfun.apply( this.transfunThisObj, new_arg );
            }
            
        } // function tfun_from_objectdef( definition )

    } // function tfun( ... )

    // ---------- Private implementation

    var SPEC_ARR             = 'spec_arr'
    ,   EXTERN_ARR           = 'extern_arr'
    ,   I_2_EXTERN_NAME      = 'i2externname'
    ,   EXTERN_NAME_2_EXTERN = 'externname2extern'
    ,   _CS_proto = _ChainSpec.prototype
    
    ,   ARRAY   = 'array'
    ,   OBJECT  = 'object'
    ;
    _CS_proto.add_step = _CS_add_step;

    function _ChainSpec( /*?object?*/opt )
    {        
        this[ SPEC_ARR ]             = opt  ?  opt[ SPEC_ARR ]              :  [];

        this[ EXTERN_ARR ]           = opt  ?  opt[ EXTERN_ARR ]            :  [];
        this[ I_2_EXTERN_NAME ]      = opt  ?  opt[ I_2_EXTERN_NAME ]       :  {}; // mapping
        this[ EXTERN_NAME_2_EXTERN ] = opt  ?  opt[ EXTERN_NAME_2_EXTERN ]  :  {}; // mapping
    }
    
    function _CS_add_step( arity, spec_or_specgen, args )
    // Returns a new _ChainSpec instance that includes the new step.
    {
        arity === args.length  ||  null.bug;

        // shallow copies
        var spec_arr = this[ SPEC_ARR ].slice()
        ,   e_arr    = this[ EXTERN_ARR ].slice()
        ,   i2en     = Object.create( this[ I_2_EXTERN_NAME ] )
        ,   en2e     = Object.create( this[ EXTERN_NAME_2_EXTERN ] )
        ;

        // determine the specification for this new step
        var spec;
        if (arity === 0)
        {
            spec = spec_or_specgen;
        }
        else
        {
            // array of string
            var spec_s_arg = [];
            for (var n = args.length, i = 0; i < n; i++)
            {
                var one  = args[ i ]
                ,   is_s = 'string' === typeof one
                ;
                if (is_s)
                {
                    spec_s_arg.push( one );
                }
                else
                {
                    var e_i    = e_arr.length
                    ,   e_name = '__extern$' + e_i + '__'
                    ;
                    e_arr.push( one );
                    i2en[ e_i ]    = e_name;
                    en2e[ e_name ] = one;
                    
                    spec_s_arg.push( e_name )
                }
            }
            spec = spec_or_specgen.apply( null, spec_s_arg );
        }

        // append the step and return a new _ChainSpec instance
        spec_arr.push( spec );

        var opt = {};

        opt[ SPEC_ARR ]             = spec_arr;
        opt[ EXTERN_ARR ]           = e_arr;
        opt[ I_2_EXTERN_NAME ]      = i2en;
        opt[ EXTERN_NAME_2_EXTERN ] = en2e;

        return new _ChainSpec( opt );
    }

    function optimize_spec_arr_merging_morphs( spec_arr )
    {
        var spec_arr_optim = spec_arr.slice();  // copy
        for (var i = spec_arr_optim.length, next = null; i--;)
        {
            var one = spec_arr_optim[ i ];
            if (next)
            {               
                var one_looptype = get_looptype( one )  ||  null

                ,   one_loop  = one_looptype  &&  one[ one_looptype ]
                ,   one_morph = one_loop  &&  one_loop.morph

                // For an optimization to take place, both `one` and
                // `next` must have the same looptype.
                ,  next_loop   = next[ one_looptype ]  
                ,  next_morph  = next_loop  &&  next_loop.morph

                ,  merged_spec = null
                ;
                if (one_morph  &&  next_morph  &&  one_morph === next_morph)
                {
                    // Continue morphing (e.g. map, filter)
                    var conserve_array_length = one_morph === ARRAY  &&
                        one_morph .conserve_array_length  &&
                        next_morph.conserve_array_length

                    ,  new_body_add = arrify(  one_loop.body_add )
                        .concat( arrify( next_loop.body_add ) )

                    ,  new_spec = {}
                    ,  new_loop = {}
                    ;
                    new_spec[ one_looptype ] = new_loop;
                    new_loop.morph           = one_morph;
                    new_loop.body_add        = new_body_add;

                    merged_spec = new_spec;
                }
                else if (one_morph  &&  next_loop  &&  !next_morph)
                {
                    // Finish morphing (e.g. map, filter, reduce)
                    var new_spec = {}
                    ,   new_loop = Object.create( next_loop )  // e.g. `beforeloop`, `afterloop`

                    ,   new_body_add = arrify( one_loop.body_add )
                        .concat( arrify( next_loop.body_add ) )
                    ;
                    new_spec[ one_looptype ] = new_loop;
                    new_loop.body_add        = new_body_add;
                    
                    merged_spec = new_spec;
                }

                if (merged_spec)
                {
                    // An optimization happens here: two loops merged.
                    spec_arr_optim[ i ].splice( i, 2, merged_spec );  
                }
            }
            next = one;
        }

    }

    function explicit_and_optimize_morph_store( spec_arr_optim__or__spec )
    {
        if (spec_arr_optim__or__spec instanceof Array)
            return spec_arr_optim__or__spec.map( explicit_and_optimize_morph_store );

        var spec     = spec_arr_optim__or__spec
        ,   looptype = get_looptype( spec )
        ,   loop     = looptype  &&  spec[ looptype ]
        ,   morph    = loop  &&  loop.morph

        , new_spec = spec;
        ;
        if (morph)
        {
            new_spec = {};
            var conserve_array_length = morph === ARRAY  &&  loop.conserve_array_length

            ,   before_loop = morph === ARRAY

                ?  [ { decl : [ 'n', 'current.length' ] }
                     , { decl : [ 'out'
                                  , conserve_array_length
                                  ?  'new Array(n)'
                                  :  '[]'
                                ]
                       }
                   ]

                :  [ { decl : [ 'out', '{}' ] } ]

            ,   after_loop = [ { set : [ 'current', 'out' ] } ]
            
            ,   new_loop = {}
            ,   new_body = arrify( loop.body_add ).slice()  // copy
            
            , to_store = 'v'
            , tmp = new_body[ new_body.length - 1 ]
            ;
            if ((tmp = tmp  &&  tmp.set)  &&  tmp[ 0 ] === to_store)
            {
                // Small optimization: compute and store in one line.
                new_body.pop();
                to_store = tmp[ 1 ];
            }
            new_body.push( morph === OBJECT  ||  conserve_array_length
                           
                           ?  { set : [ 'out', 'k', to_store ] }
                           
                           :  { push : [ 'out', to_store ] }
                         );
            
            new_loop.bodyadd = new_body;
            new_spec[ looptype ] = new_loop;
        }
        return new_spec;
    }

    function generate_code_body( spec_arr_optim_solved )
    {
        xxx //pay attention to restwrap + non-loops must have stepadd
    }

    // ---------- Private details: tool functions

    function arrify( obj_or_arr )
    {
        return obj_or_arr instanceof Array  ?  obj_or_arr  :  [ obj_or_arr ];
    }

    function get_looptype( /*object*/spec )
    {
        return L_LEFT in spec  ?  L_LEFT
            :  L_RIGHT in spec  ?  L_RIGHT
            :  L_IN    in spec  ?  L_IN
            :  null
        ;
    }
    
})();
