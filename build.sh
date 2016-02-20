#!/usr/bin/env sh

rm -rf build/*

cat transfun.js plugin/*.js > build/transfun.js
cp LICENSE test.html test.js build/
cp -a rsrc_web build
