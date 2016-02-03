/*
  devilappfun.js
  
  Copyright Guillaume Lathoud 2016
  Boost License: see the file ../LICENSE

  Contact: glat@glat.info

  --- DESCRIPTION ---

  Minimal support of the `appfun` interface to wrap around your
  functions, chain them using `next`, and retrieve the resulting code.
  
  WARNING! This relies on function decompilation. Stick to simple,
  closureless, non-native and non-bound functions.

  http://perfectionkills.com/state-of-function-decompilation-in-javascript/

  Example of use: together with ./parallel.js
*/

/*global devilappfun*/

var devilappfun;
(function () {

    // ---------- Public API

    devilappfun = tfun_devilappfun;

    // ---------- Public API implementation

    function tfun_devilappfun( f )
    {
        return _DAF_create( 'function' === typeof f  ?  [ f ]  :  f );
    }

    // ---------- Private details

    function _DAF_create( f_arr )
    {
        f_arr.splice.call.a; // must be an array

        var code
        , impl
        ;

        // Minimal support of the `appfun` interface.
        
        daf.getBodyCode  = daf_getBodyCode;
        daf.getNExternal = daf_getNExternal;
        daf.next         = daf_next;
                
        return daf;

        function daf( current )
        {
            _daf_ensure_impl();
            return impl( current );
        }

        function daf_getBodyCode()
        {
            _daf_ensure_impl();
            return code;
        }

        function daf_getNExternal()
        // Of course you won't put any externals in your code, right?
        {
            return 0;
        }

        function daf_next( f )
        {
            return _DAF_create( f_arr.concat( [ f ] ) );
        }

        function _daf_ensure_impl()
        // Of course you don't *intend* to rely on function decompilation, right?
        // 
        // State of function decompilation as of 2014-01-14:
        // http://perfectionkills.com/state-of-function-decompilation-in-javascript/
        {
            if (!impl)
            {
                code = 'return ' + f_arr.reduce( _daf_decompile_and_wrap_one, 'current' );
                impl = new Function( 'current', code );
            }
        }

        function _daf_decompile_and_wrap_one( prev, next )
        {
            // function decompilation: `next.toString()`
            return '(' + next.toString() + ')' + '(' + prev + ')';
        }
    }

})();
