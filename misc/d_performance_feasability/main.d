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

1 sec, 63 ms, 481 μs, and 3 hnsecs
1 sec, 314 ms, 784 μs, and 1 hnsec
159 ms and 4 hnsecs
121 ms, 364 μs, and 9 hnsecs
290 ms, 80 μs, and 1 hnsec

---

$ ldc2 --version
LDC - the LLVM D compiler (1.10.0):
  based on DMD v2.080.1 and LLVM 6.0.0
  built with LDC - the LLVM D compiler (1.10.0)
  Default target: x86_64-unknown-linux-gnu

$ main.bin 
N:  200000
BN: 100

1 sec, 22 ms, 548 μs, and 3 hnsecs
1 sec, 426 ms, 381 μs, and 3 hnsecs
176 ms, 828 μs, and 2 hnsecs
150 ms, 536 μs, and 2 hnsecs
250 ms, 973 μs, and 2 hnsecs

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
