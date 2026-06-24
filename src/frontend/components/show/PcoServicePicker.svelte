<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte"
    import { Main } from "../../../types/IPC/Main"
    import type { PCOFolderTreeNode } from "../../../electron/contentProviders/planningCenter/request"
    import { requestMain } from "../../IPC/main"
    import Icon from "../helpers/Icon.svelte"
    import PcoServiceTreeNodes from "./PcoServiceTreeNodes.svelte"
    import { translateText } from "../../utils/language"

    const dispatch = createEventDispatcher<{ select: { serviceTypeId: string; planId: string }; close: void }>()

    let nodes: PCOFolderTreeNode[] = []
    let loading = true
    let fetchError = false
    let expanded = new Set<string>()

    onMount(async () => {
        try {
            const tree = await requestMain(Main.PCO_FETCH_SERVICE_TREE)
            nodes = tree ?? []
            const autoExpand = (items: PCOFolderTreeNode[]) => {
                items.forEach((n) => {
                    if (n.type !== "plan") {
                        expanded.add(n.id)
                        autoExpand(n.children)
                    }
                })
            }
            autoExpand(nodes)
            expanded = expanded
        } catch {
            fetchError = true
        } finally {
            loading = false
        }
    })

    function onSelect(e: CustomEvent<PCOFolderTreeNode>) {
        const node = e.detail
        if (node.type !== "plan" || !node.serviceTypeId) return
        dispatch("select", { serviceTypeId: node.serviceTypeId, planId: node.id })
    }
</script>

<div class="overlay" role="none" on:click={() => dispatch("close")}></div>

<div class="picker">
    <div class="pickerHeader">
        <span>Select a Planning Center Service</span>
        <button class="closeBtn" on:click={() => dispatch("close")}>
            <Icon id="close" size={0.9} white />
        </button>
    </div>

    <div class="pickerBody">
        {#if loading}
            <p class="status">Loading…</p>
        {:else if fetchError || !nodes.length}
            <p class="status empty">{translateText("timer.no_upcoming_services_found")}</p>
        {:else}
            <PcoServiceTreeNodes {nodes} {expanded} on:toggle={(e) => { if (expanded.has(e.detail)) expanded.delete(e.detail); else expanded.add(e.detail); expanded = expanded }} on:select={onSelect} />
        {/if}
    </div>
</div>

<style>
    .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 200;
    }

    .picker {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 201;
        background: var(--primary-darker);
        border: 1px solid var(--primary-lighter);
        border-radius: 8px;
        width: min(400px, 90vw);
        max-height: 65vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    }

    .pickerHeader {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        border-bottom: 1px solid var(--primary-lighter);
        flex-shrink: 0;
        font-size: 0.95em;
        font-weight: 600;
        opacity: 0.9;
    }

    .closeBtn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 2px;
        display: flex;
        opacity: 0.6;
    }
    .closeBtn:hover {
        opacity: 1;
    }

    .pickerBody {
        overflow-y: auto;
        padding: 6px 0;
        flex: 1;
    }

    .status {
        padding: 20px;
        text-align: center;
        font-size: 0.9em;
    }

    .empty {
        opacity: 0.5;
    }
</style>
