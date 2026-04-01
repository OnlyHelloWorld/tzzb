<template>
  <span :style="{
    color: val >= 0 ? '#1a7a4a' : '#c0392b',
    fontFamily: 'monospace',
    fontSize: (size || 13) + 'px',
    fontWeight: 600,
  }">
    {{ val >= 0 ? '+' : '-' }}{{ Math.abs(pct).toFixed(2) }}%
  </span>
</template>

<script>
export default {
  name: 'PnLTag',
  props: {
    val: { type: Number, default: 0 },
    pct: { type: Number, default: 0 },
    size: { type: Number, default: 13 },
  },
}
</script>
