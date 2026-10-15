import { Model } from "mongoose";
import { CourseType, Currency, ICourse } from "../models/course.model";

// Fills fields added after courses already existed. Idempotent — safe to run on every boot.
export async function backfillCourseDefaults(courseModel: Model<ICourse>): Promise<void> {
  const [typeResult, priceResult, currencyResult] = await Promise.all([
    courseModel.updateMany({ courseType: { $exists: false } }, { $set: { courseType: CourseType.PROFESSIONAL } }),
    courseModel.updateMany({ price: { $exists: false } }, { $set: { price: 0 } }),
    courseModel.updateMany({ currency: { $exists: false } }, { $set: { currency: Currency.NGN } }),
  ]);

  const updated = typeResult.modifiedCount + priceResult.modifiedCount + currencyResult.modifiedCount;
  if (updated > 0) {
    console.log(
      `Course defaults backfilled: courseType=${typeResult.modifiedCount}, ` +
        `price=${priceResult.modifiedCount}, currency=${currencyResult.modifiedCount}`
    );
  }
}
