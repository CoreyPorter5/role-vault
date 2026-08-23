import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
    return await updateSession(request)
}

export const config = {
    // Only protected pages need server-side token refresh and authorization.
    // Public pages can therefore remain cacheable and avoid an auth round trip.
    matcher: ['/dashboard/:path*'],
}
