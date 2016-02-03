#!/usr/bin/env sh

rm build/*.js build/*.html
cat transfun.js plugin/*.js > build/transfun.js
cp LICENSE test.html opinel.js test.js build/
cp -a prettify build/prettify

