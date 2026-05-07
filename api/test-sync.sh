#!/bin/bash
# Temp script to test sync without auth

curl -X POST http://localhost:4000/api/destinations/1/sync \
  -H "Content-Type: application/json" \
  -d '{"sourceTable": "pipelines"}'
