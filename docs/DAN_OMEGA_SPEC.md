# DAN-OMEGA Boundary Layer Specification v1.0

## Summary

DAN-OMEGA is the bridge between the external resonance signal surface and the internal Chorus control state.
Its job is simple:

- accept only well-formed tuner input
- reject stale or out-of-order payloads
- map accepted payloads into the visual control space deterministically
- surface link state clearly to the operator

## Input Contract

The bridge listens for local storage updates on `lumina-wave-params`.

Expected payload:

```json
{
  "freq": 1.68,
  "speed": 1.2,
  "complexity": 4,
  "hueShift": 0,
  "timestamp": 1710000000000,
  "source": "resonance-tuner"
}
```

Validation rules:

- `source` must equal `resonance-tuner`
- `timestamp` must be finite and newer than the last applied payload
- payload age must be less than 500 ms
- numeric fields are clamped into accepted operating ranges

## Mapping

Accepted payloads are mapped into Chorus space as follows:

- `hue = wrap(170 + hueShift)`
- `speed = clamp(speed, 0.0, 2.5)`
- `complexity = clamp(complexity / 3.5, 1 / 3.5, 2.0)`
- `frequency = clamp(freq / 2, 0.2, 2.1)`

This mapping keeps the external tuner protocol stable while preserving the internal visual scale used by the lattice renderer.

## Transport Behavior

The bridge uses two input paths:

- `storage` event for cross-tab updates
- 100 ms polling fallback for same-tab updates and missed events

If no valid payload arrives within the freshness window, the UI drops back to the offline state.

## Operator Surface

The UI must expose:

- linked/offline status
- current mapped frequency readout
- capture tooling for the current resonance frame
- current Nonagram plate and invariant status

## Nonagram Surface

The UI rotates through the nine-plate sequence independently of tuner cadence.
This keeps the architectural visualization stable even when the external bridge goes quiet.

Core sequence:

`VIII -> IV -> III -> I -> V -> IX -> ∞`

## Build Intent

This document is a practical interface contract, not a proof artifact.
Formal claims should be backed separately by model-checking outputs, traces, and reproducible verification logs.
