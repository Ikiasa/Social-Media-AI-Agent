import { Router } from 'express';
import { listCalendarItems, scheduleContent, updateSchedule, cancelSchedule } from '../controllers/calendarController';
import { validate } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

const scheduleSchema = z.object({
  contentId: z.string().min(1, 'Content ID is required'),
  scheduledAt: z.string().min(1, 'scheduledAt ISO date string is required'),
  timezone: z.string().optional(),
  platform: z.string().optional(),
  brandId: z.string().optional(),
});

router.get('/calendar', listCalendarItems);
router.post('/calendar/schedule', validate(scheduleSchema), scheduleContent);
router.patch('/calendar/schedule/:id', updateSchedule);
router.delete('/calendar/schedule/:id', cancelSchedule);

export default router;
