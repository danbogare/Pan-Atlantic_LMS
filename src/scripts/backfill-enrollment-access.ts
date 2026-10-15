// Gives enrollments created before access periods existed an access window, starting from the day
// after this script runs (Africa/Lagos) and using each course's current duration in days.
//
// Dry run (default):  node dist/scripts/backfill-enrollment-access.js
// Apply changes:      node dist/scripts/backfill-enrollment-access.js --apply
//
// Until this runs, those enrollments are treated as never expiring. Review course durations first:
// they are now interpreted as days.
import { dbManager } from "../config/database";
import { Course, Enrollment } from "../models/course.model";
import { computeAccessWindow } from "../utils/course-access";

async function run(): Promise<void> {
  const apply = process.argv.includes("--apply");
  await dbManager.connect();

  try {
    const legacy = await Enrollment.find({ accessStartsAt: { $exists: false } }).select("_id course").lean();
    const courseIds = [...new Set(legacy.map((e) => e.course.toString()))];
    const courses = await Course.find({ _id: { $in: courseIds } }).select("_id title duration").lean();
    const courseById = new Map(courses.map((c) => [c._id.toString(), c]));

    const now = new Date();
    let updated = 0;

    for (const courseId of courseIds) {
      const course = courseById.get(courseId);
      const durationDays = course?.duration ?? 0;
      const window = computeAccessWindow(durationDays, now);
      const ids = legacy.filter((e) => e.course.toString() === courseId).map((e) => e._id);

      console.log(
        `${course?.title ?? `(missing course ${courseId})`}: ${ids.length} enrollment(s), ` +
          `duration ${durationDays} day(s) -> expires ${window.accessExpiresAt?.toISOString() ?? "never"}`
      );

      if (apply) {
        const result = await Enrollment.updateMany(
          { _id: { $in: ids }, accessStartsAt: { $exists: false } },
          { $set: window }
        );
        updated += result.modifiedCount;
      }
    }

    console.log(
      apply
        ? `Done: ${updated} enrollment(s) updated.`
        : `Dry run: ${legacy.length} enrollment(s) would be updated. Re-run with --apply to save.`
    );
  } finally {
    await dbManager.disconnect();
  }
}

run().catch((error) => {
  console.error("Enrollment access backfill failed:", error);
  process.exit(1);
});
