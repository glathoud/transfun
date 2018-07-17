#!/usr/bin/env rdmd
// -*- coding: utf-8 -*-

import std.algorithm;
import std.datetime.stopwatch : benchmark, StopWatch;
import std.format;
import std.math;
import std.random;
import std.stdio;
import std.traits;

/*
ldc2 -ofmain.bin -O main.d ; main.bin

N:  100000000
BN: 5

686 ms, 336 μs, and 1 hnsec
748 ms, 33 μs, and 8 hnsecs
631 ms, 339 μs, and 5 hnsecs
633 ms, 74 μs, and 7 hnsecs
629 ms, 515 μs, and 8 hnsecs

--
dmd -ofmain.bin -O -inline main.d ; main.bin

N:  100000000
BN: 5

N:  100000000
BN: 5

4 secs, 542 ms, 993 μs, and 3 hnsecs
6 secs, 210 ms, 470 μs, and 6 hnsecs
984 ms, 86 μs, and 2 hnsecs
987 ms, 23 μs, and 8 hnsecs
982 ms, 187 μs, and 5 hnsecs
*/

enum  N = 100_000_000;
enum BN = 5;


void main()
{
  writeln( "N:  ", N );
  writeln( "BN: ", BN );
  
auto data = create_pseudo_random_arr();

 auto true_result = map_filter_sum_impl( data ); 
 
auto r = benchmark!
  ( wrap!( true_result, map_filter_sum_impl, data )
    , wrap!( true_result, map_cache_filter_sum_impl, data )
    , wrap!( true_result, direct_impl, data )
    , wrap!( true_result, direct_impl2, data )
    , wrap!( true_result, direct_impl2_external!( a => a.p, isFinite, (a,b) => a+b), data )
    )( BN );
writeln;
foreach (o; r)
writeln( o );

}

// ---

void wrap( alias true_result, alias impl, alias data )()
{
  auto obtained = impl( data );
  auto delta = true_result - obtained;
  bool isOk  = 1e-10 > abs( delta );
  assert( isOk
          , format( "true_result: %s, obtained: %s, delta: %s", true_result, obtained, delta )
          );
}

// --- 

struct S { double p; };

double map_filter_sum_impl( in ref S[] data )
{
return data.map!"a.p"
.filter!"isFinite(a)"
.reduce!"a+b";
}

double map_cache_filter_sum_impl( in ref S[] data )
{
return data.map!"a.p"
.cache
.filter!"isFinite(a)"
.reduce!"a+b";
}

double direct_impl( in ref S[] data )
{
double ret = 0;
for (ulong i = 0, i_end = data.length; i < i_end; ++i)
  {
auto current_0 = data[ i ];
auto current_1 = current_0.p;
if (isFinite( current_1 ))
  ret += current_1;
}
return ret;
}


double direct_impl2( in ref S[] data )
{
double ret = 0;
foreach (k, ref v; data )
  {
alias current_0 = v;
auto current_1 = current_0.p;
if (isFinite( current_1 ))
  ret += current_1;
}
return ret;
}

double direct_impl2_external( alias fa, alias fb, alias fc )( in ref S[] data )
{
double ret = 0;
foreach (k, ref v; data )
  {
alias current_0 = v;
auto current_1 = fa( current_0 );
if (fb( current_1 ))
  ret = fc( ret, current_1 );
}
return ret;
}

// ---

S[] create_pseudo_random_arr( in uint n = N )
{
auto ret = new S[ n ]
  ,   drop = 0.1 // Proportion of numbers to drop
  ;

// Deterministic pseudo-random numbers to make sure
// arr is always generated the same way.
// http://stackoverflow.com/questions/521295/javascript-random-seeds
double seed = 1;

double random()
{
double x = sin(seed++) * 10000;
return x - floor(x);
}

foreach (i; 0..n)
ret[i] = S( random() < drop ? double.nan : cast(double)(i) );

return ret;

} 
