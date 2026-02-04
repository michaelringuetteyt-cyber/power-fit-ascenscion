-- Add unique constraint on date column to prevent duplicates
ALTER TABLE public.available_dates ADD CONSTRAINT available_dates_date_unique UNIQUE (date);