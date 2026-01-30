-- Create function to update overdue maintenance statuses
CREATE OR REPLACE FUNCTION update_overdue_maintenances()
RETURNS JSON AS $$
DECLARE
  updated_count INTEGER;
  already_overdue_count INTEGER;
  result JSON;
BEGIN
  -- Count maintenances that are already marked as overdue
  SELECT COUNT(*) INTO already_overdue_count
  FROM maintenances
  WHERE scheduled_date < CURRENT_DATE
    AND status = 'overdue';

  -- Update maintenances that should be overdue but aren't
  UPDATE maintenances
  SET 
    status = 'overdue',
    updated_at = NOW()
  WHERE 
    scheduled_date < CURRENT_DATE
    AND status IN ('scheduled', 'pending')
    AND status != 'completed'
    AND status != 'cancelled';
  
  -- Get the number of rows updated
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Build result JSON
  result := json_build_object(
    'success', true,
    'updated', updated_count,
    'already_overdue', already_overdue_count,
    'total_overdue', already_overdue_count + updated_count,
    'timestamp', NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_overdue_maintenances() TO authenticated;

-- Create a scheduled job to run this function daily (optional - requires pg_cron extension)
-- This is just a comment for documentation, actual scheduling would need to be done via Supabase dashboard
-- SELECT cron.schedule('update-overdue-maintenances', '0 1 * * *', 'SELECT update_overdue_maintenances();');

COMMENT ON FUNCTION update_overdue_maintenances() IS 'Updates maintenance records to mark them as overdue when their scheduled date has passed';