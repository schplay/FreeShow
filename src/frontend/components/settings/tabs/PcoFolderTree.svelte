<script lang="ts">
    import { createEventDispatcher } from "svelte"
    import type { PCOFolderTreeNode } from "../../../../electron/contentProviders/planningCenter/request"
    import Icon from "../../helpers/Icon.svelte"

    export let nodes: PCOFolderTreeNode[]
    export let selectedIds: string[]
    export let depth = 0

    const dispatch = createEventDispatcher()

    // Start with all folders expanded
    let expanded = new Set<string>(nodes.filter((n) => n.type === "folder").map((n) => n.id))

    function toggleExpand(id: string) {
        if (expanded.has(id)) expanded.delete(id)
        else expanded.add(id)
        expanded = expanded
    }

    function toggleCheck(id: string) {
        const next = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
        dispatch("change", next)
    }

    function forwardChange(e: CustomEvent<string[]>) {
        dispatch("change", e.detail)
    }
</script>

{#each nodes as node}
    {#if node.type === "folder"}
        <div class="folder-row" style="padding-inline-start: {depth * 16}px">
            <button class="expand-btn" on:click={() => toggleExpand(node.id)} title={expanded.has(node.id) ? "Collapse" : "Expand"}>
                <Icon id={expanded.has(node.id) ? "arrow_down" : "arrow_right"} size={0.75} white />
            </button>
            <label class="folder-label">
                <input type="checkbox" checked={selectedIds.includes(node.id)} on:change={() => toggleCheck(node.id)} />
                <Icon id="folder" size={0.9} white />
                <span>{node.name}</span>
            </label>
        </div>
        {#if expanded.has(node.id) && node.children.length}
            <svelte:self nodes={node.children} {selectedIds} depth={depth + 1} on:change={forwardChange} />
        {/if}
    {:else}
        <div class="service-row" style="padding-inline-start: {depth * 16 + 36}px">
            <Icon id="list" size={0.8} white />
            <span class="service-name">{node.name}</span>
        </div>
    {/if}
{/each}

<style>
    .folder-row,
    .service-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding-block: 3px;
        padding-inline-end: 8px;
    }

    .expand-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 2px;
        display: flex;
        align-items: center;
        flex-shrink: 0;
        opacity: 0.7;
    }
    .expand-btn:hover {
        opacity: 1;
    }

    .folder-label {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font-size: 0.95em;
        user-select: none;
    }

    input[type="checkbox"] {
        cursor: pointer;
        width: 14px;
        height: 14px;
        flex-shrink: 0;
        accent-color: var(--secondary);
    }

    .service-row {
        opacity: 0.6;
        font-size: 0.85em;
    }

    .service-name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
</style>
