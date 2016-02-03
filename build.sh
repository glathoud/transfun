#!/usr/bin/env sh

rm -rf build/*
cat transfun.js plugin/*.js > build/transfun.js
cp test.html opinel.js test.js build/
cp -a prettify build/prettify

