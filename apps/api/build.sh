#!/bin/bash

# Copy dependencies
cp -r ../../node_modules ./node_modules
cp -r ../../packages ./packages

# Build TypeScript
npm run build

# Clean up
rm -rf packages