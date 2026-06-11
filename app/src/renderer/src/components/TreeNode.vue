<script setup lang="ts">
import { computed } from 'vue'

export interface TreeNodeData {
  name: string
  kind: 'file' | 'dir'
  children?: TreeNodeData[]
}

const props = defineProps<{
  node: TreeNodeData
  depth: number
}>()

const isDir = computed(() => props.node.kind === 'dir')
</script>

<template>
  <li class="tree-item">
    <div
      class="tree-row"
      :class="{ 'is-file': !isDir }"
      :style="{ paddingLeft: `${depth * 12 + 12}px` }"
    >
      <span class="row-icon">{{ isDir ? '▾' : '·' }}</span>
      <span class="row-name">{{ node.name }}</span>
    </div>
    <ul v-if="isDir && node.children && node.children.length" class="tree-children">
      <TreeNode
        v-for="c in node.children"
        :key="c.name"
        :node="c"
        :depth="depth + 1"
      />
    </ul>
  </li>
</template>

<style scoped>
.tree-item { list-style: none; }
.tree-children { list-style: none; margin: 0; padding: 0; }
.tree-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text);
  font-weight: 500;
}
.tree-row.is-file {
  font-weight: 400;
  color: var(--text-dim);
}
.row-icon {
  color: var(--text-faint);
  font-size: 10px;
  width: 12px;
  text-align: center;
  display: inline-block;
}
.row-name:hover { color: var(--accent); cursor: pointer; }
</style>
