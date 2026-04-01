<template>
  <span :style="{
    fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px',
    padding: '2px 7px', borderRadius: '3px',
    color: MARKET_COLOR[market], background: MARKET_BG[market],
    fontFamily: 'monospace'
  }">{{ market }}</span>
</template>

<script>
const MARKET_COLOR = { 'A股': '#c0392b', '港股': '#1a6fa8', '美股': '#1a7a4a' }
const MARKET_BG = { 'A股': '#fdf0ef', '港股': '#eef4fb', '美股': '#edf7f1' }

export default {
  props: ['market'],
  setup() {
    return { MARKET_COLOR, MARKET_BG }
  }
}
</script>
