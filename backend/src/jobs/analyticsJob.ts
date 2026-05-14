import { PrismaClient } from '@prisma/client';

/**
 * runAnalyticsJob
 *
 * Queries all completed meetings grouped by calendar month, then computes:
 *   - meetingsCount        — number of meetings in the month
 *   - avgDuration          — mean meeting duration in minutes
 *   - actionItemsRate      — mean number of action items per meeting
 *   - attendanceRate       — completion rate: meetings with status='completed' / total
 *
 * Results are upserted into the Analytics table (one row per month period string
 * in the form "YYYY-MM").
 */
export async function runAnalyticsJob(prisma: PrismaClient): Promise<void> {
  // Pull all meetings with their action item counts and duration info
  const meetings = await prisma.meeting.findMany({
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      _count: {
        select: { actionItems: true },
      },
    },
    orderBy: { startTime: 'asc' },
  });

  if (meetings.length === 0) {
    console.log('[analyticsJob] No meetings found — nothing to compute.');
    return;
  }

  // Group meetings by "YYYY-MM"
  type MonthBucket = {
    meetings: typeof meetings;
  };
  const buckets = new Map<string, MonthBucket>();

  for (const meeting of meetings) {
    const d = new Date(meeting.startTime);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!buckets.has(key)) {
      buckets.set(key, { meetings: [] });
    }
    buckets.get(key)!.meetings.push(meeting);
  }

  // Compute aggregates and upsert each month
  for (const [monthKey, bucket] of buckets) {
    const { meetings: monthMeetings } = bucket;
    const total = monthMeetings.length;

    // avgDuration in minutes (endTime - startTime)
    let totalDurationMinutes = 0;
    for (const m of monthMeetings) {
      const durationMs = new Date(m.endTime).getTime() - new Date(m.startTime).getTime();
      totalDurationMinutes += durationMs / (1000 * 60);
    }
    const avgDuration = total > 0 ? totalDurationMinutes / total : 0;

    // avgActionItemsPerMeeting
    const totalActionItems = monthMeetings.reduce(
      (sum, m) => sum + m._count.actionItems,
      0
    );
    const actionItemsRate = total > 0 ? totalActionItems / total : 0;

    // completionRate = completed meetings / total meetings
    const completedCount = monthMeetings.filter((m) => m.status === 'completed').length;
    const attendanceRate = total > 0 ? completedCount / total : 0;

    // Monthly detail data stored in the JSON `data` column
    const data = {
      period: monthKey,
      completedMeetings: completedCount,
      totalActionItems,
      avgDurationMinutes: Math.round(avgDuration * 100) / 100,
      computedAt: new Date().toISOString(),
    };

    // Check if a record for this month already exists
    const existing = await prisma.analytics.findFirst({
      where: { period: monthKey },
    });

    if (existing) {
      await prisma.analytics.update({
        where: { id: existing.id },
        data: {
          meetingsCount: total,
          avgDuration: Math.round(avgDuration * 100) / 100,
          actionItemsRate: Math.round(actionItemsRate * 100) / 100,
          attendanceRate: Math.round(attendanceRate * 1000) / 1000,
          data,
        },
      });
      console.log(`[analyticsJob] Updated analytics for ${monthKey}`);
    } else {
      await prisma.analytics.create({
        data: {
          period: monthKey,
          meetingsCount: total,
          avgDuration: Math.round(avgDuration * 100) / 100,
          actionItemsRate: Math.round(actionItemsRate * 100) / 100,
          attendanceRate: Math.round(attendanceRate * 1000) / 1000,
          data,
        },
      });
      console.log(`[analyticsJob] Created analytics for ${monthKey}`);
    }
  }

  console.log(`[analyticsJob] Done — processed ${buckets.size} monthly periods.`);
}
