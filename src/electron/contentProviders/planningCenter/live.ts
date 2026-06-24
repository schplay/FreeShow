/**
 * WARNING: This file should ONLY be accessed through PlanningCenterProvider.
 */

import { httpsRequest } from "../../utils/requests"
import { pcoConnect } from "./connect"
import { pcoRequest } from "./request"

export interface PCOLiveData {
    liveId: string | null
    liveChannel: string | null
    orgId: string | null
    liveStartAt: string | null
    liveEndAt: string | null
    length: number | null
    isPreService: boolean
    serviceStartAt: string | null
    serviceEndAt: string | null
}

const PUSHER_AUTH_HOST = "https://services.planningcenteronline.com"

let cachedOrgId: string | null | undefined

const planTimesCache = new Map<string, { serviceStartAt: string | null; serviceEndAt: string | null; fetchedAt: number }>()
const PLAN_TIMES_TTL_MS = 10 * 60 * 1000 // 10 minutes — service times don't change mid-service

async function getOrgId(): Promise<string | null> {
    if (cachedOrgId !== undefined) return cachedOrgId

    const data = await pcoRequest({ scope: "services", endpoint: "" })
    const orgId: string | null = data?.[0]?.id ?? null
    cachedOrgId = orgId
    return orgId
}

export async function pcoGetLiveData(serviceTypeId: string, planId: string): Promise<PCOLiveData | null> {
    // Fetch plan_times once and cache — service start/end don't change mid-service
    const planTimesCacheKey = `${serviceTypeId}/${planId}`
    let serviceStartAt: string | null = null
    let serviceEndAt: string | null = null
    const cachedTimes = planTimesCache.get(planTimesCacheKey)
    if (cachedTimes && Date.now() - cachedTimes.fetchedAt < PLAN_TIMES_TTL_MS) {
        serviceStartAt = cachedTimes.serviceStartAt
        serviceEndAt = cachedTimes.serviceEndAt
    } else {
        const planTimesList = await pcoRequest({ scope: "services", endpoint: `service_types/${serviceTypeId}/plans/${planId}/plan_times` })
        if (planTimesList?.length) {
            const byStart = [...planTimesList].sort((a: any, b: any) => new Date(a.attributes?.starts_at).getTime() - new Date(b.attributes?.starts_at).getTime())
            serviceStartAt = byStart[0]?.attributes?.starts_at ?? null
            const byEnd = [...planTimesList].sort((a: any, b: any) => new Date(b.attributes?.ends_at).getTime() - new Date(a.attributes?.ends_at).getTime())
            serviceEndAt = byEnd[0]?.attributes?.ends_at ?? null
        }
        planTimesCache.set(planTimesCacheKey, { serviceStartAt, serviceEndAt, fetchedAt: Date.now() })
    }

    // Fetch live session and org id in parallel (plan_times now cached above)
    const [liveList, orgId] = await Promise.all([
        pcoRequest({ scope: "services", endpoint: `service_types/${serviceTypeId}/plans/${planId}/live` }),
        getOrgId()
    ])

    // No active live session — return plan schedule only so pre-service countdown works
    if (!liveList?.length || !liveList[0]?.id) {
        return { liveId: null, liveChannel: null, orgId, liveStartAt: null, liveEndAt: null, length: null, isPreService: false, serviceStartAt, serviceEndAt }
    }

    const liveId: string = liveList[0].id
    // PCO provides the public Pusher channel for live updates in the live_channel attribute
    const liveChannel: string | null = liveList[0].attributes?.live_channel ?? null

    // Live resource is a singleton — endpoint is live/current_item_time, NOT live/{id}/current_item_time
    const itemTimeList = await pcoRequest({ scope: "services", endpoint: `service_types/${serviceTypeId}/plans/${planId}/live/current_item_time` })

    const noItemTime = { liveId, liveChannel, orgId, liveStartAt: null, liveEndAt: null, length: null, isPreService: false, serviceStartAt, serviceEndAt }

    const itemTime = itemTimeList?.[0]
    if (!itemTimeList?.length || !itemTime?.attributes || itemTime.attributes.exclude) return noItemTime

    const rawLength = itemTime.attributes.length
    const parsedLength = rawLength != null && !isNaN(Number(rawLength)) ? Number(rawLength) : null

    // Determine if the current item is a pre-service item so the frontend can show the
    // correct countdown (serviceStartAt - now) rather than liveStartAt + length - now.
    // Primary: check service_position via the plan item relationship.
    // Fallback: length_offset=null is only set on pre-service items per observed API behaviour.
    let isPreService = false
    const planItemId: string | null = itemTime.relationships?.plan_item?.data?.id ?? null
    if (planItemId) {
        const planItemList = await pcoRequest({ scope: "services", endpoint: `service_types/${serviceTypeId}/plans/${planId}/items/${planItemId}` })
        isPreService = planItemList?.[0]?.attributes?.service_position === "pre_service"
    } else {
        // Fallback: PCO sets length_offset=null on pre-service items and 0 on regular items
        isPreService = itemTime.attributes.length_offset == null
    }

    return {
        liveId,
        liveChannel,
        orgId,
        liveStartAt: itemTime.attributes.live_start_at ?? null,
        liveEndAt: itemTime.attributes.live_end_at ?? null,
        length: parsedLength,
        isPreService,
        serviceStartAt,
        serviceEndAt
    }
}

// Authorizes a Pusher presence-channel subscription (kept for potential future use).
// NOTE: PCO's public live_channel requires no auth — use that instead.
export async function pcoGetPusherAuth(socketId: string, channelName: string, serviceTypeId: string): Promise<{ auth: string; channel_data?: string } | null> {
    const access = await pcoConnect("services")
    if (!access) return null

    return new Promise((resolve) => {
        httpsRequest(
            PUSHER_AUTH_HOST,
            `/pusher/auth?service_type=${serviceTypeId}&time=${Date.now()}`,
            "POST",
            { Authorization: `Bearer ${access.access_token}`, "Content-Type": "application/x-www-form-urlencoded" },
            { socket_id: socketId, channel_name: channelName },
            (err, result) => {
                if (err) {
                    console.warn("PCO Pusher auth failed:", err.message)
                    return resolve(null)
                }
                resolve(result)
            }
        )
    })
}
