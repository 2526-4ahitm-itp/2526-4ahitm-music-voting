#!/bin/bash

cd ../addMusic || exit 1

# Immer auf localhost laufen lassen
ng serve --port 8082 --host 127.0.0.1 --disable-host-check -o
