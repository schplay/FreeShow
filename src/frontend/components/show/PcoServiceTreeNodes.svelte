<script lang="ts">
    import { createEventDispatcher } from "svelte"
    import type { PCOFolderTreeNode } from "../../../electron/contentProviders/planningCenter/request"
    import Icon from "../helpers/Icon.svelte"
    import { translateText } from "../../utils/language"

    export let nodes: PCOFolderTreeNode[]
    export let expanded: Set<string>
    export let depth = 0

    const dispatch = createEventDispatcher<{ toggle: string; select: PCOFolderTreeNode }>()

    function forwardToggle(e: CustomEvent<string>) {
        dispatch("toggle", e.detail)
    }
    function forwardSelect(e: CustomEvent<PCOFolderTreeNode>) {
        dispatch("select", e.detail)
    }
</script>

{#each nodes as node}
    {#if node.type === "folder"}
        <div class="row folder-row" style="padding-inline-start: {depth * 16}px">
            <button class="expand-btn" on:click={() => dispatch("toggle", node.id)} title={expanded.has(node.id) ? "Collapse" : "Expand"}>
                <Icon id={expanded.has(node.id) ? "arrow_down" : "arrow_right"} size={0.75} white />
            </button>
            <Icon id="folder" size={0.9} white />
            <span class="label">{node.name}</span>
        </div>
        {#if expanded.has(node.id) && node.children.length}
            <svelte:self nodes={node.children} {expanded} depth={depth + 1} on:toggle={forwardToggle} on:select={forwardSelect} />
        {/if}
    {:else if node.type === "service_type"}
        <div class="row service-row" style="padding-inline-start: {depth * 16 + 28}px">
            <button class="expand-btn" on:click={() => dispatch("toggle", node.id)} title={expanded.has(node.id) ? "Collapse" : "Expand"}>
                <Icon id={expanded.has(node.id) ? "arrow_down" : "arrow_right"} size={0.75} white />
            </button>
            <Icon id="list" size={0.8} white />
            <span class="label">{node.name}</span>
        </div>
        {#if expanded.has(node.id) && node.children.length}
            <svelte:self nodes={node.children} {expanded} depth={depth + 1} on:toggle={forwardToggle} on:select={forwardSelect} />
        {:else if expanded.has(node.id)}
            <div class="no-plans" style="padding-inline-start: {(depth + 1) * 16 + 28}px">{translateText("timer.no_upcoming_services")}</div>
        {/if}
    {:else if node.type === "plan"}
        <button class="row plan-row" style="padding-inline-start: {depth * 16 + 28}px" on:click={() => dispatch("select", node)}>
            <Icon id="project" size={0.8} white />
            <span class="label">{node.name}</span>
        </button>
    {/if}
{/each}

<style>
    .row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding-block: 3px;
        padding-inline-end: 8px;
        width: 100%;
        box-sizing: border-box;
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

    .label {
        font-size: 0.9em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: left;
    }

    .folder-row {
        font-weight: 600;
        opacity: 0.85;
    }

    .service-row {
        background: none;
        border: none;
        opacity: 0.8;
    }

    .plan-row {
        background: none;
        border: none;
        cursor: pointer;
        opacity: 0.7;
        color: var(--text, white);
        transition: opacity 0.1s, background 0.1s;
        border-radius: 4px;
    }
    .plan-row:hover {
        opacity: 1;
        background: rgba(255, 255, 255, 0.06);
    }

    .no-plans {
        font-size: 0.8em;
        opacity: 0.4;
        padding-block: 3px;
        font-style: italic;
    }
</style>
