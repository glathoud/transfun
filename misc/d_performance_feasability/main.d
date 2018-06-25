#!/usr/bin/env rdmd

import std.algorithm;
import std.datetime.stopwatch : benchmark, StopWatch;
import std.math;
import std.parallelism;
import std.random;
import std.stdio;

enum  N = 200_000;
enum BN = 100;

/*
dmd --version
DMD64 D Compiler v2.078.3

$ ./main.d 
N:  200000
BN: 100

1 sec, 80 ms, and 594 μs
1 sec, 389 ms, 751 μs, and 4 hnsecs
152 ms, 188 μs, and 1 hnsec
126 ms, 478 μs, and 5 hnsecs
283 ms, 427 μs, and 5 hnsecs
192 ms, 43 μs, and 6 hnsecs
342 ms, 349 μs, and 8 hnsecs

---

$ ldc2 --version
LDC - the LLVM D compiler (1.10.0):
  based on DMD v2.080.1 and LLVM 6.0.0
  built with LDC - the LLVM D compiler (1.10.0)
  Default target: x86_64-unknown-linux-gnu

$ ldc2  -ofmain.bin main.d ; main.bin
N:  200000
BN: 100

1 sec, 28 ms, and 536 μs
1 sec, 408 ms, 192 μs, and 7 hnsecs
162 ms, 944 μs, and 6 hnsecs
158 ms, 897 μs, and 4 hnsecs
326 ms, 268 μs, and 5 hnsecs
236 ms, 584 μs, and 6 hnsecs
352 ms, 594 μs, and 2 hnsecs

*/

void main()
{
  writeln( "N:  ", N );
  writeln( "BN: ", BN );
  
auto data = create_pseudo_random_arr();

auto r = benchmark!
  ( () => map_filter_sum_impl( data )
      , () => map_cache_filter_sum_impl( data)
      , () => direct_impl( data )
      , () => direct_impl2( data )
      , () => direct_impl2_parallel( data )
      , () => direct_impl2_external!( a => a.p, isFinite, (a,b) => a+b)( data )
      , () => direct_impl2_external_parallel!( a => a.p, isFinite, (a,b) => a+b)( data )
      )( BN );
writeln;
foreach (o; r)
writeln( o );

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


double direct_impl2_parallel( in ref S[] data )
{
double ret = 0;
foreach (k, ref v; data.parallel ) // okay in this particular case
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


double direct_impl2_external_parallel( alias fa, alias fb, alias fc )( in ref S[] data )
{
double ret = 0;
foreach (k, ref v; data.parallel ) // okay in this particular case
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
