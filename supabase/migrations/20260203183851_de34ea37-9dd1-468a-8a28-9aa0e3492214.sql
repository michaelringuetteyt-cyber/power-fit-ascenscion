-- Add max_bookings column to available_dates
ALTER TABLE public.available_dates
ADD COLUMN max_bookings integer NOT NULL DEFAULT 1;

-- Add comment for clarity
COMMENT ON COLUMN public.available_dates.max_bookings IS 'Maximum number of bookings allowed per time slot';