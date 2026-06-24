import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, password } = await request.json()

  if (email === 'admin@onecarta.shop' && password === 'tousif2026') {
    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_token', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      // No maxAge/expires set => this becomes a SESSION cookie, meaning it is
      // automatically cleared once the browser is fully closed (not just the tab).
      // This matches the requirement: closing the dev session should require a
      // fresh login next time, instead of staying signed in for 7 days.
      path: '/',
    })
    return response
  }

  return NextResponse.json(
    { success: false, error: 'Invalid credentials' },
    { status: 401 }
  )
}