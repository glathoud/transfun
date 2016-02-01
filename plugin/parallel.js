/*
  parallel.js
  
  Copyright Guillaume Lathoud 2016
  Boost License: see the file ../LICENSE

  Contact: glat@glat.info

  --- DESCRIPTION ---

  XXX WORK IN PROGRESS - NOT TESTED YET

  Split an `appfun` across workers. 
  
  `appfun` must support the interface:

   * `getNExternals()`: returns the number of extern calls (must be zero!).

   * `getBodyCode()`: returns the JavaScript code implementing `appfun`
     with an input parameter called `current`.

   * `next( otherAppfun )`: returns a new `appfun` that is the composition
     of the two: `this` and `otherAppfun`.

  The `appfun`s produced by ../transfun.js support that interface.

  You may however develop your own. Example: ./devilappfun.js
*/

/*global psingle psplit navigator URL Blob Worker setTimeout*/

var psingle, psplit; // required
(function () {

    var DEFAULT_N_WORKERS = navigator.hardwareConcurrency - 1  ||  3
    ,   WORKERS_SUPPORTED = 'undefined' !== typeof URL  &&  'function' === typeof URL.createObjectURL  &&
        'function' === typeof Blob  &&
        'function' === typeof Worker
    ;
    
    // ---------- Public API
    
    psingle = tfun_psingle;
    psplit  = tfun_psplit;

    // ---------- Public API implementation

    function tfun_psingle( appfun )
    // Setup an `appfun` runner for a single parallel worker.
    {
        return tfun_psplit( appfun, { n : 1 } );
    }

    function tfun_psplit( appfun, /*?object { n : <integer>} | { prop : <float between 0 and 1>}?*/cfg )
    // Setup an `appfun` runner for a several parallel workers.
    {
        cfg != null  ||  (cfg = { n : DEFAULT_N_WORKERS });

        return new _ParallelSplit( appfun, cfg );
    }

    // ---------- Private details

    function _ParallelSplit( appfun, cfg, previous_parallelMerge )
    {
        if (appfun.getNExternal() !== 0)
            throw new Error( 'psplit: `appfun`: external calls are forbidden here!' );

        cfg.n != null
            ?  0 < cfg.n       &&  cfg.n < Infinity  &&  cfg.n.toPrecision.call.a
            :  0.0 < cfg.prop  &&  cfg.prop < 1.0    &&  cfg.prop.toPrecision.call.a
        ;
        
        this.appfun = appfun;
        this.cfg    = cfg;
        this.previous_parallelMerge = previous_parallelMerge  ||  null;
    }

    var PS_proto = _ParallelSplit.prototype;

    PS_proto.pnext           = PS_pnext;
    PS_proto.pmerge          = PS_pmerge
    PS_proto.pmergeRight     = PS_pmergeRight;
    PS_proto.pmerginit       = PS_pmerginit
    PS_proto.pmerginitRight  = PS_pmerginitRight;

    function PS_pnext( appfun )
    {
        return new _ParallelSplit( this.appfun  ?  this.appfun.next( appfun )  :  appfun, this.cfg );
    }

    function PS_pmerge( /*function (out,v) => new_out*/mergefun )
    {
        return new _ParallelMerge( this, mergefun );
    }
    
    function PS_pmergeRight( /*function (out,v) => new_out*/mergefun )
    {
        return new _ParallelMerge( this, mergefun, { righttoleft : true } );
    }

    function PS_pmerginit( /*any*/initval, /*function (out,v) => new_out*/mergefun )
    {
        return new _ParallelMerge( this, mergefun, { initval : initval } );
    }
    
    function PS_pmerginitRight( /*any*/initval, /*function (out,v) => new_out*/mergefun )
    {
        return new _ParallelMerge( this, mergefun, { initval : initval, righttoleft : true } );
    }

    // ---
    
    function _ParallelMerge( parallelSplit, mergefun, opt, opt_nextAppFun )
    {
        this.parallelSplit = parallelSplit;
        this.mergefun      = mergefun;
        this.opt           = opt  ||  {};

        this.nextAppfun    = opt_nextAppFun  ||  null; // optional main-thread post-processing, see `next` below
    }

    var PM_proto = _ParallelMerge.prototype;

    PM_proto.next    = PM_next;
    PM_proto.run     = PM_run;
    PM_proto.psingle = PM_psingle;
    PM_proto.psplit  = PM_psplit;
    
    function PM_next( appfun )
    {
        var   naf = this.nextAppfun
        , new_naf = naf  ?  naf.next( appfun )  :  appfun
        ;
        return new _ParallelMerge( this.parallelSplit, this.mergefun, this.opt, new_naf );
    }

    function PM_run( data )
    {
        var that = this;
        
        var done
        , merged_result
        , nextAppfun = that.nextAppfun
        , cb_arr = []
        ;

        _PS_run.call( that.parallelSplit, data ).then( _PM_merge_result );
        
        return { then : _PM_run_then };

        function _PM_merge_result( result_arr )
        {
            var  method = that.opt.righttoleft  ?  'reduceRight'  :  'reduce';

            merged_result = 'initval' in that.opt
                ?  result_arr[ method ]( that.mergefun, that.opt.initval )
                :  result_arr[ method ]( that.mergefun )
            ;
            done = true;

            var final_merged_result = nextAppfun
                ?  nextAppfun( merged_result )
                :  merged_result
            ;

            while (cb_arr.length)
                cb_arr.shift()( final_merged_result );
        }

        function _PM_run_then( callback )
        {
            if (done)
                callback( merged_result );
            else
                cb_arr.push( callback );
        }
    }

    function PM_psingle( appfun )
    {
        return this.psplit( appfun, 1 );
    }

    function PM_psplit( appfun,  /*?object { n : <integer>} | { prop : <float between 0 and 1>}?*/cfg )
    {
        cfg != null  ||  (cfg = this.parallelSplit.cfg  ||  { n : DEFAULT_N_WORKERS });
        return new _ParallelSplit( appfun, cfg, this );
    }
    
    // ---------- Private details: Deeper

    function _PS_run( data )
    {
        var that = this;
        
        var done
        ,   split_result
        ,   cb_arr = []
        ,   ppm    = that.previous_parallelMerge
        ;
        if (ppm)
            ppm.run( data ).then( _PS_run_impl );
        else
            _PS_run_impl( data );

        return { then : _PS_run_then };

        function _PS_run_then( callback )
        {
            if (done)
                callback( split_result );
            else
                cb_arr.push( callback );
        }

        function _PS_run_impl( data2 )
        {
            var  cfg = that.cfg
            , appfun = that.appfun
            , split_data
            ;
            if (WORKERS_SUPPORTED)
            {
                var n = Math.max( 1, Math.min(
                    DEFAULT_N_WORKERS
                    , cfg.n != null
                        ?  cfg.n
                        :  Math.round( cfg.prop * DEFAULT_N_WORKERS )
                ));
                n.toPrecision.call.a;
                
                if (n < 2)
                {
                    split_data = [ data2 ];
                }
                else
                {
                    if (!(data2  instanceof Array  ||  (data2  &&  data2.slice  &&  data2.length != null)))
                        throw new Error( 'ParallelSplit on more than one worker can only run on array data!' );

                    var delta  = Math.max( 1, data2.length / n )
                    ,   x      = 0
                    ,   i_next = 0
                    ;
                    while (i_next < n)
                    {
                        x += delta;

                        var j = 1 + Math.min( n, Math.max( i_next, Math.round( x ) ) );

                        split_data.push( data2.slice( i_next, j ) );

                        i_next = j;
                    }
                }

                var n_worker = split_data
                , result_arr = new Array( n_worker )
                , n_received = 0
                , bodycode   = appfun.getBodyCode()
                ;
                
                split_data.forEach( _PS_start_one_worker );
            }
            else if ('function' === typeof setTimeout)
            {
                // Workers not supported. Fallback 1: later.
                setTimeout( _PS_fallback_run_in_main );
                
            }
            else
            {
                // Workers not supported. Fallback 2: now.
                _PS_fallback_run_in_main();
            }

            // --- details
            
            function _PS_start_one_worker( data_piece, i_worker )
            {
                var blob_url = URL.createObjectURL(
                    new Blob(
                        [ // Javascript code that can run any piece of code (xxx we might switch to a worker pool later on)
                            "(function () {",
                            "var w_code2fun = {};",
                            "self.addEventListener('message', function(e) {",
                            "var w_code = e.data.w_code;",
                            "(w_code  ||  null).substring.call.a;",
                            "var fun = w_code in w_code2fun  ?  w_code2fun[ w_code ]  :  (w_code2fun[ w_code ] = new Function( 'current', w_code ))",
                            ",   ret = fun( e.data.w_data )",
                            ";",
                            "self.postMessage( ret );",
                            "})();"
                        ]
                        , {type: 'application/javascript'}
                    )
                )
                , worker = new Worker( blob_url )
                ;
                worker.addEventListener( 'message', _PS_receive_one_result );

                worker.postMessage( { w_data   : data_piece
                                      , w_code : bodycode
                                    }
                                  );
                
                function _PS_receive_one_result( e )
                {
                    result_arr[ i_worker ] = e.data;
                    n_received++;
                    worker.terminate(); // xxx we might switch to a worker pool later on
                    
                    if (n_received === n_worker)
                    {
                        split_result = result_arr;
                        _PS_transmit_result();
                    }
                }

            } // _PS_start_one_worker

            function _PS_fallback_run_in_main()
            {
                split_result = [ appfun( data ) ];
                _PS_transmit_result();
            }
            
            function _PS_transmit_result()
            {
                done = true;
                
                while (cb_arr.length)
                    cb_arr.shift()( split_result );
            }
            
        } // _PS_run_impl

    } // _PS_run
    
})();
