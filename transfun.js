/*
  transfun.js
  
  Copyright Guillaume Lathoud 2016
  Boost License: see the file ./LICENSE

  Contact: glat@glat.info
*/

/*global tval tpub tfun fullexpr 
  map filter reduce redinit sum prod decl
  console global exports
  Map
*/

// transfun: merge loops for speed in JavaScript.
//
// Transformation functions generate code where:
//
// (1) loops do as few function calls as possible,
//
// (2) consecutive loops have been merged into a single loop, whenever
// possible.
//
// Guillaume Lathoud
// glat@glat.info


var global, exports; // NPM support [github#1]
(function (global) {

    var L_LEFT  = 'loopleftright'
    ,   L_RIGHT = 'looprightleft'
    ,   L_IN    = 'loopin'

    ,   ARRAY   = 'array'
    ,   OBJECT  = 'object'

    ,   _emptyObj = {}
    ;
    
    // ---------- Public API: global namespace access

    global.fullexpr = fullexpr_;
    global.tval     = tval_;
    global.tpub     = tpub_;
    global.tfun     = tfun_;

    // ---------- Public API: TF namespace access

    global.TF = { fullexpr : fullexpr_
                  , tval   : tval_
                  , tpub   : tpub_
                  , tfun   : tfun_
                };
    
    // --- Publish a few common transfunctions, specifying an
    // internally imperative implementation for a functional.

    tpub_( 'map', {
        arity     : 1
        , specgen : function ( /*string | externcall object*/transform ) {
            return { loopleftright : {
                morph : 'array'  // --> means, among other, reducable + depending on conserve_array_length, init & bodyend (store)
                , conserve_array_length : true
                , bodyadd : { set : [ 'v', fullexpr( transform, 'v', 'k' ) ] }
            }};
        }
    });

    tpub_( 'mapRight', {
        arity     : 1
        , specgen : function ( /*string | externcall object*/transform ) {
            return { looprightleft : {
                morph : 'array'  // --> means, among other, reducable + depending on conserve_array_length, init & bodyend (store)
                , conserve_array_length : true
                , bodyadd : { set : [ 'v', fullexpr( transform, 'v', 'k' ) ] }
            }};
        }
    });

    tpub_( 'mapIn', {
        arity     : 1
        , specgen : function ( /*string | externcall object*/transform ) {
            return { loopin : {
                morph     : 'object'  // --> means, among other, reducable, init & bodyend (store)
                , bodyadd : { set : [ 'v', fullexpr( transform, 'v', 'k' ) ] }
            }};
        }
    });

    tpub_( 'filter', {
        arity     : 1
        , specgen : function ( /*string | externcall object*/test ) {
            return { loopleftright : {
                morph     : 'array'  // --> means, among other, reducable + depending on conserve_array_length (always false here), init & bodyend (store)
                , bodyadd : { restwrap : function ( rest ) { return { 'if' : fullexpr( test, 'v', 'k' ), 'then' : rest }; } }
            }};
        }
    });

    tpub_( 'filterRight', {
        arity     : 1
        , specgen : function ( /*string | externcall object*/test ) {
            return { looprightleft : {
                morph     : 'array'  // --> means, among other, reducable + depending on conserve_array_length (always false here), init & bodyend (store)
                , bodyadd : { restwrap : function ( rest ) { return { 'if' : fullexpr( test, 'v', 'k' ), 'then' : rest }; } }
            }};
        }
    });
    
    tpub_( 'filterIn', {
        arity     : 1
        , specgen : function ( /*string | externcall object*/test ) {
            return { loopin : {
                morph     : 'object'  // --> means, among other, reducable + depending on conserve_array_length (always false here), init & bodyend (store)
                , bodyadd : { restwrap : function ( rest ) { return { 'if' : fullexpr( test, 'v', 'k' ), 'then' : rest }; } }
            }};
        }
    });
    
    tpub_( 'reduce', {
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

    tpub_( 'reduceRight', {
        arity : 1
        , specgen : function ( /*string | externcall object*/combine ) {
            return { looprightleft : {
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

    tpub_( 'reduceIn', {
        arity : 1
        , specgen : function ( /*string | externcall object*/combine ) {
            return { loopin : {
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


    
    tpub_( 'redinit', {
        arity : 2
        , specgen : function ( /*string*/redinit, /*string | externcall object*/combine ) {
            return { loopleftright : {
                beforeloop  : { decl : [ 'out', fullexpr( redinit, 'current' ) ] }
                , bodyadd   : { set : [ 'out', fullexpr( combine, 'out', 'v' ) ] }
                , afterloop : { set : [ 'current', 'out' ] }
            }};
        }
    });

    tpub_( 'redinitRight', {
        arity : 2
        , specgen : function ( /*string*/redinit, /*string | externcall object*/combine ) {
            return { looprightleft : {
                beforeloop  : { decl : [ 'out', fullexpr( redinit, 'current' ) ] }
                , bodyadd   : { set : [ 'out', fullexpr( combine, 'out', 'v' ) ] }
                , afterloop : { set : [ 'current', 'out' ] }
            }};
        }
    });

    tpub_( 'redinitIn', {
        arity : 2
        , specgen : function ( /*string*/redinit, /*string | externcall object*/combine ) {
            return { loopin : {
                beforeloop  : { decl : [ 'out', fullexpr( redinit, 'current' ) ] }
                , bodyadd   : { set : [ 'out', fullexpr( combine, 'out', 'v' ) ] }
                , afterloop : { set : [ 'current', 'out' ] }
            }};
        }
    });
    

    tpub_( 'breakWhen', {
        arity     : 1
        , specgen : function ( /*string | externcall object*/test ) {
            return { loopleftright : { bodyadd : { 'if' : fullexpr( test, 'v', 'k' ), 'then' : 'break' } }};
        }
    });

    tpub_( 'takeWhile', {
        arity : 1
        , specgen : function ( /* string | externcall object*/test ) {
            return { loopleftright : {
                morph     : 'array'
                , bodyadd : { restwrap : function ( rest ) { return { 'if' : fullexpr( test, 'v', 'k' ), then : rest, 'else' : 'break' }; } }
            }};
        }
    });

    tpub_( 'takeWhileIn', {
        arity : 1
        , specgen : function ( /* string | externcall object*/test ) {
            return { loopin : {
                morph     : 'object'
                , bodyadd : { restwrap : function ( rest ) { return { 'if' : fullexpr( test, 'v', 'k' ), then : rest, 'else' : 'break' }; } }
            }};
        }
    });

    // -- and
    
    tpub_( 'and', {
        arity : 0
        , spec : { loopleftright : {
            beforeloop : { decl : [ 'out', 'true' ] }
            , bodyadd  : [
                { set : [ 'out', 'v' ] }
                , { 'if' : { not : 'out' } , 'then' : 'break' }
                ]
            , afterloop : { set : [ 'current', 'out' ] }
        }}
    });

    tpub_( 'andRight', {
        arity : 0
        , spec : { looprightleft : {
            beforeloop : { decl : [ 'out', 'true' ] }
            , bodyadd  : [
                { set : [ 'out', 'v' ] }
                , { 'if' : { not : 'out' } , 'then' : 'break' }
                ]
            , afterloop : { set : [ 'current', 'out' ] }
        }}
    });

    tpub_( 'andIn', {
        arity : 0
        , spec : { loopin : {
            beforeloop : { decl : [ 'out', 'true' ] }
            , bodyadd  : [
                { set : [ 'out', 'v' ] }
                , { 'if' : { not : 'out' } , 'then' : 'break' }
                ]
            , afterloop : { set : [ 'current', 'out' ] }
        }}
    });

    // -- or
    
    tpub_( 'or', {
        arity : 0
        , spec : { loopleftright : {
            beforeloop : { decl : [ 'out', 'false' ] }
            , bodyadd  : [
                { set : [ 'out', 'v' ] }
                , { 'if' : 'out' , 'then' : 'break' }
            ]
            , afterloop : { set : [ 'current', 'out' ] }
        }}
    });

    tpub_( 'orRight', {
        arity : 0
        , spec : { looprightleft : {
            beforeloop : { decl : [ 'out', 'false' ] }
            , bodyadd  : [
                { set : [ 'out', 'v' ] }
                , { 'if' : 'out' , 'then' : 'break' }
            ]
            , afterloop : { set : [ 'current', 'out' ] }
        }}
    });

    tpub_( 'orIn', {
        arity : 0
        , spec : { loopin : {
            beforeloop : { decl : [ 'out', 'false' ] }
            , bodyadd  : [
                { set : [ 'out', 'v' ] }
                , { 'if' : 'out' , 'then' : 'break' }
            ]
            , afterloop : { set : [ 'current', 'out' ] }
        }}
    });


    // "Values" extraction:
    
    tpub_( 'o2values', {
        arity  : 0
        , spec : { loopin : {
            beforeloop  : { decl : [ 'out', '[]' ] }
            , bodyadd   : { push : [ 'out', 'v' ] }
            , afterloop : { set : [ 'current', 'out' ] }
        }}
    });

    // "Key" conversions:

    tpub_( 'o2keys', {
        arity : 0
        , spec : { stepadd : { set : [ 'current', 'Object.keys(current)' ] } }
    });

    tpub_( 'keys2o', {
        arity  : 0
        , spec : { loopleftright : {
            beforeloop  : { decl : [ 'out', '{}' ] }
            , bodyadd   : { set_at : [ 'out', 'v', 'true' ] }
            , afterloop : { set : [ 'current', 'out' ] }
        }}
    });


    // "Key-values" conversions:

    tpub_( 'o2kv', {
        arity  : 0
        , spec : { loopin : {
            beforeloop  : { decl : [ 'out', '[]' ] }
            , bodyadd   : { push : [ 'out', '[k, v]' ] }
            , afterloop : { set : [ 'current', 'out' ] }
        }}
    });

    tpub_( 'kv2o', {
        arity  : 0
        , spec : { loopleftright : {
            beforeloop  : { decl : [ 'out', '{}' ] }
            , bodyadd   : { set_at : [ 'out', 'v[0]', 'v[1]' ] }
            , afterloop : { set : [ 'current', 'out' ] }
        }}
    });

    tpub_( 'decl', {
        arity : 2
        , specgen : function ( /*string*/name, /*string | externcall object*/expr ) {
            return {
                stepadd : { decl : [ name, fullexpr( expr, 'current' ) ] }
            };
        }
    });

    
    tpub_( 'sum', redinit( '0', '+' ) );

    tpub_( 'join', '#s',  '.join(#s)' );
    tpub_( 'split', '#s', '.split(#s)' );
    
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
            var arr = Array.apply(
                null
                , 'function' === typeof f  ?  arguments  :  f
            )
            
            ,   n   = arr.length
            ,   v   = arr[ 0 ].apply( thisObj, args )
            ;
            for (var i = 1; i < n; i++)
                v = arr[ i ].call( thisObj, v );
            
            return v;
        }
    }


    var _tpub_cache;
    function tpub_( name, spec_or_fun_or_str /*... more strings in the shortcut variant...*/ )
    {
        (name  ||  null).substring.call.a;

        _tpub_cache  ||  (_tpub_cache = {});
        if (name in _tpub_cache)
            throw new Error( '"' + name + '" already published!' );

        var tf = _tpub_cache[ name ] = tfun_.apply(
            null
            , with_default_loopname( Array.prototype.slice.call( arguments, 1 ) )
        );
        
        // Also publish the function to the global namespace
        // 
        // if arity 0 -> publish the appfun directly
        //
        // if arity > 0 -> publish the transfun
        new Function( 'tf'
                      , 'TF["' + name + '"]=' + name + '=tf' + (
                          tf._tf_arity > 0  ?  ''  :  '()'
                      )
                    )( tf );

        return tf;

        function with_default_loopname( arg )
        {
            var x = arg[ 0 ];
            if ('object' === typeof x)
            {
                if (x.spec)
                {
                    x = Object.create( x );
                    x.spec = try_to_add_default_loopname( x.spec );
                    arg[ 0 ] = x;
                }
                else if (x.specgen)
                {
                    x = Object.create( x );
                    x.specgen = get_default_loopname_wrapper( x.specgen );
                    arg[ 0 ] = x;
                }
            }
            return arg;
            
            function try_to_add_default_loopname( spec, opt )
            {
                var looptype = get_looptype( spec );
                if (looptype)
                {
                    var loop = spec[ looptype ];
                    if (!loop.loopname)
                        loop.loopname = '-- ' + name + '(' + (opt  ?  ' ' + Array.apply( null, opt )
                                                              .map( function ( s ) { return '`' + (s.externcall  ||  s) + '`' ; })
                                                              .join( ', ' ) + ' '  :  ''
                                                             ) + ') --'
                }
                return spec;
            }

            function get_default_loopname_wrapper( specgen )
            {
                return default_loopname_wrapper;
                function default_loopname_wrapper( /*...*/ )
                {
                    return try_to_add_default_loopname( specgen.apply( this, arguments ), arguments );
                }
            }
        }
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
            return externcall + '(' + leftvar + (rightvar  ?  ',' + rightvar  :  '') + ')';
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

        return '(' + code + ')';
    }
    
    var _transfun_id;  // for caching [github#2], to speedup the code generation
    function tfun_( def_or_fun_or_str /*... more strings in the string shortcut variant...*/ )
    {
        var tof = typeof def_or_fun_or_str;

        if ('string' === tof)
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
                           , specgen : shortcut_specgen
                         }
                       );
            
        }

        // General variant
        if (1 !== arguments.length)
            throw new Error( 'General variant requires a single specification (object or function).' );

        var fun;
        
        if ('function' === tof)
        {
            var f = def_or_fun_or_str;
            if (f._is_transfun)
            {
                fun = f;
            }
            else
            {
                var appfun = f;
                fun = appfun._tf_bound;
            }
        }
        else
        {
            var def  = def_or_fun_or_str;
            fun  = 'object' === typeof def  ?  tfun_from_objectdef( def )  :  def;
        }
        
        if (!('function' === typeof fun  &&  fun._is_transfun))
            throw new Error( 'Invalid specification! Must be an object or a transfunction.' );
        
        return fun;
        
        // --- Details for the string shortcut variant

        function shortcut_specgen( /*...arguments...*/ )
        {
            shortcut_arity === arguments.length  ||  null.bug;

            var ret = shortcut_body;
            for (var i = shortcut_par_rx.length; i--;)
                ret = ret.replace( shortcut_par_rx[ i ], arguments[ i ] );

            return { stepadd : { set : [ 'current', fullexpr( ret, 'current' ) ] } };
        }

        // --- Details for the object definition variant

        function tfun_from_objectdef( definition )
        {
            var arity = definition.arity
            ,   spec  = arity === 0  &&  definition.spec
            ,   specgen = arity > 0  &&  definition.specgen

            ,   tf_id = _transfun_id = 1 + ~~_transfun_id; // [github#2]
            ;
            transfun._is_transfun = true;
            transfun._tf_arity    = arity;
            transfun._tf_id       = tf_id;
            
            return transfun;
            
            function transfun( /*...`arity` arguments: array of (code string | non-string extern) ... */ )
            {
                if (arity !== arguments.length)
                    return missing_args_transfun.apply( { transfunThisObj : this, arg : [] }, arguments );
                
                var chainspec = (
                    this instanceof _ChainSpec  ?  this  :  new _ChainSpec
                )
                    .add_step( arity, tf_id, spec  ||  specgen, transfun, arguments )

                , cached_appfun = chainspec.appfun  // avoid duplicated work [github#2]
                ;
                if (!cached_appfun)
                {
                    // Necessary to support `next` (see `ChainSpec.concat_call_tf`)
                    appfun._tf_chainspec = chainspec;
                    
                    // Necessary to support `tfun( <appfun> )`
                    var _tf_bound_arg = arguments;
                    appfun._tf_bound = function () { return transfun.apply( this, _tf_bound_arg ); }
                    appfun._tf_bound._is_transfun = true;
                    
                    // For convenience: give access
                    appfun.getBodyCode = appfun_getBodyCode;
                    
                    cached_appfun = chainspec.appfun = mix_published_tfun_methods_into_appfun( chainspec, appfun );
                }
                return cached_appfun;
                
                // --- Details

                // steps for code & function generation
                var extern_arr   // array of non-string values (if any, given by _ChainSpec)
                ,   has_extern
                
                ,   spec_arr_optim          // after merging compatible `morph` loops + one extra loop
                ,   spec_arr_optim_solved   // after expliciting the last `store` step of `morph` loops
                
                ,   code_par_arr   // actual implementation: parameters (array of string: parameter names, `n_extern` extern names, if any, + `current`)
                ,   code_body      // actual implementation: body (string)
                
                ,   impl           // actual implementation (function)
                ;
                function appfun( /*an actual value, e.g. an array of numbers*/current )
                {
                    if (!impl)  // Generated only on-demand, i.e. when calling the application function
                        ensure_appimpl();

                    return has_extern
                        ?  impl.apply( this, extern_arr.concat( [ current ] ) )
                        :  impl.call( this, current )
                    ;
                }

                function appfun_getBodyCode()
                {
                    ensure_appimpl();
                    return code_body;
                }

                function ensure_appimpl()
                {
                    if (!impl)
                    {
                        extern_arr    = chainspec.extern_arr;
                        has_extern    = extern_arr.length > 0;
                        
                        code_par_arr    = chainspec.externname_arr.concat( [ 'current' ] );
                        
                        spec_arr_optim        = optimize_spec_arr_merging_morphs( chainspec.spec_arr );
                        spec_arr_optim_solved = explicit_and_optimize_morph_store( spec_arr_optim );

                        code_body       = generate_code_body( spec_arr_optim_solved );

                        impl            = new Function( code_par_arr, code_body );

                        // For debugging
                        appfun._tf_dbg = {
                            impl : impl
                            , code_body : code_body
                            , spec_arr_optim_solved : spec_arr_optim_solved
                            , spec_arr_optim : spec_arr_optim
                            , code_par_arr : code_par_arr
                            , has_extern : has_extern
                            , extern_arr : extern_arr
                            , chainspec : chainspec
                        };
                    }
                }
                
            } // function transfun

            function missing_args_transfun( /*... more arguments ... */)
            {
                var new_arg = this.arg.concat( Array.apply( null, arguments ) )
                , n_missing = arity - new_arg.length
                ;
                if (n_missing < 0)
                    throw new Error( 'Too many arguments.' );
                
                if (n_missing > 0)
                {
                    var ret = missing_args_transfun.bind( { transfunThisObj : this.transfunThisObj, arg : new_arg } );
                    ret._is_incomplete_transfun = true;
                    ret._is_transfun = true;
                    ret._tf_arity    = n_missing;
                    return ret;
                }
                
                return transfun.apply( this.transfunThisObj, new_arg );
            }
            
        } // function tfun_from_objectdef( definition )

    } // function tfun( ... )

    // ---------- Private implementation

    var _CS_cache // [github#2]
    ;

    function _ChainSpec( /*?object (all or nothing)?*/opt )
    {
        var TFARG_ARR            = 'tfarg_arr'
        ,   SPEC_ARR             = 'spec_arr'
        ,   EXTERN_ARR           = 'extern_arr'
        ,   EXTERNNAME_ARR       = 'externname_arr'
        ,   I_2_EXTERN_NAME      = 'i2externname'
        ,   EXTERN_NAME_2_EXTERN = 'externname2extern'

        ,   CACHE_KEY = '_cache_key'
        ;

        // [github#2] to speedup the code generation
        this[ CACHE_KEY ]   = opt  ?  opt[ CACHE_KEY ]  :  [];

        // arrays
        this[ TFARG_ARR ]            = opt  ?  opt[ TFARG_ARR ]             :  [];
        this[ SPEC_ARR ]             = opt  ?  opt[ SPEC_ARR ]              :  [];
        this[ EXTERN_ARR ]           = opt  ?  opt[ EXTERN_ARR ]            :  [];
        this[ EXTERNNAME_ARR ]       = opt  ?  opt[ EXTERNNAME_ARR ]        :  [];

        // mappings (objects)
        this[ I_2_EXTERN_NAME ]      = opt  ?  opt[ I_2_EXTERN_NAME ]       :  {};
        this[ EXTERN_NAME_2_EXTERN ] = opt  ?  opt[ EXTERN_NAME_2_EXTERN ]  :  {};

        this.add_step       = _CS_add_step;
        this.concat_call_tf = _CS_concat_call_tf;
        
        function _CS_add_step( arity, tf_id, spec_or_specgen, transfun, args )
        // Returns a new _ChainSpec instance that includes the new step.
        {
            arity === args.length  ||  null.bug;

            // [github#2] to speedup the code generation
            var _CS_cache_key = this[ CACHE_KEY ].slice();
            _CS_cache_key.push( tf_id );
            _CS_cache_key.push.apply( _CS_cache_key, args );
            
            _CS_cache  ||  (_CS_cache = _create_CS_cache());
            var already = _CS_cache.get( _CS_cache_key );
            if (already)
                return already;
            

            // shallow copies
            var tfarg_arr = this[ TFARG_ARR ].slice()
            ,    spec_arr = this[ SPEC_ARR ].slice()
            ,    e_arr    = this[ EXTERN_ARR ].slice()
            ,    en_arr   = this[ EXTERNNAME_ARR ].slice()
            ,    i2en     = Object.create( this[ I_2_EXTERN_NAME ] )
            ,    en2e     = Object.create( this[ EXTERN_NAME_2_EXTERN ] )
            ;

            // remember who called me and how, for `.concat_call_tf` (and `next`)
            tfarg_arr.push( { tf : transfun, arg : args } );
            
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
                        // code string
                        spec_s_arg.push( one );
                    }
                    else
                    {
                        // anything else (non-string)
                        var e_i    = e_arr.length
                        ,   e_name = '__extern$' + e_i + '__'
                        ;
                        e_arr .push( one );
                        en_arr.push( e_name );
                        i2en[ e_i ]    = e_name;
                        en2e[ e_name ] = one;
                        
                        spec_s_arg.push( { externcall : e_name } )
                    }
                }
                spec = spec_or_specgen.apply( null, spec_s_arg );
            }

            // Optional: add some loopname comment (useful if looking
            // at the code produced for merged loops, to trace back).
            
            var looptype = get_looptype( spec );
            if (looptype)
            {
                var loop     = spec[ looptype ]
                ,   loopname = loop.loopname
                ;
                if (loopname)
                {
                    var tmp = {};
                    for (var k in loop) { if (!(k in _emptyObj)  &&  k !== 'loopname') {
                        tmp[ k ] = loop[ k ];
                    }}
                    tmp.bodyadd = [ {}  // empty line to breathe a bit
                                    , { comment : loopname } ].concat( tmp.bodyadd );
                    
                    spec = {};
                    spec[ looptype ] = tmp;
                }
            }
            
            // Checks
            
            var looptype = get_looptype( spec );
            if (looptype)
            {
                check_exactly_has_properties( spec, looptype )
                var loop = spec[ looptype ]
                ,  morph = loop.morph
                ;
                if (!morph)
                {
                    check_exactly_has_properties( loop, { beforeloop : 1, bodyadd : 1, afterloop : 1 } );
                }
                else
                {
                    if (morph !== ARRAY  &&  morph !== OBJECT)
                        throw new Error( 'Invalid morph value "' + morph + '".' );
                    
                    var optional = ARRAY === morph  &&  { conserve_array_length : 1 };
                    check_exactly_has_properties( loop, { morph : 1, bodyadd : 1 }, optional );
                }
            }
            else
            {
                check_exactly_has_properties( spec, { stepadd : 1 } );
            }
            
            // append the step and return a new _ChainSpec instance
            spec_arr.push( spec );
            
            var opt = {};

            opt[ CACHE_KEY ]            = _CS_cache_key;
            opt[ TFARG_ARR ]            = tfarg_arr;
            opt[ SPEC_ARR ]             = spec_arr;
            opt[ EXTERN_ARR ]           = e_arr;
            opt[ EXTERNNAME_ARR ]       = en_arr;
            opt[ I_2_EXTERN_NAME ]      = i2en;
            opt[ EXTERN_NAME_2_EXTERN ] = en2e;

            var ret = new _ChainSpec( opt );

            _CS_cache.set( _CS_cache_key, ret );  // [github#2]

            return ret;
        }

        function _CS_concat_call_tf( other )
        {
            if (!(other instanceof _ChainSpec))
                null.bug;

            // We start with this chainspec...
            var chainspec = this

            // ...and redo each call of the other chainspec.
            ,   tfarg_arr = other[ TFARG_ARR ]
            ,   ret
            ;
            for (var n = tfarg_arr.length, i = 0; i < n; i++)
            {
                var tfarg = tfarg_arr[ i ];
                ret       = tfarg.tf.apply( chainspec, tfarg.arg );
                chainspec = ret._tf_chainspec;
            }
            return ret;
        }
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

                    ,  new_bodyadd = arrify(  one_loop.bodyadd )
                        .concat( arrify( next_loop.bodyadd ) )

                    ,  new_spec = {}
                    ,  new_loop = {}
                    ;
                    new_spec[ one_looptype ] = new_loop;
                    new_loop.morph           = one_morph;

                    if (conserve_array_length)
                        new_loop.conserve_array_length = conserve_array_length;
                    
                    new_loop.bodyadd         = new_bodyadd;

                    merged_spec = new_spec;
                }
                else if (one_morph  &&  next_loop  &&  !next_morph)
                {
                    // Finish morphing (e.g. map, filter, reduce)
                    var new_spec = {}
                    ,   new_loop = Object.create( next_loop )  // e.g. `beforeloop`, `afterloop`

                    ,   new_bodyadd = arrify( one_loop.bodyadd )
                        .concat( arrify( next_loop.bodyadd ) )
                    ;
                    new_spec[ one_looptype ] = new_loop;

                    new_loop.beforeloop      = next_loop.beforeloop;
                    new_loop.bodyadd         = new_bodyadd;
                    new_loop.afterloop       = next_loop.afterloop;
                    
                    merged_spec = new_spec;
                }

                if (merged_spec)
                {
                    // An optimization happens here: two loops merged.
                    spec_arr_optim.splice( i, 2, merged_spec );  
                }
            }
            next = spec_arr_optim[ i ];
            
        } // for loop (last to first)
        return spec_arr_optim;
    }

    function explicit_and_optimize_morph_store( spec_arr_optim__or__spec )
    {
        if (spec_arr_optim__or__spec instanceof Array)
            return spec_arr_optim__or__spec.map( explicit_and_optimize_morph_store );

        var spec     = spec_arr_optim__or__spec
        ,   looptype = get_looptype( spec )
        ,   loop     = looptype  &&  spec[ looptype ]
        ,   morph    = loop  &&  loop.morph

        , new_spec   = spec;
        ;
        if (morph)
        {
            new_spec = {};
            var conserve_array_length = morph === ARRAY  &&  loop.conserve_array_length

            ,   beforeloop = morph === ARRAY

                ?  [ { decl : [ 'out'
                                , conserve_array_length  ?  'new Array(n)'  :  '[]'
                              ]
                     }
                   ]

                :  [ { decl : [ 'out', '{}' ] } ]

            ,   afterloop = [ { set : [ 'current', 'out' ] } ]
            
            ,   new_loop = {}
            ,   new_body = arrify( loop.bodyadd ).slice()  // copy
            
            , to_store = 'v'
            , tmp = new_body[ new_body.length - 1 ]
            ;
            if ((tmp = tmp  &&  tmp.set)  &&  tmp[ 0 ] === to_store)
            {
                // Small optimization: compute and store in one step.
                new_body.pop();
                to_store = tmp[ 1 ];
            }
            new_body.push( morph === OBJECT  ||  conserve_array_length
                           
                           ?  { set_at : [ 'out', 'k', to_store ] }
                           
                           :  { push : [ 'out', to_store ] }
                         );

            new_loop.beforeloop  = beforeloop;
            new_loop.bodyadd     = new_body;
            new_loop.afterloop   = afterloop;
            
            new_spec[ looptype ] = new_loop;
        }
        return new_spec;
    }

    function generate_code_body( /*array*/spec_arr_optim_solved )
    {
        var code = []
        , needs_emptyObj = false
        ;
        spec_arr_optim_solved.forEach( one_spec_push_code );

        if (needs_emptyObj)
            code.unshift(  'var _emptyObj = {};' );

        var last = /^\s*current\s*=\s*([^=][\s\S]*)$/.exec( code[ code.length - 1 ] );
        if (last)
        {
            code.pop();
            code.push( 'return ' + last[ 1 ] );
        }
        else
        {
            code.push( 'return current;' );
        }
        
        return code.map( indent_and_terminate_code_line, { indent : 0 } ).join( '\n' );

        // --- Details

        function one_spec_push_code( /*object*/spec )
        {
            var looptype = get_looptype( spec );
            if (looptype)
            {
                check_exactly_has_properties( spec, looptype );

                var loop       = spec[ looptype ];
                
                check_exactly_has_properties( loop, { beforeloop : 1, bodyadd : 1, afterloop : 1 } );

                var is_l_left  = L_LEFT  === looptype
                ,   is_l_right = L_RIGHT === looptype
                ,   is_l_in    = L_IN    === looptype
                
                ,   beforeloop = solve_restwrap( arrify( loop.beforeloop ) )
                ,   bodyadd    = solve_restwrap( arrify( loop.bodyadd ) )
                ,   afterloop  = solve_restwrap( arrify( loop.afterloop ) )
                ;
                
                if (is_l_left  ||  is_l_right)
                    code.push( 'var n = current.length' );
                
                beforeloop.forEach( push_codestep );

                code.push
                (
                    is_l_left  ?  'for (var k = 0; k < n; k++ ) {'
                        :  is_l_right  ?  'for (var k = n; k--;) {'
                        :  is_l_in     ?  (needs_emptyObj = true
                                           , 'for (var k in current) { if (!(k in _emptyObj)) {'
                                          )
                        :  null.bug
                );

                code.push( 'var v = current[ k ]' );

                bodyadd.forEach( push_codestep );

                code.push
                (
                    is_l_left  ||  is_l_right  ?  '}'
                        :  is_l_in  ?  '}}'
                        :  null.bug
                );
                
                afterloop.forEach( push_codestep );
            }
            else
            {
                check_exactly_has_properties( spec, { stepadd : 1 } );

                solve_restwrap( arrify( spec.stepadd ) )
                    .forEach( push_codestep )
                ;
            }

            function push_codestep( step )
            {
                var a = one_step_2_code( step ); // string | array
                push_codestep2( a );
                function push_codestep2( a )
                {
                    if ('string' === typeof a)
                        code.push( a );
                    else
                        a.forEach( push_codestep2 );
                }
            }
            
        }  // function one_spec_push_code

        function indent_and_terminate_code_line( s )
        {
            var is_closing = /^\s*\}/.test( s )
            ,   is_opening = /\{\s*$/.test( s )
            ,   is_comment = /^\s*\/\/.*$/.test( s )  ||  /^\s*\/\*.*\*\/\s*$/.test( s )
            ,   is_empty   = /^\s*$/.test( s )
            
            ,   indent = this.indent + (is_closing  ?  -1  :  0);
            ;
            this.indent = indent + (is_opening  ?  +1  :  0);

            return Array.apply( null, Array( indent << 2) )
                .map( function () { return ' '; })
                .join('') +
                s +
                (is_empty  ||  is_opening  ||  is_closing  ||  is_comment  ?  ''  :  ';')
            ;
        }
        
    }  // function generate_code_body

    // ---------- Private details: tool functions

    function arrify( obj_or_arr )
    {
        return obj_or_arr
            ?  (obj_or_arr instanceof Array  ?  obj_or_arr  :  [ obj_or_arr ])
        :  []
        ;
    }

    function check_exactly_has_properties( /*object*/o, /*object: mandatory set of properties*/pset, /*?object?*/opt )
    {
        if ('string' === typeof pset)
        {
            var p = pset;
            pset = {};
            pset[ p ] = 1;
        }


        for (var p in pset)
        {
            if (pset.hasOwnProperty( p )  &&  !o[ p ]) 
                throw new Error( 'Missing property "' + p + '".' );
        }

        for (var p in o) { if (!(p in _emptyObj)) {  // More flexible than hasOwnProperty
            if (!(pset[ p ]  ||  opt  &&  opt[ p ]))
                throw new Error( 'Unknown property "' + p + '".' );
        }}
    }

    function get_looptype( /*object*/o )
    {
        return L_LEFT  in o  ?  L_LEFT
            :  L_RIGHT in o  ?  L_RIGHT
            :  L_IN    in o  ?  L_IN
            :  null
        ;
    }

    function mix_published_tfun_methods_into_appfun( chainspec, appfun )
    {
        if (_tpub_cache)
        {
            for (var name in _tpub_cache) { if (_tpub_cache.hasOwnProperty( name )) {
                appfun[ name ] = get_wrapped_chain_method_tf( name, _tpub_cache[ name ] ); 
            }}
        }

        appfun.next = appfun_next;
        
        return appfun;


        function get_wrapped_chain_method_tf( /*string*/name, /*function*/tf )
        {
            return wrapped_chain_method;
            function wrapped_chain_method( /*... arguments for `tf`...*/ )
            {
                return tf.apply( chainspec, arguments );
            }
        }

        function appfun_next( /*string | appfun | transfun*/s_f)
        {
            var tf, arg;
            
            if ('string' === typeof s_f)
            {
                tf = tfun({
                    arity : 1
                    , specgen : function ( /*string | externcall object*/transform ) {
                        return { stepadd : { set : [ 'current', fullexpr( transform, 'current' ) ] } };
                    }
                });
                arg = [ s_f ];
                return tf.apply( chainspec, arg );
            }
            else
            {
                var other = s_f._tf_chainspec;
                if (!(other  &&  other instanceof _ChainSpec))
                    throw new Error( 'next(s_or_f): s_or_f must be either a codestring or an appfun!' );

                return chainspec.concat_call_tf( other );
            }
        }
        
    }

    function one_step_2_code( /*object*/step )
    {
        return step  ?  one_expr_2_code( step )  :  '';
    }

    function one_expr_2_code( /*string | object*/expr )
    {
        var oe2c = one_expr_2_code
        , x,y,z
        ;
        return 'string' === typeof expr
            ?  expr

        // many expression objects
        
            :  expr instanceof Array
            ?  expr.map( oe2c )

        // single expression object
        
            :  (x = expr.decl )
            ?  'var ' + x[ 0 ] + ' = ' + oe2c( x[ 1 ] )

            :  (x = expr.dotcall)
            ?   x[ 0 ] + '.' + x[ 1 ] + '(' + oe2c( x[ 2 ] ) + ')'

            :  (x = expr.push)
            ?  x[ 0 ] + '.push(' + oe2c( x[ 1 ] ) + ')'
        
            :  (x = expr.set)
            ?  x[ 0 ] + ' = ' + oe2c( x[ 1 ] )

            :  (x = expr.set_at)
            ?  x[ 0 ] + '[' + oe2c( x[ 1 ] ) + '] = ' + oe2c( x[ 2 ] )
        
            :  ((x = expr['if'])  &&
                (y = expr[ 'then' ], z = expr[ 'else' ], true)
               )
            ?  [ 'if (' + oe2c( x ) + ') {'
                 , oe2c( y )
               ].concat( z  ?  [ '} else {', oe2c( z ), '}' ]  :  [ '}' ] )
            
        :  (x = expr.not)  ?  '!(' + oe2c( x ) + ')'
        

            :  (x = expr.comment)  ?  '/* ' + x + ' */'

            :  hasNoKey( x )  ?  ''

            :  null.unsupported_or_bug
        ;
        function hasNoKey( x )
        {
            for (var k in x) { if (!(k in _emptyObj)) {
                return false;
            }}
            return true;
        }
    }
    
    function solve_restwrap( /*object*/step_arr )
    // Unfold if/then/else wrappers.
    {
        var ret = step_arr.slice();  // copy

        for (var i = ret.length; i--;)
        {
            var   step = ret[ i ]
            , restwrap = step.restwrap
            ;
            if (restwrap)
                ret = ret.slice( 0, i ).concat( restwrap( ret.slice( i + 1 ) ) );

            walk_step( step );  // Check for similar cases, deeper
        }

        return ret;

        function walk_step( step )
        {
            for (var k in step) { if (!(k in _emptyObj)) {   // More flexible than hasOwnProperty

                var v = step[ k ];
                if (v instanceof Array)
                    step[ k ] = solve_restwrap( v );
                else if ('object' === typeof v)
                    walk_step( v );
                
            }}
        }
    }

    // --- Support for caching to speedup the code generation
    // --- [github#2]

    function _create_CS_cache()
    {
        var tmp = 'undefined' !== typeof Map  &&  Map.prototype
        ,  base = { cs : null, map : _create_MapWrap() }
        ;
        return { get : _CS_cache_get, set : _CS_cache_set };

        function _CS_cache_get( /*array of { param : <array>, args : <array> }*/arr )
        {
            return _CS_cache_getset( arr, null );
        }

        function _CS_cache_set( /*array of { param : <array>, args : <array> }*/arr, /*_ChainSpec*/cs )
        {
            return _CS_cache_getset( arr, cs );
        }
            
        function _CS_cache_getset( arr, /*?*/cs )
        {
            cs  ||  (cs = null);
            
            var cs_map = _CS_cache_getset_descent( base, arr, cs );
            
            if (cs)  // set
                cs === cs_map.cs  ||  null.bug;

            else if (cs_map)  // get
                cs = cs_map.cs;
            
            // result

            if (cs)
                cs instanceof _ChainSpec  ||  null.bug;

            return cs   ||  null;
        }
        

        function _CS_cache_getset_descent( cs_map, arr, /*?*/cs )
        {
            var  n = arr.length
            , last = n - 1
            ;
            for (var i = 0; i < n; i++)
            {
                var    x = arr[ i ]
                ,    map = cs_map.map
                , tmp_cm = map.get( x )
                ;
                
                if (tmp_cm)
                {
                    // found: one step deeper
                    cs_map = tmp_cm;
                }
                else
                {
                    // not found
                    if (cs)
                    {
                        // set: one step deeper
                        var tmp_cm = { cs : null, map : _create_MapWrap() };
                        map.set( x, tmp_cm );
                        cs_map = tmp_cm;
                    }
                    else
                    {
                        // get: done
                        return null;
                    }
                }
            }
            
            cs_map  ||  null.bug;

            if (cs)
            {
                cs_map.cs  &&  null.bug;
                cs_map.cs = cs;
            }
            
            return cs_map;
        }

    } // _create_CS_cache

    var is_Map_supported;
    function _create_MapWrap()
    {
        if (null == is_Map_supported)
        {
            var tmp = 'undefined' !== typeof Map  &&  Map.prototype;
            is_Map_supported = !!(
                tmp  &&
                    'function' === typeof tmp.get  &&
                    'function' === typeof tmp.set  &&
                    'function' === typeof tmp.has
            );
        }

        if (is_Map_supported)
            return new Map;
        
        var basic_store = {}
        ,   other_store = []
        ;
        
        return { get   : _MapWrap_fallback_get
                 , set : _MapWrap_fallback_set 
               };

        function _MapWrap_fallback_get( k )
        {
            var tk = typeof k;
            if ('number' === tk && isFinite( tk )  ||  'string' === tk  ||  'boolean' === tk)
                return basic_store[ k ];

            if (other_store)
            {
                for (var i = other_store.length; i--;)
                {
                    var x = other_store[ i ];
                    if (x[ 0 ] === k)
                        return x[ 1 ];  // value
                }
            }

            null.bug;
        }

        function _MapWrap_fallback_set( k, v )
        {
            var tk = typeof k;
            if ('number' === tk && isFinite( tk )  ||  'string' === tk  ||  'boolean' === tk)
            {
                basic_store[ k ] = v;
                return;
            }

            if (other_store)
            {
                var x_found;
                for (var n = other_store.length, i = 0; i < n; i++)
                {
                    var x = other_store[ i ];
                    if (x[ 0 ] === k)
                    {
                        x_found = x;
                        break;
                    }
                }
                
                if (x_found)
                    x_found[ 1 ] = v;
                else
                    other_store.push( [ k, v ] );
            }

            null.bug;
        }
    }

    
})(global  ||  exports  ||  this); // NPM support [github#1]
