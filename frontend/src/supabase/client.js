import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://uifenovojjcrsqidpeks.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZmVub3ZvampjcnNxaWRwZWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyODMzNzAsImV4cCI6MjA5MDg1OTM3MH0.GhxjVe2cdRo5upPe3MsRlQnBoYDm9dHnEmhy62kq684'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)