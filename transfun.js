/*
  transfun.js
  
  Copyright Guillaume Lathoud 2016
  Boost License: see the file ./LICENSE

  Contact: glat@glat.info

  --- DESCRIPTION ---

  Merge loops for speed in JavaScript: transformation functions
  generate code where:

  (1) loops do as few function calls as possible,

  (2) consecutive loops have been merged into a single loop, whenever
  possible.

  See also: 

  http://glat.info/transfun
  https://github.com/glathoud/transfun

*/

/*global 

  tval tpub tfun fullexpr 
  map filter reduce redinit sum prod decl
  console global exports
  Map
  JSON
*/

var global, exports; // NPM support [github#1]
(function (global) {

    var L_LEFT  = 'loopleftright'
    ,   L_RIGHT = 'looprightleft'
    ,   L_IN    = 'loopin'

    ,   R_LEFT  = 'rangeleftright'
    ,   R_RIGHT = 'rangerightleft'
    
    ,   ARRAY   = 'array'
    ,   OBJECT  = 'object'
    
    ,   CURRENT = 'current'
    
    ,   _emptyObj = {}
    ;
    
    // ---------- Public API: global namespace access
    // 
    // (1) through global variables: only `tfun`, `tpub` and `tval`.
    //
    // (2) through `tfun.*` methods: everything, including
    // transformation function ("transfuns") published with `tpub`
    // (examples below).

    global.tfun     = tfun;
    global.tpub     = tfun.tpub = tpub;
    global.tval     = tfun.tval = tval;
    
    tfun.createMap = createMap;
    tfun.fullexpr  = fullexpr;
    tfun.statement = statement;
    
    // --- Publish a few common transfunctions, specifying an
    // internally imperative implementation for a functional.

    tpub( 'arg', { // To extract multiple arguments (instead of the standard single argument `current`)

        arity : 1

        , specgen : function ( /*...comma-separated string, e.g. "a,b,c"...*/cs ) {

            var   arr = cs.split( ',' )
            ,       n = arr.length
            , stepadd = new Array( n )
            ;
            for (var i = 0; i < n; ++i)
            {
                var name = arr[ i ].replace( /^\s+|\s+$/i, '' );
                (name  ||  null).substring.call.a;
                
                stepadd[ i ] = { decl : [ name, { get_at : [ 'arguments', ''+i ] } ] };
            }
            
            return { stepadd : stepadd, first_only : true };
        }
        
    });
    
    tpub( 'map', {
        arity     : 1
        , specgen : function ( /*string | externcall object*/transform ) {
            return { loopleftright : {
                morph : 'array'  // --> means, among other, reducable + depending on conserve_array_length, init & bodyend (store)
                , conserve_array_length : true
                , bodyadd : { set : [ 'v', tfun.fullexpr( transform, 'v', 'k' ) ] }
            }};
        }
    });

    tpub( 'mapRight', {
        arity     : 1
        , specgen : function ( /*string | externcall object*/transform ) {
            return { looprightleft : {
                morph : 'array'  // --> means, among other, reducable + depending on conserve_array_length, init & bodyend (store)
                , conserve_array_length : true
                , bodyadd : { set : [ 'v', tfun.fullexpr( transform, 'v', 'k' ) ] }
            }};
        }
    });

    tpub( 'mapIn', {
        arity     : 1
        , specgen : function ( /*string | externcall object*/transform ) {
            return { loopin : {
                morph     : 'object'  // --> means, among other, reducable, init & bodyend (store)
                , bodyadd : { set : [ 'v', tfun.fullexpr( transform, 'v', 'k' ) ] }
            }};
        }
    });

    tpub( 'filter', {
        arity     : 1
        , specgen : function ( /*string | externcall object*/test ) {
            return { loopleftright : {
                morph     : 'array'  // --> means, among other, reducable + depending on conserve_array_length (always false here), init & bodyend (store)
                , bodyadd : { restwrap : { 'if' : tfun.fullexpr( test, 'v', 'k' ), 'then' : { rest : 1 } } }
            }};
        }
    });

    tpub( 'filterRight', {
        arity     : 1
        , specgen : function ( /*string | externcall object*/test ) {
            return { looprightleft : {
                morph     : 'array'  // --> means, among other, reducable + depending on conserve_array_length (always false here), init & bodyend (store)
                , bodyadd : { restwrap : { 'if' : tfun.fullexpr( test, 'v', 'k' ), 'then' : { rest : 1 } } }
            }};
        }
    });
    
    tpub( 'filterIn', {
        arity     : 1
        , specgen : function ( /*string | externcall object*/test ) {
            return { loopin : {
                morph     : 'object'  // --> means, among other, reducable + depending on conserve_array_length (always false here), init & bodyend (store)
                , bodyadd : { restwrap : { 'if' : tfun.fullexpr( test, 'v', 'k' ), 'then' : { rest : 1 } } }
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
                                , then   : { set : [ 'out', tfun.fullexpr( combine, 'out', 'v', 'k' ) ] }
                                , 'else' : [ {   set : [ 'out', 'v' ] }
                                             , { set : [ 'redinit', 'true' ] }
                                           ]
                              }
                , afterloop : { set : [ 'current', 'out' ] }
            }};
        }
    });

    tpub( 'reduceRight', {
        arity : 1
        , specgen : function ( /*string | externcall object*/combine ) {
            return { looprightleft : {
                beforeloop  : [ { decl : [ 'out', 'null' ] }
                                , { decl : [ 'redinit', 'false' ] }
                              ]
                , bodyadd   : { 'if'     : 'redinit'
                                , then   : { set : [ 'out', tfun.fullexpr( combine, 'out', 'v', 'k' ) ] }
                                , 'else' : [ {   set : [ 'out', 'v' ] }
                                             , { set : [ 'redinit', 'true' ] }
                                           ]
                              }
                , afterloop : { set : [ 'current', 'out' ] }
            }};
        }
    });

    tpub( 'reduceIn', {
        arity : 1
        , specgen : function ( /*string | externcall object*/combine ) {
            return { loopin : {
                beforeloop  : [ { decl : [ 'out', 'null' ] }
                                , { decl : [ 'redinit', 'false' ] }
                              ]
                , bodyadd   : { 'if'     : 'redinit'
                                , then   : { set : [ 'out', tfun.fullexpr( combine, 'out', 'v', 'k' ) ] }
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
        , specgen : function ( /*string*/redinit, /*string | externcall object*/combine ) {
            return { loopleftright : {
                beforeloop  : { decl : [ 'out', tfun.fullexpr( redinit, 'current' ) ] }
                , bodyadd   : { set : [ 'out', tfun.fullexpr( combine, 'out', 'v', 'k' ) ] }
                , afterloop : { set : [ 'current', 'out' ] }
            }};
        }
    });

    tpub( 'redinitRight', {
        arity : 2
        , specgen : function ( /*string*/redinit, /*string | externcall object*/combine ) {
            return { looprightleft : {
                beforeloop  : { decl : [ 'out', tfun.fullexpr( redinit, 'current' ) ] }
                , bodyadd   : { set : [ 'out', tfun.fullexpr( combine, 'out', 'v', 'k' ) ] }
                , afterloop : { set : [ 'current', 'out' ] }
            }};
        }
    });

    tpub( 'redinitIn', {
        arity : 2
        , specgen : function ( /*string*/redinit, /*string | externcall object*/combine ) {
            return { loopin : {
                beforeloop  : { decl : [ 'out', tfun.fullexpr( redinit, 'current' ) ] }
                , bodyadd   : { set : [ 'out', tfun.fullexpr( combine, 'out', 'v', 'k' ) ] }
                , afterloop : { set : [ 'current', 'out' ] }
            }};
        }
    });
    
    tpub( 'each', {
        arity : 1
        , specgen : function ( /*string*/action ) {
            return { loopleftright : {
                morph                   : 'array'
		, keep_current_instance : true
		, bodyadd               : tfun.statement( action, 'v', 'k', 'current' )
            }};
        }
	
    });

    tpub( 'eachRight', {
        arity : 1
        , specgen : function ( /*string*/action ) {
            return { looprightleft : {
                morph                   : 'array'
		, keep_current_instance : true
		, bodyadd               : tfun.statement( action, 'v', 'k', 'current' )
            }};
        }

    });

    tpub( 'eachIn', {
        arity : 1
        , specgen : function ( /*string*/action ) {
            return { loopin : {
                morph                   : 'object'
		, keep_current_instance : true
		, bodyadd               : tfun.statement( action, 'v', 'k', 'current' )
            }};
        }

    });


    tpub( 'breakWhen', {
        arity     : 1
        , specgen : function ( /*string | externcall object*/test ) {
            return { loopleftright : { bodyadd : { 'if' : tfun.fullexpr( test, 'v', 'k' ), 'then' : 'break' } }};
        }
    });

    tpub( 'breakWhenRight', {
        arity     : 1
        , specgen : function ( /*string | externcall object*/test ) {
            return { looprightleft : { bodyadd : { 'if' : tfun.fullexpr( test, 'v', 'k' ), 'then' : 'break' } }};
        }
    });

    tpub( 'takeWhile', {
        arity : 1
        , specgen : function ( /* string | externcall object*/test ) {
            return { loopleftright : {
                morph     : 'array'
                , bodyadd : { restwrap : { 'if' : tfun.fullexpr( test, 'v', 'k' ), then : { rest : 1 }, 'else' : 'break' } }
            }};
        }
    });

    tpub( 'takeWhileIn', {
        arity : 1
        , specgen : function ( /* string | externcall object*/test ) {
            return { loopin : {
                morph     : 'object'
                , bodyadd : { restwrap : { 'if' : tfun.fullexpr( test, 'v', 'k' ), then : { rest : 1 }, 'else' : 'break' } }
            }};
        }
    });

    // -- and
    
    tpub( 'and', {
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

    tpub( 'andRight', {
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

    tpub( 'andIn', {
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
    
    tpub( 'or', {
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

    tpub( 'orRight', {
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

    tpub( 'orIn', {
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
    
    tpub( 'o2values', {
        arity  : 0
        , spec : { loopin : {
            beforeloop  : { decl : [ 'out', '[]' ] }
            , bodyadd   : { push : [ 'out', 'v' ] }
            , afterloop : { set : [ 'current', 'out' ] }
        }}
    });

    // "Key" conversions:

    tpub( 'o2keys', {
        arity : 0
        , spec : { stepadd : { set : [ 'current', 'Object.keys(current)' ] } }
    });

    tpub( 'keys2o', {
        arity  : 0
        , spec : { loopleftright : {
            beforeloop  : { decl : [ 'out', '{}' ] }
            , bodyadd   : { set_at : [ 'out', 'v', 'true' ] }
            , afterloop : { set : [ 'current', 'out' ] }
        }}
    });


    // "Key-values" conversions:

    tpub( 'o2kv', {
        arity  : 0
        , spec : { loopin : {
            beforeloop  : { decl : [ 'out', '[]' ] }
            , bodyadd   : { push : [ 'out', '[k, v]' ] }
            , afterloop : { set : [ 'current', 'out' ] }
        }}
    });

    tpub( 'kv2o', {
        arity  : 0
        , spec : { loopleftright : {
            beforeloop  : { decl : [ 'out', '{}' ] }
            , bodyadd   : { set_at : [ 'out', 'v[0]', 'v[1]' ] }
            , afterloop : { set : [ 'current', 'out' ] }
        }}
    });

    tpub( 'decl', {
        arity : 2
        , specgen : function ( /*string*/name, /*string | externcall object*/expr ) {
            return {
                stepadd : { decl : [ name, tfun.fullexpr( expr, 'current' ) ] }
            };
        }
    });

    tpub( 'declIn', {
        arity : 1
        , specgen : function ( /*object: name -> value*/o ) {
            var arr = [];
            for (var k in o) { if (!(k in _emptyObj)) {  // More flexible than hasOwnProperty
                var v = o[ k ];
                arr.push({
                    decl : [ k, tfun.fullexpr( v, 'current' ) ]
                });
            }}

            return { stepadd : arr };
        }
    });

    // Ranges

    tpub( 'rangeOf', {
        arity : +Infinity  // xxx maybe restrict to {2:true or 3:true} (not supported yet). Maybe. Maybe leave it as is.
        , specgen : function ( begin, end, maybe_step ) {

            arguments.length in {2:true,3:true}  ||  null.invalid_arity;
            
            return { rangeleftright : {
                morph     : 'array'
                , conserve_array_length : true
                , begin   : begin
                , end     : end
                , step    : maybe_step
                , varname : 'v'
            }};
        }
    });   

    tpub( 'range', tfun.arg( 'begin,end,maybe_step' ).rangeOf( 'begin', 'end', 'maybe_step' ) );
    
    // Others
    
    tpub( 'prod', tfun.redinit( '1', '*' ) );
    tpub( 'sum',  tfun.redinit( '0', '+' ) );

    tpub( 'join', '#s',  '.join(#s)' );
    tpub( 'split', '#s', '.split(#s)' );
    
    tpub( 'sorted', {
        arity : 1
        , specgen : function( /*string | externcall object*/transform ) {
            return {
                stepadd : {
                    set : [ 
                        CURRENT
                        , CURRENT + '.slice().sort((a,b)=>' + tfun.fullexpr( transform, 'a', 'b' ) + ')'
                    ]
                }
            };
        }
    });

    // ---------- Public API implementation

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
            var arr = Array.apply(
                null
                , 'function' === typeof f  ?  arguments  :  f
            )
            
            ,   n   = arr.length
            ,   v   = arr[ 0 ].apply( thisObj, args )
            ;
            for (var i = 1; i < n; ++i)
                v = arr[ i ].call( thisObj, v );
            
            return v;
        }
    }


    var _tpub_cache;
    function tpub( name, spec_or_fun_or_str /*... more strings in the shortcut variant...*/ )
    {
        (name  ||  null).substring.call.a;

        _tpub_cache  ||  (_tpub_cache = {});
        if (name in _tpub_cache)
            throw new Error( '"' + name + '" already published!' );

        var tf = _tpub_cache[ name ] = tfun.apply(
            null
            , with_default_loopname( Array.prototype.slice.call( arguments, 1 ) )
        );
        
        // Also publish the function to the global namespace through
        // `tfun.*` methods (2) through `tfun.*` properties ==
        
        new Function( 'tf' , 'this.tfun["' + name + '"]=tf' )
            .call( global, tf );
        
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
                    x._tf_tpub_name = name;  // Not mandatory, only for better logging
                    arg[ 0 ] = x;
                }
                else if (x.specgen)
                {
                    x = Object.create( x );
                    x.specgen = get_default_loopname_wrapper( x.specgen );
                    x._tf_tpub_name = name;  // Not mandatory, only for better logging
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
                                                              .map( s2origcodestring )
                                                              .join( ', ' ) + ' '  :  ''
                                                             ) + ') --'
                }
                return spec;

                function s2origcodestring( s )
                {
                    var     x = (s.externcall  ||  s)
                    , codestr = 'string' === typeof x  ?  x  :  JSON.stringify( x )
                    ;
                    return '`' + codestr + '`';
                }
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

    function statement( /* ... see _stmt_expr_common... */ ) 
    {
	return _stmt_expr_common.apply( { statement : true }, arguments );
    }

    function fullexpr( /* ... see _stmt_expr_common... */ )
    // string|object->string|object: Complete a code expression of one or two variables.
    //
    // Examples:
    // {{{
    // 'v!=null' === tfun.fullexpr( '!=null', 'v' )
    // 'v+k'     === tfun.fullexpr( '+', 'v', 'k' )
    // }}}
    {
        return _stmt_expr_common.apply( { statement : false }, arguments );
    }

    var _TF_GET_ARGNAME_ARR = '_tf_get_argname_arr'
    ,   _TF_GET_BODYCODE    = '_tf_get_bodycode'
    ,   _TF_POUND_OUT_TMPL  = '#__tf_out__#'
    ,   _TF_TOP_LOOP        = '__tf_top_loop__'
    ,   _TF_TOP_LOOP_I      = 0
    ;
    function _stmt_expr_common( /* string | externcall object*/code, /*string*/leftvar, /*?string?*/rightvar /*...more variables (for [extern]call)...*/ )
    {
        var         opt = this
        , opt_statement = opt  &&  opt.statement
        ;

        if ('object' === typeof code)
        {
            // object: call to an extern function => replace with a
            // code string implementing the function call.
            if (code.externcall)
            {
	        var externcall = code.externcall;
	        (externcall  ||  null).substring.call.a;

                var arg = Array.apply( 0, arguments ).slice( 1 );

                // Optional API for inlining
                var one = code.one;
                'function' === typeof one  ||  null.bug;

                var tmp_has_0 = _TF_GET_ARGNAME_ARR in one
                ,   tmp_has_1 = _TF_GET_BODYCODE    in one
                ;
                if (tmp_has_0  ^  tmp_has_1)
                {
                    throw new Error( 'transfun: optional inlineable function: please provide either both or none of the'
                                     + ' function object method ' + _TF_GET_ARGNAME_ARR + ' and ' + _TF_GET_BODYCODE + '.'
                                     + ' See also: https://github.com/glathoud/transfun/issues/7'
                                   );
                }
                else if (tmp_has_0  &&  tmp_has_1)
                {
                    var top_loop = _TF_TOP_LOOP + (_TF_TOP_LOOP_I++);

                    var f_argname_arr = one[ _TF_GET_ARGNAME_ARR ]()
                    ,   f_bodycode    = get_transformed_bodycode( one[ _TF_GET_BODYCODE ]() )
                    ;
                    if ('string' === typeof f_argname_arr)
                        f_argname_arr = f_argname_arr.split( ',' );

                    var homonyms = f_argname_arr.map( function ( s, i ) {
                        return s === arg[ i ]  &&  'let ' + tmp_homonym( s ) + ' = ' + s + ';'
                            ||  ''
                        ;
                    }).join( '' )
                    ,   assigns = !f_argname_arr.length
                        ?  ''
                        :  'let ' +
                        f_argname_arr.map( function ( s, i ) {
                            return !arg[ i ]
                                ?  ''
                                :  s + ' = ' + (s === arg[ i ]  ?  tmp_homonym( s )  :  arg[ i ])
                            ;
                        }).join( ', ') + ';';
                    ;
                    
                    return [
                        '{'
                        , homonyms
                        , '{'
                        , assigns
                        , top_loop + ': for(;;) {'
                        , f_bodycode
                        , exiter()
                        , '}'
                        , '}'
                        , '}'
                    ].join( '\n' );
                }
                
	        return { 'call' : { fun : externcall, arg : arg } };
            }

            // object: definition piece => as is.
            return code;
        }

        function tmp_homonym( s ) { (s  ||  null).substring.call.a; return '__tf_homonym_' + s + '__'; }

        function get_transformed_bodycode( /*string*/bodycode )
        {
            bodycode.substring.call.a;
            return bodycode.replace( /\breturn([^;]+);/, replace_exit );

            function replace_exit( s0, s1 )
            {
                return exiter( s1 );
            }
        }
        
        function exiter( expr ) { return _TF_POUND_OUT_TMPL + ' = ' + expr + '; break ' + top_loop + ';' }
        
	// string: statement => as is (no completion).

	if (opt_statement)
	    return code;

	// string: expression => complete it if necessary.

        code.substring.call.a;  // the empty string '' is allowed, means the value itself, unchanged
        (leftvar   ||  null).substring.call.a;
        rightvar  &&  rightvar.substring.call.a;
        
        var is_left_implicit  = /^\s*(?:[+*\/%&|\^\.=<>\?]|!=|-=|$)/.test( code )
        ,   is_right_implicit = /[+\-*\/%&|\^\.=<>!]\s*$/        .test( code )  &&  !/(\+\+|\-\-)$/.test( code )
        ;
        if (is_left_implicit)
	    code = leftvar + code;

        if (is_right_implicit)
	    code = code + (is_left_implicit  ?  (rightvar  ||  '')  :  leftvar);

        return '(' + code + ')';
    }
    
    var _transfun_id;  // for caching [github#2], to speedup the code generation
    function tfun( def_or_fun_or_str /*... more strings in the string shortcut variant...*/ )
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

	    return { stepadd : { set : [ CURRENT, fullexpr( ret, CURRENT ) ] } };
        }

        // --- Details for the object definition variant

        function tfun_from_objectdef( definition )
        {
	    var def_arity          = definition.arity
            ,   has_variable_arity = def_arity === +Infinity  // xxx Maybe: more restrictive def_arity, e.g. set: {2:true,3:true}
            ;
            
            var spec      = def_arity === 0  &&  definition.spec
            ,   specgen   = def_arity !== 0  &&  definition.specgen
            ,   tf_id     = _transfun_id = 1 + ~~_transfun_id; // [github#2]
	    ;
	    transfun._is_transfun           = true;
	    transfun._tf_def_arity          = def_arity;
            transfun._tf_has_variable_arity = has_variable_arity
	    transfun._tf_id                 = tf_id;

            var tpub_name = definition._tf_tpub_name;
            if (tpub_name)
                transfun._tf_tpub_name = tpub_name;
            
	    return transfun;
	    
	    function transfun( /*...`arity` arguments: array of (code string | non-string extern) ... */ )
	    {
                var arity = has_variable_arity  ?  arguments.length  :  def_arity;                
                if (arity !== arguments.length)
                {
		    return missing_args_transfun.apply( { transfunThisObj : this, arg : [] }, arguments );
                }
                
                var prev_chainspec = (this instanceof _ChainSpec  ?  this  :  new _ChainSpec)

                ,        chainspec = prev_chainspec
		    .add_step( arity, tf_id, spec  ||  specgen, transfun, arguments )

                , cached_appfun = chainspec.appfun  // avoid duplicated work [github#2]
                ;
                if (!cached_appfun)
                {
                    var appfun; // function: `impl` or `extern_impl_wrapper`

                    // Do it now, so that we can have appfun==impl in
                    // most cases -> performance.  This is okay
                    // because we have cache: do it only once.
                    // See also [github#2].
                    ensure_appimpl();

                    appfun._tf_actual_arity = arity;
                    
                    // Necessary to support `next` (see `ChainSpec.concat_call_tf`)
		    appfun._tf_chainspec = chainspec;
		    
		    // Necessary to support `tfun( <appfun> )`
		    var _tf_bound_arg = [].slice.call( arguments );
		    appfun._tf_bound  = appfun__tf_bound;
		    appfun._tf_bound._is_transfun = true;
		    
		    // For convenience: give access
		    appfun.getBodyCode  = appfun_getBodyCode;
                    appfun.getFunSpec   = appfun_getFunSpec;
                    appfun.getNExternal = appfun_getNExternal;
		    
		    cached_appfun = chainspec.appfun = mix_published_tfun_methods_into_appfun( chainspec, appfun );

                    // API for inlining when appfun are used as externals
                    // https://github.com/glathoud/transfun/issues/12
                    appfun[ _TF_GET_BODYCODE ]    = appfun_getBodyCode;
                    appfun[ _TF_GET_ARGNAME_ARR ] = function () { return code_par_arr.slice( extern_arr.length ); };
                }
                return cached_appfun;
                
                function appfun__tf_bound()
                {
                    // Fail early to help the user self-correcting
                    // misuses.
                    if (arguments.length !== 0)
                        throw new Error( arguments.length + ' unexpected arguments: ' + Array.prototype.slice.call( arguments ) );
                    
                    return transfun.apply( this instanceof _ChainSpec
                                           ?  this.concat_call( prev_chainspec )
                                           :  prev_chainspec

                                           , _tf_bound_arg
                                         );
                }
                
                // --- Details

                // steps for code & function generation
                var extern_arr   // array of non-string values (if any, given by _ChainSpec)
                ,   has_extern
                
                ,   spec_arr_optim          // after merging compatible `morph` loops + one extra loop
                ,   spec_arr_optim_solved   // after expliciting the last `store` step of `morph` loops
                ,   spec_arr_optim_multiarg // after optimizing some multiple arguments use cases
                
                ,   code_par_arr   // actual implementation: parameters (array of string: parameter names, `n_extern` extern names, if any, + `current`)
                ,   code_body      // actual implementation: body (string)
                
                ,   impl           // actual implementation (function)
                ;

                function appfun_getBodyCode()
                {
		    ensure_appimpl();
		    return code_body;
                }

                function appfun_getFunSpec()
                {
                    ensure_appimpl();
                    return { funSpec : {
                        varNameArr : code_par_arr.slice()
                        , specArr  : chainspec.spec_arr
                    }};
                }

                function appfun_getNExternal()
                {
                    ensure_appimpl();
                    return extern_arr.length;
                }

                function ensure_appimpl()
                {
		    if (!impl)
		    {
                        extern_arr    = chainspec.extern_arr;
                        has_extern    = extern_arr.length > 0;
                        
                        code_par_arr    = chainspec.externname_arr.concat( [ CURRENT ] );

                        var first_only  = is_first_only( chainspec.spec_arr );
                        
                        spec_arr_optim          = optimize_spec_arr_merging_morphs( chainspec.spec_arr );
                        spec_arr_optim_solved   = explicit_and_optimize_morph_store( spec_arr_optim );

                        if (first_only)
                            mark_first_only( spec_arr_optim_solved );
                        
                        var gcb_o = optimize_some_multiarg_cases( code_par_arr, spec_arr_optim_solved );
                        
                        if (first_only)
                            mark_first_only( gcb_o.spec_arr );
                        
                        code_body = '    "use strict";\n' // https://github.com/glathoud/transfun/issues/11
                            + generate_code_body( gcb_o.spec_arr );
                        impl      = new Function( gcb_o.code_par_arr, code_body );
                        
                        // In most cases no wrapper because no
                        // externs. Performance in mind. Okay because
                        // of cache [github#2].
                        appfun = has_extern
                            ?  (gcb_o.code_par_arr.length - chainspec.externname_arr.length > 1  // optimization for that case
                                ?  extern_impl_wrapper_many_args
                                :  extern_impl_wrapper_one_arg 
                               )
                        :  impl
                        ;
                        
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
                            , gcb_o     : gcb_o
                        };
		    }

                    function extern_impl_wrapper_one_arg( current )
                    {
                        return impl.apply( this, extern_arr.concat( [ current ] ) );
                    }

                    function extern_impl_wrapper_many_args( /* ...several arguments... */ )
                    {
                        return impl.apply( this, extern_arr.concat( Array.prototype.slice.call( arguments ) ) );
                    }
                }
                
	        // function transfun
                
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
        this.concat_call    = _CS_concat_call;
        
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

            ,    spec_arr_first_only = spec_arr.length > 0  &&  is_first_only( spec_arr )
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
                for (var n = args.length, i = 0; i < n; ++i)
                {
		    var one  = args[ i ]
                    ,   tone = typeof one
		    ,   is_s = 'string' === tone
                    ,   is_f = 'function' === tone
		    ;
		    if (is_s)
		    {
                        // code string
                        spec_s_arg.push( one );
		    }
		    else if (is_f)
		    {
                        // extern function
                        var e_i    = e_arr.length
                        ,   e_name = ( 
                            '__extern$' + e_i + (one.name  ?  '_' + one.name : '' ) + '__'
                        )
                            .replace( /\W/g, '_' )
                        ;
                        e_arr .push( one );
                        en_arr.push( e_name );
                        i2en[ e_i ]    = e_name;
                        en2e[ e_name ] = one;
                        
                        spec_s_arg.push( { externcall : e_name
                                           , one      : one
                                         } );
		    }
                    else
                    {
                        'object' === tone  ||  null.unsupported;
                        
                        // object describing a piece of definition
                        check_no_function_value( one );
                        spec_s_arg.push( one );
                    }
                }
                
                spec = spec_or_specgen.apply( null, spec_s_arg );
	    }

            var first_only = is_first_only( [ spec ] );

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
				    , { comment : loopname } ].concat( tmp.bodyadd  ||  [] );
		    
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
		    check_exactly_has_properties_mand_opt( loop, get_mandatory_optional( looptype, morph ) );
                }
                else
                {
		    if (morph !== ARRAY  &&  morph !== OBJECT)
                        throw new Error( 'Invalid morph value "' + morph + '".' );

		    check_exactly_has_properties_mand_opt( loop, get_mandatory_optional( looptype, morph ) );
                }
	    }
	    else
	    {
                check_exactly_has_properties( spec, { stepadd : 1 }, { first_only : 1 } );
	    }

            // Optional: `first_only` (mainly for `tfun.arg()`)

            if (first_only  &&  spec_arr.length)
            {
                var tmp_tf_tpub_name  = transfun  &&  transfun._tf_tpub_name
                ,   tmp_error_begin = tmp_tf_tpub_name  ?  '`' + tmp_tf_tpub_name + '`'  :  'This one'
                ;
                throw new Error( tmp_error_begin + ' can only be the first of a chain, e.g. `tfun.'
                                 + (tmp_tf_tpub_name  ||  'arg') + '(...)`.' );
            }
            
	    // append the step and return a new _ChainSpec instance
            spec  ||  null.bug;
	    spec_arr.push( spec );

            if (spec_arr_first_only)
                mark_first_only( spec_arr );
            
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
	    for (var n = tfarg_arr.length, i = 0; i < n; ++i)
	    {
                var tfarg = tfarg_arr[ i ];
                ret       = tfarg.tf.apply( chainspec, tfarg.arg );
                chainspec = ret._tf_chainspec;
	    }
	    return ret;
        }

        function _CS_concat_call( other )
        {
            if (!(other instanceof _ChainSpec)  ||  other.spec_arr.length === 0)
                return this;

            if (this.spec_arr.length === 0)
                return other;
            
	    var tmp = this.concat_call_tf( other );
            return tmp._tf_chainspec;
        }
        
    }
    
    function optimize_spec_arr_merging_morphs( spec_arr )
    {
        var spec_arr_optim = spec_arr.slice();  // copy
        for (var i = spec_arr_optim.length, next = null; i--;)
        {
	    var one = spec_arr_optim[ i ];

            if (i > 0  &&  one.first_only)
                null.bug;
            
	    if (next)
	    {               
                var one_looptype = get_looptype( one )  ||  null

                ,   one_loop  = one_looptype  &&  one[ one_looptype ]
                ,   one_morph = one_loop  &&  one_loop.morph

                ,   one_is_range = one_looptype === R_LEFT  ||  one_looptype === R_RIGHT

                ,   one_is_left  = one_looptype === L_LEFT  ||  one_looptype === R_LEFT
                ,   one_is_right = one_looptype === L_RIGHT  ||  one_looptype === R_RIGHT

                ,   one_r_begin   = one_is_range  &&  one_loop.begin
                ,   one_r_end     = one_is_range  &&  one_loop.end
                ,   one_r_varname = one_is_range  &&  one_loop.varname
                ,   one_r_step    = one_is_range  &&  one_loop.step
                
                // For an optimization to take place, both `one` and
                // `next` must have the same looptype.
                ,  next_loop   = next[ one_is_left  ?  L_LEFT
                                       :  one_is_right  ?  L_RIGHT
                                       :  one_looptype
                                     ]  
                ,  next_morph  = next_loop  &&  next_loop.morph

                ,  merged_spec = null
                ;
                if (one_morph  &&  next_morph  &&  one_morph === next_morph)
                {
		    // Continue morphing (e.g. map, filter)
		    var conserve_array_length = one_morph === ARRAY  &&
                        one_loop .conserve_array_length  &&
                        next_loop.conserve_array_length

		    ,  keep_current_instance = 
			one_loop .keep_current_instance  &&
			next_loop.keep_current_instance
		    
		    ,  new_bodyadd = arrify(  one_loop.bodyadd  ||  [] )
                        .concat( arrify( next_loop.bodyadd  ||  [] ) )
                    
		    ,  new_spec = {}
		    ,  new_loop = {}
		    ;
		    new_spec[ one_looptype ] = new_loop;
		    new_loop.morph           = one_morph;

		    if (conserve_array_length)
                        new_loop.conserve_array_length = conserve_array_length;
		    
		    if (keep_current_instance)
			new_loop.keep_current_instance = keep_current_instance;

                    if (one_is_range)
                    {
                        new_loop.begin   =  one_r_begin;
                        new_loop.end     =  one_r_end;
                        new_loop.varname =  one_r_varname;

                        if (one_r_step != null)
                            new_loop.step = one_r_step;
                    }

		    new_loop.bodyadd         = new_bodyadd;

		    merged_spec = new_spec;
                }
                else if (one_morph  &&  next_loop  &&  !next_morph)
                {
		    // Finish morphing (e.g. map, filter, reduce)
		    var new_spec = {}
		    ,   new_loop = Object.create( next_loop )  // e.g. `beforeloop`, `afterloop`

		    ,   new_bodyadd = arrify( one_loop.bodyadd  ||  [] )
                        .concat( arrify( next_loop.bodyadd  ||  [] ) )
		    ;
		    new_spec[ one_looptype ] = new_loop;

		    new_loop.beforeloop      = next_loop.beforeloop;
		    new_loop.bodyadd         = new_bodyadd;
		    new_loop.afterloop       = next_loop.afterloop;

                    if (one_is_range)
                    {
                        new_loop.begin   =  one_r_begin;
                        new_loop.end     =  one_r_end;
                        new_loop.varname =  one_r_varname;
                        
                        if (one_r_step != null)
                            new_loop.step = one_r_step;
                    }
                    
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

        ,   loop_is_range = loop  &&  (looptype === R_LEFT  ||  looptype === R_RIGHT)
        ,   r_is_left = loop_is_range  &&  looptype === R_LEFT
        ,   r_begin   = loop_is_range  &&  loop.begin
        ,   r_end     = loop_is_range  &&  loop.end
        ,   r_step    = loop_is_range  &&  loop.step
        ,   r_varname = loop_is_range  &&  loop.varname
        
        , new_spec   = spec;
        ;
        if (morph)
        {
	    new_spec = {};
	    var conserve_array_length = morph === ARRAY  &&  loop.conserve_array_length

	    ,   keep_current_instance = loop.keep_current_instance

	    ,   beforeloop = keep_current_instance

		?  []

		:  morph === ARRAY

                ?  [ { decl : [ 'out'
                                , conserve_array_length  ?  'new Array(n)'  :  '[]'
			      ]
		     }
                   ]
	    
                :  [ { decl : [ 'out', '{}' ] } ]
	    
	    ,   afterloop = keep_current_instance
	    
		?  []

		:  [ { set : [ CURRENT, 'out' ] } ]
	    
	    ,   new_loop = {}
	    ,   new_body = arrify( loop.bodyadd  ||  [] ).slice()  // copy
	    
	    , to_store = 'v'
	    , tmp = new_body[ new_body.length - 1 ]
	    ;
	    if ((tmp = tmp  &&  tmp.set)  &&  tmp[ 0 ] === to_store)
	    {
                // Small optimization: compute and store in one step.
                new_body.pop();
                to_store = tmp[ 1 ];
	    }
            if (!keep_current_instance)
            {
	        new_body.push(
                    morph === OBJECT  ||  conserve_array_length
                    
                        ?  { set_at : [

                            'out'

                            , 'k'
                            
                            , to_store ] }
                    
                    :  { push : [ 'out', to_store ] }
                );
            }

	    new_loop.beforeloop  = beforeloop;
	    new_loop.bodyadd     = new_body;
	    new_loop.afterloop   = afterloop;

            if (loop_is_range)
            {
                new_loop.begin   = loop.begin;
                new_loop.end     = loop.end;
                new_loop.varname = loop.varname;

                var loop_step = loop.step;
                if (loop_step != null)
                    new_loop.step = loop_step;
            }
            
	    new_spec[ looptype ] = new_loop;
        }
        return new_spec;
    }

    function optimize_some_multiarg_cases( code_par_arr, spec_arr )
    {
        var c = code_par_arr.slice( -1 )[ 0 ];
        if (c === CURRENT)
        {
            // When (2) multiple arguments are used, and read at the very
            // beginning, then can implement a simpler "reading" by adding
            // the parameter names to `code_par_arr`
            // 
            // Example use case:
            //
            // var sparse_pick = tfun.arg( 'arr,begin,end' )
            //   .rangeOf( 'begin', 'end' ).filter( 'v in arr' ).map( 'arr[ v ]' );
            var s0 = spec_arr[ 0 ];
            if (s0.stepadd)
            {
                check_exactly_has_properties( s0, { stepadd : 1 }, { first_only : 1 } );

                var iarg_all = s0.stepadd instanceof Array
                ,   name_arr = iarg_all  &&  s0.stepadd.map( osmc_check_and_extract_one )
                ;
                if (iarg_all  &&  name_arr)
                {
                    var rest_spec_arr = spec_arr.slice( 1 );
                    
                    spec_arr = (
                        word_is_used( CURRENT, rest_spec_arr )
                            ?  [
                                { stepadd : { decl : [ c, name_arr[ 0 ] ] } }
                            ]
                        :  [ { nope : 1 } ]  // To be able to mark `first_only` in all cases (e.g. tpub( 'arg', ... ))
                    )
                        .concat( rest_spec_arr )
                    ;
                    code_par_arr = code_par_arr.slice( 0, -1 ).concat( name_arr );

                }
            }
        }
        
        return { code_par_arr : code_par_arr, spec_arr : spec_arr };

        // --- Details

        function osmc_check_and_extract_one( one, ind )
        {
            var decl;
            if (iarg_all  &&  (decl = one.decl))
            {
                check_exactly_has_properties( one, { decl : 1 } );

                var name = decl[ 0 ];
                (decl.length === 2  &&  name  ||  null).substring.call.a;

                var spec   = decl[ 1 ]
                ,   get_at = spec.get_at
                ;
                if (get_at)
                {
                    check_exactly_has_properties( get_at, { '0' : 1, '1' : 1 } );
                    if (get_at[ 0 ] === 'arguments'  &&  get_at[ 1 ] === '' + ind)
                    {
                        // Success at this step, too
                        return name;
                    }
                }
            }

            // ...in all other cases, fail:
            iarg_all = false;
        }
    }

    function is_first_only( spec_arr )
    {
        return spec_arr[ 0 ].first_only;
    }
    
    function mark_first_only( spec_arr )
    {
        if (!is_first_only( spec_arr ))
            spec_arr[ 0 ].first_only = true;
    }

    function word_is_not_used( /*string*/word, /*object | array | string*/spec )
    {
        return !word_is_used( word, spec );
    }

    function word_is_used( /*string*/word, /*object | array | string*/spec )
    {
        if ('string' === typeof spec)
            return word === spec;

        if ('object' === typeof spec)
        {
            var current_looptype = word === CURRENT  &&  get_looptype( spec );
            if (current_looptype  &&
                (current_looptype === L_LEFT  ||  current_looptype === L_RIGHT)
               )
                return true;  // because of "var n = current.length;" insertion
            
            for (var k in spec) { if (!(k in _emptyObj)) {   // More flexible than hasOwnProperty

                if (word === k  ||  word_is_used( word, spec[ k ] ))
                    return true;
            }}
        }

        return false;
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
	    code.push( 'return ' + CURRENT + ';' );
        }

        // Detect a case where a first line with a `current` declaration is useless
        if (/^\s*var\s+current\s*=\s*[a-zA-Z]+\s*(?:;\s*)?$/.test( code[ 0 ] )
            &&
            !/\bcurrent\b/.test( code.slice( 1 ).join( '' ) )
           )
        {
            code.shift();
        }

        
        return code.map( indent_and_terminate_code_line, { indent : 1 } ).join( '\n' );

        // --- Details

        function one_spec_push_code( /*object*/spec )
        {
	    var looptype = get_looptype( spec );
	    if (looptype)
	    {
                check_exactly_has_properties( spec, looptype );

                var loop       = spec[ looptype ]
                
                ,   is_l_left  = L_LEFT  === looptype
                ,   is_l_right = L_RIGHT === looptype
                ,   is_l_in    = L_IN    === looptype

                ,   is_r_left  = R_LEFT  === looptype
                ,   is_r_right = R_RIGHT === looptype
                ,   is_range   = is_r_left  ||  is_r_right

                ,   mand_opt   = get_mandatory_optional( looptype, is_range  ?  ARRAY  :  spec.morph )
                ;
                delete mand_opt.mandatory.morph;
                
                check_exactly_has_properties_mand_opt( loop, mand_opt );
                
                var r_begin    = is_range  &&  loop.begin
                ,   r_end      = is_range  &&  loop.end
                ,   r_step     = is_range  &&  loop.step  ||  1
                ,   r_varname  = is_range  &&  loop.varname
                
                ,   beforeloop = solve_restwrap( arrify( loop.beforeloop  ||  [] ) )
                ,   bodyadd    = solve_restwrap( arrify( loop.bodyadd ) )
                ,   afterloop  = solve_restwrap( arrify( loop.afterloop  ||  [] ) )
                ;

                if (is_l_left  ||  is_l_right)
                {
		    code.push( 'var n = ' + CURRENT + '.length' );
                }
                else if (is_range)
                {
                    is_r_right  ||  is_r_left  ||  null.bug;
                    
                    var tmp = is_r_left
                        ?  r_end + '-(' + r_begin + ')'
                        :  r_begin + '-(' + r_end + ')'

                    ,  tmp_a = tmp
                    ,  tmp_b = '-(' + tmp + ')'
                    ,  tmp_c = 'Math.ceil( 1e-10 * Math.round( 1e10 * (' + tmp + ') / (' + r_step + ') ) )'
                    ;

                    if (isFinite( r_step ))  // e.g. `1` or `"1"` or `-123.45` or `"-123.45"`
                    {
                        // We decide now: at code generation time
                        
                        code.push( 'var n = ' + ( 1 == r_step  ?  tmp_a
                                                  :  -1 == r_step  ?  tmp_b
                                                  :  tmp_c
                                                )
                                 );
                    }
                    else
                    {
                        // We decide later: at execution time
                        
                        code.push( r_step + ' != null  ||  (' + r_step + ' = 1)' );
                        
                        code.push( 'var n = ' + r_step + ' === 1  ?  ' + tmp_a + '\n' +
                                   '    :  ' + r_step + ' === -1  ?  ' + tmp_b + '\n' +  
                                   '    :  ' + tmp_c
                                 );
                    }
                }

                beforeloop.forEach( push_codestep );

                code.push
                (
		    is_l_left  ?  'for (var k = 0; k < n; ++k ) {'
                        :  is_l_right  ?  'for (var k = n; k--;) {'
                        :  is_l_in     ?  (needs_emptyObj = true
                                           , 'for (var k in ' + CURRENT + ') { if (!(k in _emptyObj)) {'
                                          )

                    // Have to implement this way, recalculating `v`
                    // each time because of use cases with following
                    // transformations of `v` (e.g. `map(v % 2)`).
                        :  is_range  ?  [ 'for (var k = 0; k < n; ++k) {'
                                          , ' var ' + r_varname + ' = ' + r_begin
                                          , (is_r_left  ?  ' + '  :  ' - ')
                                          , r_step === 1  ||  r_step === '1'  ?  'k'  :  'k * ' + r_step
                                        ].join( '' )
                    
                    :  null.bug
                );

                if (!is_range)
                    code.push( 'var v = ' + CURRENT + '[ k ]' );

                bodyadd.forEach( push_codestep );

                code.push
                (
		    is_l_left  ||  is_l_right  ||  is_r_left  ||  is_r_right  ?  '}'
                        :  is_l_in  ?  '}}'
                        :  null.bug
                );
                
                afterloop.forEach( push_codestep );
	    }
	    else if (spec.nope)
            {
                // Do nothing :)
                check_exactly_has_properties( spec, { nope : 1 }, { first_only : 1 } );
            }
            else
	    {
                check_exactly_has_properties( spec, { stepadd : 1 }, { first_only : 1 } );

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
    
    function check_exactly_has_properties_mand_opt( /*object*/o, /*wrapper object: with `mandatory` and `optional`*/mand_opt )
    {
        check_exactly_has_properties( o, mand_opt.mandatory, mand_opt.optional );
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

    function check_no_function_value( /*object*/o )
    {
        for (var k in o) { if (!(k in _emptyObj)) {  // More flexible than hasOwnProperty

            var v = o[ k ]
            , tov = typeof v
            ;
            if ('function' === tov)
                throw new Error('function value forbidden here (object key was:"' + k + '", function name was:"' + v.name + '", function code was like:"' + (''+v).substring(0,100) + '"...)' );

            if (v  &&  'object' === v)
                check_no_function_value( v );
        }}
    }
    
    function get_looptype( /*object*/o )
    {
        return L_LEFT  in o  ?  L_LEFT
	    :  L_RIGHT in o  ?  L_RIGHT
	    :  L_IN    in o  ?  L_IN
            :  R_LEFT  in o  ?  R_LEFT
            :  R_RIGHT in o  ?  R_RIGHT
	    :  null
        ;
    }

    function get_mandatory_optional( looptype, morph )
    {
        var mandatory, optional;
        if (looptype === R_LEFT  ||  looptype === R_RIGHT)
        {
            ARRAY === morph  ||  null.unsupported;
            
            mandatory = { morph : 1, begin : 1, end : 1, varname : 1 };
            optional  = { step : 1, bodyadd : 1, conserve_array_length : 1,
                          beforeloop : 1, afterloop : 1
                        };
        }
        else
        {
            looptype === L_LEFT  ||  looptype === L_RIGHT  ||  looptype === L_IN  ||  null.unsupported;
            
            mandatory = morph  ?  { morph : 1, bodyadd : 1 }  :  { bodyadd : 1 };
            optional  =
                ARRAY === morph  ?  { keep_current_instance : 1, conserve_array_length : 1 }
            :  OBJECT === morph  ?  { keep_current_instance : 1 }
            :  { beforeloop : 1, afterloop : 1 }
            ;
        }

        return { mandatory : mandatory, optional : optional };
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

        function appfun_next( /*string | appfun | normal function with arguments*/s_f
            /*...optional arguments in the "normal function" case, else default: `current`...*/
        )
        {
	    var tf, arg, other, tof_s_f = typeof s_f;
	    
	    if ('string' === tof_s_f)
	    {
                // codestring
                tf = tfun({
		    arity : 1
		    , specgen : function ( /*string | externcall object*/transform ) {
                        return { stepadd : { set : [ CURRENT, fullexpr( transform, CURRENT ) ] } };
		    }
                });
                arg = [ s_f ];
                return tf.apply( chainspec, arg );
	    }
	    else if ((other = s_f._tf_chainspec)  &&  other instanceof _ChainSpec)
	    {
                // appfun
                return chainspec.concat_call_tf( other );
	    }
            else if (s_f._is_transfun)
            {
                // transfun
                throw new Error( 'tfun.next does not accept a transfun, only an appfun, codestring or normal function'
                                 + ' (the latter optionally inlineable #7).'
                               );
            }
            else if ('function' === tof_s_f)
            {
                // External function, optionally inlineable
                // https://github.com/glathoud/transfun/issues/7
                
                // Optional arguments, default: `current`
                var transform_arg = arguments.length > 1
                    ?  [].slice.call( arguments, 1 )
                    :  [ CURRENT ]
                ;
                tf = tfun({
		    arity : 1
		    , specgen : function ( /*string | externcall object*/transform ) {
                        return { stepadd : { set : [ CURRENT, fullexpr.apply( null, [ transform ].concat( transform_arg ) ) ] } };
		    }
                });
                arg = [ s_f ];
                return tf.apply( chainspec, arg );
            }
            else
            {
                null.invalid_next_arguments;
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
        ,   toe  = typeof expr
        , x,y,z
        ;
        return 'string' === toe
	    ?  expr

            :  'number' === toe  ||  'boolean' === toe  ||  'undefined' === toe
            ?  null.unsupported
        
        // many expression objects
        
	    :  expr instanceof Array
	    ?  expr.map( oe2c )

        // single expression object

            :  (x = expr.get_at)
            ?  x[ 0 ] + '[ ' + oe2c( x[ 1 ] ) + ' ]'
        
	    :  (x = expr.decl )
	    ?  'var ' + x[ 0 ] + '; ' + setter_code( x[ 0 ], oe2c( x[ 1 ] ) )

	    :  (x = expr.dotcall)
	    ?   x[ 0 ] + '.' + x[ 1 ] + '(' + oe2c( x[ 2 ] ) + ')'

	    :  (x = expr.push)
	    ?  x[ 0 ] + '.push(' + oe2c( x[ 1 ] ) + ')'
        
	    :  (x = expr.set)
	    ?  setter_code( x[ 0 ], oe2c( x[ 1 ] ) )

	    :  (x = expr.set_at)
	    ?  setter_code( x[ 0 ] + '[' + oe2c( x[ 1 ] ) + ']', oe2c( x[ 2 ] ) )
        
	    :  ((x = expr['if'])  &&
                (y = expr[ 'then' ], z = expr[ 'else' ], true)
	       )
	    ?  [ 'if (' + oe2c( x ) + ') {'
                 , oe2c( y )
	       ].concat( z  ?  [ '} else {', oe2c( z ), '}' ]  :  [ '}' ] )
        
        :  (x = expr.not)  ?  '!(' + oe2c( x ) + ')'
        

	    :  (x = expr.comment)  ?  '/* ' + x + ' */'

            :  (x = expr.call)  ?  x.fun + '.call(' + ([ 'this' ].concat( x.arg )).join( ',' ) + ')'
        
	    :  hasNoKey( expr )  ?  ''

	    :  null.unsupported_or_bug
        ;
        function hasNoKey( x )
        {
	    for (var k in x) { if (!(k in _emptyObj)) {
                return false;
	    }}
	    return true;
        }
        function setter_code( target, source )
        {
            return 0 > source.indexOf( _TF_POUND_OUT_TMPL )
                ?  target + ' = ' + source
                :  source.replace( new RegExp( _TF_POUND_OUT_TMPL, 'g' ), target )
            ;            
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
                ret = ret.slice( 0, i ).concat( rest_unwrap( restwrap, ret.slice( i + 1 ) ) );

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

    function rest_unwrap( restwrap, rest )
    {
        return clone_unwrap( restwrap );

        function clone_unwrap( o )
        // Deep copy of `o`, except for the places where we find
        // '#rest', which we replace with a shallow copy of `rest`.
        {
            if (!(o  &&  'object' === typeof o))
                return o;
            
            var ret = o instanceof Array  ?  []  :  {};
            
            for (var k in o) { if (!(k in _emptyObj)) {   // More flexible than hasOwnProperty

                if (k === 'rest')
                    return rest.slice();
                
                ret[ k ] = clone_unwrap( o[ k ] );
            }}

            return ret;
        }
    }
    
    // --- Support for caching to speedup the code generation
    // --- [github#2]

    function _create_CS_cache()
    {
        var tmp = 'undefined' !== typeof Map  &&  Map.prototype
        ,  base = { cs : null, map : createMap() }
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
	    for (var i = 0; i < n; ++i)
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
                        var tmp_cm = { cs : null, map : createMap() };
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
    function createMap()
    // Wrapper around ES6 Map, with fallback onto ES5 implementation.
    {
        if (null == is_Map_supported)
        {
	    var tmp = 'undefined' !== typeof Map  &&  Map.prototype;
	    is_Map_supported = !!(
                tmp  &&
		    'function' === typeof tmp.get  &&
		    'function' === typeof tmp.set
	    );
        }

        if (is_Map_supported)
	    return new Map;
        
        var basic_store = {}
        ,   other_store = []
        ;
        
        return { get   : _createMap_fallback_get
                 , set : _createMap_fallback_set 
	       };

        function _createMap_fallback_get( k )
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

        function _createMap_fallback_set( k, v )
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
                for (var n = other_store.length, i = 0; i < n; ++i)
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
