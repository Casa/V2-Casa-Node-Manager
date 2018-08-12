#!/usr/bin/env bash
export ARCHITECTURE=x86

docker build . -t casacomputer/manager:$ARCHITECTURE